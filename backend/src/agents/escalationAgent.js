/**
 * Agente de Escalamiento (Puntos Extra)
 * Responsabilidad: Crear un ticket formal para RRHH cuando una pregunta no tiene respuesta
 * en los documentos de políticas o requiere atención humana personalizada.
 */
const { db } = require('../database/connection');

class EscalationAgent {
  /**
   * Crea un ticket en la tabla tickets_escalamiento
   */
  createTicket({ colaboradorId, preguntaOriginal, motivo = 'Consulta no contemplada en la documentación oficial' }) {
    const stmt = db.prepare(`
      INSERT INTO tickets_escalamiento (colaborador_id, pregunta_original, motivo_escalamiento, estado, fecha_creacion)
      VALUES (?, ?, ?, 'abierto', CURRENT_TIMESTAMP)
    `);

    const result = stmt.run(colaboradorId, preguntaOriginal, motivo);
    const ticketId = result.lastInsertRowid;

    return {
      success: true,
      ticketId,
      colaboradorId,
      preguntaOriginal,
      estado: 'abierto',
      mensajeUsuario: `Se ha generado el ticket de escalamiento #TICK-${ticketId} con el equipo de Gestión del Talento Humano. Un especialista de RRHH revisará tu consulta sobre "${preguntaOriginal}" y se comunicará contigo en un plazo máximo de 24 a 48 horas hábiles.`
    };
  }

  /**
   * Lista tickets abiertos para el dashboard de RRHH
   */
  listTickets() {
    return db.prepare(`
      SELECT t.*, c.nombre as colaborador_nombre, c.departamento, c.email
      FROM tickets_escalamiento t
      JOIN colaboradores c ON t.colaborador_id = c.id
      ORDER BY t.fecha_creacion DESC
    `).all();
  }
}

module.exports = new EscalationAgent();
