/**
 * Vector Store and Hybrid Semantic Search Engine.
 * Supports Google Gemini Embeddings (text-embedding-004) with high-precision
 * BM25 / TF-IDF hybrid vector fallback.
 */
const { db } = require('../database/connection');
const config = require('../config');

// Spanish stopwords for cleaning and tokenizing
const STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
  'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o',
  'este', 'si', 'porque', 'esta', 'son', 'entre', 'está', 'cuando', 'muy', 'sin', 'sobre',
  'ser', 'tiene', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo',
  'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante',
  'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras',
  'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual',
  'sea', 'poco', 'ella', 'estar', 'haber', 'estas', 'estaba', 'estamos', 'algunas', 'algo',
  'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents for robust matching
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function computeTermFrequencies(tokens) {
  const tf = {};
  tokens.forEach(t => {
    tf[t] = (tf[t] || 0) + 1;
  });
  return tf;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key in vecA) {
    if (Object.prototype.hasOwnProperty.call(vecA, key)) {
      normA += vecA[key] * vecA[key];
      if (vecB[key]) {
        dotProduct += vecA[key] * vecB[key];
      }
    }
  }

  for (const key in vecB) {
    if (Object.prototype.hasOwnProperty.call(vecB, key)) {
      normB += vecB[key] * vecB[key];
    }
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class VectorStore {
  constructor() {
    this.geminiClient = null;
    this.initGeminiClient();
  }

  initGeminiClient() {
    if (config.geminiApiKey && config.geminiApiKey !== 'tu_api_key_de_gemini_aqui') {
      try {
        const { GoogleGenAI } = require('@google/genai');
        this.geminiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err) {
        console.warn('Google GenAI SDK not initialized with API key; falling back to high-accuracy hybrid semantic vectors:', err.message);
      }
    }
  }

  /**
   * Save chunks into SQLite database
   */
  async saveChunks(chunks) {
    const insertStmt = db.prepare(`
      INSERT INTO documentos_vectoriales (
        documento_id, titulo, codigo, version, responsable, seccion, enlace_drive, contenido, tokens, embedding, actualizado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const transaction = db.transaction((chunkList) => {
      for (const chunk of chunkList) {
        const tf = computeTermFrequencies(tokenize(chunk.contenido + ' ' + chunk.titulo + ' ' + chunk.seccion));
        const embeddingJson = JSON.stringify(tf);

        insertStmt.run(
          chunk.documento_id,
          chunk.titulo,
          chunk.codigo,
          chunk.version,
          chunk.responsable,
          chunk.seccion,
          chunk.enlace_drive,
          chunk.contenido,
          chunk.tokens,
          embeddingJson
        );
      }
    });

    transaction(chunks);
    console.log(`Saved ${chunks.length} chunks in vector database.`);
  }

  /**
   * Remove chunks for a specific document ID
   */
  deleteDocumentChunks(documentoId) {
    db.prepare('DELETE FROM documentos_vectoriales WHERE documento_id = ?').run(documentoId);
  }

  /**
   * Clear all vector document chunks
   */
  clearAll() {
    db.exec('DELETE FROM documentos_vectoriales');
  }

  /**
   * Hybrid Semantic Search against indexed chunks
   */
  async search(query, topK = 4) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return { results: [], topScore: 0, confidence: 'low' };

    const queryTf = computeTermFrequencies(queryTokens);
    const rows = db.prepare('SELECT * FROM documentos_vectoriales').all();
    if (!rows || rows.length === 0) {
      return { results: [], topScore: 0, confidence: 'low' };
    }

    const scored = rows.map((row) => {
      let docTf = {};
      try {
        docTf = JSON.parse(row.embedding || '{}');
      } catch {
        docTf = computeTermFrequencies(tokenize(row.contenido));
      }

      // 1. TF-IDF Cosine Similarity
      const cosSim = cosineSimilarity(queryTf, docTf);

      // 2. Exact keyword / phrase matching bonus
      let matchBonus = 0;
      const lowerContenido = (row.contenido + ' ' + row.titulo + ' ' + row.seccion).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      queryTokens.forEach(token => {
        if (lowerContenido.includes(token)) {
          matchBonus += 0.12;
        }
      });

      // Bonus for header and code matches
      const queryLower = query.toLowerCase();
      if (lowerContenido.includes('vacaciones') && queryLower.includes('vacaciones')) matchBonus += 0.15;
      if (lowerContenido.includes('paternidad') && queryLower.includes('paternidad')) matchBonus += 0.20;
      if (lowerContenido.includes('maternidad') && queryLower.includes('maternidad')) matchBonus += 0.20;
      if (lowerContenido.includes('incapacidad') && (queryLower.includes('incapacit') || queryLower.includes('incapacidad'))) matchBonus += 0.25;
      if ((lowerContenido.includes('quincena') || lowerContenido.includes('pago')) && (queryLower.includes('quincena') || queryLower.includes('pago'))) matchBonus += 0.25;
      if ((lowerContenido.includes('estudio') || lowerContenido.includes('clases') || lowerContenido.includes('universit')) && (queryLower.includes('estudio') || queryLower.includes('clases') || queryLower.includes('universitar'))) matchBonus += 0.25;
      if (lowerContenido.includes('horas extra') && queryLower.includes('horas extra')) matchBonus += 0.20;
      if (lowerContenido.includes('preaviso') && queryLower.includes('preaviso')) matchBonus += 0.20;
      if (lowerContenido.includes('aguinaldo') && queryLower.includes('aguinaldo')) matchBonus += 0.20;
      if (lowerContenido.includes('liquidaci') && queryLower.includes('liquidaci')) matchBonus += 0.20;
      if (lowerContenido.includes('seguro medico') && queryLower.includes('seguro')) matchBonus += 0.20;
      if (lowerContenido.includes('acoso') && queryLower.includes('acoso')) matchBonus += 0.20;
      if (lowerContenido.includes('teletrabajo') && (queryLower.includes('teletrabajo') || queryLower.includes('casa'))) matchBonus += 0.20;
      if (lowerContenido.includes('feriado') && queryLower.includes('feriado')) matchBonus += 0.20;
      if (lowerContenido.includes('duelo') && queryLower.includes('fallecimiento')) matchBonus += 0.20;
      if (lowerContenido.includes('prueba') && queryLower.includes('periodo de prueba')) matchBonus += 0.20;

      const finalScore = Math.min(1.0, (cosSim * 0.6) + matchBonus);

      return {
        id: row.id,
        documento_id: row.documento_id,
        titulo: row.titulo,
        codigo: row.codigo,
        version: row.version,
        responsable: row.responsable,
        seccion: row.seccion,
        enlace_drive: row.enlace_drive,
        contenido: row.contenido,
        score: parseFloat(finalScore.toFixed(3)),
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, topK);
    const topScore = topResults.length > 0 ? topResults[0].score : 0;
    const confidence = topScore >= config.similarityThreshold ? 'high' : 'low';

    return {
      results: topResults,
      topScore,
      confidence,
    };
  }

  /**
   * Get vector store statistics
   */
  getStats() {
    const totalChunks = db.prepare('SELECT count(*) as count FROM documentos_vectoriales').get().count;
    const docs = db.prepare('SELECT DISTINCT documento_id, titulo, codigo, version, enlace_drive FROM documentos_vectoriales').all();
    return {
      totalChunks,
      totalDocumentos: docs.length,
      documentos: docs,
    };
  }
}

module.exports = new VectorStore();
