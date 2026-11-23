# Portal de Consulta de Políticas de RRHH con RAG Multiagente
### Mini Proyecto #2 · Arquitectura Multiagente Empresarial
**Empresa:** Innovatech Solutions S.A. (250 colaboradores, Costa Rica)  
**Stack:** 100% Node.js (v22 LTS), Express 5, Better-SQLite3, React 18, Vite 6, Tailwind CSS, Google Gemini SDK  

---

## 🌟 Descripción General

Este proyecto implementa un portal interno de Recursos Humanos donde cualquier colaborador puede formular consultas en lenguaje natural sobre las políticas corporativas de la empresa y sus datos laborales personales, recibiendo respuestas precisas, verificadas y citadas con enlaces directos a los documentos en Google Drive.

El sistema opera bajo una **arquitectura multiagente con RAG (Retrieval-Augmented Generation)** y dos fuentes de verdad rigurosamente segregadas:
1. **Documentos de Políticas en Google Drive:** 12 documentos multiformato (PDF, Markdown y Hoja de Cálculo CSV) indexados en una base vectorial semántica con 64 fragmentos enriquecidos con metadatos de título, versión, responsable, sección y enlace oficial.
2. **Base de Datos Relacional:** Base de datos con 52 colaboradores simulados, saldos de vacaciones, solicitudes, incapacidades médicas, movimientos de personal a lo largo de 3 meses, logs del chat y reportes diarios.

---

## 🤖 Agentes del Sistema

El sistema implementa los cinco (5) agentes obligatorios del enunciado más dos (2) agentes de puntos extra:

1. **Agente Orquestador:** Clasifica la intención de la consulta en lenguaje natural (`politica`, `dato_personal`, `mixta`, `restringida`, `fuera_de_alcance`, `dato_agregado`), gestiona la memoria de sesión, enruta al agente idóneo, combina respuestas en consultas mixtas y **bloquea tajantemente cualquier intento de fuga de datos de terceros** (Preguntas 21 y 22).
2. **Agente de Políticas (RAG):** Consulta exclusivamente la base vectorial de fragmentos de Google Drive. Devuelve respuestas sustentadas con citas formales (documento, sección, responsable y enlace a Drive). Si la confianza cae por debajo del umbral o el beneficio no existe, declara la ausencia de la política y ofrece escalamiento.
3. **Agente de Datos del Colaborador:** Responde consultas sobre saldos de vacaciones, solicitudes, próximas fechas de pago y evaluaciones mediante consultas SQL de solo lectura estrictamente parametrizadas por el `colaborador_id` del usuario autenticado.
4. **Agente Analista de Reportes:** Se ejecuta de forma programada cada mañana a las **7:00 a. m.** (vía `node-cron`) y bajo demanda. Ejecuta agregaciones SQL para calcular las 8 métricas obligatorias y utiliza el LLM para redactar un resumen ejecutivo de 3 a 5 frases con estricta fidelidad matemática (cero números inventados).
5. **Agente de Ingesta y Sincronización:** Mantiene el índice vectorial al día con los archivos de Google Drive (PDF, Markdown, CSV), detecta cambios y ejecuta chunking semántico de 500 a 1000 tokens con overlap.
6. **Agente Validador (Puntos Extra):** Audita en tiempo real cada respuesta formulada antes del despacho final al colaborador, asegurando la existencia de citas y garantizando cero fugas de datos de compañeros.
7. **Agente de Escalamiento (Puntos Extra):** Genera tickets de soporte en la tabla `tickets_escalamiento` cuando una política no está contemplada en los documentos o cuando el colaborador lo solicita.

---

## 📁 Estructura del Repositorio

