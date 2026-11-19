const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');
const emailService = require('../services/emailService');

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeLiveMetrics(activeRecord) {
  const now = Date.now();
  const startTime = new Date(activeRecord.hora_entrada).getTime();
  const totalElapsed = Math.max(0, Math.floor((now - startTime) / 1000));
  const accumulatedLunch = activeRecord.segundos_almuerzo || 0;
  let currentLunchSeconds = 0;

  if (activeRecord.en_almuerzo && activeRecord.inicio_almuerzo) {
    const lunchStart = new Date(activeRecord.inicio_almuerzo).getTime();
    currentLunchSeconds = Math.max(0, Math.floor((now - lunchStart) / 1000));
  }

  const totalLunchSeconds = accumulatedLunch + currentLunchSeconds;
  const effectiveWorkSeconds = Math.max(0, totalElapsed - totalLunchSeconds);
  const targetSeconds = Math.round((activeRecord.jornada_esperada_horas || 8.0) * 3600);
  const overtimeSeconds = Math.max(0, effectiveWorkSeconds - targetSeconds);

  return {
    segundosTranscurridos: effectiveWorkSeconds,
    enAlmuerzo: !!activeRecord.en_almuerzo,
    segundosAlmuerzoActual: currentLunchSeconds,
    segundosAlmuerzoTotal: totalLunchSeconds,
    segundosExtra: overtimeSeconds
  };
}

/**
 * GET /api/attendance/status/:colaboradorId
 * Obtiene el estado de asistencia de hoy para el colaborador
 */
