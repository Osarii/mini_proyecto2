# Investigación Profunda (Deep Research): Inyección SQL (SQLi)

**Proyecto:** Mini Proyecto #2 · Portal de Consulta de Políticas de RRHH con RAG Multiagente  
**Empresa Simulada:** Innovatech Solutions S.A.  
**Asignación:** Seguridad en Aplicaciones Web (SQLi, XSS, CSRF, CORS y RBAC)

---

## 1. ¿Qué es la Inyección SQL (SQLi)?

La **Inyección SQL (SQL Injection o SQLi)** es una vulnerabilidad crítica de seguridad web (clasificada históricamente en el **OWASP Top 10** dentro de *A03:2021 – Injection*) que ocurre cuando una aplicación construye consultas a la base de datos concatenando directamente datos proporcionados por el usuario sin validarlos ni parametrizarlos.

Esto permite que un atacante altere la estructura lógica de la consulta SQL original, logrando:
* **Leer datos confidenciales** de otros usuarios (salarios, contraseñas, correos, expedientes).
* **Evadir mecanismos de autenticación** (iniciar sesión como administrador sin conocer la contraseña).
* **Modificar o eliminar registros** (`UPDATE`, `DELETE`, `DROP TABLE`).
* **Ejecutar comandos del sistema operativo** en configuraciones mal aseguradas.

---

## 2. ¿Cómo Funciona?

Cuando el servidor concatena cadenas de texto:
```javascript
// CÓDIGO VULNERABLE
const sql = "SELECT * FROM colaboradores WHERE email = '" + email + "'";
```
Si un usuario legítimo ingresa `carlos.morales@innovatech.cr`, la consulta busca solo a Carlos.  
Si un atacante ingresa `' OR '1'='1`, la consulta resultante es:
```sql
SELECT * FROM colaboradores WHERE email = '' OR '1'='1'
```
Como `'1'='1'` siempre evalúa a verdadero (`TRUE`), la base de datos devuelve **toda la tabla de colaboradores**, rompiendo el aislamiento de datos y exponiendo información protegida por la Ley N° 8968.

---

## 3. Tipos Principales de Inyección SQL

| Tipo de Ataque | Mecanismo | Ejemplo de Payload |
| :--- | :--- | :--- |
| **In-Band (Clásica / Tautología)** | Altera la cláusula `WHERE` para que siempre sea verdadera y devuelve los datos en la misma respuesta HTTP. | `' OR '1'='1' --` |
| **UNION-Based SQLi** | Utiliza el operador `UNION SELECT` para anexar resultados de otras tablas a la respuesta original. | `' UNION SELECT id, nombre, email FROM colaboradores --` |
| **Error-Based SQLi** | Provoca errores intencionales en el motor SQL para extraer nombres de tablas y columnas desde los mensajes de error verbosos. | `' AND 1=CONVERT(int, (SELECT @@version)) --` |
| **Blind Boolean-Based** | La aplicación no devuelve datos ni errores, pero cambia su respuesta (verdadero/falso) permitiendo inferir datos carácter por carácter. | `' AND SUBSTR(password,1,1)='a' --` |
| **Blind Time-Based** | Obliga a la base de datos a pausar la respuesta (`SLEEP(5)`) si una condición es verdadera. | `'; SELECT SLEEP(5) --` |
| **Second-Order SQLi** | El payload se guarda primero de forma segura en la BD y se ejecuta después cuando otro proceso lo lee y lo concatena en otra consulta. | Registro de nombre malicioso que luego se usa en un reporte SQL sin parametrizar. |

---

## 4. Casos Reales Conocidos

1. **MOVEit Transfer (2023):** Una vulnerabilidad crítica de inyección SQL (CVE-2023-34362) en el software de transferencia de archivos MOVEit permitió al grupo Cl0p comprometer a más de 2,500 organizaciones y exponer datos de más de 60 millones de personas a nivel mundial.
2. **Sony Pictures (2011):** El grupo LulzSec explotó una inyección SQL clásica para extraer más de un millón de cuentas de usuarios, contraseñas en texto plano y correos electrónicos.
3. **Heartland Payment Systems (2008):** Atacantes utilizaron inyección SQL para instalar malware en la red de procesamiento de pagos, comprometiendo aproximadamente 130 millones de tarjetas de crédito y débito.
4. **TalkTalk (2015):** Una inyección SQL en páginas heredadas expuso datos personales y bancarios de más de 156,000 clientes, resultando en una multa récord de la ICO en el Reino Unido.

---

## 5. Cómo se Previene (Defensa en Profundidad)

1. **Consultas Parametrizadas / Sentencias Preparadas (Defensa Principal):**  
   Separar estrictamente el código SQL de los datos del usuario usando marcadores de posición (`?`, `$1`):
   ```javascript
   // CÓDIGO SEGURO (implementado en todo el Portal de RRHH)
   db.prepare('SELECT * FROM colaboradores WHERE email = ?').get(email);
   ```
   El motor de base de datos compila primero la estructura SQL y luego enlaza el parámetro como dato literal; nunca lo interpreta como código ejecutable.
2. **Validación y Saneamiento de Entradas:** Validar tipos (`parseInt`), formatos y longitudes antes de consultar la BD.
3. **Principio de Mínimo Privilegio (RBAC):** La aplicación y cada agente solo tienen acceso a las tablas y filas permitidas para el rol autenticado (`WHERE colaborador_id = ?`).
4. **Ocultar Errores Verbosos:** Nunca devolver trazas de SQL ni nombres de columnas al cliente en producción.

---

## 6. Evidencia de Simulación Controlada en el Mini Proyecto #2

El script local [`backend/scripts/simular_ataque_sqli.js`](../backend/scripts/simular_ataque_sqli.js) ejecuta la demostración **Antes vs. Después** exclusivamente contra nuestra base de datos local de pruebas:

* **Antes (versión vulnerable por concatenación):** El payload `' OR '1'='1` expone **52 de 52 colaboradores** sin autorización.
* **Después (versión protegida con sentencias preparadas):** El mismo payload y el ataque `UNION SELECT` devuelven **0 filas**, neutralizando por completo la inyección.
* **Pruebas complementarias verificadas:**
  * **CORS:** Origen no autorizado (`https://sitio-malicioso.com`) -> **HTTP 403 Forbidden**.
  * **CSRF:** `POST /api/chat` sin token `X-CSRF-Token` -> **HTTP 403 Forbidden**; con token + cookie `SameSite=Lax` -> **HTTP 200 OK**.
  * **XSS / CSP:** Cabecera `Content-Security-Policy` y `X-Frame-Options: DENY` activas en todas las respuestas.
  * **RBAC:** `GET /api/dashboard/stats` con rol `colaborador` -> **HTTP 403 Forbidden**.
