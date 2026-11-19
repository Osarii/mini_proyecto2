const express = require('express');
const router = express.Router();
const orchestratorAgent = require('../agents/orchestratorAgent');
const { db } = require('../database/connection');

// POST /api/chat - Enviar consulta al sistema multiagente
router.post('/', async (req, res) => {
  try {
    const { colaboradorId = 2, query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'La pregunta no puede estar vacía.' });
    }

    const response = await orchestratorAgent.handleQuery({
      colaboradorId: parseInt(colaboradorId, 10),
      query: query.trim()
    });

    res.json(response);
  } catch (err) {
    console.error('Error procesando consulta de chat:', err);
    res.status(500).json({ error: 'Error interno en el orquestador multiagente.', details: err.message });
  }
});

// GET /api/chat/history - Historial de consultas del usuario
router.get('/history', (req, res) => {
  try {
    const colaboradorId = parseInt(req.query.colaboradorId || '2', 10);
    const history = db.prepare(`
      SELECT * FROM consultas_chat
      WHERE colaborador_id = ?
      ORDER BY fecha DESC
      LIMIT 25
    `).all(colaboradorId);

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
