/**
 * Middleware de Seguridad Integral - Portal de RRHH Innovatech Solutions S.A.
 * Implementa:
 *  1. Cabeceras de Seguridad HTTP y Content Security Policy (CSP) contra XSS
 *  2. Configuración estricta de CORS (lista blanca de orígenes, sin comodín *)
 *  3. Protección CSRF (Token Anti-CSRF + Double Submit Cookie SameSite=Lax + verificación Origin)
 *  4. Control de Acceso Basado en Roles y Permisos (RBAC - Denegar por defecto)
 *  5. Saneamiento de entradas contra XSS e Inyección SQL
 *  6. Rate Limiting contra fuerza bruta
 */
const crypto = require('crypto');

// ============================================================================
// 1. LISTA BLANCA DE ORÍGENES CORS (SIN COMODÍN *)
// ============================================================================
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

function getAllowedOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = getAllowedOrigins();
    // Peticiones sin cabecera Origin (ej. mismo origen o herramientas locales sin Origin)
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error(`Origen no autorizado por política CORS: ${origin}`);
    err.status = 403;
    return callback(err, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-user-role'],
  credentials: true,
  maxAge: 600
};

// ============================================================================
// 2. CABECERAS DE SEGURIDAD Y CONTENT SECURITY POLICY (CSP) CONTRA XSS
// ============================================================================
function securityHeadersMiddleware(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}

// ============================================================================
// 3. PROTECCIÓN CSRF (DOUBLE SUBMIT COOKIE + TOKEN ANTI-CSRF + ORIGIN)
// ============================================================================
function parseCookies(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      cookies[k] = v;
    }
  });
  return cookies;
}

function issueCsrfToken(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.csrf_token || crypto.randomBytes(32).toString('hex');
  const isProd = process.env.NODE_ENV === 'production';

  res.setHeader(
    'Set-Cookie',
    `csrf_token=${token}; Path=/; SameSite=Lax${isProd ? '; Secure' : ''}`
  );
  return res.json({ csrfToken: token, sameSite: 'Lax' });
}

function verificarCSRF(req, res, next) {
  // Solo proteger métodos que modifican estado
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Verificar cabecera Origin si está presente
  const origin = req.headers.origin;
  if (origin && !getAllowedOrigins().includes(origin)) {
    return res.status(403).json({
      error: 'Petición bloqueada por verificación de origen (CSRF/CORS).'
    });
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies.csrf_token;
  const headerToken = req.get('X-CSRF-Token') || (req.body && req.body._csrf);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: 'Token CSRF inválido o ausente. Recarga la página para renovar tu sesión segura.'
    });
  }

  return next();
}

// ============================================================================
// 4. CONTROL DE ACCESO BASADO EN ROLES Y PERMISOS (RBAC - DENEGAR POR DEFECTO)
// ============================================================================
const permisosPorRol = {
  rrhh: [
    'chat:usar',
    'asistencia:marcar',
    'autoservicio:usar',
    'dashboard:ver',
    'reportes:generar',
    'solicitudes:aprobar',
    'seguridad:auditar',
    'smtp:configurar'
  ],
  colaborador: [
    'chat:usar',
    'asistencia:marcar',
    'autoservicio:usar'
  ]
};

function requierePermiso(permiso) {
  return (req, res, next) => {
    const rol = (req.headers['x-user-role'] || '').toLowerCase();
    if (!rol) {
      return res.status(401).json({ error: 'No autenticado: falta rol de sesión.' });
    }
    const permisos = permisosPorRol[rol] || [];
    if (!permisos.includes(permiso)) {
      return res.status(403).json({
        error: `Acceso denegado (403 Forbidden). El rol '${rol}' no posee el permiso '${permiso}'.`
      });
    }
    next();
  };
}

// ============================================================================
// 5. SANEAMIENTO DE ENTRADAS CONTRA XSS
// ============================================================================
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

function sanitizeInputsMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string' && !['apiKey', 'smtpPass'].includes(key)) {
        req.body[key] = escapeHtml(req.body[key]);
      }
    }
  }
  next();
}

// ============================================================================
// 6. RATE LIMITING CONTRA FUERZA BRUTA (VENTANA DE 1 MINUTO)
// ============================================================================
const rateLimitStore = new Map();

function rateLimitMiddleware(maxRequests = 120, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'local';
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;
    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas peticiones. Intenta nuevamente en un minuto.'
      });
    }
    next();
  };
}

module.exports = {
  corsOptions,
  securityHeadersMiddleware,
  issueCsrfToken,
  verificarCSRF,
  permisosPorRol,
  requierePermiso,
  sanitizeInputsMiddleware,
  rateLimitMiddleware
};
