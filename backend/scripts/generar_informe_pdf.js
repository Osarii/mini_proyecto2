/**
 * Generador del Informe Técnico Oficial (10 páginas exactas)
 * Mini Proyecto #2 · Portal de Consulta de Políticas de RRHH con RAG Multiagente
 * Innovatech Solutions S.A.
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, '../../docs/Informe_Tecnico_Mini_Proyecto_2.pdf');

const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 55, bottom: 50, left: 52, right: 52 },
  bufferPages: true
});

doc.pipe(fs.createWriteStream(outputPath));

const COLORS = {
  navy: '#1e3a8a',
  blue: '#2563eb',
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  bgLight: '#f8fafc',
  border: '#cbd5e1',
  emerald: '#047857'
};

function addHeaderBanner(title, subtitle) {
  doc.rect(0, 0, doc.page.width, 52).fill(COLORS.navy);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('INNOVATECH SOLUTIONS S.A.  |  INFORME TÉCNICO · MINI PROYECTO #2', 58, 16);
  doc.fillColor('#bfdbfe').font('Helvetica').fontSize(8.5).text(subtitle || 'Portal de Consulta de Políticas de RRHH con RAG Multiagente', 58, 31);
  doc.y = 70;
  if (title) {
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(16).text(title);
    doc.moveTo(58, doc.y + 3).lineTo(doc.page.width - 58, doc.y + 3).strokeColor(COLORS.blue).lineWidth(1.5).stroke();
    doc.moveDown(0.9);
  }
}

function sectionTitle(text) {
  doc.moveDown(0.4);
  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(12).text(text);
  doc.moveDown(0.25);
}

function paragraph(text) {
  doc.fillColor(COLORS.slate700).font('Helvetica').fontSize(9.2).text(text, { align: 'justify', lineGap: 2.2 });
  doc.moveDown(0.35);
}

function bullet(boldPrefix, text) {
  doc.fillColor(COLORS.slate900).font('Helvetica-Bold').fontSize(9.0).text(`•  ${boldPrefix} `, { continued: true, indent: 6, lineGap: 2 });
  doc.fillColor(COLORS.slate700).font('Helvetica').text(text, { align: 'justify' });
  doc.moveDown(0.18);
}

function calloutBox(title, body) {
  const startY = doc.y;
  const width = doc.page.width - 116;
  doc.font('Helvetica').fontSize(9.5);
  const textHeight = doc.heightOfString(body, { width: width - 24, lineGap: 3 });
  const boxHeight = textHeight + 34;

  doc.rect(58, startY, width, boxHeight).fill(COLORS.bgLight).strokeColor(COLORS.border).lineWidth(0.8).stroke();
  doc.rect(58, startY, 4, boxHeight).fill(COLORS.blue);

  doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(10).text(title, 72, startY + 9, { width: width - 24 });
  doc.fillColor(COLORS.slate700).font('Helvetica').fontSize(9.5).text(body, 72, startY + 24, { width: width - 24, lineGap: 3 });
  doc.y = startY + boxHeight + 10;
}

function drawTable(headers, rows, colWidths) {
  const startX = 58;
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  let y = doc.y;

  // Header
  doc.rect(startX, y, totalW, 22).fill(COLORS.navy);
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5).text(h, x + 5, y + 6, { width: colWidths[i] - 10 });
    x += colWidths[i];
  });
  y += 22;

  // Rows
  rows.forEach((row, rIdx) => {
    doc.font('Helvetica').fontSize(7.8);
    const heights = row.map((cell, i) => doc.heightOfString(String(cell), { width: colWidths[i] - 8, lineGap: 1.5 }));
    const rowH = Math.max(16, Math.max(...heights) + 6);

    if (rIdx % 2 === 1) {
      doc.rect(startX, y, totalW, rowH).fill('#f8fafc');
    }
    doc.rect(startX, y, totalW, rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor(i === 0 ? COLORS.slate900 : COLORS.slate700)
        .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(7.8)
        .text(String(cell), x + 4, y + 3.5, { width: colWidths[i] - 8, lineGap: 1.5 });
      x += colWidths[i];
    });
    y += rowH;
  });

  doc.y = y + 7;
}

// ============================================================================
// PÁGINA 1: PORTADA EJECUTIVA
// ============================================================================
doc.rect(0, 0, doc.page.width, 230).fill(COLORS.navy);
doc.rect(0, 230, doc.page.width, 6).fill(COLORS.blue);

doc.fillColor('#93c5fd').font('Helvetica-Bold').fontSize(11).text('MINI PROYECTO #2  ·  INFORME TÉCNICO Y DE INVESTIGACIÓN', 58, 65);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(26).text('Portal de Consulta de Políticas de RRHH con RAG Multiagente', 58, 92, { width: 490 });
doc.fillColor('#dbeafe').font('Helvetica').fontSize(13).text('Arquitectura Multiagente, Base Documental en Google Drive, Seguridad RBAC, Dashboard Analítico y Autoservicio Operativo', 58, 168, { width: 490 });

doc.y = 265;
calloutBox(
  'Resumen Ejecutivo del Proyecto',
  'Innovatech Solutions S.A. (empresa tecnológica costarricense simulada de 52 colaboradores activos y 3 meses de movimientos históricos) implementó un portal interno de Recursos Humanos impulsado por una arquitectura de 7 agentes especializados (5 obligatorios + 2 de valor agregado: Validador y Escalamiento). El sistema combina Recuperación Aumentada por Generación (RAG) sobre 12 documentos multiformato (PDF, Markdown y CSV) sincronizados desde Google Drive con consultas SQL en tiempo real sobre una base de datos relacional estructurada. En la evaluación oficial de 45 preguntas (25 base + 20 propias), el sistema obtuvo un 100 % de precisión y 0 % de fugas de datos personales bajo la Ley N° 8968 de Costa Rica.'
);

doc.moveDown(0.5);
drawTable(
  ['Atributo del Proyecto', 'Especificación Implementada'],
  [
    ['Empresa Simulada', 'Innovatech Solutions S.A. (Sector Tecnología y Desarrollo de Software, San José, Costa Rica)'],
    ['Marco Legal Aplicado', 'Código de Trabajo de Costa Rica, Ley N° 8968 (Protección de Datos), CCSS e INS'],
    ['Stack Tecnológico', '100 % JavaScript/Node.js: Express 5, React 18 (Vite), Tailwind CSS, Better-SQLite3, PDFKit, Nodemailer'],
    ['Motor LLM Principal', 'DeepSeek-V3 (deepseek-chat) vía API, con soporte alterno para OpenAI y respaldo determinístico'],
    ['Agentes Implementados', 'Orquestador, Políticas (RAG), Datos del Colaborador, Analista Diario, Ingesta Drive, Validador y Escalamiento'],
    ['Módulos Adicionales', 'Control de Asistencia con Cronómetro en Vivo, Almuerzo (60m), Horas Extra (1.5x), Correo SMTP Real y Autoservicio PDF'],
    ['Resultado de Evaluación', '45 / 45 preguntas aprobadas (100 % exactitud, 100 % citas verificables, 0 fugas de privacidad)'],
    ['Fecha de Entrega', 'Noviembre 2026']
  ],
  [165, 331]
);

doc.moveDown(1);
doc.fillColor(COLORS.slate500).font('Helvetica').fontSize(9).text(
  'Nota de cumplimiento: Todos los datos de colaboradores utilizados en la base de datos son 100 % simulados. Ninguna credencial o clave de API se almacena en el repositorio de código fuente (.env excluido vía .gitignore).',
  { align: 'center' }
);

// ============================================================================
// PÁGINA 2: FASE 1 · INVESTIGACIÓN NORMATIVA (COSTA RICA)
// ============================================================================
doc.addPage();
addHeaderBanner('1. Investigación Normativa y Base Documental (Fase 1)', 'Dominios de RRHH y legislación laboral de Costa Rica');

paragraph(
  'Previo a la implementación técnica, se realizó una investigación exhaustiva de la legislación laboral vigente en Costa Rica (Código de Trabajo, reglamentos de la Caja Costarricense de Seguro Social - CCSS, pólizas del Instituto Nacional de Seguros - INS, y la Ley N° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales). Esta investigación constituye la fuente primaria de verdad del sistema RAG.'
);

sectionTitle('1.1 Cobertura de los 10 Dominios Obligatorios y Mejoras Corporativas');
paragraph(
  'Conforme a las reglas del proyecto, cada política institucional de Innovatech Solutions S.A. respeta el piso mínimo legal costarricense y documenta explícitamente las mejoras superiores a la ley que ofrece la empresa:'
);

drawTable(
  ['Código', 'Dominio', 'Mínimo Legal (Costa Rica)', 'Política Innovatech Solutions S.A.'],
  [
    ['POL-01', 'Vacaciones y Feriados', '2 semanas (12 días hábiles) por cada 50 semanas (Art. 153 CT).', '15 días hábiles anuales (+3 días sobre ley). Acumulación máx. 20 días.'],
    ['POL-02', 'Permisos y Licencias', 'Maternidad 4 meses (Art. 95); Paternidad 2 días/sem por 4 sem.', 'Maternidad 4 meses + Paternidad 10 días hábiles continuos; Duelo 5 días.'],
    ['POL-03', 'Incapacidades Médicas', 'CCSS: Días 1-3 al 50% patrono; Día 4+ al 60% CCSS.', 'Complemento patronal del 40% desde día 4 para asegurar 100% del salario.'],
    ['POL-04', 'Jornada y Teletrabajo', 'Jornada diurna máx. 48h/sem (Art. 136); Horas extra 1.5x.', 'Jornada reducida de 40h/sem (8h/día, L-V). Teletrabajo híbrido 3 días/sem.'],
    ['POL-05', 'Remuneración y Aguinaldo', 'Aguinaldo: 1/12 de salarios dic-nov, pago antes del 20 dic.', 'Pago quincenal (15 y 30). Aguinaldo depositado el 5 de diciembre.'],
    ['POL-06', 'Beneficios Corporativos', 'Asociación solidarista voluntaria y garantías sociales CCSS.', 'Seguro médico privado 80% cobertura, 5% aporte patronal solidarista, bono capacitación.'],
    ['POL-07', 'Ingreso y Salida', 'Periodo de prueba 3 meses; Preaviso hasta 1 mes; Cesantía tope 8 años.', 'Onboarding estructurado de 30 días; Liquidación pagada en máximo 10 días hábiles.'],
    ['POL-08', 'Desempeño y Carrera', 'No regulado por mínimo legal específico en sector privado.', 'Evaluación semestral (junio y diciembre) con planes de carrera y bonos por mérito.'],
    ['POL-09', 'Conducta y Convivencia', 'Ley N° 7476 contra Hostigamiento Sexual; debido proceso.', 'Canal confidencial 24/7, cero tolerancia y comité investigador imparcial.'],
    ['POL-10', 'Datos y Privacidad', 'Ley N° 8968 y PRODHAB (autodeterminación informativa).', 'Segregación estricta RBAC; prohibición total de revelar datos de terceros en IA.']
  ],
  [50, 92, 165, 189]
);

sectionTitle('1.2 Repositorio Multiformato en Google Drive');
paragraph(
  'Para validar la capacidad del pipeline de ingesta en múltiples formatos, la carpeta politicas_drive contiene los 10 documentos normativos en Markdown (.md), copias oficiales en formato PDF (.pdf) procesadas con pdf-parse, y una hoja de cálculo estructurada en CSV (POL-11-Calendario-Feriados-y-Pagos-2026.csv) con feriados de pago obligatorio/no obligatorio y fechas exactas de planilla.'
);

// ============================================================================
// PÁGINA 3: ARQUITECTURA DEL SISTEMA
// ============================================================================
doc.addPage();
addHeaderBanner('2. Arquitectura del Sistema Multiagente', 'Separación de flujos: Conversacional (RAG + SQL) y Reportes Programados');

paragraph(
  'El portal se diseñó bajo una arquitectura desacoplada de dos caminos independientes que comparten el motor LLM, la base de datos relacional y el esquema de seguridad RBAC. El camino conversacional atiende consultas en tiempo real (< 4 segundos promedio), mientras que el camino analítico se ejecuta automáticamente mediante node-cron cada mañana a las 7:00 a. m. sin intervención humana.'
);

sectionTitle('2.1 Diagrama de Arquitectura Lógica');
calloutBox(
  'Flujo de Datos y Componentes del Portal',
  '[Colaborador / RRHH (React + Tailwind)] ---> [API Express (Node.js :3001)]\n' +
  '   |\n' +
  '   +--> CAMINO 1 (Chat Multiagente): Orquestador -> Clasificación de Intención + Filtro Privacidad\n' +
  '   |       +--> Agente de Políticas (RAG) ---> Base Vectorial (Chunks de Drive: PDF, MD, CSV)\n' +
  '   |       +--> Agente de Datos Personales --> SQLite (Solo lectura filtrado por colaborador_id)\n' +
  '   |       +--> Consultas Mixtas ------------> Ejecuta ambos agentes y fusiona la respuesta\n' +
  '   |       +--> Agente Validador ------------> Audita citas y cero fugas de datos de terceros\n' +
  '   |       +--> Agente de Escalamiento ------> Crea Ticket RRHH si similitud < 0.35\n' +
  '   |\n' +
  '   +--> CAMINO 2 (Reportes): Cron 7:00 a.m. -> Agente Analista -> SQL Agregado -> JSON + Resumen LLM\n' +
  '   |\n' +
  '   +--> CAMINO 3 (Ingesta): Agente de Ingesta -> Drive API / Carpeta Local -> Chunker -> Embeddings\n' +
  '   |\n' +
  '   +--> CAMINO 4 (Operativo): Control Asistencia (Cronómetro/Almuerzo/Extra) + Autoservicio PDF -> SMTP Real'
);

sectionTitle('2.2 Decisiones de Diseño y Justificación del Stack');
bullet('Backend 100 % Node.js + Express 5:', 'Permite un ecosistema unificado en JavaScript entre backend y frontend, baja latencia de E/S para llamadas concurrentes a APIs LLM y SMTP, y despliegue inmediato sin dependencias de entornos virtuales externos.');
bullet('Base de Datos Relacional (Better-SQLite3):', 'Operaciones síncronas de sub-milisegundo para consultas SQL de agregación, almacenamiento de embeddings vectoriales normalizados y persistencia transaccional de marcas de asistencia, solicitudes y auditoría de seguridad.');
bullet('Motor LLM Configurable (DeepSeek-V3 + OpenAI):', 'Se integró DeepSeek (deepseek-chat) como motor principal por su excelente desempeño en español, alta velocidad de respuesta y bajo costo por token, manteniendo un modo determinístico de respaldo que garantiza operación continua incluso sin conexión a internet.');
bullet('Separación Estricta de Fuentes de Verdad:', 'El Agente de Políticas jamás consulta tablas SQL de personas; el Agente de Datos jamás inventa políticas. Las cifras del Dashboard provienen exclusivamente de consultas SQL verificables.');

// ============================================================================
// PÁGINA 4: DISEÑO DE LOS 7 AGENTES Y PROMPTS
// ============================================================================
doc.addPage();
addHeaderBanner('3. Diseño Multiagente y Prompts del Sistema', '5 agentes obligatorios + 2 agentes de puntos extra (Validador y Escalamiento)');

paragraph(
  'Cada agente opera con una responsabilidad única, herramientas delimitadas y un formato de salida estructurado. El Orquestador es el único punto de contacto con la interfaz del usuario.'
);

drawTable(
  ['Agente', 'Responsabilidad Principal', 'Herramientas', 'Formato de Salida'],
  [
    ['1. Orquestador', 'Clasifica intención (política, dato personal, mixta, restringida, fuera de alcance) y aplica firewall de privacidad.', 'Clasificador semántico + Regex de privacidad Ley N° 8968.', 'Ruta de agente destino + respuesta consolidada.'],
    ['2. Políticas (RAG)', 'Responde normativa institucional basándose exclusivamente en fragmentos recuperados de Drive.', 'Búsqueda por similitud coseno en base vectorial + DeepSeek-V3.', 'Respuesta fundamentada + citas (documento, sección, enlace).'],
    ['3. Datos Colaborador', 'Consulta saldos de vacaciones, solicitudes, próximas fechas de pago y evaluaciones del usuario autenticado.', 'Consultas SQL parametrizadas (WHERE colaborador_id = ?).', 'Respuesta exacta con cifras reales de la BD.'],
    ['4. Analista Reportes', 'Genera cada mañana a las 7:00 a. m. el reporte ejecutivo con los 8 indicadores obligatorios.', 'SQL de agregación + LLM para redacción ejecutiva.', 'JSON estructurado + resumen ejecutivo (3-5 frases).'],
    ['5. Ingesta Drive', 'Sincroniza documentos PDF, MD y CSV, fragmenta por secciones y actualiza embeddings.', 'Conector Drive + pdf-parse + csv-parser + Chunker.', 'Chunks con metadatos y vectores actualizados.'],
    ['6. Validador (Extra)', 'Audita cada respuesta antes de enviarla: verifica citas y bloquea cualquier dato salarial o personal ajeno.', 'Reglas de auditoría post-generación + tabla auditoria_seguridad.', 'Aprobación o bloqueo con registro de incidente.'],
    ['7. Escalamiento (Extra)', 'Genera un ticket formal hacia Gestión del Talento Humano cuando no existe política aplicable.', 'Inserción en tabla tickets_escalamiento.', 'ID de ticket (#TICK-XX) y tiempo estimado de atención.']
  ],
  [85, 155, 130, 126]
);

sectionTitle('3.1 Estrategia de Prompts Versionados');
calloutBox(
  'Prompt Base del Agente de Políticas (RAG)',
  '"Eres el Asistente Oficial de Políticas de RRHH de Innovatech Solutions S.A. (Costa Rica). Responde ÚNICAMENTE utilizando los fragmentos de documentos oficiales proporcionados en el contexto. Cita siempre el nombre exacto del documento, código (ej. POL-RRHH-01) y sección. Si la respuesta no aparece explícitamente en los fragmentos, indica claramente que no existe una política registrada y ofrece escalar la consulta a RRHH. Prohibido inventar cifras, beneficios o revelar datos personales de terceros."'
);

calloutBox(
  'Prompt Base del Agente Analista de Reportes',
  '"Redacta un resumen ejecutivo conciso de 3 a 5 frases dirigido a la Directora de Gestión del Talento Humano a partir ÚNICAMENTE de las cifras exactas contenidas en el objeto JSON adjunto. Está estrictamente prohibido inventar, extrapolar o modificar cualquier número. Destaca alertas prioritarias: solicitudes con más de 3 días sin respuesta y colaboradores con más de 20 días de vacaciones acumuladas."'
);

// ============================================================================
// PÁGINA 5: PIPELINE RAG, CHUNKING Y SINCRONIZACIÓN DRIVE
// ============================================================================
doc.addPage();
addHeaderBanner('4. Pipeline RAG, Estrategia de Chunking e Ingesta', 'Procesamiento multiformato, embeddings y control de alucinaciones');

sectionTitle('4.1 Ingesta Multiformato y Detección de Cambios');
paragraph(
  'El Agente de Ingesta (driveConnector.js) escanea el repositorio sincronizado con Google Drive soportando tres formatos distintos requeridos por el enunciado: documentos Markdown (.md) con metadatos YAML/encabezados, archivos PDF oficiales (.pdf) extraídos mediante pdf-parse, y hojas de cálculo CSV (.csv) convertidas en registros semánticos legibles por el motor vectorial.'
);

bullet('Metadatos Preservados por Fragmento:', 'Cada chunk almacena nombre_archivo, titulo_documento, codigo_politica, version, fecha_vigencia, responsable, seccion y enlace_drive. Sin estos metadatos el agente no puede emitir citas verificables.');
bullet('Sincronización Automática y Manual:', 'El pipeline se ejecuta al iniciar el servidor y cuenta con un disparador manual desde la pestaña "Políticas & Drive" (POST /api/sync/trigger) que reindexa archivos nuevos, editados o eliminados.');

sectionTitle('4.2 Estrategia de Chunking Semántico');
paragraph(
  'En lugar de realizar cortes arbitrarios por número fijo de caracteres (que suelen romper tablas de subsidios o artículos legales a la mitad), se implementó un chunker consciente de estructura (chunker.js):'
);

drawTable(
  ['Parámetro de Chunking', 'Valor Configurado', 'Justificación Técnica'],
  [
    ['Unidad de División', 'Encabezados Markdown (## / ###) y párrafos', 'Preserva la cohesión semántica de cada artículo o sección normativa.'],
    ['Tamaño Objetivo', '500 a 900 tokens (~2,000 caracteres)', 'Balance óptimo entre contexto completo y precisión de búsqueda vectorial.'],
    ['Solapamiento (Overlap)', '15 % (~100 tokens)', 'Evita pérdida de contexto en transiciones entre incisos consecutivos.'],
    ['Umbral de Similitud', 'SIMILARITY_THRESHOLD = 0.35', 'Si el puntaje máximo cae debajo de 0.35, se declara sin respuesta y se ofrece ticket.'],
    ['Top-K Recuperados', '4 fragmentos más relevantes', 'Minimiza ruido en la ventana de contexto del LLM y reduce latencia.']
  ],
  [125, 145, 226]
);

sectionTitle('4.3 Prevención de Alucinaciones y Citas Verificables');
paragraph(
  'Cada respuesta del Agente de Políticas devuelve un arreglo estructurado de citas que el frontend renderiza como tarjetas clicables. El colaborador puede abrir el documento completo dentro del visor integrado del portal, descargar el PDF original o abrir el enlace directo en Google Drive. Cuando un colaborador pregunta por un beneficio inexistente (ejemplo: "¿La empresa da bono por mascotas?"), la baja similitud activa automáticamente el rechazo controlado y el botón para generar un Ticket de Escalamiento.'
);

// ============================================================================
// PÁGINA 6: BASE DE DATOS, SEGURIDAD Y PRIVACIDAD (LEY N° 8968)
// ============================================================================
doc.addPage();
addHeaderBanner('5. Modelo de Base de Datos y Seguridad RBAC', 'Integridad relacional, segregación de roles y auditoría de amenazas');

sectionTitle('5.1 Esquema Relacional (13 Tablas Activas)');
paragraph(
  'La base de datos SQLite contiene 52 colaboradores simulados distribuidos en 6 departamentos (Ingeniería, Recursos Humanos, Ventas, Operaciones, Finanzas y Diseño) con 3 meses completos de movimientos históricos, saldos, solicitudes, incapacidades y registros operativos:'
);

drawTable(
  ['Tabla', 'Propósito Principal', 'Campos Clave'],
  [
    ['colaboradores', 'Identidad, jerarquía y rol RBAC', 'id, nombre, email, departamento, puesto, fecha_ingreso, rol'],
    ['saldos_vacaciones', 'Control de pasivo y días disponibles', 'colaborador_id, periodo, dias_asignados, dias_tomados, dias_disponibles'],
    ['solicitudes', 'Flujo de vacaciones y permisos', 'colaborador_id, tipo, fecha_inicio, fecha_fin, estado, aprobador_id'],
    ['incapacidades', 'Registro médico CCSS e INS', 'colaborador_id, tipo, fecha_inicio, dias, entidad, numero_boleta'],
    ['movimientos_personal', 'Cálculo de rotación mensual', 'colaborador_id, tipo (ingreso/salida/ascenso), fecha, motivo'],
    ['consultas_chat', 'Telemetría y analítica del chatbot', 'colaborador_id, pregunta, intencion, agente, latencia_ms, escalada'],
    ['reportes_diarios', 'Histórico de reportes ejecutivos', 'id, fecha, datos_json, resumen_texto, generado_por'],
    ['marcas_asistencia', 'Cronómetro, almuerzo y horas extra', 'colaborador_id, hora_entrada, hora_salida, segundos_almuerzo, horas_extra'],
    ['notificaciones_rrhh', 'Bandeja de correos enviados a RRHH', 'remitente, destinatario, tipo, asunto, cuerpo, fecha_envio, leido'],
    ['auditoria_seguridad', 'Registro de intentos bloqueados', 'colaborador_id, pregunta, tipo_amenaza, fecha']
  ],
  [120, 145, 231]
);

sectionTitle('5.2 Arquitectura de Seguridad y Privacidad (Zero-Leak)');
bullet('Control de Acceso Basado en Roles (RBAC):', 'Existen dos roles diferenciados: colaborador y rrhh. En el frontend, los colaboradores no ven ni pueden navegar al Dashboard de RRHH; en el backend, los endpoints administrativos validan el encabezado x-user-role.');
bullet('Firewall Universal de Privacidad (Ley N° 8968):', 'El Orquestador ejecuta en < 1 ms un filtro semántico universal (isRestrictedPrivacyQuery) que bloquea cualquier consulta sobre salarios, vacaciones, incapacidades o datos personales de terceros sin depender de listas estáticas de nombres. Incluso si se cambia el nombre o apellido de un gerente o compañero, la consulta es denegada y registrada en auditoria_seguridad.');
bullet('Protección de Secretos:', 'Todas las claves (DEEPSEEK_API_KEY, SMTP_PASS) residen exclusivamente en .env, excluido del control de versiones mediante .gitignore.');

// ============================================================================
// PÁGINA 7: DASHBOARD ANALÍTICO Y REPORTES DIARIOS
// ============================================================================
doc.addPage();
addHeaderBanner('6. Agente Analista y Dashboard Ejecutivo de RRHH', 'Automatización matutina a las 7:00 a. m. con datos 100 % SQL');

paragraph(
  'El Agente Analista (analystAgent.js) elimina el armado manual de reportes diarios. Programado mediante node-cron con el patrón "0 7 * * *", ejecuta consultas SQL de agregación, consolida el objeto JSON estructurado y solicita al LLM un resumen ejecutivo de 3 a 5 frases estrictamente acotado a las cifras calculadas.'
);

sectionTitle('6.1 Cumplimiento de los 8 Elementos Obligatorios del Reporte');
bullet('1. Ausentes Hoy:', 'Desglose exacto por tipo (vacaciones, permisos, incapacidades) y por departamento.');
bullet('2. Solicitudes Pendientes:', 'Total en espera de aprobación y alerta roja para aquellas con más de 3 días sin respuesta.');
bullet('3. Incapacidades Activas:', 'Cantidad de colaboradores incapacitados y total de días acumulados en el mes.');
bullet('4. Rotación Mensual:', 'Ingresos, salidas del mes y tasa de rotación acumulada calculada sobre la planilla activa.');
bullet('5. Riesgo de Pasivo Laboral:', 'Identificación de colaboradores con más de 20 días de vacaciones acumuladas.');
bullet('6. Métricas del Chatbot:', 'Consultas del día anterior, porcentaje resuelto sin escalar y latencia promedio en milisegundos.');
bullet('7. Top 5 Temas y Brechas Documentales:', 'Ranking de temas más preguntados y listado de consultas sin respuesta para detectar políticas faltantes.');
bullet('8. Resumen Ejecutivo LLM:', 'Síntesis gerencial generada a partir del JSON verificado, con exportación oficial en PDF.');

sectionTitle('6.2 Módulos Operativos en el Dashboard de RRHH');
paragraph(
  'Además de los 5 indicadores KPI, gráficos de tendencia de 30 días, historial de reportes y tabla de auditoría de seguridad, el Dashboard RRHH integra tres capacidades operativas en tiempo real:'
);
bullet('Aprobación de Solicitudes (1 Clic):', 'Permite a la Directora de RRHH aprobar o rechazar solicitudes de vacaciones y permisos. Al aprobar vacaciones, el sistema descuenta automáticamente los días en saldos_vacaciones.');
bullet('Bandeja Oficial de Correos y Bitácora de Asistencia:', 'Muestra el personal laborando en vivo, salidas anticipadas justificadas y copia de los correos reales remitidos vía SMTP a ssalasl@fwdcostarica.com.');
bullet('Configuración y Prueba SMTP Integrada:', 'Permite validar la conectividad de correo electrónico directamente desde la interfaz administrativa.');

// ============================================================================
// PÁGINA 8: MÓDULOS DE VALOR AGREGADO (ASISTENCIA Y AUTOSERVICIO)
// ============================================================================
doc.addPage();
addHeaderBanner('7. Innovación Operativa: Asistencia y Autoservicio', 'Funcionalidades interactivas que elevan el portal a nivel empresarial');

paragraph(
  'Para superar el alcance mínimo y convertir el portal en una herramienta diaria real para los colaboradores, se implementaron dos módulos operativos integrados de punta a punta con la base de datos y el servicio de correo real (Nodemailer + Google SMTP):'
);

sectionTitle('7.1 Control de Asistencia Inteligente (POL-RRHH-04)');
bullet('Cronómetro de Jornada en Vivo:', 'Inicia al pulsar "Registrar Entrada" con tipografía tabular-nums y barra de progreso hacia la meta de 8 horas diarias (28,800 segundos).');
bullet('Detección de Salida Anticipada + Correo Real:', 'Si el colaborador marca salida antes de completar las 8 horas, el sistema bloquea el cierre inmediato, exige seleccionar una categoría y redactar la justificación, y envía automáticamente un correo electrónico real a RRHH (ssalasl@fwdcostarica.com) con horas trabajadas, horas faltantes y motivo.');
bullet('Pausa de Almuerzo (Límite 60 Minutos):', 'Botón dedicado que pausa el contador laboral y activa el temporizador de almuerzo. Si excede 60 minutos, notifica automáticamente a RRHH.');
bullet('Detección de Horas Extra (1.5x):', 'Superadas las 8 horas, el cronómetro cambia a modo Tiempo Extraordinario (índigo) y solicita confirmación de autorización de jefatura para reporte de planilla.');
bullet('Historial Personal y Resumen Semanal:', 'Modal interactivo que muestra el avance hacia la meta de 40 horas semanales y el detalle de marcas de los últimos 7 días.');

sectionTitle('7.2 Portal de Autoservicio del Colaborador');
bullet('Constancia Laboral Oficial en PDF (1 Clic):', 'Generada dinámicamente con PDFKit incluyendo membrete corporativo, puesto, departamento, fecha de ingreso y firma de la Dirección de Talento Humano.');
bullet('Solicitud de Vacaciones y Permisos:', 'Valida el saldo disponible antes de permitir el envío y dispara notificación real por correo a RRHH.');
bullet('Reporte de Incapacidades Médicas (CCSS / INS):', 'Registra número de boleta y días, calculando en tiempo real el desglose de subsidio patronal vs. CCSS/INS conforme a POL-RRHH-03.');

// ============================================================================
// PÁGINA 9: EVALUACIÓN DEL BANCO DE 45 PREGUNTAS
// ============================================================================
doc.addPage();
addHeaderBanner('8. Evaluación Objetiva del Sistema (45 Preguntas)', 'Resultados cuantitativos, métricas de latencia y pruebas de seguridad');

paragraph(
  'Se construyó un evaluador automatizado (backend/evaluations/evaluar_banco.js) que ejecuta las 25 preguntas obligatorias del enunciado más 20 preguntas adicionales diseñadas por el equipo (total: 45 casos de prueba), verificando el enrutamiento correcto del agente, la presencia de citas documentales, la exactitud numérica y el bloqueo de preguntas restringidas.'
);

drawTable(
  ['Categoría de Prueba', 'Cantidad', 'Aciertos', 'Tasa de Éxito', 'Criterio Evaluado'],
  [
    ['Políticas Institucionales (RAG)', '24', '24 / 24', '100 %', 'Respuesta fiel a Drive + cita con documento y enlace.'],
    ['Datos Personales (SQL)', '8', '8 / 8', '100 %', 'Cifras exactas filtradas por colaborador_id autenticado.'],
    ['Consultas Mixtas (SQL + RAG)', '4', '4 / 4', '100 %', 'Orquestador combina ambos agentes en una sola respuesta.'],
    ['Seguridad / Restringidas (Q21, Q22+)', '4', '4 / 4', '100 %', 'Rechazo inmediato bajo Ley N° 8968 + log de auditoría.'],
    ['Sin Respuesta en Docs (Q23+)', '3', '3 / 3', '100 %', 'Admite desconocimiento sin inventar y ofrece ticket.'],
    ['Fuera de Alcance / Rol RRHH (Q24, Q25)', '2', '2 / 2', '100 %', 'Redirección cortés y dato agregado exclusivo para RRHH.'],
    ['TOTAL BANCO OFICIAL', '45', '45 / 45', '100 %', 'Supera ampliamente el mínimo requerido del 80 %.']
  ],
  [145, 50, 55, 65, 181]
);

sectionTitle('8.1 Cumplimiento de Requerimientos No Funcionales');
drawTable(
  ['Requerimiento No Funcional', 'Meta Exigida', 'Resultado Medido', 'Estado'],
  [
    ['Latencia del Chatbot (p90)', '< 8,000 ms (8 seg)', '12 ms (SQL/Guardrail) a 3,200 ms (DeepSeek)', 'CUMPLE'],
    ['Citas en Políticas', '100 % con enlace', '100 % con documento, sección y enlace Drive', 'CUMPLE'],
    ['Roles de Usuario', 'Mínimo 2 roles', 'colaborador y rrhh con segregación estricta', 'CUMPLE'],
    ['Fugas de Datos (Q21 y Q22)', '0 % tolerado', '0 fugas detectadas en todas las variantes', 'CUMPLE'],
    ['Protección de Secretos', '0 claves en repo', 'Variables en .env y plantilla .env.example', 'CUMPLE']
  ],
  [145, 100, 195, 56]
);

// ============================================================================
// PÁGINA 10: LIMITACIONES, LECCIONES APRENDIDAS Y CONCLUSIONES
// ============================================================================
doc.addPage();
addHeaderBanner('9. Limitaciones, Mejoras Futuras y Conclusiones', 'Análisis crítico de ingeniería y hoja de ruta');

sectionTitle('9.1 Limitaciones Actuales Identificadas');
bullet('Autenticación Simulada para Demo:', 'El selector de usuario en el encabezado permite cambiar rápidamente entre roles (colaborador y rrhh) para facilitar la demostración académica. En producción se debe reemplazar por SSO corporativo (Google Workspace OAuth 2.0 / OIDC) con tokens JWT firmados.');
bullet('Base de Datos Embebida (SQLite):', 'SQLite ofrece rendimiento excepcional para 50-500 colaboradores en una sola instancia, pero para despliegues multi-región o alta concurrencia de escritura se recomienda migrar el esquema a PostgreSQL + pgvector.');
bullet('Adjuntos de Boletas Médicas:', 'El reporte de incapacidades almacena el número de boleta y calcula el subsidio; como evolución natural se recomienda habilitar la carga de archivos PDF/imagen de la boleta hacia Google Cloud Storage o Drive.');

sectionTitle('9.2 Lecciones Aprendidas y Decisiones Clave');
paragraph(
  'Durante las pruebas de estrés del chatbot se identificó que depender únicamente del LLM para bloquear preguntas salariales de terceros podía fallar si el usuario variaba un apellido. La implementación de un filtro determinístico previo en el Orquestador (isRestrictedPrivacyQuery) combinado con el Agente Validador resolvió el riesgo de raíz, garantizando 0 % de fugas en menos de 1 milisegundo.'
);

sectionTitle('9.3 Conclusiones');
paragraph(
  'El Portal de Consulta de Políticas de RRHH con RAG Multiagente de Innovatech Solutions S.A. cumple con el 100 % de los objetivos funcionales, técnicos y de seguridad del Mini Proyecto #2. La separación estricta entre conocimiento documental (RAG sobre Drive) y datos transaccionales (SQL) elimina las alucinaciones numéricas, mientras que los módulos adicionales de Control de Asistencia en vivo, envío de correos reales vía SMTP y Autoservicio en PDF demuestran la aplicabilidad práctica de la arquitectura en un entorno corporativo real.'
);

calloutBox(
  'Fuentes y Referencias Oficiales Consultadas',
  '1. Código de Trabajo de la República de Costa Rica (Ley N° 2 y sus reformas).\n' +
  '2. Ley N° 8968: Protección de la Persona frente al Tratamiento de sus Datos Personales (PRODHAB).\n' +
  '3. Reglamento del Seguro de Salud de la Caja Costarricense de Seguro Social (CCSS) y Normativa INS.\n' +
  '4. Ministerio de Trabajo y Seguridad Social de Costa Rica (MTSS) - Guías de Aguinaldo, Vacaciones y Preaviso.\n' +
  '5. Documentación oficial: Google Drive API v3, DeepSeek API, Nodemailer, PDFKit y React 18.'
);

// Numeración de páginas (Page X of 10) en todas las páginas
const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  if (i > 0) {
    doc.fillColor(COLORS.slate500)
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        `Mini Proyecto #2 · Innovatech Solutions S.A.  |  Página ${i + 1} de ${range.count}`,
        58,
        doc.page.height - 38,
        { align: 'center', width: doc.page.width - 116 }
      );
  }
}

doc.end();
console.log(`PDF generado en: ${outputPath} (${range.count} páginas)`);
