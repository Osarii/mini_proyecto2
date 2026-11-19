-- =====================================================================
-- ESQUEMA SQL - PORTAL DE RRHH CON RAG MULTIAGENTE
-- Innovatech Solutions S.A.
-- Compatible con SQLite y PostgreSQL
-- =====================================================================

-- 1. Tabla de Colaboradores (50+ registros simulados)
CREATE TABLE IF NOT EXISTS colaboradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    departamento VARCHAR(80) NOT NULL,
    puesto VARCHAR(100) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    jefe_id INTEGER REFERENCES colaboradores(id) ON DELETE SET NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'colaborador', -- 'colaborador' | 'rrhh'
    estado VARCHAR(30) NOT NULL DEFAULT 'activo'   -- 'activo' | 'inactivo'
);

-- 2. Tabla de Saldos de Vacaciones
CREATE TABLE IF NOT EXISTS saldos_vacaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    periodo VARCHAR(30) NOT NULL,
    dias_asignados REAL NOT NULL DEFAULT 15.0,
    dias_tomados REAL NOT NULL DEFAULT 0.0,
    dias_disponibles REAL NOT NULL DEFAULT 15.0
);

-- 3. Tabla de Solicitudes (Vacaciones, Permisos, Licencias)
CREATE TABLE IF NOT EXISTS solicitudes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aprobada', 'rechazada'
    aprobador_id INTEGER REFERENCES colaboradores(id) ON DELETE SET NULL,
    creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT
);

-- 4. Tabla de Incapacidades Médicas (CCSS e INS)
CREATE TABLE IF NOT EXISTS incapacidades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'enfermedad_comun', 'accidente_laboral', 'maternidad'
    fecha_inicio DATE NOT NULL,
    dias INTEGER NOT NULL,
    entidad VARCHAR(40) NOT NULL, -- 'CCSS' | 'INS'
    estado VARCHAR(30) NOT NULL DEFAULT 'activa' -- 'activa' | 'concluida'
);

-- 5. Tabla de Movimientos de Personal (Rotación de 3 Meses)
CREATE TABLE IF NOT EXISTS movimientos_personal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    tipo VARCHAR(40) NOT NULL, -- 'ingreso' | 'salida' | 'ascenso'
    fecha DATE NOT NULL,
    motivo VARCHAR(200) NOT NULL
);

-- 6. Tabla de Logs de Consultas del Chatbot
CREATE TABLE IF NOT EXISTS consultas_chat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER REFERENCES colaboradores(id) ON DELETE SET NULL,
    pregunta TEXT NOT NULL,
    intencion VARCHAR(50) NOT NULL,
    agente VARCHAR(50) NOT NULL,
    documentos_citados TEXT,
    resuelta BOOLEAN NOT NULL DEFAULT 1,
    escalada BOOLEAN NOT NULL DEFAULT 0,
    latencia_ms INTEGER NOT NULL DEFAULT 0,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Reportes Diarios (Leída por el Dashboard de RRHH)
CREATE TABLE IF NOT EXISTS reportes_diarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE UNIQUE NOT NULL,
    datos_json TEXT NOT NULL,
    resumen_texto TEXT NOT NULL,
    generado_por VARCHAR(60) NOT NULL DEFAULT 'Agente Analista de Reportes'
);

-- 8. Tabla de Tickets de Escalamiento (Bonus)
CREATE TABLE IF NOT EXISTS tickets_escalamiento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    pregunta_original TEXT NOT NULL,
    motivo_escalamiento TEXT NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'abierto',
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Base Vectorial / Almacén de Chunks de Documentos de Drive
CREATE TABLE IF NOT EXISTS documentos_vectoriales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    documento_id VARCHAR(100) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    responsable VARCHAR(150) NOT NULL,
    seccion VARCHAR(200) NOT NULL,
    enlace_drive TEXT NOT NULL,
    contenido TEXT NOT NULL,
    tokens INTEGER NOT NULL,
    embedding TEXT, -- JSON array of floats or vector representation
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_colab_depto ON colaboradores(departamento);
CREATE INDEX IF NOT EXISTS idx_colab_rol ON colaboradores(rol);
CREATE INDEX IF NOT EXISTS idx_saldos_colab ON saldos_vacaciones(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_colab ON solicitudes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_incapacidades_estado ON incapacidades(estado);
CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos_personal(fecha);
CREATE INDEX IF NOT EXISTS idx_chat_fecha ON consultas_chat(fecha);

-- 10. Tabla de Control de Asistencia y Marcas de Entrada/Salida
CREATE TABLE IF NOT EXISTS marcas_asistencia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora_entrada DATETIME NOT NULL,
    hora_salida DATETIME,
    segundos_trabajados INTEGER DEFAULT 0,
    horas_trabajadas REAL DEFAULT 0.0,
    jornada_esperada_horas REAL DEFAULT 8.0,
    salida_anticipada INTEGER DEFAULT 0,
    motivo_salida_anticipada TEXT,
    notificacion_rrhh_enviada INTEGER DEFAULT 0,
    estado VARCHAR(30) NOT NULL DEFAULT 'en_curso',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bandeja de Notificaciones y Correos a Recursos Humanos
CREATE TABLE IF NOT EXISTS notificaciones_rrhh (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    remitente VARCHAR(150) NOT NULL,
    destinatario VARCHAR(150) NOT NULL DEFAULT 'Mariana Soto Vargas <mariana.soto@innovatech.cr>',
    tipo VARCHAR(50) NOT NULL DEFAULT 'salida_anticipada',
    asunto VARCHAR(200) NOT NULL,
    cuerpo TEXT NOT NULL,
    horas_laboradas REAL NOT NULL,
    horas_faltantes REAL NOT NULL,
    motivo TEXT NOT NULL,
    fecha_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leido INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_marcas_colab_fecha ON marcas_asistencia(colaborador_id, fecha);
CREATE INDEX IF NOT EXISTS idx_marcas_estado ON marcas_asistencia(estado);
CREATE INDEX IF NOT EXISTS idx_notif_fecha ON notificaciones_rrhh(fecha_envio);
