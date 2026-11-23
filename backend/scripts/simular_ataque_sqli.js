/**
 * Simulación Controlada de Ataque de Inyección SQL (ANTES vs. DESPUÉS)
 * y Verificación de CORS, CSRF y CSP
 *
 * IMPORTANTE: Esta simulación se ejecuta ÚNICAMENTE contra la base de datos
 * local de pruebas del propio Mini Proyecto #2 (Innovatech Solutions S.A.).
 */
const { db } = require('../src/database/connection');

const PAYLOAD_SQLI = "' OR '1'='1";
const PAYLOAD_UNION = "' UNION SELECT id, nombre, email, departamento, puesto, rol FROM colaboradores --";

console.log('====================================================================');
console.log('  SIMULACIÓN CONTROLADA DE SEGURIDAD - MINI PROYECTO #2');
console.log('  Entorno: Base de datos local de pruebas (SQLite)');
console.log('====================================================================\n');

// ---------------------------------------------------------------------------
// 1. SIMULACIÓN DE INYECCIÓN SQL: ANTES (VULNERABLE) vs. DESPUÉS (SEGURO)
// ---------------------------------------------------------------------------
console.log('--- PASO A: VERSIÓN VULNERABLE (Concatenación directa de SQL) ---');
console.log(`Payload inyectado en email: ${PAYLOAD_SQLI}`);

const vulnerableSql =
  "SELECT id, nombre, email, departamento, puesto, rol FROM colaboradores WHERE email = '" +
  PAYLOAD_SQLI +
  "'";
console.log(`Consulta ejecutada: ${vulnerableSql}`);

const leakedRows = db.prepare(vulnerableSql).all();
console.log(`[VULNERABLE] Filas expuestas sin autorización: ${leakedRows.length} colaboradores!`);
console.log('Muestra de datos filtrados (primeros 3 registros):');
leakedRows.slice(0, 3).forEach(r => {
  console.log(`  - ID ${r.id} | ${r.nombre} | ${r.email} | Rol: ${r.rol}`);
});

console.log('\n--- PASO B: VERSIÓN PROTEGIDA (Sentencia Parametrizada) ---');
console.log(`Mismo payload inyectado: ${PAYLOAD_SQLI}`);
const safeSql =
  'SELECT id, nombre, email, departamento, puesto, rol FROM colaboradores WHERE email = ?';
console.log(`Consulta preparada: ${safeSql}`);
const safeRows = db.prepare(safeSql).all(PAYLOAD_SQLI);
console.log(`[PROTEGIDO] Filas devueltas: ${safeRows.length} (El payload fue tratado como texto literal).`);

const safeUnionRows = db.prepare(safeSql).all(PAYLOAD_UNION);
console.log(`[PROTEGIDO] Payload UNION SELECT devuelto: ${safeUnionRows.length} filas (Ataque bloqueado).\n`);

// ---------------------------------------------------------------------------
// 2. VERIFICACIÓN EN VIVO DE CORS, CSRF Y CABECERAS CSP (si el servidor corre)
// ---------------------------------------------------------------------------
async function verifyLiveProtections() {
  const baseUrl = 'http://localhost:3001';
  console.log('--- PASO C: VERIFICACIÓN DE CORS, CSRF, XSS/CSP Y RBAC EN SERVIDOR ---');

  try {
    // 1. Verificar cabeceras CSP y seguridad
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const csp = healthRes.headers.get('content-security-policy');
    const xfo = healthRes.headers.get('x-frame-options');
    console.log(`[CSP] Content-Security-Policy presente: ${csp ? 'SÍ' : 'NO'}`);
    console.log(`[XSS] X-Frame-Options: ${xfo}`);

    // 2. Probar CORS desde origen malicioso
    const badCorsRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://sitio-malicioso.com' }
    });
    console.log(`[CORS] Petición desde https://sitio-malicioso.com -> HTTP ${badCorsRes.status} (Esperado: 403)`);

    // 3. Probar CSRF: POST sin token anti-CSRF
    const badCsrfRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colaboradorId: 2, query: 'Hola' })
    });
    console.log(`[CSRF] POST /api/chat sin token anti-CSRF -> HTTP ${badCsrfRes.status} (Esperado: 403)`);

    // 4. Probar CSRF válido: obtener cookie + token y enviar POST
    const tokenRes = await fetch(`${baseUrl}/api/security/csrf-token`);
    const setCookie = tokenRes.headers.get('set-cookie') || '';
    const { csrfToken } = await tokenRes.json();
    const okCsrfRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: setCookie.split(';')[0]
      },
      body: JSON.stringify({ colaboradorId: 2, query: '¿Cuántos días de vacaciones me corresponden al año?' })
    });
    console.log(`[CSRF] POST /api/chat CON token válido + cookie SameSite=Lax -> HTTP ${okCsrfRes.status} (Esperado: 200)`);

    // 5. Probar RBAC: colaborador intentando acceder a Dashboard RRHH
    const rbacRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      headers: { 'x-user-role': 'colaborador' }
    });
    console.log(`[RBAC] GET /api/dashboard/stats con rol colaborador -> HTTP ${rbacRes.status} (Esperado: 403)`);
  } catch (err) {
    console.log('(Servidor no iniciado en :3001 durante la prueba local; inícialo para ejecutar el Paso C.)');
  }

  console.log('\n====================================================================');
  console.log('  FIN DE LA SIMULACIÓN DE SEGURIDAD');
  console.log('====================================================================');
}

verifyLiveProtections();