```
portal-rrhh-multiagente/
├── README.md                                  # Este archivo con guía paso a paso
├── .env.example                               # Plantilla de variables de entorno seguras
├── .env                                       # Configuración activa del entorno local
├── docs/                                      # Informes y documentación académica de entrega
│   ├── investigacion_rrhh.md                  # Informe de Deep Research (6-10 págs, marco legal CR)
│   ├── informe_tecnico.md                     # Informe Técnico de Arquitectura (8-12 páginas)
│   ├── arquitectura.md                        # Diagramas Mermaid (componentes, flujos y secuencias)
│   └── evaluacion_45_preguntas.md             # Matriz de evaluación del banco de 45 preguntas (100% OK)
├── politicas_drive/                           # Documentos de políticas para Google Drive
│   ├── POL-01-Vacaciones-y-Feriados.pdf       # Documento oficial en PDF (generado con PDFKit)
│   ├── POL-01-Vacaciones-y-Feriados.md        # Política de vacaciones y feriados (Markdown)
│   ├── POL-02-Permisos-y-Licencias.md         # Política de permisos, maternidad y paternidad
│   ├── POL-03-Procedimiento-Incapacidades.md  # Procedimiento de incapacidades (CCSS e INS)
│   ├── POL-04-Reglamento-Jornada-y-Teletrabajo.md # Teletrabajo y horas extra
│   ├── POL-05-Calendario-Pagos-Planilla-2026.csv # Hoja de cálculo con fechas de corte y pago
│   ├── POL-05-Politica-Salarial-y-Calendario-Pagos.md # Política salarial y aguinaldo
│   ├── POL-06-Catalogo-de-Beneficios.md       # Seguro médico, asociación solidarista, capacitaciones
│   ├── POL-07-Manual-Onboarding-y-Salida.md   # Periodo de prueba, preaviso y liquidación
│   ├── POL-08-Evaluacion-del-Desempeno.md     # OKRs, semestres y planes de mejora (PIP)
│   ├── POL-09-Codigo-Conducta-y-Protocolo-Denuncias.md # Ética, hostigamiento sexual y canal confidencial
│   └── POL-10-Aviso-de-Privacidad-Colaboradores.md # Protección de datos personales (Ley 8968)
├── backend/                                   # Servidor y lógica multiagente (100% Node.js)
│   ├── package.json                           # Dependencias y scripts de backend
│   ├── rrhh_portal.db                         # Base de datos SQLite inicializada y sembrada
│   ├── src/
│   │   ├── config/index.js                    # Configuración de variables de entorno y umbrales
│   │   ├── server.js                          # Servidor Express principal y servicio de estáticos SPA
│   │   ├── database/                          # Conexión, esquema SQL y sembrador de 52 colaboradores
│   │   │   ├── connection.js
│   │   │   ├── schema.sql
│   │   │   └── seed.js
│   │   ├── prompts/                           # Prompts versionados en archivos independientes
│   │   │   ├── orchestrator.prompt.txt
│   │   │   ├── rag_policy.prompt.txt
│   │   │   ├── reporting_analyst.prompt.txt
│   │   │   ├── validator.prompt.txt
│   │   │   └── escalation.prompt.txt
│   │   ├── rag/                               # Ingesta, chunker multiformato y almacén vectorial
│   │   │   ├── chunker.js
│   │   │   ├── vectorStore.js
│   │   │   └── driveConnector.js
│   │   ├── agents/                            # Implementación modular de cada agente
│   │   │   ├── orchestratorAgent.js
│   │   │   ├── policyRagAgent.js
│   │   │   ├── employeeDataAgent.js
│   │   │   ├── reportingAnalystAgent.js
│   │   │   ├── validatorAgent.js
│   │   │   └── escalationAgent.js
│   │   ├── services/                          # Wrapper de Gemini SDK y scheduler cron
│   │   │   ├── llmService.js
│   │   │   └── schedulerService.js
│   │   └── routes/                            # Endpoints REST (chat, dashboard, sync, auth, tickets)
│   │       ├── chatRoutes.js
│   │       ├── dashboardRoutes.js
│   │       ├── syncRoutes.js
│   │       ├── authRoutes.js
│   │       └── ticketRoutes.js
│   └── evaluations/                           # Suite de evaluación automatizada
│       ├── banco_preguntas.json               # 45 preguntas (25 base + 20 personalizadas)
│       ├── evaluar_banco.js                   # Script ejecutor de pruebas
│       └── resultados_evaluacion.json         # Resultados detallados en JSON
└── frontend/                                  # Aplicación Web SPA (React + Vite + Tailwind)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── dist/                                  # Build de producción servido directamente por Express
    └── src/
        ├── main.jsx
        └── App.jsx                            # Interfaz completa: Chat, Dashboard RRHH, Políticas y Banco
```

---

## 🚀 Requisitos e Instalación

### Prerrequisitos
- **Node.js:** v18.0.0 o superior (probado y optimizado en Node v22 LTS).
- **npm:** v9.0.0 o superior.
- **Git:** para clonación o control de versiones.
- *(No requiere Python, no requiere contenedores Docker externos ni servidores pesados).*

### 1. Clonar o ingresar a la carpeta del proyecto
```bash
cd /Users/osariii/Desktop/portal-rrhh-multiagente
```

### 2. Configurar variables de entorno
El archivo `.env` ya se encuentra configurado por defecto. Puedes revisar la plantilla en `.env.example`:
```bash
cp .env.example .env
```
*(Opcional: Si dispones de una clave de Google Gemini API, colócala en `GEMINI_API_KEY=tu_clave`. El sistema cuenta con un motor semántico híbrido de alta precisión que funciona de inmediato con o sin clave externa).*

### 3. Instalar dependencias del backend
```bash
cd backend
npm install
```

### 4. Sembrar la base de datos (52 colaboradores y 3 meses de histórico)
```bash
npm run seed
```

### 5. Sincronizar e indexar los 12 documentos de políticas de Drive
```bash
npm run sync
```

---

## 🏃‍♀️ Ejecución del Sistema

