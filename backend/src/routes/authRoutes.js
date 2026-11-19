const express = require('express');
const router = express.Router();
const { db } = require('../database/connection');

// GET /api/auth/users - Listar colaboradores disponibles para probar roles en la interfaz
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, nombre, email, departamento, puesto, rol, fecha_ingreso
      FROM colaboradores
      ORDER BY id ASC
    `).all();

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/user/:id - Obtener información del usuario en sesión
router.get('/user/:id', (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, nombre, email, departamento, puesto, rol, fecha_ingreso
      FROM colaboradores
      WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