router.get('/status/:colaboradorId', (req, res) => {
  try {
    const colaboradorId = parseInt(req.params.colaboradorId, 10);
    const today = getTodayString();

    const activeRecord = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? AND estado = 'en_curso'
      ORDER BY id DESC LIMIT 1
    `).get(colaboradorId);

    if (activeRecord) {
      const metrics = computeLiveMetrics(activeRecord);
      return res.json({
        clockedIn: true,
        completedToday: false,
        record: {
          ...activeRecord,
          ...metrics
        }
      });
    }

    const completedRecord = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? AND fecha = ? AND estado != 'en_curso'
      ORDER BY id DESC LIMIT 1
    `).get(colaboradorId, today);

    if (completedRecord) {
      return res.json({
        clockedIn: false,
        completedToday: true,
        record: completedRecord
      });
    }

    res.json({
      clockedIn: false,
      completedToday: false,
      record: null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/attendance/check-in
 * Registra la hora de entrada del colaborador e inicia el cronómetro
 */
router.post('/check-in', (req, res) => {
  try {
    const { colaboradorId } = req.body;
    if (!colaboradorId) {
      return res.status(400).json({ error: 'colaboradorId es requerido' });
    }

    const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    const existing = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? AND estado = 'en_curso'
    `).get(colaboradorId);

    if (existing) {
      const metrics = computeLiveMetrics(existing);
      return res.json({
        success: true,
        message: 'Ya posees una jornada en curso.',
        clockedIn: true,
        record: { ...existing, ...metrics }
      });
    }

    const today = getTodayString();
    const nowIso = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO marcas_asistencia (
        colaborador_id, fecha, hora_entrada, estado, jornada_esperada_horas, en_almuerzo, segundos_almuerzo
      ) VALUES (?, ?, ?, 'en_curso', 8.0, 0, 0)
    `).run(colaboradorId, today, nowIso);

    const newRecord = db.prepare('SELECT * FROM marcas_asistencia WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      message: `Entrada registrada a las ${new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. Contador de jornada iniciado.`,
      clockedIn: true,
      record: {
        ...newRecord,
        segundosTranscurridos: 0,
        enAlmuerzo: false,
        segundosAlmuerzoActual: 0,
        segundosAlmuerzoTotal: 0,
        segundosExtra: 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/attendance/lunch-start
 * Inicia la pausa de almuerzo (pausa el cronómetro laboral y activa contador de 60 min)
 */
router.post('/lunch-start', (req, res) => {
  try {
    const { colaboradorId } = req.body;
    const activeRecord = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? AND estado = 'en_curso'
      ORDER BY id DESC LIMIT 1
    `).get(colaboradorId);

    if (!activeRecord) {
      return res.status(400).json({ error: 'No tienes una jornada activa para iniciar almuerzo.' });
    }
    if (activeRecord.en_almuerzo) {
      return res.json({ success: true, message: 'Ya te encuentras en pausa de almuerzo.', record: { ...activeRecord, ...computeLiveMetrics(activeRecord) } });
    }

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE marcas_asistencia SET en_almuerzo = 1, inicio_almuerzo = ? WHERE id = ?
    `).run(nowIso, activeRecord.id);

    const updated = db.prepare('SELECT * FROM marcas_asistencia WHERE id = ?').get(activeRecord.id);
    res.json({
      success: true,
      message: 'Pausa de almuerzo iniciada (60 minutos permitidos según POL-RRHH-04).',
      record: { ...updated, ...computeLiveMetrics(updated) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/attendance/lunch-end
 * Finaliza la pausa de almuerzo, reanuda el cronómetro y notifica a RRHH si excede 60 min
 */
router.post('/lunch-end', async (req, res) => {
  try {
    const { colaboradorId } = req.body;
    const activeRecord = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? AND estado = 'en_curso'
      ORDER BY id DESC LIMIT 1
    `).get(colaboradorId);

    if (!activeRecord || !activeRecord.en_almuerzo) {
      return res.status(400).json({ error: 'No tienes una pausa de almuerzo activa.' });
    }

    const now = new Date();
    const lunchStart = new Date(activeRecord.inicio_almuerzo);
    const sessionLunchSeconds = Math.max(1, Math.floor((now.getTime() - lunchStart.getTime()) / 1000));
    const totalLunchSeconds = (activeRecord.segundos_almuerzo || 0) + sessionLunchSeconds;
    const excessSeconds = Math.max(0, totalLunchSeconds - 3600);

    db.prepare(`
      UPDATE marcas_asistencia SET
        en_almuerzo = 0,
        inicio_almuerzo = NULL,
        segundos_almuerzo = ?,
        exceso_almuerzo_segundos = ?
      WHERE id = ?
    `).run(totalLunchSeconds, excessSeconds, activeRecord.id);

    let excessNotified = false;
    if (excessSeconds > 0) {
      const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
      const targetEmail = emailService.getTargetEmail();
      const excesoMin = Math.ceil(excessSeconds / 60);
      const totalMin = Math.round(totalLunchSeconds / 60);
      const asunto = `[Alerta de Almuerzo] Exceso de tiempo de almuerzo - ${colaborador.nombre} (${colaborador.departamento})`;
      const cuerpo =
`DE: ${colaborador.nombre} <${colaborador.email}>
PARA: Mariana Soto Vargas <${targetEmail}> (Directora de Gestión del Talento Humano)
FECHA: ${now.toLocaleDateString('es-CR')} ${now.toLocaleTimeString('es-CR')}

Estimada Licda. Mariana Soto Vargas:

Se informa que el colaborador ${colaborador.nombre} (${colaborador.puesto}, ${colaborador.departamento}) ha excedido el límite de 60 minutos de pausa de almuerzo establecido en la política POL-RRHH-04.

DATOS DE LA PAUSA DE ALMUERZO:
• Tiempo total en almuerzo: ${totalMin} minutos
• Exceso registrado: ${excesoMin} minutos sobre la hora permitida

Atentamente,
Sistema Automatizado de Control de Marcas y Asistencia
Innovatech Solutions S.A.`;

      db.prepare(`
        INSERT INTO notificaciones_rrhh (
          colaborador_id, remitente, destinatario, tipo, asunto, cuerpo,
          horas_laboradas, horas_faltantes, motivo, fecha_envio
        ) VALUES (?, ?, ?, 'exceso_almuerzo', ?, ?, 0, ?, ?, ?)
      `).run(
        colaborador.id,
        `${colaborador.nombre} <${colaborador.email}>`,
        `Mariana Soto Vargas <${targetEmail}>`,
        asunto,
        cuerpo,
        parseFloat((excessSeconds / 3600).toFixed(2)),
        `Exceso de almuerzo de ${excesoMin} minutos`,
        now.toISOString()
      );

      await emailService.sendMail({ to: targetEmail, subject: asunto, text: cuerpo });
      excessNotified = true;
    }

    const updated = db.prepare('SELECT * FROM marcas_asistencia WHERE id = ?').get(activeRecord.id);
    res.json({
      success: true,
      excessNotified,
      message: excessNotified
        ? `Almuerzo finalizado. Se detectó un exceso sobre 60 minutos y se notificó a RRHH.`
        : `Almuerzo finalizado (${Math.round(totalLunchSeconds / 60)} min). Cronómetro de jornada reanudado.`,
      record: { ...updated, ...computeLiveMetrics(updated) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/attendance/check-out
 * Registra la salida. Soporta salida anticipada (<8h) y registro de horas extra (>8h).
 */
router.post('/check-out', async (req, res) => {
  try {
    const { colaboradorId, motivoSalidaAnticipada, horasExtraAutorizadas, motivoHorasExtra } = req.body;
    if (!colaboradorId) {
      return res.status(400).json({ error: 'colaboradorId es requerido' });
    }

    const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }

    const activeRecord = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? AND estado = 'en_curso'
      ORDER BY id DESC LIMIT 1
    `).get(colaboradorId);

    if (!activeRecord) {
      return res.status(400).json({ error: 'No tienes una jornada activa en curso para registrar salida.' });
    }

    const now = new Date();
    const metrics = computeLiveMetrics(activeRecord);
    const elapsedSeconds = Math.max(1, metrics.segundosTranscurridos);
    const elapsedHours = parseFloat((elapsedSeconds / 3600).toFixed(2));
    const targetHours = activeRecord.jornada_esperada_horas || 8.0;
    const targetSeconds = Math.round(targetHours * 3600);

    const isEarlyDeparture = elapsedSeconds < targetSeconds;
    const overtimeSeconds = Math.max(0, elapsedSeconds - targetSeconds);
    const overtimeHours = parseFloat((overtimeSeconds / 3600).toFixed(2));
    const hasOvertime = overtimeSeconds >= 60; // Al menos 1 minuto de extra

    if (isEarlyDeparture && (!motivoSalidaAnticipada || !motivoSalidaAnticipada.trim())) {
      const horasFaltantes = parseFloat((targetHours - elapsedHours).toFixed(2));
      return res.json({
        requiresReason: true,
        isEarly: true,
        horasLaboradas: elapsedHours,
        horasFaltantes,
        segundosLaborados: elapsedSeconds,
        mensaje: `No has completado tu jornada ordinaria de ${targetHours} horas (has acumulado ${elapsedHours} h). Debes registrar el motivo de tu salida anticipada para enviar la notificación a Recursos Humanos.`
      });
    }

    const motivoFinal = isEarlyDeparture ? motivoSalidaAnticipada.trim() : null;
    const nuevoEstado = isEarlyDeparture ? 'justificada' : (hasOvertime ? 'horas_extra' : 'completada');

    db.prepare(`
      UPDATE marcas_asistencia SET
        hora_salida = ?,
        segundos_trabajados = ?,
        horas_trabajadas = ?,
        en_almuerzo = 0,
        inicio_almuerzo = NULL,
        segundos_almuerzo = ?,
        salida_anticipada = ?,
        motivo_salida_anticipada = ?,
        segundos_extra = ?,
        horas_extra = ?,
        horas_extra_autorizadas = ?,
        motivo_horas_extra = ?,
        notificacion_rrhh_enviada = ?,
        estado = ?
      WHERE id = ?
    `).run(
      now.toISOString(),
      elapsedSeconds,
      elapsedHours,
      metrics.segundosAlmuerzoTotal,
      isEarlyDeparture ? 1 : 0,
      motivoFinal,
      overtimeSeconds,
      overtimeHours,
      horasExtraAutorizadas ? 1 : 0,
      motivoHorasExtra ? motivoHorasExtra.trim() : null,
      (isEarlyDeparture || hasOvertime) ? 1 : 0,
      nuevoEstado,
      activeRecord.id
    );

    let notificacionId = null;
    let envioReal = null;
    const targetEmail = emailService.getTargetEmail();

    if (isEarlyDeparture) {
      const horasFaltantes = parseFloat((targetHours - elapsedHours).toFixed(2));
      const asunto = `[Alerta de Asistencia] Salida anticipada de jornada - ${colaborador.nombre} (${colaborador.departamento})`;
      const cuerpo =
`DE: ${colaborador.nombre} <${colaborador.email}>
PARA: Mariana Soto Vargas <${targetEmail}> (Directora de Gestión del Talento Humano)
FECHA: ${now.toLocaleDateString('es-CR')} ${now.toLocaleTimeString('es-CR')}

Estimada Licda. Mariana Soto Vargas:

Se le informa formalmente que el colaborador ${colaborador.nombre}, quien se desempeña en el puesto de ${colaborador.puesto} en el departamento de ${colaborador.departamento}, ha registrado su salida del trabajo antes de cumplir con las 8.0 horas de su jornada ordinaria.

DATOS DEL REGISTRO DE ASISTENCIA:
• Fecha: ${now.toLocaleDateString('es-CR')}
• Hora de Entrada Registrada: ${new Date(activeRecord.hora_entrada).toLocaleTimeString('es-CR')}
• Hora de Salida Registrada: ${now.toLocaleTimeString('es-CR')}
• Tiempo Efectivo Laborado: ${elapsedHours} horas (${Math.floor(elapsedSeconds / 3600)}h ${Math.floor((elapsedSeconds % 3600) / 60)}m ${elapsedSeconds % 60}s)
• Tiempo en Almuerzo: ${Math.round(metrics.segundosAlmuerzoTotal / 60)} minutos
• Tiempo Faltante para Jornada Completa: ${horasFaltantes} horas

MOTIVO Y JUSTIFICACIÓN DECLARADA POR EL COLABORADOR:
"${motivoFinal}"

MARCO NORMATIVO INSTITUCIONAL:
Conforme al Reglamento de Jornada, Asistencia y Teletrabajo (POL-RRHH-04), esta salida anticipada queda debidamente archivada en la bitácora de control de marcas para su respectivo seguimiento.

Atentamente,
Sistema Automatizado de Control de Marcas y Asistencia
Innovatech Solutions S.A.`;

      const notifResult = db.prepare(`
        INSERT INTO notificaciones_rrhh (
          colaborador_id, remitente, destinatario, tipo, asunto, cuerpo,
          horas_laboradas, horas_faltantes, motivo, fecha_envio
        ) VALUES (?, ?, ?, 'salida_anticipada', ?, ?, ?, ?, ?, ?)
      `).run(
        colaborador.id,
        `${colaborador.nombre} <${colaborador.email}>`,
        `Mariana Soto Vargas <${targetEmail}>`,
        asunto,
        cuerpo,
        elapsedHours,
        horasFaltantes,
        motivoFinal,
        now.toISOString()
      );
      notificacionId = notifResult.lastInsertRowid;

      try {
        envioReal = await emailService.sendMail({ to: targetEmail, subject: asunto, text: cuerpo });
      } catch (mailErr) {
        envioReal = { success: false, error: mailErr.message };
      }
    } else if (hasOvertime) {
      const asunto = `[Reporte de Horas Extra 1.5x] ${colaborador.nombre} (${overtimeHours} h extra)`;
      const cuerpo =
`DE: ${colaborador.nombre} <${colaborador.email}>
PARA: Mariana Soto Vargas <${targetEmail}> (Directora de Gestión del Talento Humano)
FECHA: ${now.toLocaleDateString('es-CR')} ${now.toLocaleTimeString('es-CR')}

Estimada Licda. Mariana Soto Vargas:

Se reporta el registro de tiempo extraordinario para revisión de planilla (recargo de ley 1.5x):

• Colaborador: ${colaborador.nombre} (${colaborador.puesto} - ${colaborador.departamento})
• Tiempo Total Laborado: ${elapsedHours} horas
• Tiempo Extraordinario Detectado: ${overtimeHours} horas
• Autorizado por Jefatura: ${horasExtraAutorizadas ? 'Sí' : 'Pendiente de confirmación'}
• Motivo / Detalle: "${motivoHorasExtra || 'No especificado'}"

Atentamente,
Sistema Automatizado de Control de Marcas y Asistencia
Innovatech Solutions S.A.`;

      const notifResult = db.prepare(`
        INSERT INTO notificaciones_rrhh (
          colaborador_id, remitente, destinatario, tipo, asunto, cuerpo,
          horas_laboradas, horas_faltantes, motivo, fecha_envio
        ) VALUES (?, ?, ?, 'horas_extra', ?, ?, ?, 0, ?, ?)
      `).run(
        colaborador.id,
        `${colaborador.nombre} <${colaborador.email}>`,
        `Mariana Soto Vargas <${targetEmail}>`,
        asunto,
        cuerpo,
        elapsedHours,
        `Horas extra (${overtimeHours}h): ${motivoHorasExtra || 'Sin detalle'}`,
        now.toISOString()
      );
      notificacionId = notifResult.lastInsertRowid;

      try {
        envioReal = await emailService.sendMail({ to: targetEmail, subject: asunto, text: cuerpo });
      } catch (mailErr) {
        envioReal = { success: false, error: mailErr.message };
      }
    }

    const updatedRecord = db.prepare('SELECT * FROM marcas_asistencia WHERE id = ?').get(activeRecord.id);

    const mensajeRespuesta = isEarlyDeparture
      ? (envioReal && envioReal.sentRealEmail
          ? `Salida anticipada registrada (${elapsedHours} h trabajadas). Se envió el correo real a ${targetEmail}.`
          : `Salida anticipada registrada (${elapsedHours} h trabajadas). Notificación archivada para ${targetEmail}.`)
      : hasOvertime
        ? `Jornada completada con ${overtimeHours} h extra (1.5x). Reporte enviado a RRHH (${targetEmail}).`
        : `Jornada completada exitosamente (${elapsedHours} h trabajadas).`;

    res.json({
      success: true,
      requiresReason: false,
      isEarly: isEarlyDeparture,
      hasOvertime,
      overtimeHours,
      correoEnviado: isEarlyDeparture || hasOvertime,
      envioReal,
      destinatarioReal: targetEmail,
      notificacionId,
      horasLaboradas: elapsedHours,
      mensaje: mensajeRespuesta,
      record: updatedRecord
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/attendance/weekly-summary/:colaboradorId
 * Resumen semanal e historial de los últimos 7 días del colaborador
 */
router.get('/weekly-summary/:colaboradorId', (req, res) => {
  try {
    const colaboradorId = parseInt(req.params.colaboradorId, 10);
    const records = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? 
      ORDER BY id DESC LIMIT 14
    `).all(colaboradorId);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    const weekRecords = records.filter(r => r.fecha >= cutoff);
    const totalHorasSemana = parseFloat(weekRecords.reduce((acc, r) => acc + (r.horas_trabajadas || 0), 0).toFixed(2));
    const totalHorasExtra = parseFloat(weekRecords.reduce((acc, r) => acc + (r.horas_extra || 0), 0).toFixed(2));
    const salidasAnticipadas = weekRecords.filter(r => r.salida_anticipada === 1).length;

    res.json({
      metaSemanalHoras: 40.0,
      totalHorasSemana,
      porcentajeMeta: Math.min(100, Math.round((totalHorasSemana / 40.0) * 100)),
      totalHorasExtra,
      salidasAnticipadas,
      records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/attendance/history/:colaboradorId
 */
router.get('/history/:colaboradorId', (req, res) => {
  try {
    const colaboradorId = parseInt(req.params.colaboradorId, 10);
    const records = db.prepare(`
      SELECT * FROM marcas_asistencia 
      WHERE colaborador_id = ? 
      ORDER BY id DESC LIMIT 10
    `).all(colaboradorId);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/attendance/admin/alerts
 */
router.get('/admin/alerts', (req, res) => {
  try {
    const earlyDepartures = db.prepare(`
      SELECT m.*, c.nombre as colaborador_nombre, c.departamento, c.puesto, c.email
      FROM marcas_asistencia m
      JOIN colaboradores c ON m.colaborador_id = c.id
      WHERE m.salida_anticipada = 1
      ORDER BY m.id DESC LIMIT 15
    `).all();

    const emails = db.prepare(`
      SELECT * FROM notificaciones_rrhh
      ORDER BY id DESC LIMIT 25
    `).all();

    const activeStaff = db.prepare(`
      SELECT m.*, c.nombre as colaborador_nombre, c.departamento, c.puesto
      FROM marcas_asistencia m
      JOIN colaboradores c ON m.colaborador_id = c.id
      WHERE m.estado = 'en_curso'
      ORDER BY m.hora_entrada ASC
    `).all();

    res.json({
      earlyDepartures,
      emails,
      activeStaff,
      totalAlertas: earlyDepartures.length,
      correosSinLeer: emails.filter(e => e.leido === 0).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/attendance/admin/mark-email-read
 */
router.post('/admin/mark-email-read', (req, res) => {
  try {
    const { emailId } = req.body;
    db.prepare('UPDATE notificaciones_rrhh SET leido = 1 WHERE id = ?').run(emailId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/attendance/email-status
 */
router.get('/email-status', (req, res) => {
  res.json(emailService.getStatus());
});

/**
 * POST /api/attendance/configure-smtp
 */
router.post('/configure-smtp', (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPass, targetEmail } = req.body;
    const status = emailService.updateCredentials({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      targetEmail
    });
    res.json({ success: true, message: 'Configuración de correo actualizada exitosamente.', status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/attendance/send-test-email
 */
router.post('/send-test-email', async (req, res) => {
  try {
    const targetEmail = req.body.to || emailService.getTargetEmail();
    const result = await emailService.sendMail({
      to: targetEmail,
      subject: '[Prueba de Conexión] Portal de RRHH Innovatech Solutions',
      text: `Hola,\n\nEste es un correo oficial de prueba enviado desde el Portal de RRHH de Innovatech Solutions S.A. para confirmar la recepción exitosa de notificaciones en ${targetEmail}.\n\nFecha y hora: ${new Date().toLocaleString('es-CR')}\n\nSi estás leyendo este mensaje en tu bandeja de entrada, la entrega de correos reales está 100% activa.`
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
