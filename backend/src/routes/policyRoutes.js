const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// GET /api/policies - Listar todos los documentos disponibles
router.get('/', (req, res) => {
  try {
    const dir = config.drivePoliciesDir;
    if (!fs.existsSync(dir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(dir);
    const policies = files
      .filter(f => ['.md', '.pdf', '.csv', '.txt'].includes(path.extname(f).toLowerCase()))
      .map(filename => {
        const filePath = path.join(dir, filename);
        const stat = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        
        let titulo = filename;
        let codigo = filename.split('-')[0] || 'POL';
        let version = '2.0';

        if (ext === '.md' || ext === '.txt') {
          const content = fs.readFileSync(filePath, 'utf8');
          const tMatch = content.match(/^#\s+(.+)$/m);
          if (tMatch) titulo = tMatch[1].trim();
          const cMatch = content.match(/\*\*Código:\*\*\s*(.+)$/m);
          if (cMatch) codigo = cMatch[1].trim();
          const vMatch = content.match(/\*\*Versión:\*\*\s*(.+)$/m);
          if (vMatch) version = vMatch[1].trim();
        }

        return {
          filename,
          titulo,
          codigo,
          version,
          formato: ext.replace('.', '').toUpperCase(),
          tamanoBytes: stat.size,
          mtime: stat.mtime,
          viewUrl: `/api/policies/file/${filename}`
        };
      });

    res.json(policies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/policies/content/:filename - Obtener el texto completo de la política para visualizador
router.get('/content/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(config.drivePoliciesDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const ext = path.extname(filename).toLowerCase();
    if (ext === '.md' || ext === '.txt' || ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ filename, content, formato: ext.replace('.', '') });
    } else if (ext === '.pdf') {
      res.json({ 
        filename, 
        formato: 'pdf',
        pdfUrl: `/api/policies/file/${filename}`,
        mensaje: 'Documento en formato PDF oficial.'
      });
    } else {
      res.status(400).json({ error: 'Formato no soportado para lectura directa' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/policies/file/:filename - Descargar o visualizar archivo crudo (PDF, CSV, MD)
router.get('/file/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(config.drivePoliciesDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Archivo no encontrado');
    }

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// POST /api/policies/update-drive-folder - Actualizar el enlace base de Drive
router.post('/update-drive-folder', (req, res) => {
  try {
    const { driveFolderUrl } = req.body;
    if (!driveFolderUrl) {
      return res.status(400).json({ error: 'driveFolderUrl es requerido' });
    }

    const dir = config.drivePoliciesDir;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

    files.forEach(f => {
      const p = path.join(dir, f);
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/\*\*Enlace a Google Drive:\*\*.*$/m, `**Enlace a Google Drive:** ${driveFolderUrl}`);
      fs.writeFileSync(p, content, 'utf8');
    });

    // Re-index
    const driveConnector = require('../rag/driveConnector');
    driveConnector.sync();

    res.json({ success: true, message: 'Enlaces de Drive actualizados exitosamente en todos los documentos.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
