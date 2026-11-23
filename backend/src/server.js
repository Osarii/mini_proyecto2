/**
 * Servidor Principal - Portal de RRHH con RAG Multiagente
 * Innovatech Solutions S.A.
 * 100% Node.js / Express
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { db, initDatabaseSchema } = require('./database/connection');
const driveConnector = require('./rag/driveConnector');
const schedulerService = require('./services/schedulerService');

// Routers
const chatRoutes = require('./routes/chatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const syncRoutes = require('./routes/syncRoutes');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const policyRoutes = require('./routes/policyRoutes');
const drivePreviewRoutes = require('./routes/drivePreviewRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const selfServiceRoutes = require('./routes/selfServiceRoutes');
const {
  corsOptions,
  securityHeadersMiddleware,
  issueCsrfToken,
  verificarCSRF,
  requierePermiso,
  sanitizeInputsMiddleware,
  rateLimitMiddleware
} = require('./middleware/securityMiddleware');

const app = express();

// Middlewares de Seguridad (CSP/XSS, CORS estricto sin *, Rate Limit, Saneamiento)
app.use(securityHeadersMiddleware);
app.use(cors(corsOptions));
app.use((err, req, res, next) => {
  if (err && err.status === 403) {
    return res.status(403).json({ error: err.message });
  }
  next(err);
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api', rateLimitMiddleware(150, 60000));
app.use('/api', sanitizeInputsMiddleware);

// Endpoint para emitir token anti-CSRF (Double Submit Cookie SameSite=Lax)
app.get('/api/security/csrf-token', issueCsrfToken);

// Validación CSRF obligatoria en peticiones que modifican estado (POST, PUT, DELETE)
app.use('/api', verificarCSRF);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', requierePermiso('dashboard:ver'), dashboardRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/self-service', selfServiceRoutes);
app.use('/drive', drivePreviewRoutes);
app.use('/file', drivePreviewRoutes);

const llmService = require('./services/llmService');

// LLM Status and Configuration endpoints
app.get('/api/llm/status', (req, res) => {
  res.json(llmService.getStatus());
});

app.post('/api/llm/configure', (req, res) => {
  try {
    const { apiKey, model, provider } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey es requerido' });
    }

    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    if (provider === 'deepseek' || (!provider && !apiKey.startsWith('sk-proj-'))) {
      if (/^DEEPSEEK_API_KEY=/m.test(envContent)) {
        envContent = envContent.replace(/^DEEPSEEK_API_KEY=.*$/m, `DEEPSEEK_API_KEY=${apiKey.trim()}`);
      } else {
        envContent += `\nDEEPSEEK_API_KEY=${apiKey.trim()}`;
      }
      const chosenModel = model || 'deepseek-chat';
      if (/^DEEPSEEK_MODEL=/m.test(envContent)) {
        envContent = envContent.replace(/^DEEPSEEK_MODEL=.*$/m, `DEEPSEEK_MODEL=${chosenModel.trim()}`);
      } else {
        envContent += `\nDEEPSEEK_MODEL=${chosenModel.trim()}`;
      }
      if (/^LLM_PROVIDER=/m.test(envContent)) {
        envContent = envContent.replace(/^LLM_PROVIDER=.*$/m, `LLM_PROVIDER=deepseek`);
      } else {
        envContent += `\nLLM_PROVIDER=deepseek`;
      }
      config.deepseekApiKey = apiKey.trim();
      config.deepseekModel = chosenModel.trim();
      config.llmProvider = 'deepseek';
    } else if (provider === 'openai' || apiKey.startsWith('sk-proj-')) {
      if (/^OPENAI_API_KEY=/m.test(envContent)) {
        envContent = envContent.replace(/^OPENAI_API_KEY=.*$/m, `OPENAI_API_KEY=${apiKey.trim()}`);
      } else {
        envContent += `\nOPENAI_API_KEY=${apiKey.trim()}`;
      }
      if (model) {
        if (/^OPENAI_MODEL=/m.test(envContent)) {
          envContent = envContent.replace(/^OPENAI_MODEL=.*$/m, `OPENAI_MODEL=${model.trim()}`);
        } else {
          envContent += `\nOPENAI_MODEL=${model.trim()}`;
        }
      }
      if (/^LLM_PROVIDER=/m.test(envContent)) {
        envContent = envContent.replace(/^LLM_PROVIDER=.*$/m, `LLM_PROVIDER=openai`);
      } else {
        envContent += `\nLLM_PROVIDER=openai`;
      }
      config.openaiApiKey = apiKey.trim();
      if (model) config.openaiModel = model.trim();
      config.llmProvider = 'openai';
    } else {
      if (/^GEMINI_API_KEY=/m.test(envContent)) {
        envContent = envContent.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${apiKey.trim()}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${apiKey.trim()}`;
      }
      if (model) {
        if (/^GEMINI_MODEL=/m.test(envContent)) {
          envContent = envContent.replace(/^GEMINI_MODEL=.*$/m, `GEMINI_MODEL=${model.trim()}`);
        } else {
          envContent += `\nGEMINI_MODEL=${model.trim()}`;
        }
      }
      config.geminiApiKey = apiKey.trim();
      if (model) config.geminiModel = model.trim();
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    llmService.init();

    res.json({
      success: true,
      mensaje: 'Proveedor LLM configurado y conectado exitosamente.',
      status: llmService.getStatus()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    organization: 'Innovatech Solutions S.A.',
    system: 'Portal de Consulta de Políticas de RRHH con RAG Multiagente',
    engine: 'Node.js Express + Better-SQLite3 + Hybrid Vector RAG',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if exists
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
const frontendPublic = path.resolve(__dirname, '../../frontend/public');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
} else if (require('fs').existsSync(frontendPublic)) {
  app.use(express.static(frontendPublic));
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Error interno en el servidor.', details: err.message });
});

async function startServer() {
  try {
    console.log('--- Iniciando Portal de RRHH Multiagente ---');
    initDatabaseSchema();

    // Check if database needs seeding
    const colabCount = db.prepare('SELECT count(*) as count FROM colaboradores').get().count;
    if (colabCount === 0) {
      console.log('Base de datos vacía. Ejecutando seed automático...');
      const { seedDatabase } = require('./database/seed');
      seedDatabase();
    }

    // Sync Drive documents and build vector index
    console.log('Sincronizando documentos de Drive e indexando chunks vectoriales...');
    await driveConnector.sync();

    // Start daily scheduler (7:00 a. m.)
    schedulerService.start();

    // Listen on configured port
    app.listen(config.port, () => {
      console.log(`[OK] Servidor backend activo en http://localhost:${config.port}`);
      console.log(`Endpoints disponibles:`);
      console.log(`   - Chat Multiagente: POST http://localhost:${config.port}/api/chat`);
      console.log(`   - Dashboard RRHH:   GET  http://localhost:${config.port}/api/dashboard/stats`);
      console.log(`   - Sincronización:   POST http://localhost:${config.port}/api/sync/trigger`);
      console.log(`   - Colaboradores:    GET  http://localhost:${config.port}/api/auth/users`);
      console.log(`   - Estado de Salud:  GET  http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('Fallo fatal al inicializar el servidor:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
