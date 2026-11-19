# DIAGRAMA Y ESPECIFICACIÓN DE ARQUITECTURA DEL SISTEMA
## Portal de Consulta de Políticas de Recursos Humanos con RAG Multiagente
**Organización:** Innovatech Solutions S.A.  
**Plataforma Tecnológica:** Node.js (Express), Better-SQLite3, Hybrid Vector RAG, Google Gemini SDK y React SPA  
**Versión:** 2.1 (Producción)  
**Fecha:** 18 de Noviembre de 2026  

---

## 1. Visión General de la Arquitectura

El sistema implementa una arquitectura desacoplada de dos caminos independientes:
1. **Camino Conversacional (On-Demand):** Activado por consultas de colaboradores en lenguaje natural, administrado por un **Orquestador** que clasifica la intención, aplica filtros de privacidad de datos personales y delega a agentes especializados (**Agente de Políticas RAG** o **Agente de Datos del Colaborador**), auditado por un **Agente Validador**.
2. **Camino de Reportería Diaria (Batch / Scheduled):** Activado automáticamente cada mañana a las **7:00 a. m.** mediante un scheduler (`node-cron`), donde el **Agente Analista de Reportes** ejecuta agregaciones SQL, sintetiza un resumen ejecutivo estrictamente apegado a las cifras y persiste el informe en la tabla `reportes_diarios`, el cual es consumido de forma exclusiva por usuarios con rol RRHH en el Dashboard.

---

## 2. Diagrama de Componentes y Flujo de Datos

```mermaid
flowchart TD
    subgraph Usuarios["Capa de Usuarios & Roles"]
        UserColab["Colaborador (Chat Web)"]
        UserRRHH["Líder / Jefatura RRHH (Dashboard)"]
    end

    subgraph Orquestacion["Capa de Orquestación & Seguridad"]
        Orchestrator["Agente Orquestador\n(Clasificador de Intención & RBAC)"]
        Validator["Agente Validador (Bonus)\n(Auditoría de Citas & Fugas)"]
        Scheduler["Programador Diario Cron\n(Dispara a las 7:00 a. m.)"]
    end

    subgraph AgentesEspecializados["Agentes Especializados"]
        PolicyAgent["Agente de Políticas (RAG)\n(Recuperación con Citas a Drive)"]
        DataAgent["Agente de Datos del Colaborador\n(Consultas SQL Parametrizadas)"]
        AnalystAgent["Agente Analista de Reportes\n(Agregación SQL & Resumen LLM)"]
        EscalationAgent["Agente de Escalamiento (Bonus)\n(Gestión de Tickets RRHH)"]
        IngestionAgent["Agente de Ingesta & Sincronización\n(Extracción PDF/MD/CSV & Chunker)"]
    end

    subgraph Almacenamiento["Capa de Almacenamiento & Fuentes de Verdad"]
        VectorDB[("Base Vectorial\n(documentos_vectoriales\n64 Chunks + Metadatos)")]
        SQLDB[("Base de Datos Relacional\n(colaboradores, saldos, solicitudes,\nincapacidades, movimientos, logs)")]
        DriveRepo["Google Drive / Carpeta de Políticas\n(PDF, Markdown, CSV)"]
    end

    subgraph LLMService["Modelos de Lenguaje & Embeddings"]
        GeminiAPI["Google Gemini 1.5 Flash / Embeddings\n(vía SDK oficial @google/genai)"]
    end

    %% Conexiones de Usuario
    UserColab -->|"Pregunta en lenguaje natural"| Orchestrator
    UserRRHH -->|"Consulta Dashboard & KPIs"| SQLDB

    %% Orquestador a Agentes
    Orchestrator -->|"Intención: política"| PolicyAgent
    Orchestrator -->|"Intención: dato_personal"| DataAgent
    Orchestrator -->|"Intención: mixta (combina)"| DataAgent
    Orchestrator -->|"Intención: mixta (combina)"| PolicyAgent
    Orchestrator -->|"Intención: restringida (Q21/Q22)"| Orchestrator
    Orchestrator -->|"Filtro de salida"| Validator

    %% Flujos de Agentes a Almacenes
    PolicyAgent -->|"Búsqueda semántica híbrida"| VectorDB
    PolicyAgent -->|"Síntesis con contexto"| GeminiAPI
    PolicyAgent -.->|"Baja confianza / sin política"| EscalationAgent

    DataAgent -->|"SELECT filtrado por colaborador_id"| SQLDB
    
    Scheduler -->|"Disparo matutino"| AnalystAgent
    AnalystAgent -->|"Agregaciones SQL (8 métricas)"| SQLDB
    AnalystAgent -->|"Redacción ejecutiva fiel"| GeminiAPI
    AnalystAgent -->|"INSERT reporte diario"| SQLDB

    IngestionAgent -->|"Lectura periódica / changes.list"| DriveRepo
    IngestionAgent -->|"Chunking 500-1000 tokens"| VectorDB

    EscalationAgent -->|"INSERT ticket"| SQLDB
    Validator -->|"Respuesta final aprobada"| UserColab
```

---

## 3. Diagrama de Secuencia: Consulta Mixta (Pregunta 19)

