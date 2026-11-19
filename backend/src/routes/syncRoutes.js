const express = require('express');
const router = express.Router();
const driveConnector = require('../rag/driveConnector');

// GET /api/sync/status - Estado de la sincronización con Google Drive
router.get('/status', (req, res) => {
  try {
    const status = driveConnector.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sync/trigger - Disparar sincronización e indexación de políticas
router.post('/trigger', async (req, res) => {
  try {
    const result = await driveConnector.sync();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
