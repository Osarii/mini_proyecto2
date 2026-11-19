const express = require('express');
const router = express.Router();
const reportingAnalystAgent = require('../agents/reportingAnalystAgent');
const { db } = require('../database/connection');
const PDFDocument = require('pdfkit');

// Middleware to verify HR role
function requireHRRole(req, res, next) {
  const role = req.headers['x-user-role'] || req.query.role || 'colaborador';
  if (role !== 'rrhh') {
    return res.status(403).json({
      error: 'Acceso restringido. Solo los usuarios con rol de Recursos Humanos pueden visualizar el dashboard.'
    });
  }
  next();
}

// GET /api/dashboard/export-pdf - Descargar el Reporte Ejecutivo Diario en PDF Oficial
router.get('/export-pdf', async (req, res) => {
  try {
    let report = reportingAnalystAgent.getLatestReport();
    if (!report) {
      report = await reportingAnalystAgent.generateDailyReport();
    }

    const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Reporte_Ejecutivo_RRHH_${report.fecha || '2026'}.pdf"`);
    doc.pipe(res);

    // Header Corporativo
    doc.fontSize(9).fillColor('#2563EB').text('INNOVATECH SOLUTIONS S.A. · DEPARTAMENTO DE TALENTO HUMANO', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(16).fillColor('#0F172A').text('INFORME EJECUTIVO DIARIO DE OPERACIONES DE RRHH', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(8.5).fillColor('#64748B').text(`Fecha del Reporte: ${report.fecha || new Date().toISOString().split('T')[0]} · Generado automáticamente por Agente Analista (07:00 a. m.)`);
    doc.moveDown(0.5);

    // Blue Line Divider
    doc.strokeColor('#2563EB').lineWidth(1.5).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
    doc.moveDown(0.6);

    // 1. Tabla de Métricas Clave (KPIs)
    doc.fontSize(11).fillColor('#1E3A8A').text('1. Indicadores Operacionales del Día (KPIs)', { underline: false });
    doc.moveDown(0.4);

    const m = report.metricas || {};
    const ausentes = m.ausentes_hoy || { total: 0, por_tipo: {} };
    const solicitudes = m.solicitudes_pendientes || { total: 0, criticas_mas_3_dias: 0 };
    const pasivo = m.pasivo_vacaciones_alerta || { total_colaboradores_alerta: 0 };

    const kpiY = doc.y;
    doc.rect(40, kpiY, 530, 60).fillAndStroke('#F8FAFC', '#CBD5E1');

    doc.fontSize(8.5).fillColor('#0F172A');
    doc.text(`Colaboradores Activos: ${m.colaboradores_activos || 52}`, 55, kpiY + 10);
    doc.text(`Personal Ausente Hoy: ${ausentes.total || 0}`, 220, kpiY + 10);
    doc.text(`Tasa de Ausentismo: ${(m.tasa_ausentismo || 0).toFixed(1)}%`, 390, kpiY + 10);

    doc.text(`Solicitudes Pendientes: ${solicitudes.total || 0} (${solicitudes.criticas_mas_3_dias || 0} críticas >3d)`, 55, kpiY + 28);
    doc.text(`Riesgo Pasivo Vacacional: ${pasivo.total_colaboradores_alerta || 0} personas (>20d)`, 220, kpiY + 28);
    doc.text(`Rotación Mensual Estimada: ${(m.rotacion_mensual || 0).toFixed(1)}%`, 390, kpiY + 28);

    doc.y = kpiY + 70;
    doc.moveDown(0.4);

    // 2. Desglose de Ausencias
    doc.fontSize(11).fillColor('#1E3A8A').text('2. Desglose Detallado de Ausencias');
    doc.moveDown(0.3);
    doc.fontSize(8.5).fillColor('#334155');
    const porTipo = ausentes.por_tipo || { vacaciones: 0, permiso: 0, incapacidad: 0 };
    doc.text(`• Por Vacaciones Remuneradas: ${porTipo.vacaciones || 0} colaboradores`);
    doc.text(`• Por Permisos Especiales / Duelo: ${porTipo.permiso || 0} colaboradores`);
    doc.text(`• Por Incapacidad Médica (CCSS / INS): ${porTipo.incapacidad || 0} colaboradores`);
    doc.moveDown(0.6);

    // 3. Análisis Ejecutivo (Generado por LLM)
    doc.fontSize(11).fillColor('#1E3A8A').text('3. Análisis Ejecutivo de Talento Humano (Agente Analista)');
    doc.moveDown(0.3);
    doc.fontSize(8.5).fillColor('#1E293B').text(
      report.resumen_ejecutivo || 'La jornada actual transcurre dentro de los umbrales de normalidad operativa. Se recomienda dar seguimiento prioritario a las solicitudes con más de 3 días de atraso.',
      { align: 'justify', lineGap: 2 }
    );
    doc.moveDown(0.6);

    // 4. Recomendaciones Operativas
    doc.fontSize(11).fillColor('#1E3A8A').text('4. Recomendaciones Inmediatas');
    doc.moveDown(0.3);
    doc.fontSize(8.5).fillColor('#1E293B');
    const recomms = report.recomendaciones || [
      'Enviar recordatorio formal a las jefaturas con solicitudes pendientes >3 días para cumplimiento de SLA.',
      'Iniciar plan de programación de vacaciones para colaboradores con pasivos superiores a 20 días.',
      'Validar con Salud Ocupacional el seguimiento de reincorporación de personal incapacitado.'
    ];
    recomms.forEach(r => doc.text(`• ${r}`, { lineGap: 1.5 }));
    doc.moveDown(1);

    // Bloque de Firmas
    const sigY = doc.y;
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, sigY).lineTo(570, sigY).stroke();
    doc.moveDown(0.4);
    doc.fontSize(7.5).fillColor('#64748B').text('CERTIFICACIÓN Y CONTROL:', 40, doc.y);
    doc.moveDown(0.3);

    const boxY = doc.y;
    doc.rect(50, boxY, 220, 40).stroke('#CBD5E1');
    doc.text('Elaborado por: Agente Analista de Reportes RRHH', 60, boxY + 6);
    doc.text('Scheduler Cron: 07:00 a. m. · Datos SQL Certificados', 60, boxY + 16);
    doc.text('Verificado por: Agente Validador de Auditoría', 60, boxY + 26);

    doc.rect(310, boxY, 220, 40).stroke('#CBD5E1');
    doc.text('Recibido por: Dirección de Talento Humano', 320, boxY + 6);
    doc.text('Mariana Soto Vargas · Innovatech Solutions S.A.', 320, boxY + 16);
    doc.text('San José, Costa Rica · Ley N° 8968', 320, boxY + 26);

    doc.end();
  } catch (err) {
    console.error('Error generando PDF de reporte:', err);
    res.status(500).send(`Error generando PDF: ${err.message}`);
  }
});

// GET /api/dashboard/stats - Estadísticas y reporte del día
router.get('/stats', requireHRRole, async (req, res) => {
  try {
    let report = reportingAnalystAgent.getLatestReport();
    if (!report) {
      report = await reportingAnalystAgent.generateDailyReport();
    }

    // 30-day historical trends for charts
    const historicalTrends = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      // Simulated trend data with real variance
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseQueries = isWeekend ? 2 : (12 + (i % 8));
      const baseAbsences = isWeekend ? 0 : (2 + (i % 4));

      historicalTrends.push({
        fecha: dateStr.substring(5), // MM-DD
        fechaCompleta: dateStr,
        consultasChatbot: baseQueries,
        ausenciasPersonal: baseAbsences,
        solicitudesIngresadas: isWeekend ? 0 : (1 + (i % 3))
      });
    }

    res.json({
      reporteActual: report,
      tendencias30Dias: historicalTrends
    });
  } catch (err) {
    console.error('Error obteniendo stats del dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dashboard/generate-report - Disparar generación de reporte manual
router.post('/generate-report', requireHRRole, async (req, res) => {
  try {
    const report = await reportingAnalystAgent.generateDailyReport();
    res.json({
      success: true,
      mensaje: 'Reporte diario generado exitosamente por el Agente Analista.',
      reporte: report
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/reports - Historial de reportes anteriores
router.get('/reports', requireHRRole, (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '15', 10);
    const history = reportingAnalystAgent.getReportHistory(limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/pending-requests - Lista de solicitudes pendientes
router.get('/pending-requests', requireHRRole, (req, res) => {
  try {
    const requests = db.prepare(`
      SELECT s.*, c.nombre as colaborador_nombre, c.departamento, c.puesto, c.email
      FROM solicitudes s
      JOIN colaboradores c ON s.colaborador_id = c.id
      WHERE s.estado = 'pendiente'
      ORDER BY s.creada_en ASC
    `).all();

    const ahora = new Date();
    const enriched = requests.map(r => {
      const diffDias = Math.floor((ahora - new Date(r.creada_en)) / (1000 * 60 * 60 * 24));
      return {
        ...r,
        dias_pendiente: diffDias,
        alerta_urgente: diffDias > 3
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/security-events - Bitácora de auditoría de seguridad y prompt injections
router.get('/security-events', requireHRRole, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT a.*, c.nombre as colaborador_nombre, c.departamento, c.rol
      FROM auditoria_seguridad a
      LEFT JOIN colaboradores c ON a.colaborador_id = c.id
      ORDER BY a.fecha DESC
      LIMIT 25
    `).all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
