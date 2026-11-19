/**
 * Automatic PDF Generator for all 10 Corporate Policies
 * Uses Node.js + PDFKit to produce official high-fidelity PDFs.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const dir = path.resolve(__dirname, '../../politicas_drive');

function parseMarkdownPolicy(content) {
  let titulo = 'POLÍTICA CORPORATIVA';
  let codigo = 'POL-RRHH';
  let version = '2.0';
  let fechaVigencia = '01 de enero de 2026';
  let responsable = 'Mariana Soto Vargas - Directora de Gestión del Talento Humano';
  let enlaceDrive = '/drive/view';

  const tMatch = content.match(/^#\s+(.+)$/m);
  if (tMatch) titulo = tMatch[1].trim();

  const cMatch = content.match(/\*\*Código:\*\*\s*(.+)$/m);
  if (cMatch) codigo = cMatch[1].trim();

  const vMatch = content.match(/\*\*Versión:\*\*\s*(.+)$/m);
  if (vMatch) version = vMatch[1].trim();

  const fMatch = content.match(/\*\*Fecha de Vigencia:\*\*\s*(.+)$/m);
  if (fMatch) fechaVigencia = fMatch[1].trim();

  const rMatch = content.match(/\*\*Responsable:\*\*\s*(.+)$/m);
  if (rMatch) responsable = rMatch[1].trim();

  const lMatch = content.match(/\*\*Enlace a Google Drive:\*\*\s*(.+)$/m);
  if (lMatch) enlaceDrive = lMatch[1].trim();

  // Split into sections (h2 sections)
  const sections = [];
  const parts = content.split(/\n(?=##\s+)/);

  for (let i = 1; i < parts.length; i++) {
    const rawPart = parts[i].trim();
    const secTitleMatch = rawPart.match(/^##\s+(.+)$/m);
    const secTitle = secTitleMatch ? secTitleMatch[1].trim() : `Sección ${i}`;
    const secBody = rawPart.replace(/^##\s+.+$/m, '').trim();
    sections.push({ title: secTitle, body: secBody });
  }

  return {
    titulo,
    codigo,
    version,
    fechaVigencia,
    responsable,
    enlaceDrive,
    sections
  };
}

function generatePdfForPolicy(mdFilename) {
  return new Promise((resolve, reject) => {
    const mdPath = path.join(dir, mdFilename);
    const pdfFilename = mdFilename.replace(/\.md$/, '.pdf');
    const pdfPath = path.join(dir, pdfFilename);

    const content = fs.readFileSync(mdPath, 'utf8');
    const parsed = parseMarkdownPolicy(content);

    const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Top Header
    doc.fontSize(8.5).fillColor('#1D4ED8').text('INNOVATECH SOLUTIONS S.A. · SISTEMA DE GESTIÓN DE POLÍTICAS DE RRHH', { align: 'left' });
    doc.moveDown(0.2);
    doc.fontSize(16).fillColor('#0F172A').text(parsed.titulo, { align: 'left' });
    doc.moveDown(0.4);

    // Metadata Block
    const metaY = doc.y;
    doc.rect(45, metaY, 520, 65).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fontSize(8.5).fillColor('#334155');
    doc.text(`Código: ${parsed.codigo}`, 55, metaY + 8);
    doc.text(`Versión: ${parsed.version} (Vigente 2026)`, 310, metaY + 8);
    doc.text(`Vigencia: ${parsed.fechaVigencia}`, 55, metaY + 22);
    doc.text(`Responsable: ${parsed.responsable.split('-')[0].trim()}`, 310, metaY + 22);
    doc.text(`Jurisdicción: República de Costa Rica (MTSS / CCSS)`, 55, metaY + 36);
    doc.text(`Repositorio: Google Drive Corporativo`, 310, metaY + 36);

    doc.y = metaY + 75;
    doc.strokeColor('#2563EB').lineWidth(1.5).moveTo(45, doc.y).lineTo(565, doc.y).stroke();
    doc.moveDown(0.6);

    // Render Sections
    parsed.sections.forEach((sec, idx) => {
      // Add page if too low
      if (doc.y > 680) {
        doc.addPage();
      }

      doc.fontSize(11).fillColor('#1E3A8A').text(sec.title);
      doc.moveDown(0.2);

      // Clean markdown body
      const cleanBody = sec.body
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/---/g, '')
        .trim();

      doc.fontSize(9).fillColor('#1E293B').text(cleanBody, {
        align: 'justify',
        lineGap: 2.5
      });
      doc.moveDown(0.6);
    });

    // Formal Signatures Block
    if (doc.y > 640) {
      doc.addPage();
    } else {
      doc.moveDown(1);
    }

    const sigY = doc.y;
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(45, sigY).lineTo(565, sigY).stroke();
    doc.moveDown(0.5);

    doc.fontSize(8.5).fillColor('#64748B').text('APROBACIÓN Y REGISTRO INSTITUCIONAL:', 45, doc.y);
    doc.moveDown(0.5);

    const sigBoxesY = doc.y;
    doc.rect(55, sigBoxesY, 210, 45).stroke('#CBD5E1');
    doc.fontSize(7.5).fillColor('#475569');
    doc.text('Aprobado por: Dirección de Talento Humano', 65, sigBoxesY + 8);
    doc.text('Mariana Soto Vargas · Firma Digital Certificada', 65, sigBoxesY + 20);
    doc.text('Fecha: 01/01/2026 · Sello Electrónico', 65, sigBoxesY + 30);

    doc.rect(320, sigBoxesY, 210, 45).stroke('#CBD5E1');
    doc.text('Visto Bueno: Asesoría Legal Laboral', 330, sigBoxesY + 8);
    doc.text('Lic. Carlos Fernández Castro · Col. Abogados #14892', 330, sigBoxesY + 20);
    doc.text('Conforme al Código de Trabajo de Costa Rica', 330, sigBoxesY + 30);

    doc.end();
    stream.on('finish', () => {
      console.log(`✅ Generado PDF oficial: ${pdfFilename}`);
      resolve(pdfPath);
    });
    stream.on('error', reject);
  });
}

async function main() {
  console.log('Iniciando generación masiva de PDFs oficiales para Innovatech Solutions S.A....');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  for (const f of files) {
    await generatePdfForPolicy(f);
  }

  console.log(`\n🎉 Total generados: ${files.length} documentos PDF corporativos en ${dir}`);
}

main().catch(err => {
  console.error('Error generando PDFs:', err);
  process.exit(1);
});
