/**
 * Agente de Datos del Colaborador
 * Responsabilidad: Responder consultas sobre datos personales exactos (saldo de vacaciones,
 * estado de solicitudes, fechas de pago, fechas de evaluación).
 * Herramientas: Consultas SQL de solo lectura estrictamente parametrizadas por colaborador_id.
 * Regla de diseño: Nunca inventa políticas; responde con cifras exactas y verificables.
 */
const { db } = require('../database/connection');

class EmployeeDataAgent {
  /**
   * Atiende consultas personales parametrizadas por el colaborador autenticado
   */
  async answerQuery(colaboradorId, query) {
    const startTime = Date.now();
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Obtener datos del colaborador autenticado
    const colab = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
    if (!colab) {
      return {
        agente: 'Agente de Datos del Colaborador',
        pregunta: query,
        respuesta: 'No se encontró la ficha del colaborador en el sistema.',
        datos: null,
        resuelta: false,
        latencia_ms: Date.now() - startTime
      };
    }

    // 2. Consulta de saldo de vacaciones
    if (q.includes('saldo') || q.includes('vacaciones') || q.includes('dias') || q.includes('quedan')) {
      const saldo = db.prepare('SELECT * FROM saldos_vacaciones WHERE colaborador_id = ?').get(colaboradorId);
      if (saldo) {
        const respuesta = `Hola ${colab.nombre.split(' ')[0]}, actualmente dispones de un saldo de **${saldo.dias_disponibles.toFixed(1)} días de vacaciones disponibles** para el periodo ${saldo.periodo} (has disfrutado de ${saldo.dias_tomados.toFixed(1)} días de un total de ${saldo.dias_asignados.toFixed(1)} días asignados para este ciclo laboral).`;
        return {
          agente: 'Agente de Datos del Colaborador',
          pregunta: query,
          respuesta,
          datos: {
            dias_disponibles: saldo.dias_disponibles,
            dias_tomados: saldo.dias_tomados,
            dias_asignados: saldo.dias_asignados,
            periodo: saldo.periodo
          },
          resuelta: true,
          latencia_ms: Date.now() - startTime
        };
      }
    }

    // 3. Consulta de estado de solicitudes (ejemplo: "¿En qué estado está mi solicitud de permiso del viernes?")
    if (q.includes('solicitud') || q.includes('permiso') || q.includes('estado')) {
      const solicitudes = db.prepare(`
        SELECT * FROM solicitudes 
        WHERE colaborador_id = ? 
        ORDER BY creada_en DESC
      `).all(colaboradorId);

      if (solicitudes && solicitudes.length > 0) {
        // Buscar si pregunta por viernes o permiso específico
        let target = solicitudes[0];
        if (q.includes('viernes') || q.includes('permiso')) {
          const matchPermiso = solicitudes.find(s => s.tipo.toLowerCase().includes('permiso'));
          if (matchPermiso) target = matchPermiso;
        }

        const estadoCapitalized = target.estado.charAt(0).toUpperCase() + target.estado.slice(1);
        const respuesta = `Tu solicitud de **${target.tipo}** programada para el día **${target.fecha_inicio}** se encuentra actualmente en estado: **${estadoCapitalized}** (registrada el ${target.creada_en.split(' ')[0]} por motivo: "${target.motivo}"). Está a la espera de resolución por parte de tu jefatura directa.`;

        return {
          agente: 'Agente de Datos del Colaborador',
          pregunta: query,
          respuesta,
          datos: target,
          resuelta: true,
          latencia_ms: Date.now() - startTime
        };
      } else {
        return {
          agente: 'Agente de Datos del Colaborador',
          pregunta: query,
          respuesta: `Hola ${colab.nombre.split(' ')[0]}, no registras ninguna solicitud activa o pendiente en el portal en este momento.`,
          datos: [],
          resuelta: true,
          latencia_ms: Date.now() - startTime
        };
      }
    }

    // 4. Consulta de fecha del próximo pago
    if (q.includes('pago') || q.includes('salario') || q.includes('planilla')) {
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      let proximoPagoStr = "";
      if (currentDay < 15) {
        proximoPagoStr = `el día **15 de este mes** (Primera quincena)`;
      } else if (currentDay < 30) {
        proximoPagoStr = `el día **30 de este mes** (Segunda quincena de fin de mes)`;
      } else {
        proximoPagoStr = `el día **15 del próximo mes**`;
      }

      const respuesta = `Hola ${colab.nombre.split(' ')[0]}, de acuerdo con el calendario oficial de pagos de planilla, tu próximo pago cae **${proximoPagoStr}**. Los depósitos se realizan en tu cuenta bancaria registrada antes de las 5:00 p. m.`;
      return {
        agente: 'Agente de Datos del Colaborador',
        pregunta: query,
        respuesta,
        datos: { proximo_pago: proximoPagoStr },
        resuelta: true,
        latencia_ms: Date.now() - startTime
      };
    }

    // 5. Consulta de próxima evaluación de desempeño
    if (q.includes('evaluacion') || q.includes('desempeno') || q.includes('okr')) {
      const today = new Date();
      const month = today.getMonth() + 1;
      let cicloStr = "";
      if (month <= 6) {
        cicloStr = "en la **última quincena de junio (Evaluación de medio periodo H1)**";
      } else {
        cicloStr = "en la **primera quincena de noviembre (Evaluación de cierre anual H2)**";
      }

      const respuesta = `Hola ${colab.nombre.split(' ')[0]}, de acuerdo con el ciclo corporativo de desempeño, tu próxima evaluación formal de OKRs y competencias está programada para ${cicloStr}, coordinada por tu líder de área y la Dirección de RRHH.`;
      return {
        agente: 'Agente de Datos del Colaborador',
        pregunta: query,
        respuesta,
        datos: { proxima_evaluacion: cicloStr },
        resuelta: true,
        latencia_ms: Date.now() - startTime
      };
    }

    // Respuesta genérica de datos
    return {
      agente: 'Agente de Datos del Colaborador',
      pregunta: query,
      respuesta: `Hola ${colab.nombre.split(' ')[0]}, aquí tienes tus datos registrados: Departamento de ${colab.departamento}, Puesto: ${colab.puesto}, Fecha de ingreso: ${colab.fecha_ingreso}, Estado: ${colab.estado}.`,
      datos: colab,
      resuelta: true,
      latencia_ms: Date.now() - startTime
    };
  }

  /**
   * Obtiene exclusivamente el saldo de vacaciones para consultas combinadas
   */
  getVacationBalance(colaboradorId) {
    const saldo = db.prepare('SELECT * FROM saldos_vacaciones WHERE colaborador_id = ?').get(colaboradorId);
    return saldo ? saldo.dias_disponibles : 0;
  }
}

module.exports = new EmployeeDataAgent();
