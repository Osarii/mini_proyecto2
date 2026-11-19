const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../database/connection');
const emailService = require('../services/emailService');

function calcBusinessDays(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
  const diffTime = Math.abs(end - start);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ============================================================================
// 1. SOLICITUDES DE VACACIONES Y PERMISOS (CON FLUJO DE APROBACIÓN)
// ============================================================================

/**
 * GET /api/self-service/requests/:colaboradorId
 * Obtiene el saldo de vacaciones y las solicitudes del colaborador
 */
router.get('/requests/:colaboradorId', (req, res) => {
  try {
    const colaboradorId = parseInt(req.params.colaboradorId, 10);
    const saldo = db.prepare(`
      SELECT * FROM saldos_vacaciones WHERE colaborador_id = ? ORDER BY periodo DESC LIMIT 1
    `).get(colaboradorId) || { dias_asignados: 12, dias_tomados: 0, dias_disponibles: 12, periodo: '2026' };

    const solicitudes = db.prepare(`
      SELECT * FROM solicitudes WHERE colaborador_id = ? ORDER BY id DESC LIMIT 15
    `).all(colaboradorId);

    const incapacidades = db.prepare(`
      SELECT * FROM incapacidades WHERE colaborador_id = ? ORDER BY id DESC LIMIT 10
    `).all(colaboradorId);

    res.json({ saldo, solicitudes, incapacidades });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/self-service/requests
 * Crea una nueva solicitud de vacaciones o permiso y notifica por correo real a RRHH
 */
router.post('/requests', async (req, res) => {
  try {
    const { colaboradorId, tipo, fechaInicio, fechaFin, motivo } = req.body;
    if (!colaboradorId || !tipo || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'colaboradorId, tipo, fechaInicio y fechaFin son requeridos.' });
    }

    const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }

    const diasSolicitados = calcBusinessDays(fechaInicio, fechaFin);

    // Validar saldo disponible si son vacaciones
    if (tipo === 'vacaciones') {
      const saldo = db.prepare(`
        SELECT * FROM saldos_vacaciones WHERE colaborador_id = ? ORDER BY periodo DESC LIMIT 1
      `).get(colaboradorId);
      if (saldo && diasSolicitados > saldo.dias_disponibles) {
        return res.status(400).json({
          error: `Saldo insuficiente: solicitas ${diasSolicitados} día(s), pero solo dispones de ${saldo.dias_disponibles} día(s) de vacaciones.`
        });
      }
    }

    const now = new Date();
    const result = db.prepare(`
      INSERT INTO solicitudes (colaborador_id, tipo, fecha_inicio, fecha_fin, estado, aprobador_id, creada_en, motivo)
      VALUES (?, ?, ?, ?, 'pendiente', 1, ?, ?)
    `).run(colaboradorId, tipo, fechaInicio, fechaFin, now.toISOString(), (motivo || '').trim() || 'Solicitud desde Portal de Autoservicio');

    const targetEmail = emailService.getTargetEmail();
    const asunto = `[Nueva Solicitud RRHH] ${tipo.toUpperCase()} - ${colaborador.nombre} (${diasSolicitados} día(s))`;
    const cuerpo =
`DE: ${colaborador.nombre} <${colaborador.email}>
PARA: Mariana Soto Vargas <${targetEmail}> (Directora de Gestión del Talento Humano)
FECHA: ${now.toLocaleDateString('es-CR')} ${now.toLocaleTimeString('es-CR')}

Estimada Licda. Mariana Soto Vargas:

El colaborador ${colaborador.nombre} (${colaborador.puesto} - ${colaborador.departamento}) ha enviado una nueva solicitud desde el Portal de Autoservicio:

• Tipo de Solicitud: ${tipo}
• Fecha de Inicio: ${fechaInicio}
• Fecha de Fin: ${fechaFin}
• Duración: ${diasSolicitados} día(s)
• Motivo: "${(motivo || 'No especificado').trim()}"

Puede aprobar o rechazar esta solicitud directamente desde el Dashboard de RRHH en el portal.

Atentamente,
Portal de Autoservicio RRHH
Innovatech Solutions S.A.`;

    db.prepare(`
      INSERT INTO notificaciones_rrhh (
        colaborador_id, remitente, destinatario, tipo, asunto, cuerpo,
        horas_laboradas, horas_faltantes, motivo, fecha_envio
      ) VALUES (?, ?, ?, 'solicitud', ?, ?, 0, 0, ?, ?)
    `).run(
      colaborador.id,
      `${colaborador.nombre} <${colaborador.email}>`,
      `Mariana Soto Vargas <${targetEmail}>`,
      asunto,
      cuerpo,
      `${tipo} (${fechaInicio} a ${fechaFin})`,
      now.toISOString()
    );

    const envioReal = await emailService.sendMail({ to: targetEmail, subject: asunto, text: cuerpo });

    res.json({
      success: true,
      requestId: result.lastInsertRowid,
      diasSolicitados,
      envioReal,
      mensaje: `Solicitud #${result.lastInsertRowid} enviada correctamente (${diasSolicitados} día(s)). Se notificó a RRHH (${targetEmail}).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/self-service/admin/requests
 * Lista todas las solicitudes para aprobación en el Dashboard RRHH
 */
router.get('/admin/requests', (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT s.*, c.nombre as colaborador_nombre, c.departamento, c.puesto, c.email,
             COALESCE(sv.dias_disponibles, 0) as dias_disponibles
      FROM solicitudes s
      JOIN colaboradores c ON s.colaborador_id = c.id
      LEFT JOIN saldos_vacaciones sv ON sv.colaborador_id = c.id
      GROUP BY s.id
      ORDER BY CASE WHEN s.estado = 'pendiente' THEN 0 ELSE 1 END, s.id DESC
      LIMIT 30
    `).all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/self-service/admin/requests/:id/decide
 * Aprueba o rechaza una solicitud y actualiza el saldo de vacaciones si aplica
 */
router.post('/admin/requests/:id/decide', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { decision } = req.body; // 'aprobada' | 'rechazada'

    if (!['aprobada', 'rechazada'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión inválida. Use aprobada o rechazada.' });
    }

    const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(requestId);
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const prevEstado = solicitud.estado;
    db.prepare('UPDATE solicitudes SET estado = ? WHERE id = ?').run(decision, requestId);

    // Descontar días si se aprueba una solicitud de vacaciones que estaba pendiente
    let diasDescontados = 0;
    if (decision === 'aprobada' && prevEstado === 'pendiente' && solicitud.tipo === 'vacaciones') {
      diasDescontados = calcBusinessDays(solicitud.fecha_inicio, solicitud.fecha_fin);
      const saldo = db.prepare('SELECT * FROM saldos_vacaciones WHERE colaborador_id = ? ORDER BY periodo DESC LIMIT 1').get(solicitud.colaborador_id);
      if (saldo) {
        const nuevosTomados = (saldo.dias_tomados || 0) + diasDescontados;
        const nuevosDisponibles = Math.max(0, (saldo.dias_disponibles || 0) - diasDescontados);
        db.prepare('UPDATE saldos_vacaciones SET dias_tomados = ?, dias_disponibles = ? WHERE id = ?')
          .run(nuevosTomados, nuevosDisponibles, saldo.id);
      }
    }

    res.json({
      success: true,
      requestId,
      decision,
      diasDescontados,
      mensaje: `Solicitud #${requestId} marcada como ${decision.toUpperCase()}.${diasDescontados > 0 ? ` Se descontaron ${diasDescontados} día(s) del saldo de vacaciones.` : ''}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. REPORTE DE INCAPACIDADES MÉDICAS (CCSS / INS) - POL-RRHH-03
// ============================================================================

/**
 * POST /api/self-service/incapacidades
 * Registra una incapacidad médica, calcula subsidio según POL-RRHH-03 y notifica a RRHH
 */
router.post('/incapacidades', async (req, res) => {
  try {
    const { colaboradorId, entidad, fechaInicio, dias, numeroBoleta, notas } = req.body;
    if (!colaboradorId || !entidad || !fechaInicio || !dias) {
      return res.status(400).json({ error: 'colaboradorId, entidad, fechaInicio y dias son requeridos.' });
    }

    const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }

    const totalDias = Math.max(1, parseInt(dias, 10));
    const entidadNorm = entidad.toUpperCase() === 'INS' ? 'INS' : 'CCSS';
    const tipoIncapacidad = entidadNorm === 'INS' ? 'Riesgo de Trabajo (INS)' : 'Enfermedad Común (CCSS)';

    // Cálculo automático de subsidio según POL-RRHH-03
    let resumenSubsidio = '';
    if (entidadNorm === 'CCSS') {
      const dias1a3 = Math.min(3, totalDias);
      const dias4mas = Math.max(0, totalDias - 3);
      resumenSubsidio = `Días 1 a ${dias1a3}: 50% subsidio patronal (Innovatech) / 0% CCSS.` +
        (dias4mas > 0 ? ` Días 4 a ${totalDias} (${dias4mas} día(s)): 60% subsidio CCSS + 40% complemento patronal (100% cobertura).` : '');
    } else {
      resumenSubsidio = `${totalDias} día(s) cubiertos por póliza de Riesgos del Trabajo: 60% subsidio INS + 40% complemento patronal.`;
    }

    const result = db.prepare(`
      INSERT INTO incapacidades (colaborador_id, tipo, fecha_inicio, dias, entidad, estado, numero_boleta, notas)
      VALUES (?, ?, ?, ?, ?, 'activa', ?, ?)
    `).run(colaboradorId, tipoIncapacidad, fechaInicio, totalDias, entidadNorm, (numeroBoleta || 'Pendiente').trim(), (notas || '').trim());

    const now = new Date();
    const targetEmail = emailService.getTargetEmail();
    const asunto = `[Reporte de Incapacidad ${entidadNorm}] ${colaborador.nombre} (${totalDias} día(s))`;
    const cuerpo =
`DE: ${colaborador.nombre} <${colaborador.email}>
PARA: Mariana Soto Vargas <${targetEmail}> (Directora de Gestión del Talento Humano)
FECHA: ${now.toLocaleDateString('es-CR')} ${now.toLocaleTimeString('es-CR')}

Estimada Licda. Mariana Soto Vargas:

Se ha registrado una nueva incapacidad médica en el portal:

• Colaborador: ${colaborador.nombre} (${colaborador.puesto} - ${colaborador.departamento})
• Entidad Emisora: ${entidadNorm} (${tipoIncapacidad})
• Número de Boleta: ${(numeroBoleta || 'Pendiente de adjuntar').trim()}
• Fecha de Inicio: ${fechaInicio}
• Cantidad de Días: ${totalDias} día(s)
• Cálculo de Subsidio (POL-RRHH-03): ${resumenSubsidio}
• Observaciones: "${(notas || 'Sin observaciones adicionales').trim()}"

Atentamente,
Portal de Autoservicio RRHH
Innovatech Solutions S.A.`;

    db.prepare(`
      INSERT INTO notificaciones_rrhh (
        colaborador_id, remitente, destinatario, tipo, asunto, cuerpo,
        horas_laboradas, horas_faltantes, motivo, fecha_envio
      ) VALUES (?, ?, ?, 'incapacidad', ?, ?, 0, 0, ?, ?)
    `).run(
      colaborador.id,
      `${colaborador.nombre} <${colaborador.email}>`,
      `Mariana Soto Vargas <${targetEmail}>`,
      asunto,
      cuerpo,
      `Incapacidad ${entidadNorm} (${totalDias} días) - Boleta: ${numeroBoleta || 'N/A'}`,
      now.toISOString()
    );

    const envioReal = await emailService.sendMail({ to: targetEmail, subject: asunto, text: cuerpo });

    res.json({
      success: true,
      incapacidadId: result.lastInsertRowid,
      resumenSubsidio,
      envioReal,
      mensaje: `Incapacidad ${entidadNorm} registrada (${totalDias} día(s)). Aviso enviado a RRHH (${targetEmail}).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. GENERADOR DE CONSTANCIA LABORAL OFICIAL EN PDF (1 CLIC)
// ============================================================================

/**
 * GET /api/self-service/constancia-pdf/:colaboradorId
 * Genera y descarga una Constancia Laboral oficial en formato PDF
 */
router.get('/constancia-pdf/:colaboradorId', (req, res) => {
  try {
    const colaboradorId = parseInt(req.params.colaboradorId, 10);
    const colaborador = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(colaboradorId);
    if (!colaborador) {
      return res.status(404).json({ error: 'Colaborador no encontrado.' });
    }

    const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
    const safeName = colaborador.nombre.replace(/[^a-zA-Z0-9]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Constancia_Laboral_${safeName}.pdf"`);
    doc.pipe(res);

    // Encabezado corporativo
    doc.rect(0, 0, doc.page.width, 95).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('INNOVATECH SOLUTIONS S.A.', 60, 30);
    doc.fontSize(10).font('Helvetica').fillColor('#bfdbfe').text('Cédula Jurídica: 3-101-845920  |  San José, Costa Rica', 60, 56);
    doc.text('Dirección de Gestión del Talento Humano  |  Tel: +506 2204-8800', 60, 70);

    // Título
    doc.moveDown(3.5);
    doc.fillColor('#0f172a').fontSize(15).font('Helvetica-Bold').text('CONSTANCIA LABORAL OFICIAL', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Emitida el ${new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}  ·  Ref: RRHH-CL-${colaborador.id}-${new Date().getFullYear()}`, { align: 'center' });

    // Cuerpo de la constancia
    doc.moveDown(2);
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text('A QUIEN INTERESE:', { align: 'left' });
    doc.moveDown(1);

    doc.text(
      `Por medio de la presente, la Dirección de Gestión del Talento Humano de Innovatech Solutions S.A. hace constar que el(la) señor(a) ${colaborador.nombre}, identificado(a) en nuestros registros institucionales con el correo corporativo ${colaborador.email}, labora actualmente de forma activa y permanente para nuestra organización.`,
      { align: 'justify', lineGap: 5 }
    );

    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').text('Detalles de la Relación Laboral:');
    doc.moveDown(0.5);

    const startY = doc.y;
    doc.rect(60, startY, doc.page.width - 120, 108).fill('#f8fafc').stroke('#e2e8f0');
    doc.fillColor('#0f172a').fontSize(10);

    const rows = [
      ['Colaborador:', colaborador.nombre],
      ['Puesto Actual:', colaborador.puesto],
      ['Departamento:', colaborador.departamento],
      ['Fecha de Ingreso:', colaborador.fecha_ingreso || 'Registro vigente'],
      ['Estado Contractual:', 'Activo - Contrato por Tiempo Indefinido (Jornada 40h/semana)']
    ];

    let curY = startY + 12;
    for (const [label, val] of rows) {
      doc.font('Helvetica-Bold').text(label, 76, curY, { continued: true, width: 150 });
      doc.font('Helvetica').text(` ${val}`);
      curY += 18;
    }

    doc.y = startY + 128;
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(
      'Se extiende la presente constancia a solicitud de la persona interesada para los fines administrativos, bancarios o personales que estime convenientes.',
      { align: 'justify', lineGap: 5 }
    );

    // Bloque de firma
    doc.moveDown(4);
    doc.moveTo(60, doc.y).lineTo(260, doc.y).stroke('#94a3b8');
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Licda. Mariana Soto Vargas');
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text('Directora de Gestión del Talento Humano');
    doc.text('Innovatech Solutions S.A.');
    doc.fontSize(9).fillColor('#64748b').text(`Contacto de verificación: ${emailService.getTargetEmail()}`);

    // Pie de página
    doc.fontSize(8).fillColor('#94a3b8').text(
      'Documento generado automáticamente por el Portal de Autoservicio de RRHH de Innovatech Solutions S.A.',
      60,
      doc.page.height - 50,
      { align: 'center', width: doc.page.width - 120 }
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