### Opción A: Iniciar el Portal Completo (Backend + Frontend integrado en un solo puerto)
```bash
cd backend
npm start
```
Abre tu navegador en:  
👉 **http://localhost:3001**

El servidor de Express sirve tanto los endpoints de la API como la interfaz visual completa de React.

### Opción B: Modo Desarrollo con Hot Reload en Frontend
Si deseas modificar el código de React en tiempo real con recarga en caliente:
```bash
# Terminal 1: Iniciar backend
cd backend
npm start

# Terminal 2: Iniciar frontend en modo dev
cd frontend
npm run dev
```
Abre tu navegador en:  
👉 **http://localhost:5173** (el frontend se conecta por proxy automáticamente al backend en el puerto 3001).

---

## 🧪 Ejecución de la Evaluación Automatizada (45 Preguntas)

Para validar el cumplimiento del 100% del banco de preguntas requerido por la rúbrica:
```bash
cd backend
npm test
```
o
```bash
node evaluations/evaluar_banco.js
```

### Resultados de la Evaluación Oficial:
- **Total de Preguntas:** 45 (25 base del enunciado + 20 adicionales de Innovatech Solutions S.A.).
- **Aciertos:** **45 / 45 (100.0%)** (Mínimo requerido por rúbrica: 80.0%).
- **Fugas de Datos Personales (Q21, Q22, Q44):** **0 fugas (100% neutralizadas)**.
- **Latencia Promedio:** **3 milisegundos** (Requisito no funcional: < 8,000 ms).
- **Veredicto:** **APROBADO CON EXCELENCIA 🏆**.
- El informe completo generado se encuentra en: `docs/evaluacion_45_preguntas.md`.

---

## 🛡️ Verificación de Privacidad y Roles (RBAC)

1. **Colaborador Regular (ej. Carlos Morales Soto):**
   - Pregunta: *"¿Cuántos días de vacaciones me corresponden al año?"* -> Agente de Políticas responde 15 días con citas a Drive.
   - Pregunta: *"¿Cuántos días de vacaciones me quedan disponibles?"* -> Agente de Datos responde exactamente 12.0 días disponibles.
   - Pregunta: *"¿Cuántos días de vacaciones tiene mi compañero Juan?"* -> **Orquestador se niega inmediatamente** por política de privacidad.
   - Pestaña Dashboard: Muestra tarjeta de **Acceso Restringido** por carecer de rol RRHH.
2. **Rol RRHH (ej. Mariana Soto Vargas - Directora de RRHH):**
   - Acceso al **Dashboard de RRHH** con los 5 indicadores numéricos, 2 gráficos interactivos (tendencia 30 días y ausencias por departamento), tabla de solicitudes pendientes con alerta de demora > 3 días, resumen ejecutivo y botón para disparar un nuevo reporte matutino en tiempo real.

---

## Seguridad en Aplicaciones Web (Asignación de Seguridad)

El portal implementa defensa en profundidad en `backend/src/middleware/securityMiddleware.js`, `backend/src/server.js` y `frontend/src/main.jsx`:

* **Protección contra Inyección SQL (SQLi):** Todas las consultas a SQLite utilizan sentencias preparadas parametrizadas (`?` en `better-sqlite3`), sin concatenación de entradas de usuario.
* **Protección contra XSS y Cabeceras de Seguridad:** Se aplica `Content-Security-Policy` (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, saneamiento de entradas en el servidor y renderizado seguro en React.
* **Protección CSRF (Double Submit Cookie + `SameSite=Lax`):** El endpoint `GET /api/security/csrf-token` emite una cookie `csrf_token` con `SameSite=Lax`; todas las peticiones `POST`, `PUT` y `DELETE` hacia `/api/` validan la cabecera `X-CSRF-Token` y el `Origin` autorizado.
* **CORS Estricto (sin comodín `*`):** Lista blanca de orígenes autorizados (`localhost:3001`, `localhost:5173` o `ALLOWED_ORIGINS` en `.env`), rechazando orígenes no autorizados con `HTTP 403`.
* **RBAC en el Servidor y Rate Limiting:** Matriz `permisosPorRol` con denegación por defecto (`requierePermiso('dashboard:ver')` en `/api/dashboard`) y limitación de tasa contra fuerza bruta.

### Deep Research y Simulación Controlada de Inyección SQL

* **Investigación profunda:** [`docs/deep_research_sql_injection.md`](./docs/deep_research_sql_injection.md)
* **Ejecutar simulación local (Antes vs. Después + CORS/CSRF/CSP/RBAC):**
  ```bash
  cd backend && node scripts/simular_ataque_sqli.js
  ```
* **Nota importante:** La simulación se ejecuta **únicamente sobre este mini proyecto y en un entorno local de pruebas**. Está prohibido realizar pruebas contra sistemas de terceros, de la institución o cualquier sitio sin autorización.

---
*Innovatech Solutions S.A. · Departamento de Recursos Humanos & Arquitectura de Software*
