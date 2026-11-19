const express = require('express');
const router = express.Router();
const escalationAgent = require('../agents/escalationAgent');

// GET /api/tickets - Listar tickets para el dashboard
router.get('/', (req, res) => {
  try {
    const tickets = escalationAgent.listTickets();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - Crear un nuevo ticket de escalamiento
router.post('/', (req, res) => {
  try {
    const { colaboradorId, preguntaOriginal, motivo } = req.body;
    if (!colaboradorId || !preguntaOriginal) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (colaboradorId, preguntaOriginal).' });
    }

    const ticket = escalationAgent.createTicket({
      colaboradorId: parseInt(colaboradorId, 10),
      preguntaOriginal,
      motivo
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
