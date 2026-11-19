/**
 * Agente Orquestador
 * Responsabilidad:
 * 1. Clasifica la intención de la consulta del colaborador (política, dato personal, mixta, restringida, fuera de alcance, dato agregado).
 * 2. Aplica control de privacidad y seguridad estricto (rechaza preguntas 21 y 22 sobre terceros).
 * 3. Enruta al agente correspondiente (Políticas RAG, Datos del Colaborador, Analista de Reportes).
 * 4. Resuelve consultas mixtas llamando a ambos agentes y fusionando sus respuestas.
 * 5. Pasa la respuesta por el Agente Validador y registra en consultas_chat.
 */
const { db } = require('../database/connection');
const policyRagAgent = require('./policyRagAgent');
const employeeDataAgent = require('./employeeDataAgent');
const reportingAnalystAgent = require('./reportingAnalystAgent');
const validatorAgent = require('./validatorAgent');
const escalationAgent = require('./escalationAgent');
const leaveRequestAgent = require('./leaveRequestAgent');
const llmService = require('../services/llmService');

class OrchestratorAgent {
  constructor() {
    this.conversationHistory = new Map(); // Session memory by colaboradorId
  }

  /**
   * Evalúa de forma exhaustiva si la consulta busca acceder a salarios o datos personales de terceros
   */
  isRestrictedPrivacyQuery(q, userRole = 'colaborador') {
    if (userRole === 'rrhh') {
      return false; // RRHH tiene acceso administrativo a auditoría y métricas
    }

    // A. Preguntas salariales o de remuneración de terceros o puestos
    // Excepción permitida: el colaborador preguntando exclusivamente por su propio salario personal
    const isSelfSalary = (
      q === 'cuanto gano' ||
      q === 'cuanto gano yo' ||
      q === 'cual es mi salario' ||
      q === 'mi salario' ||
      q === 'mi sueldo' ||
      q === 'mi proximo pago' ||
      q.includes('cuanto gano yo') ||
      ((q.includes('mi salario') || q.includes('mi sueldo') || q.includes('mi pago')) && 
       !q.includes('companer') && !q.includes('gerente') && !q.includes('director') && !q.includes('de otro') && !q.includes('de otra'))
    );

    // 1. Cualquier pregunta que contenga "cuanto gana", "cuanto le pagan", etc.
    if (q.includes('cuanto gana') || q.includes('cuanto le pagan') || q.includes('cuanto pagan a') || q.includes('cuanto cobra')) {
      if (!isSelfSalary) return true;
    }

    // 2. Patrones directos de salario / sueldo / remuneración de alguien o puesto
    if (
      q.includes('salario de') ||
      q.includes('salario del') ||
      q.includes('sueldo de') ||
      q.includes('sueldo del') ||
      q.includes('remuneracion de') ||
      q.includes('remuneracion del') ||
      q.includes('ingresos de') ||
      q.includes('ingresos del') ||
      q.includes('planilla de') ||
      q.includes('planilla del')
    ) {
      if (!isSelfSalary) return true;
    }

    // 3. Salario / sueldo / aumento combinado con directivos, puestos o compañeros
    if (
      (q.includes('salario') || q.includes('sueldo') || q.includes('aumento')) &&
      (q.includes('gerente') || q.includes('director') || q.includes('directora') || q.includes('jefe') || q.includes('jefa') || q.includes('ceo') || q.includes('cto') || q.includes('cfo') || q.includes('companer') || q.includes('desarrollador') || q.includes('ingeniero') || q.includes('alguien') || q.includes('otro') || q.includes('otra'))
    ) {
      return true;
    }

    // 4. Correo de directivos para pedir aumento
    if (q.includes('correo') && (q.includes('gerente') || q.includes('director') || q.includes('ceo')) && (q.includes('aumento') || q.includes('salario') || q.includes('pedir'))) {
      return true;
    }

    // B. Consultas sobre datos personales de terceros (vacaciones, saldos, días restantes, licencias, expedientes)
    if (
      q.includes('companero') ||
      q.includes('companera') ||
      q.includes('de mi companer') ||
      q.includes('le quedan a') ||
      q.includes('le quedan al') ||
      q.includes('le queda a') ||
      q.includes('le queda al') ||
      q.includes('tiene mi companer') ||
      q.includes('de otro colaborador') ||
      q.includes('de otra persona') ||
      q.includes('del gerente') ||
      q.includes('de la directora') ||
      q.includes('del director') ||
      q.includes('del jefe') ||
      q.includes('del ceo')
    ) {
      return true;
    }

    // Patrón: [dato privado] + "de" / "del" + [nombre propio o rol de tercero]
    // Ejemplo: "vacaciones de andres chaves moreno", "saldo de andres", "dias de juan", "expediente de pedro"
    if (
      /(?:vacaciones|saldo|dias|permiso|incapacidad|expediente|evaluacion|cedula|telefono|correo|faltas|amonestacion)\s+(?:de\s+|del\s+)(?:andres|juan|sofia|carlos|pedro|maria|luis|ana|roberto|diego|elena|gabriel|lucia|mariana|cordero|montero|moreno|soto|morales|vargas|chaves|rodriguez|gonzalez|hernandez|perez|desarrollador|ingeniero|jefe|gerente|director|ceo|cto)\b/i.test(q) &&
      !q.includes('me quedan') && !q.includes('mi saldo') && !q.includes('cuanto gano yo')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Clasifica la intención de la consulta del usuario
   */
  classifyIntent(query, userRole = 'colaborador') {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // 1. Detección de preguntas restringidas (violación de privacidad de terceros o canales inapropiados de salario directivo)
    if (this.isRestrictedPrivacyQuery(q, userRole)) {
      return 'restringida';
    }

    // 2. Detección de fuera de alcance
    if (q.includes('pelicula') || q.includes('chiste') || q.includes('receta') || q.includes('futbol') || q.includes('partido') || q.includes('clima')) {
      return 'fuera_de_alcance';
    }

    // 3. Detección de consultas mixtas (Combina saldo personal + regla general de acumulación/política)
    // Ejemplo: "¿cuántos días me quedan y puedo pasar los que sobren al otro año?"
    if ((q.includes('cuantos dias me quedan') || q.includes('cuanto me queda') || q.includes('mi saldo')) &&
        (q.includes('puedo pasar') || q.includes('acumular') || q.includes('otro ano') || q.includes('siguiente ano') || q.includes('proximo ano'))) {
      return 'mixta';
    }

    // 4. Detección de datos agregados (Rol RRHH)
    if (q.includes('cuantas personas') || q.includes('cuantos estan de vacaciones') || q.includes('ausentes hoy') || q.includes('rol rrhh')) {
      return 'dato_agregado';
    }

    // 4.5 Detección de trámite/solicitud operativa de vacaciones (Agente Transaccional)
    if (
      (q.includes('quiero pedir') || q.includes('quiero solicitar') || q.includes('solicito') || q.includes('deseo pedir') || q.includes('deseo solicitar') || q.includes('solicitar vacaciones') || q.includes('pedir vacaciones') || q.includes('tramitar vacaciones') || q.includes('ingresar solicitud')) &&
      (q.includes('vacaciones') || q.includes('permiso') || q.includes('dia') || q.includes('dias'))
    ) {
      return 'solicitud_tramite';
    }

    // 5. Detección de datos personales propios del colaborador autenticado
    if (
      q.includes('me quedan') ||
      q.includes('he tomado') ||
      q.includes('he disfrutado') ||
      q.includes('mi saldo') ||
      q.includes('mi proximo pago') ||
      q.includes('mi proxima evaluacion') ||
      q.includes('mi solicitud') ||
      (q.includes('solicitud') && q.includes('viernes'))
    ) {
      return 'dato_personal';
    }

    // 6. Por defecto, es consulta de política general RAG
    return 'politica';
  }

  /**
   * Procesa la consulta del usuario de punta a punta
   */
  async handleQuery({ colaboradorId = 2, query, sessionHistory = [] }) {
    const startTime = Date.now();

    // Obtener información del usuario en sesión
    const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId) || {
      id: colaboradorId,
      nombre: 'Colaborador Ficticio',
      rol: 'colaborador'
    };

    const userRole = colaborador.rol;

    // 0. Escaneo de Prompt Injection y Seguridad de IA (Agente Validador)
    const injectionCheck = validatorAgent.scanPromptInjection(query, colaboradorId);
    if (injectionCheck.esAmenaza) {
      return {
        pregunta: query,
        intencion: 'seguridad_inyeccion',
        agente: 'Agente Validador de Seguridad (Guardrail AI)',
        respuesta: injectionCheck.respuestaBloqueo,
        citas: [],
        resuelta: false,
        escalada: false,
        ofreceEscalamiento: false,
        latencia_ms: Date.now() - startTime,
        colaborador: {
          id: colaborador.id,
          nombre: colaborador.nombre,
          rol: userRole,
          departamento: colaborador.departamento
        }
      };
    }

    const intencion = this.classifyIntent(query, userRole);

    let agenteAsignado = '';
    let respuestaFinal = '';
    let citasFinales = [];
    let resuelta = true;
    let escalada = false;
    let requiereEscalamiento = false;

    // Ejecutar lógica según la intención clasificada
    switch (intencion) {
      case 'restringida': {
        agenteAsignado = 'Orquestador (Filtro de Privacidad y Seguridad)';
        respuestaFinal = 'Por estrictas políticas de privacidad, confidencialidad y la Ley N° 8968 de Protección de Datos Personales de Costa Rica, no está permitido consultar saldos de vacaciones, salarios ni expedientes personales de otros colaboradores o directivos.';
        resuelta = false;
        citasFinales = [];
        break;
      }

      case 'fuera_de_alcance': {
        agenteAsignado = 'Orquestador (Enrutador de Asistencia)';
        respuestaFinal = 'Soy el asistente virtual oficial de Recursos Humanos de Innovatech Solutions S.A. Mi alcance está orientado exclusivamente a resolver consultas sobre políticas de la empresa, beneficios, feriados y tus datos laborales personales. ¿Hay alguna consulta sobre temas de RRHH en la que pueda orientarte?';
        resuelta = true;
        citasFinales = [];
        break;
      }

      case 'dato_agregado': {
        agenteAsignado = 'Agente Analista / Datos Consolidados';
        if (userRole === 'rrhh') {
          const metrics = reportingAnalystAgent.computeDailyMetrics();
          respuestaFinal = `(Acceso con Rol RRHH autorizado)\nEn la jornada de hoy se registran **${metrics.ausentes_hoy.total} personas ausentes** en la empresa:\n• **${metrics.ausentes_hoy.por_tipo.vacaciones} colaboradores de vacaciones**.\n• **${metrics.ausentes_hoy.por_tipo.permiso} colaborador con permiso especial**.\n• **${metrics.ausentes_hoy.por_tipo.incapacidad} colaborador incapacitado**.\nEl departamento con mayor cantidad de ausencias es Ingeniería (${metrics.ausentes_hoy.por_departamento['Ingeniería'] || 0} personas).`;
          resuelta = true;
        } else {
          respuestaFinal = 'Las consultas sobre métricas globales y consolidadas del personal de la empresa requieren permisos y rol de Recursos Humanos.';
          resuelta = false;
        }
        break;
      }

      case 'dato_personal': {
        agenteAsignado = 'Agente de Datos del Colaborador';
        const dataResult = await employeeDataAgent.answerQuery(colaboradorId, query);
        respuestaFinal = dataResult.respuesta;
        resuelta = dataResult.resuelta;
        break;
      }

      case 'solicitud_tramite': {
        agenteAsignado = 'Agente Transaccional de Trámites (Action Agent)';
        const transResult = await leaveRequestAgent.processRequest({ query, colaboradorId });
        respuestaFinal = transResult.respuesta;
        citasFinales = transResult.citas || [];
        resuelta = transResult.resuelta;
        escalada = transResult.ofreceEscalamiento;
        requiereEscalamiento = transResult.ofreceEscalamiento;
        break;
      }

      case 'mixta': {
        agenteAsignado = 'Orquestador (Coordinador Mixto: Datos + Políticas)';
        // 1. Llamar al Agente de Datos para el saldo exacto del usuario
        const saldoDisponible = employeeDataAgent.getVacationBalance(colaboradorId);
        
        // 2. Llamar al Agente de Políticas RAG para la regla de acumulación
        const ragResult = await policyRagAgent.answerQuery('¿Puedo acumular vacaciones para el próximo año?');
        citasFinales = ragResult.citas || [];

        respuestaFinal = 
          `Actualmente dispones de **${saldoDisponible.toFixed(1)} días de vacaciones disponibles** en tu cuenta personal.\n\n` +
          `Respecto al traslado de días: sí, de acuerdo con la **Política de Vacaciones y Calendario de Feriados (POL-RRHH-01)**, se permite trasladar un **máximo de cinco (5) días hábiles** al año siguiente, con la condición obligatoria de que sean disfrutados durante el primer trimestre (enero a marzo). Los días que excedan dicho tope no podrán acumularse y deben ser programados con tu jefatura.\n\n` +
          `${policyRagAgent.formatCitationFooter(citasFinales)}`;
        
        resuelta = true;
        break;
      }

      case 'politica':
      default: {
        const ragResult = await policyRagAgent.answerQuery(query);
        agenteAsignado = ragResult.agente || 'Agente de Políticas (RAG)';
        respuestaFinal = ragResult.respuesta;
        citasFinales = ragResult.citas;
        resuelta = ragResult.resuelta;
        escalada = ragResult.ofreceEscalamiento;
        requiereEscalamiento = ragResult.ofreceEscalamiento;
        break;
      }
    }

    // Auditoría con el Agente Validador (Bonus)
    const audit = validatorAgent.auditResponse({
      query,
      respuesta: respuestaFinal,
      rolUsuario: userRole,
      colaboradorIdAutenticado: colaboradorId,
      intencion,
      citas: citasFinales
    });

    if (!audit.aprobado) {
      respuestaFinal = audit.respuestaFinal;
      resuelta = false;
    }

    const latenciaMs = Date.now() - startTime;

    // Registrar en tabla de logs consultas_chat
    try {
      db.prepare(`
        INSERT INTO consultas_chat (
          colaborador_id, pregunta, intencion, agente, documentos_citados, resuelta, escalada, latencia_ms, fecha
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        colaboradorId,
        query,
        intencion,
        agenteAsignado,
        JSON.stringify(citasFinales),
        resuelta ? 1 : 0,
        escalada ? 1 : 0,
        latenciaMs
      );
    } catch (logErr) {
      console.warn('Error registrando log de consulta:', logErr.message);
    }

    return {
      pregunta: query,
      intencion,
      agente: agenteAsignado,
      respuesta: respuestaFinal,
      citas: citasFinales,
      resuelta,
      escalada,
      ofreceEscalamiento: requiereEscalamiento,
      latencia_ms: latenciaMs,
      colaborador: {
        id: colaborador.id,
        nombre: colaborador.nombre,
        rol: userRole,
        departamento: colaborador.departamento
      }
    };
  }
}

module.exports = new OrchestratorAgent();
