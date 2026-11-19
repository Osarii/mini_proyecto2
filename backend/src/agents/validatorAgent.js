/**
 * Agente Validador & Auditor de Seguridad (Bonus de Puntos Extra)
 * Responsabilidad:
 * 1. Detección proactiva de Prompt Injections, Jailbreaks e intentos de manipulación del sistema.
 * 2. Auditoría de fugas de datos personales o confidenciales (Ley N° 8968).
 * 3. Verificación de fundamentación y citas formales de políticas de Google Drive.
 * 4. Registro inmutable en la bitácora de seguridad `auditoria_seguridad`.
 */
const { db } = require('../database/connection');

class ValidatorAgent {
  /**
   * Escanea la consulta del usuario en busca de intentos de evasión o inyección de prompts
   */
  scanPromptInjection(query, colaboradorId = null) {
    const qLower = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const injectionPatterns = [
      { pattern: /ignora\s+(?:todas\s+)?(?:las\s+)?instrucciones/i, type: 'Prompt Injection (Override Instructions)' },
      { pattern: /ignore\s+(?:all\s+)?(?:previous\s+)?instructions/i, type: 'Prompt Injection (English Override)' },
      { pattern: /olvida\s+(?:todas\s+)?tus\s+reglas/i, type: 'Prompt Injection (Rule Erasure)' },
      { pattern: /(?:muestrame|revela|dame|imprime)\s+(?:tu\s+)?(?:system\s+prompt|instrucciones\s+del\s+sistema)/i, type: 'Prompt Leak / Reconnaissance' },
      { pattern: /actua\s+como\s+(?:un\s+)?(?:hacker|administrador\s+sin\s+restricciones|modo\s+dan|god\s+mode)/i, type: 'Persona Jailbreak' },
      { pattern: /drop\s+table|select\s+\*\s+from|delete\s+from\s+colaboradores/i, type: 'SQL Injection Pattern' }
    ];

    for (const item of injectionPatterns) {
      if (item.pattern.test(qLower)) {
        try {
          db.prepare(`
            INSERT INTO auditoria_seguridad (colaborador_id, pregunta, tipo_amenaza, accion_tomada)
            VALUES (?, ?, ?, 'bloqueado_preventivo')
          `).run(colaboradorId, query, item.type);
        } catch (dbErr) {
          console.warn('Error registrando evento de seguridad:', dbErr.message);
        }

        return {
          esAmenaza: true,
          tipoAmenaza: item.type,
          respuestaBloqueo: 
            `**ALERTA DE SEGURIDAD INFORMÁTICA INSTITUCIONAL:**\n\n` +
            `Se ha detectado e interceptado un intento de manipulación de directivas o inyección de prompts (\`${item.type}\`).\n\n` +
            `Conforme al **Código de Conducta y Seguridad (POL-RRHH-09)** de Innovatech Solutions S.A., todas las interacciones con los agentes virtuales son monitoreadas. Este evento ha sido registrado en la bitácora de auditoría de seguridad para revisión del departamento de TI y Cumplimiento.`
        };
      }
    }

    return { esAmenaza: false };
  }

  /**
   * Audita la respuesta final antes de remitirla al colaborador
   */
  auditResponse({ query, respuesta, rolUsuario, colaboradorIdAutenticado, intencion, citas }) {
    const qLower = query.toLowerCase();
    const respLower = respuesta.toLowerCase();

    // 1. Detección de fuga de datos personales de terceros o salarios (Ley N° 8968)
    let fugaDetectada = false;
    let motivoBloqueo = '';

    if (rolUsuario !== 'rrhh') {
      if (intencion === 'restringida') {
        fugaDetectada = true;
        motivoBloqueo = 'Intento de consulta de datos privados o salariales de terceros sin permisos de RRHH (Violación Ley N° 8968).';
      } else {
        // Auditoría sobre la respuesta generada: evitar fugas no intencionadas de montos salariales de terceros
        const contieneCifraSalarial = (respLower.includes('₡') || (respLower.includes('$') && !respLower.includes('política')));
        const mencionaTercero = respLower.includes('salario de') || respLower.includes('sueldo de') || respLower.includes('le corresponden a');
        if (contieneCifraSalarial && mencionaTercero) {
          fugaDetectada = true;
          motivoBloqueo = 'Fuga detectada: la respuesta generada contiene montos salariales de terceros.';
        }
      }
    }

    if (fugaDetectada) {
      try {
        db.prepare(`
          INSERT INTO auditoria_seguridad (colaborador_id, pregunta, tipo_amenaza, accion_tomada)
          VALUES (?, ?, 'Intento Violacion Privacidad (Ley 8968)', 'bloqueado_rbac')
        `).run(colaboradorIdAutenticado, query);
      } catch (e) {}

      return {
        aprobado: false,
        respuestaFinal: 'Por estrictas políticas de confidencialidad, privacidad y en cumplimiento con la Ley N° 8968 de Protección de Datos Personales de Costa Rica, no está permitido consultar saldos de vacaciones, salarios ni expedientes personales de otros colaboradores o directivos.',
        fugaDetectada: true,
        motivoBloqueo,
        citasPresentes: false
      };
    }

    // 2. Verificación de presencia de citas en consultas de política
    let citasPresentes = true;
    if (intencion === 'politica' && (!citas || citas.length === 0) && !respLower.includes('no encontre ninguna politica')) {
      citasPresentes = false;
    }

    return {
      aprobado: true,
      respuestaFinal: respuesta,
      fugaDetectada: false,
      citasPresentes,
      motivoBloqueo: null
    };
  }
}

module.exports = new ValidatorAgent();
