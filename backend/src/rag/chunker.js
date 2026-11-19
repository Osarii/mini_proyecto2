/**
 * Document chunker for Markdown, PDF, and CSV files.
 * Chunks documents to 500-1000 tokens preserving header hierarchy and rich metadata.
 */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Approximate token count (roughly 1 token per 4 characters or ~0.75 words per token in Spanish)
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.trim().split(/\s+/).length * 1.3);
}

/**
 * Extract metadata headers from Markdown policy files
 */
function extractMarkdownMetadata(content) {
  const meta = {
    titulo: 'Política de Recursos Humanos',
    codigo: 'POL-RRHH',
    version: '1.0',
    fecha_vigencia: '2026-01-01',
    responsable: 'Gestión del Talento Humano',
    enlace_drive: '/drive/view'
  };

  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) meta.titulo = titleMatch[1].trim();

  const codeMatch = content.match(/\*\*Código:\*\*\s*(.+)$/m);
  if (codeMatch) meta.codigo = codeMatch[1].trim();

  const versionMatch = content.match(/\*\*Versión:\*\*\s*(.+)$/m);
  if (versionMatch) meta.version = versionMatch[1].trim();

  const vigenciaMatch = content.match(/\*\*Fecha de Vigencia:\*\*\s*(.+)$/m);
  if (vigenciaMatch) meta.fecha_vigencia = vigenciaMatch[1].trim();

  const respMatch = content.match(/\*\*Responsable:\*\*\s*(.+)$/m);
  if (respMatch) meta.responsable = respMatch[1].trim();

  const linkMatch = content.match(/\*\*Enlace a Google Drive:\*\*\s*(.+)$/m);
  if (linkMatch) meta.enlace_drive = linkMatch[1].trim();

  return meta;
}

/**
 * Chunk markdown text by ## and ### headers
 */
