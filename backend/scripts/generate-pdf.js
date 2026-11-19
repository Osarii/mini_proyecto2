/**
 * Node.js script using PDFKit to generate the official policy PDF:
 * POL-01-Vacaciones-y-Feriados.pdf
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function generatePolicyPDF() {
  const outputDir = path.resolve(__dirname, '../../politicas_drive');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'POL-01-Vacaciones-y-Feriados.pdf');

  const doc = new PDFDocument({ margin: 45, size: 'LETTER' });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Header
  doc.fontSize(10).fillColor('#2563EB').text('INNOVATECH SOLUTIONS S.A. · DEPARTAMENTO DE RECURSOS HUMANOS', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(18).fillColor('#1E3A8A').text('POLÍTICA CORPORATIVA DE VACACIONES Y CALENDARIO DE FERIADOS', { align: 'left' });
  doc.moveDown(0.5);

  // Metadata block
  doc.rect(45, doc.y, 520, 70).fillAndStroke('#F3F4F6', '#D1D5DB');
  const metaY = doc.y + 8;
  doc.fontSize(9).fillColor('#111827');
  doc.text('Código: POL-RRHH-01', 55, metaY);
  doc.text('Versión: 2.4 (Revisión Anual)', 300, metaY);
  doc.text('Fecha de Vigencia: 01 de enero de 2026', 55, metaY + 16);
  doc.text('Responsable: Mariana Soto Vargas (Directora RRHH)', 300, metaY + 16);
  doc.text('Ámbito de Aplicación: Nacional (Costa Rica)', 55, metaY + 32);
  doc.text('Enlace Drive: https://drive.google.com/file/d/1A_vacaciones_feriados_2026/view', 300, metaY + 32);

  doc.y = metaY + 55;
  doc.moveDown(0.8);
  doc.strokeColor('#3B82F6').lineWidth(1.5).moveTo(45, doc.y).lineTo(565, doc.y).stroke();
  doc.moveDown(0.8);

  // Section 1
  doc.fontSize(12).fillColor('#1E3A8A').text('1. Propósito y Alcance');
  doc.moveDown(0.3);
  doc.fontSize(9.5).fillColor('#1F2937').text(
    'La presente política regula de manera integral el derecho, cálculo, devengo, solicitud, disfrute y acumulación ' +
    'de las vacaciones remuneradas y el régimen de feriados oficiales para la totalidad de colaboradores vinculados por ' +
    'contrato de trabajo formal con Innovatech Solutions S.A., cubriendo las modalidades presencial, híbrida y teletrabajo.'
  );
  doc.moveDown(0.8);

  // Section 2
  doc.fontSize(12).fillColor('#1E3A8A').text('2. Marco Jurídico y Beneficio Superior a la Ley');
  doc.moveDown(0.3);
  doc.fontSize(9.5).fillColor('#1F2937').text(
    'El artículo 153 del Código de Trabajo de Costa Rica establece un derecho mínimo de dos (2) semanas laborales (12 días hábiles) ' +
    'de vacaciones por cada cincuenta (50) semanas de labores continuas. Como beneficio institucional superior para favorecer la salud ' +
    'mental y el bienestar de los 250 colaboradores de Innovatech Solutions S.A., la empresa confiere quince (15) días laborales hábiles ' +
    'al año desde el primer año de servicio (1.25 días acumulados por cada mes de labor continua).'
  );
  doc.moveDown(0.8);

  // Section 3
  doc.fontSize(12).fillColor('#1E3A8A').text('3. Reglas de Fraccionamiento, Solicitud y Acumulación');
  doc.moveDown(0.3);
  doc.fontSize(9.5).fillColor('#1F2937');
  doc.text('• Fraccionamiento: Se permite el disfrute fraccionado en periodos mínimos de medio día (0.5) o un día hábil (1.0).');
  doc.text('• Anticipación de solicitud: Para 1 a 2 días se exige aviso de 3 días hábiles; de 3 a 5 días aviso de 5 días hábiles; para más de 5 días continuos se requiere ingresar la solicitud con al menos 10 días hábiles de anticipación.');
  doc.text('• Acumulación: Conforme al Art. 156 del Código de Trabajo, las vacaciones no son compensables en dinero. Se autoriza trasladar un máximo de cinco (5) días hábiles al año inmediato siguiente, debiendo consumirse en el primer trimestre (enero a marzo). Acumulaciones superiores a 20 días constituyen riesgo de pasivo laboral y ameritan plan obligatorio de vacaciones coordinado por RRHH.');
  doc.moveDown(0.8);

  // Section 4
  doc.fontSize(12).fillColor('#1E3A8A').text('4. Calendario Oficial de Feriados Obligatorios y de Empresa 2026');
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#1F2937');
  const feriados = [
    '• 01 de enero: Año Nuevo (Pago obligatorio)',
    '• 02 y 03 de abril: Jueves y Viernes Santo (Pago obligatorio)',
    '• 11 de abril: Batalla de Rivas / Juan Santamaría (Pago obligatorio)',
    '• 01 de mayo: Día Internacional del Trabajo (Pago obligatorio)',
    '• 25 de julio: Anexión de Nicoya a Costa Rica (Pago obligatorio)',
    '• 02 de agosto: Nuestra Señora de los Ángeles (Pago no obligatorio - concedido con salario)',
    '• 15 de agosto: Día de la Madre (Pago obligatorio)',
    '• 31 de agosto: Día de la Persona Negra y Cultura Afrocostarricense (Concedido con salario)',
    '• 15 de septiembre: Independencia de Costa Rica (Pago obligatorio)',
    '• 01 de diciembre: Día de la Abolición del Ejército (Concedido con salario)',
    '• 25 de diciembre: Navidad (Pago obligatorio)'
  ];
  feriados.forEach(f => doc.text(f));
  doc.moveDown(0.8);

  // Section 5
  doc.fontSize(12).fillColor('#1E3A8A').text('5. Procedimiento Operativo de Aprobación');
  doc.moveDown(0.3);
  doc.fontSize(9.5).fillColor('#1F2937').text(
    'Toda solicitud se procesa de forma digital a través del Portal de Autogestión de RRHH. La jefatura inmediata ' +
    'cuenta con un plazo de tres (3) días hábiles para emitir su resolución. En caso de emergencias operativas o periodos ' +
    'críticos de despliegue, la jefatura podrá convenir una reprogramación consensuada con el colaborador.'
  );

  doc.end();
  stream.on('finish', () => {
    console.log('PDF successfully generated with Node.js at:', outputPath);
  });
}

generatePolicyPDF();
