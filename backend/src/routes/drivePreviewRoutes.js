const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Helper to escape HTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Simple markdown to HTML parser for official document rendering
function renderMarkdownToHtml(md) {
  let html = escapeHtml(md);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-800 mt-5 mb-2 pb-1 border-b border-slate-200">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-slate-900 mt-6 mb-3 pb-1 border-b-2 border-blue-600">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-slate-900 mb-4 pb-2 border-b-2 border-slate-300 text-center tracking-tight">$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>');

  // Horizontal rule
  html = html.replace(/^---$/gim, '<hr class="my-6 border-slate-300" />');

  // Lists
  html = html.replace(/^\s*[-•]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-700 leading-relaxed my-1">$1</li>');
  html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ml-4 list-decimal text-slate-700 leading-relaxed my-1">$2</li>');

  // Paragraphs
  html = html.split('\n\n').map(p => {
    p = p.trim();
    if (!p) return '';
    if (p.startsWith('<h1') || p.startsWith('<h2') || p.startsWith('<h3') || p.startsWith('<hr') || p.startsWith('<li')) {
      return p;
    }
    return `<p class="my-3 text-slate-700 leading-relaxed">${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  return html;
}

// Render CSV to HTML table
function renderCsvToHtml(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length === 0) return '<p>Archivo vacío</p>';
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));

  let html = '<div class="overflow-x-auto"><table class="w-full text-left border-collapse border border-slate-200 text-xs">';
  html += '<thead class="bg-slate-100"><tr>';
  headers.forEach(h => {
    html += `<th class="border border-slate-200 px-3 py-2 font-bold text-slate-800">${escapeHtml(h)}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr class="hover:bg-slate-50">';
    r.forEach(c => {
      html += `<td class="border border-slate-200 px-3 py-2 text-slate-700">${escapeHtml(c)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

// GET /drive/view/:filename - Vista oficial simulada de Google Drive
router.get('/view/:filename', (req, res) => {
  try {
    let filename = path.basename(req.params.filename);
    const dir = config.drivePoliciesDir;
    
    // Map mock IDs like 1B_permisos_licencias_2026 to real filename
    const idMap = {
      '1A_vacaciones_feriados_2026': 'POL-01-Vacaciones-y-Feriados.md',
      '1B_permisos_licencias_2026': 'POL-02-Permisos-y-Licencias.md',
      '1C_procedimiento_incapacidades_2026': 'POL-03-Procedimiento-Incapacidades.md',
      '1D_jornada_teletrabajo_2026': 'POL-04-Reglamento-Jornada-y-Teletrabajo.md',
      '1E_calendario_planilla_2026': 'POL-05-Calendario-Pagos-Planilla-2026.csv',
      '1E_politica_salarial_2026': 'POL-05-Politica-Salarial-y-Calendario-Pagos.md',
      '1F_catalogo_beneficios_2026': 'POL-06-Catalogo-de-Beneficios.md',
      '1G_onboarding_salida_2026': 'POL-07-Manual-Onboarding-y-Salida.md',
      '1H_evaluacion_desempeno_2026': 'POL-08-Evaluacion-del-Desempeno.md',
      '1I_codigo_conducta_2026': 'POL-09-Codigo-Conducta-y-Protocolo-Denuncias.md',
      '1J_aviso_privacidad_2026': 'POL-10-Aviso-de-Privacidad-Colaboradores.md'
    };

    if (idMap[filename]) {
      filename = idMap[filename];
    }

    let filePath = path.join(dir, filename);

    // If file doesn't exist directly, check if it's missing extension
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + '.md')) {
        filename += '.md';
        filePath += '.md';
      } else if (fs.existsSync(filePath + '.pdf')) {
        filename += '.pdf';
        filePath += '.pdf';
      } else {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
            <meta charset="UTF-8">
            <title>Archivo no encontrado - Google Drive</title>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4 font-sans">
            <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200">
              <div class="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h1 class="text-xl font-bold text-slate-900 mb-2">Documento no encontrado</h1>
              <p class="text-sm text-slate-600 mb-6">El archivo solicitado no se encuentra en el repositorio local de políticas.</p>
              <a href="/" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">Volver al Portal de RRHH</a>
            </div>
          </body>
          </html>
        `);
      }
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    let bodyContent = '';

    if (ext === '.md' || ext === '.txt') {
      const raw = fs.readFileSync(filePath, 'utf8');
      bodyContent = renderMarkdownToHtml(raw);
    } else if (ext === '.csv') {
      const raw = fs.readFileSync(filePath, 'utf8');
      bodyContent = `<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 font-medium">Hoja de cálculo corporativa oficial de calendario y fechas de corte.</div>` + renderCsvToHtml(raw);
    } else if (ext === '.pdf') {
      bodyContent = `
        <div class="text-center py-8">
          <div class="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5h-2v3H6V9h3.5c.8 0 1.5.7 1.5 1.5v1c0 .8-.7 1.5-1.5 1.5zm5 3H12V9h2.5c.8 0 1.5.7 1.5 1.5v3c0 .8-.7 1.5-1.5 1.5zm4-3.5h-2v1h2v1.5h-2V15H17V9h3.5v1.5z"/></svg>
          </div>
          <h2 class="text-lg font-bold text-slate-900 mb-1">Documento Oficial en Formato PDF</h2>
          <p class="text-xs text-slate-500 mb-6">Generado con firmas y membrete institucional de Innovatech Solutions S.A.</p>
          <div class="flex items-center justify-center gap-3">
            <a href="/api/policies/file/${encodeURIComponent(filename)}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>Abrir PDF en Pantalla Completa</span>
            </a>
            <a href="/api/policies/file/${encodeURIComponent(filename)}" download class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-300">
              Descargar Archivo
            </a>
          </div>
        </div>
      `;
    }

    const kbSize = (stat.size / 1024).toFixed(1);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(filename)} - Google Drive</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 87.3 78'><path d='m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z' fill='%230066da'/><path d='m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z' fill='%2300ac47'/><path d='m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z' fill='%23ea4335'/><path d='m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.4-4.5 1.2z' fill='%2300832d'/><path d='m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-20.45-35.4c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8z' fill='%23ffba00'/><path d='m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h40.8c1.6 0 3.15-.4 4.5-1.2z' fill='%232684fc'/></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; }
      .sheet { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
    }
  </style>
</head>
<body class="bg-[#f0f4f9] text-slate-800 min-h-screen flex flex-col font-sans antialiased">

  <!-- Top Google Drive Navigation Header -->
  <header class="no-print bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
    <div class="flex items-center gap-3">
      <a href="/" class="flex items-center gap-2 group" title="Ir al Portal de RRHH">
        <!-- Google Drive SVG Icon -->
        <svg class="w-8 h-8 flex-shrink-0" viewBox="0 0 87.3 78">
          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.4-4.5 1.2z" fill="#00832d"/>
          <path d="m59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5l-20.45-35.4c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8z" fill="#ffba00"/>
          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h40.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684fc"/>
        </svg>
        <div class="leading-none">
          <span class="text-base font-medium text-slate-800 tracking-tight block">Google Drive</span>
          <span class="text-[10px] text-blue-600 font-semibold tracking-wider uppercase">Innovatech Workspace</span>
        </div>
      </a>

      <div class="h-6 w-px bg-slate-200 mx-1"></div>

      <!-- File Details -->
      <div class="flex items-center gap-2">
        <h1 class="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
          <span>${escapeHtml(filename)}</span>
        </h1>
        <span class="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
          ${kbSize} KB
        </span>
        <span class="hidden md:inline-flex text-[11px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-200">
          Sincronizado
        </span>
      </div>
    </div>

    <!-- Actions Toolbar -->
    <div class="flex items-center gap-2">
      <button onclick="window.print()" class="text-slate-600 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors" title="Imprimir documento">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
        <span class="hidden sm:inline">Imprimir</span>
      </button>

      <a href="/api/policies/file/${encodeURIComponent(filename)}" download class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs" title="Descargar archivo a tu disco">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        <span>Descargar</span>
      </a>

      <a href="/" class="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors border border-slate-300">
        <span>Volver al Chat</span>
      </a>
    </div>
  </header>

  <!-- Document Notice Banner -->
  <div class="no-print bg-blue-50/70 border-b border-blue-100 px-4 py-1.5 text-center text-xs text-blue-800 flex items-center justify-center gap-2">
    <svg class="w-3.5 h-3.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
    <span><strong>Vista oficial de Google Drive:</strong> Repositorio corporativo de Políticas de RRHH · Innovatech Solutions S.A. (San José, Costa Rica).</span>
  </div>

  <!-- Main Viewer Paper Sheet -->
  <main class="flex-1 py-8 px-4 flex justify-center">
    <div class="sheet max-w-4xl w-full bg-white rounded-xl shadow-md border border-slate-200/80 p-8 sm:p-12 min-h-[85vh]">
      ${bodyContent}
    </div>
  </main>

  <!-- Footer -->
  <footer class="no-print py-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
    Google Drive Workspace Simulator · Portal de Consulta de Políticas de RRHH con RAG Multiagente · Innovatech Solutions S.A. 2026
  </footer>

</body>
</html>
    `;

    res.send(html);
  } catch (err) {
    res.status(500).send(`Error visualizando documento en Google Drive: ${err.message}`);
  }
});

// Redirects for classic Drive URLs like /drive/file/d/:id/view or /file/d/:id/view
router.get(['/file/d/:id/view', '/drive/file/d/:id/view', '/file/d/:id', '/drive/file/d/:id'], (req, res) => {
  const id = req.params.id;
  res.redirect(`/drive/view/${id}`);
});

module.exports = router;