function chunkMarkdown(filename, content) {
  const metadata = extractMarkdownMetadata(content);
  const chunks = [];
  
  // Split content by markdown section headers
  const sections = content.split(/\n(?=##\s+)/);
  
  sections.forEach((section, idx) => {
    const trimmed = section.trim();
    if (!trimmed) return;
    
    // Extract section heading
    const headerMatch = trimmed.match(/^##\s+(.+)$/m);
    const seccionNombre = headerMatch ? headerMatch[1].trim() : (idx === 0 ? 'Encabezado y Metadatos' : `Sección ${idx}`);
    
    // Check token length; if it exceeds 1000 tokens, sub-chunk by paragraphs
    const tokens = estimateTokens(trimmed);
    if (tokens <= 1000) {
      chunks.push({
        documento_id: filename,
        titulo: metadata.titulo,
        codigo: metadata.codigo,
        version: metadata.version,
        responsable: metadata.responsable,
        seccion: seccionNombre,
        enlace_drive: metadata.enlace_drive,
        contenido: trimmed,
        tokens
      });
    } else {
      // Split large section by paragraphs or subsections
      const paragraphs = trimmed.split(/\n\n+/);
      let buffer = '';
      let subIdx = 1;

      paragraphs.forEach((p) => {
        if (estimateTokens(buffer + '\n\n' + p) > 800) {
          if (buffer.trim()) {
            chunks.push({
              documento_id: filename,
              titulo: metadata.titulo,
              codigo: metadata.codigo,
              version: metadata.version,
              responsable: metadata.responsable,
              seccion: `${seccionNombre} (Parte ${subIdx})`,
              enlace_drive: metadata.enlace_drive,
              contenido: buffer.trim(),
              tokens: estimateTokens(buffer)
            });
            subIdx++;
            buffer = p;
          }
        } else {
          buffer = buffer ? buffer + '\n\n' + p : p;
        }
      });

      if (buffer.trim()) {
        chunks.push({
          documento_id: filename,
          titulo: metadata.titulo,
          codigo: metadata.codigo,
          version: metadata.version,
          responsable: metadata.responsable,
          seccion: `${seccionNombre} (Parte ${subIdx})`,
          enlace_drive: metadata.enlace_drive,
          contenido: buffer.trim(),
          tokens: estimateTokens(buffer)
        });
      }
    }
  });

  return chunks;
}

/**
 * Chunk CSV payroll calendar
 */
function chunkCsv(filename, content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const rows = lines.slice(1);
  const chunks = [];

  // Group calendar rows into quarters or manageable chunks
  const chunkSize = 6; // 6 payroll periods per chunk (quarter)
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const chunkText = [
      `POL-05: Calendario Oficial de Pagos de Planilla y Aguinaldo 2026 (Registros ${i + 1} a ${i + slice.length})`,
      `Documento: POL-05-Calendario-Pagos-Planilla-2026.csv`,
      `Responsable: Lic. Roberto Mora Solano (Jefe de Compensación y Planilla)`,
      `Enlace Drive: https://drive.google.com/file/d/1E_calendario_planilla_2026/view`,
      '',
      `Columnas: ${headers.join(' | ')}`,
      ...slice.map(r => r.split(',').join(' | '))
    ].join('\n');

    chunks.push({
      documento_id: filename,
      titulo: 'Calendario Oficial de Pagos de Planilla y Aguinaldo 2026',
      codigo: 'POL-RRHH-05-CAL',
      version: '2.3',
      responsable: 'Lic. Roberto Mora Solano - Jefe de Compensación y Planilla',
      seccion: `Cronograma de Pagos y Cortes (Lote ${Math.floor(i / chunkSize) + 1})`,
      enlace_drive: '/drive/view/POL-05-Calendario-Pagos-Planilla-2026.csv',
      contenido: chunkText,
      tokens: estimateTokens(chunkText)
    });
  }

  return chunks;
}

/**
 * Chunk PDF policy document using pdf-parse
 */
async function chunkPdf(filename, filePath) {
  try {
    const pdfParseModule = require('pdf-parse');
    const fileBuffer = fs.readFileSync(filePath);
    let fullText = '';

    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(new Uint8Array(fileBuffer));
      await parser.load();
      const textResult = await parser.getText();
      if (textResult && textResult.pages) {
        fullText = textResult.pages.map(p => p.text).join('\n\n');
      }
    } else if (typeof pdfParseModule === 'function') {
      const parsed = await pdfParseModule(fileBuffer);
      fullText = parsed.text || '';
    }

    if (!fullText) {
      // Fallback: If PDF text parsing returns empty, read markdown companion
      const mdCompanion = filePath.replace(/\.pdf$/i, '.md');
      if (fs.existsSync(mdCompanion)) {
        fullText = fs.readFileSync(mdCompanion, 'utf8');
      }
    }

    const metadata = extractMarkdownMetadata(fullText);
    if (!metadata.titulo || metadata.titulo === 'Política de Recursos Humanos') {
      metadata.titulo = 'Política Corporativa de Vacaciones Anuales y Feriados';
      metadata.codigo = 'POL-RRHH-01';
      metadata.version = '2.4';
      metadata.responsable = 'Mariana Soto Vargas - Directora de Gestión del Talento Humano';
      metadata.enlace_drive = '/drive/view/POL-01-Vacaciones-y-Feriados.pdf';
    }

    // Split into sections by numbered points (e.g. "1. Propósito", "2. Marco Jurídico", etc.)
    const sectionParts = fullText.split(/\n(?=[0-9]\.\s+[A-ZÁÉÍÓÚ])/);
    const chunks = [];

    sectionParts.forEach((part, index) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const headerMatch = trimmed.match(/^([0-9]\.\s+[^\n]+)/);
      const seccion = headerMatch ? headerMatch[1].trim() : (index === 0 ? 'Encabezado General PDF' : `Sección PDF ${index}`);

      chunks.push({
        documento_id: filename,
        titulo: metadata.titulo,
        codigo: metadata.codigo,
        version: metadata.version,
        responsable: metadata.responsable,
        seccion,
        enlace_drive: metadata.enlace_drive,
        contenido: trimmed,
        tokens: estimateTokens(trimmed)
      });
    });

    return chunks;
  } catch (err) {
    console.warn(`PDF parsing fallback for ${filename}:`, err.message);
    const mdCompanion = filePath.replace(/\.pdf$/i, '.md');
    if (fs.existsSync(mdCompanion)) {
      const content = fs.readFileSync(mdCompanion, 'utf8');
      return chunkMarkdown(filename, content);
    }
    return [];
  }
}

/**
 * Universal document parser and chunker
 */
async function parseAndChunkFile(filePath) {
  const filename = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.md' || ext === '.txt') {
    const content = fs.readFileSync(filePath, 'utf8');
    return chunkMarkdown(filename, content);
  } else if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf8');
    return chunkCsv(filename, content);
  } else if (ext === '.pdf') {
    return await chunkPdf(filename, filePath);
  }
  return [];
}

module.exports = {
  parseAndChunkFile,
  chunkMarkdown,
  chunkCsv,
  chunkPdf,
  estimateTokens,
};