El siguiente diagrama detalla cómo el orquestador coordina múltiples agentes para responder preguntas compuestas como:  
*"¿Cuántos días me quedan y puedo pasar los que sobren al otro año?"*

```mermaid
sequenceDiagram
    autonumber
    actor C as Colaborador (Carlos Morales)
    participant O as Orquestador
    participant D as Agente de Datos
    participant P as Agente de Políticas (RAG)
    participant V as Agente Validador
    participant S as Base de Datos SQL
    participant R as Base Vectorial (Drive)

    C->>O: "¿Cuántos días me quedan y puedo pasar los que sobren al otro año?"
    Note over O: Clasifica intención: "mixta"<br/>Detecta necesidad de saldo + regla
    
    par Consulta de Saldo Personal
        O->>D: Obtener saldo para colaborador_id = 2
        D->>S: SELECT dias_disponibles FROM saldos_vacaciones WHERE colaborador_id = 2
        S-->>D: dias_disponibles = 12.0
        D-->>O: Saldo: 12.0 días disponibles
    and Consulta de Política RAG
        O->>P: "¿Puedo acumular vacaciones para el próximo año?"
        P->>R: Búsqueda vectorial (POL-01-Vacaciones-y-Feriados)
        R-->>P: Chunk 3: Regla de acumulación (máx 5 días en Q1)
        P-->>O: Respuesta con cita formal y enlace Drive
    end

    Note over O: Fusiona ambas respuestas:<br/>Saldo personal (12.0) + Regla de traslado (máx 5 días)
    O->>V: Auditar respuesta (revisión de citas y privacidad)
    V-->>O: Aprobado (cero fugas, citas válidas)
    O-->>C: Respuesta completa con citas y metadatos
```

---

## 4. Diagrama de Secuencia: Reportería Diaria Programada (7:00 a. m.)

```mermaid
sequenceDiagram
    autonumber
    participant C as Programador Cron (7:00 a. m.)
    participant A as Agente Analista de Reportes
    participant S as Base de Datos SQL
    participant L as LLM (Gemini)
    actor R as Jefa de RRHH (Mariana Soto)

    C->>A: Disparo de tarea diaria
    Note over A: Ejecuta consultas de agregación SQL
    A->>S: 1. Ausentes hoy por tipo y departamento
    A->>S: 2. Solicitudes pendientes (> 3 días)
    A->>S: 3. Incapacidades activas y días acumulados
    A->>S: 4. Ingresos, salidas y rotación mensual
    A->>S: 5. Colaboradores con > 20 días vacaciones
    A->>S: 6. Métricas del chatbot (latencia y resolución)
    A->>S: 7. Top temas y preguntas no respondidas
    S-->>A: Dataset JSON consolidado con las 8 métricas

    A->>L: Prompt con dataset exacto para redactar resumen ejecutivo de 3-5 frases
    L-->>A: Resumen ejecutivo fiel a las cifras numéricas
    A->>S: INSERT INTO reportes_diarios (fecha, datos_json, resumen_texto)

    Note over R: Jefa de RRHH abre el Dashboard
    R->>S: GET /api/dashboard/stats (con header x-user-role: rrhh)
    S-->>R: Carga 4 KPI cards, 2 gráficos, solicitudes y resumen del analista
```

---

## 5. Matriz de Responsabilidades de los Agentes

| Agente | Responsabilidad Principal | Herramientas Utilizadas | Salida Entregada |
|---|---|---|---|
| **Orquestador** | Clasificación de intención, gestión de memoria de sesión, enrutamiento, rechazo de consultas prohibidas (Q21/Q22) y fusión de respuestas mixtas. | Clasificador LLM / Reglas semánticas, RBAC. | Agente destino, consulta reformulada o negativa formal. |
| **Políticas (RAG)** | Respuestas exclusivas sobre normativas internas a partir de documentos de Google Drive. | Búsqueda vectorial híbrida (TF-IDF/BM25/Gemini), LLM. | Respuesta estructurada + citas oficiales (documento, sección, enlace). |
| **Datos del Colaborador** | Consulta de saldos personales, estado de solicitudes, fechas de pago y evaluaciones. | SQL parametrizado `WHERE colaborador_id = ?`. | Respuesta con cifras numéricas exactas. |
| **Analista de Reportes** | Generación de la foto diaria del personal a las 7:00 a. m. y bajo demanda. | Agregaciones SQL, LLM para síntesis ejecutiva sin números inventados. | Registro JSON en `reportes_diarios` + resumen de 3-5 frases. |
| **Ingesta & Sincronización** | Mantenimiento del índice vectorial al día con cambios en Drive (PDF, MD, CSV). | Drive connector, chunker de 500-1000 tokens, generador de embeddings. | Chunks actualizados en `documentos_vectoriales`. |
| **Validador (Bonus)** | Auditoría de seguridad y fidelidad de citas antes del despacho al usuario. | Reglas de privacidad Ley N° 8968, parser de citas. | Veredicto booleano y respuesta aprobada o bloqueada. |
| **Escalamiento (Bonus)** | Generación de tickets formales para RRHH cuando la política no existe en los documentos. | Inserción en `tickets_escalamiento`. | Número de radicado `#TICK-X` y tiempo estimado de respuesta. |
