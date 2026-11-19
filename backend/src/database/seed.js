/**
 * Database seeder for 52 simulated employees and 3 months of operational history.
 * 100% Node.js implementation using better-sqlite3.
 */
const { db, initDatabaseSchema } = require('./connection');

const NOMBRES = [
  "Mariana Soto Vargas", "Carlos Morales Soto", "Gabriel Monge Brenes", "Sofía Cordero Valverde",
  "Roberto Mora Solano", "Andrés Chaves Montero", "Valeria Jiménez Castro", "Esteban Rojas Navarro",
  "Lucía Fernández Mora", "Diego Vargas Elizondo", "Daniela Solano Carvajal", "Alejandro Castro Campos",
  "Paola Araya Guadamuz", "Kevin Umaña Fallas", "Elena Porras Quirós", "Manuel González Solís",
  "Adriana Méndez Fonseca", "Mauricio Valverde Bolaños", "Camila Céspedes Segura", "Fabián Leitón Zúñiga",
  "Silvia Delgado Gamboa", "Jorge Arroyo Alvarado", "Natalia Cordero Méndez", "Felipe Murillo Blanco",
  "Laura Salazar Vindas", "Ricardo Chacón Arguedas", "Melany Cordero Solano", "Gonzalo Barboza Pérez",
  "Andrea Monestel Soto", "Pablo Sanabria Venegas", "Raquel Guido Bonilla", "Sebastián Calvo Marín",
  "Jimena Sandí Quesada", "Gustavo Guillén Alpízar", "Monserrat Cruz Picado", "Óscar Villalobos Brenes",
  "Beatriz Guzmán Badilla", "David Madrigal Retana", "Catalina Brenes Montero", "Ignacio Solano Ureña",
  "Tatiana Oviedo Mora", "Héctor Abarca Porras", "Priscila Fallas Maroto", "Emilio Cerdas Valverde",
  "Viviana Bonilla Segura", "Federico Carrillo Soto", "Yocelyn Hidalgo Campos", "Josué Garita Vega",
  "Karla Miranda Salas", "Christian Tenorio Blanco", "Mariela Vindas Rojas", "Alonso Zumbado Mora"
];

const DEPARTAMENTOS = ["Ingeniería", "Producto", "Operaciones & Cloud", "Recursos Humanos", "Finanzas", "Ventas & Clientes"];

const PUESTOS = {
  "Ingeniería": ["Desarrollador Full Stack Senior", "Desarrollador Backend Mid", "Desarrollador Frontend Mid", "Ingeniero DevOps", "Arquitecto Cloud", "QA Automation Engineer"],
  "Producto": ["Product Owner", "UX/UI Designer", "Product Analyst", "Scrum Master"],
  "Operaciones & Cloud": ["SRE Specialist", "Cloud Infrastructure Engineer", "Security Operations Analyst", "Soporte Técnico L2"],
  "Recursos Humanos": ["Directora de Gestión del Talento Humano", "Oficial de Cumplimiento", "Jefe de Compensación y Planilla", "Especialista en Atracción de Talento"],
  "Finanzas": ["Contador General", "Analista Financiero Senior", "Especialista en Tesorería", "Asistente Contable"],
  "Ventas & Clientes": ["Customer Success Lead", "Account Executive", "Especialista de Soporte al Cliente", "Sales Development Rep"]
};

function seedDatabase() {
  console.log("Reinitializing database schema...");
  
  // Clean tables
  db.exec(`
    DELETE FROM tickets_escalamiento;
    DELETE FROM reportes_diarios;
    DELETE FROM consultas_chat;
    DELETE FROM movimientos_personal;
    DELETE FROM incapacidades;
    DELETE FROM solicitudes;
    DELETE FROM saldos_vacaciones;
    DELETE FROM colaboradores;
  `);

  console.log("Seeding 52 simulated collaborators...");
  const insertColab = db.prepare(`
    INSERT INTO colaboradores (id, nombre, email, departamento, puesto, fecha_ingreso, jefe_id, rol, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSaldo = db.prepare(`
    INSERT INTO saldos_vacaciones (colaborador_id, periodo, dias_asignados, dias_tomados, dias_disponibles)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertSolicitud = db.prepare(`
    INSERT INTO solicitudes (colaborador_id, tipo, fecha_inicio, fecha_fin, estado, aprobador_id, creada_en, motivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertIncapacidad = db.prepare(`
    INSERT INTO incapacidades (colaborador_id, tipo, fecha_inicio, dias, entidad, estado)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertMovimiento = db.prepare(`
    INSERT INTO movimientos_personal (colaborador_id, tipo, fecha, motivo)
    VALUES (?, ?, ?, ?)
  `);

  const insertConsulta = db.prepare(`
    INSERT INTO consultas_chat (colaborador_id, pregunta, intencion, agente, documentos_citados, resuelta, escalada, latencia_ms, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReporte = db.prepare(`
    INSERT INTO reportes_diarios (fecha, datos_json, resumen_texto, generado_por)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    // 1. Fixed key collaborators
    // Mariana Soto (HR Director - HR role)
    insertColab.run(1, "Mariana Soto Vargas", "mariana.soto@innovatech.cr", "Recursos Humanos", "Directora de Gestión del Talento Humano", "2021-03-01", null, "rrhh", "activo");
    // Carlos Morales (Senior Developer - Collaborator role)
    insertColab.run(2, "Carlos Morales Soto", "carlos.morales@innovatech.cr", "Ingeniería", "Desarrollador Full Stack Senior", "2023-05-15", 1, "colaborador", "activo");
    // Gabriel Monge (Compliance - HR role)
    insertColab.run(3, "Gabriel Monge Brenes", "gabriel.monge@innovatech.cr", "Recursos Humanos", "Oficial de Cumplimiento", "2022-01-10", 1, "rrhh", "activo");
    // Roberto Mora (Compensation - HR role)
    insertColab.run(4, "Roberto Mora Solano", "roberto.mora@innovatech.cr", "Recursos Humanos", "Jefe de Compensación y Planilla", "2022-06-01", 1, "rrhh", "activo");

    // Other 48 collaborators
    for (let i = 4; i < NOMBRES.length; i++) {
      const cid = i + 1;
      const nombre = NOMBRES[i];
      const dept = DEPARTAMENTOS[i % DEPARTAMENTOS.length];
      const puestosList = PUESTOS[dept];
      const puesto = puestosList[i % puestosList.length];
      const rol = dept === "Recursos Humanos" ? "rrhh" : "colaborador";
      const email = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ".") + "@innovatech.cr";
      const year = 2022 + (i % 4);
      const month = String(1 + (i % 12)).padStart(2, '0');
      const day = String(1 + (i % 27)).padStart(2, '0');
      const fechaIngreso = `${year}-${month}-${day}`;

      insertColab.run(cid, nombre, email, dept, puesto, fechaIngreso, 1, rol, "activo");
    }

    // 2. Vacation Balances (saldos_vacaciones)
    // Carlos Morales: exactly 12.0 available
    insertSaldo.run(2, "2025-2026", 15.0, 3.0, 12.0);
    // 4 employees with > 20 days accumulated (liability risk for Metric #5)
    insertSaldo.run(5, "2025-2026", 30.0, 5.0, 25.0);
    insertSaldo.run(8, "2025-2026", 30.0, 6.0, 24.0);
    insertSaldo.run(12, "2025-2026", 28.0, 6.0, 22.0);
    insertSaldo.run(19, "2025-2026", 30.0, 7.0, 23.0);

    // Other employees
    for (let cid = 1; cid <= NOMBRES.length; cid++) {
      if ([2, 5, 8, 12, 19].includes(cid)) continue;
      const asignados = 15.0;
      const tomados = [0.0, 1.5, 3.0, 4.0, 5.0, 6.5][cid % 6];
      insertSaldo.run(cid, "2025-2026", asignados, tomados, asignados - tomados);
    }

    // 3. Leave Requests (solicitudes)
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];
    const addDays = (d, n) => {
      const res = new Date(d);
      res.setDate(res.getDate() + n);
      return res;
    };

    // Calculate next Friday for Carlos Morales (Question 18)
    const dayOfWeek = today.getDay(); // 0 is Sun, 5 is Fri
    let daysToFriday = (5 - dayOfWeek + 7) % 7;
    if (daysToFriday === 0) daysToFriday = 7;
    const nextFriday = addDays(today, daysToFriday);

    // Carlos Morales: pending permission request for Friday
    insertSolicitud.run(
      2, "permiso", formatDate(nextFriday), formatDate(nextFriday),
      "pendiente", 1, formatDate(addDays(today, -1)) + " 10:30:00",
      "Permiso médico para cita de seguimiento en la CCSS"
    );

    // Pending requests > 3 days (Metric #2: overdue alert!)
    insertSolicitud.run(
      7, "vacaciones", formatDate(addDays(today, 10)), formatDate(addDays(today, 15)),
      "pendiente", 1, formatDate(addDays(today, -5)) + " 08:00:00",
      "Vacaciones familiares programadas"
    );
    insertSolicitud.run(
      14, "vacaciones", formatDate(addDays(today, 8)), formatDate(addDays(today, 12)),
      "pendiente", 1, formatDate(addDays(today, -4)) + " 09:15:00",
      "Semana de descanso personal"
    );

    // Active approved requests for today (Metric #1: currently absent today)
    insertSolicitud.run(
      10, "vacaciones", formatDate(addDays(today, -1)), formatDate(addDays(today, 3)),
      "aprobada", 1, formatDate(addDays(today, -10)) + " 14:00:00",
      "Periodo de vacaciones regular"
    );
    insertSolicitud.run(
      15, "permiso", formatDate(today), formatDate(today),
      "aprobada", 1, formatDate(addDays(today, -2)) + " 11:20:00",
      "Permiso especial para examen de certificación"
    );
    insertSolicitud.run(
      22, "vacaciones", formatDate(today), formatDate(addDays(today, 4)),
      "aprobada", 1, formatDate(addDays(today, -8)) + " 16:45:00",
      "Vacaciones semestrales"
    );

    // 4. Incapacidades (Incapacidades activas y pasadas para Metric #1 y #3)
    insertIncapacidad.run(18, "enfermedad_comun", formatDate(addDays(today, -2)), 5, "CCSS", "activa");
    insertIncapacidad.run(25, "accidente_laboral", formatDate(addDays(today, -4)), 10, "INS", "activa");
    insertIncapacidad.run(30, "enfermedad_comun", formatDate(addDays(today, -20)), 3, "CCSS", "concluida");

    // 5. Movimientos de personal (3 meses: Ingresos, Salidas, Ascensos)
    insertMovimiento.run(45, "ingreso", formatDate(addDays(today, -75)), "Ingreso al equipo de Operaciones");
    insertMovimiento.run(46, "ingreso", formatDate(addDays(today, -70)), "Ingreso como Desarrollador Frontend");
    insertMovimiento.run(11, "ascenso", formatDate(addDays(today, -60)), "Promoción a Desarrollador Senior");
    insertMovimiento.run(47, "salida", formatDate(addDays(today, -50)), "Renuncia voluntaria por oportunidad exterior");
    insertMovimiento.run(48, "ingreso", formatDate(addDays(today, -45)), "Ingreso a Customer Success");
    insertMovimiento.run(49, "ingreso", formatDate(addDays(today, -35)), "Ingreso a Ingeniería Backend");
    insertMovimiento.run(6, "ascenso", formatDate(addDays(today, -25)), "Promoción a Tech Lead");
    insertMovimiento.run(50, "salida", formatDate(addDays(today, -15)), "Renuncia voluntaria por cambio de residencia");
    insertMovimiento.run(51, "ingreso", formatDate(addDays(today, -10)), "Ingreso a QA Automation");
    insertMovimiento.run(52, "ingreso", formatDate(addDays(today, -5)), "Ingreso a Infraestructura Cloud");

    // 6. Consultas del chat previas (Logs para Metric #6 y #7)
    insertConsulta.run(
      2, "¿Cuántos días de vacaciones me corresponden al año?", "politica", "Agente de Políticas (RAG)",
      JSON.stringify([{ documento: "POL-01-Vacaciones-y-Feriados.md", seccion: "2. Marco Jurídico y Beneficio Superior", enlace: "https://drive.google.com/file/d/1A_vacaciones_feriados_2026/view" }]),
      1, 0, 780, formatDate(addDays(today, -1)) + " 10:15:00"
    );
    insertConsulta.run(
      2, "¿Cuántos días de vacaciones me quedan disponibles?", "dato_personal", "Agente de Datos del Colaborador",
      "[]", 1, 0, 420, formatDate(addDays(today, -1)) + " 10:20:00"
    );
    insertConsulta.run(
      5, "¿La empresa da bono por mascotas?", "sin_respuesta", "Agente de Políticas (RAG)",
      "[]", 0, 1, 650, formatDate(addDays(today, -1)) + " 11:45:00"
    );
    insertConsulta.run(
      9, "¿Cómo se pagan las horas extra?", "politica", "Agente de Políticas (RAG)",
      JSON.stringify([{ documento: "POL-04-Reglamento-Jornada-y-Teletrabajo.md", seccion: "5. Horas Extraordinarias", enlace: "https://drive.google.com/file/d/1D_jornada_teletrabajo_2026/view" }]),
      1, 0, 810, formatDate(addDays(today, -1)) + " 14:10:00"
    );
    insertConsulta.run(
      14, "¿Qué feriados quedan este año?", "politica", "Agente de Políticas (RAG)",
      JSON.stringify([{ documento: "POL-01-Vacaciones-y-Feriados.md", seccion: "4. Calendario Oficial de Feriados 2026", enlace: "https://drive.google.com/file/d/1A_vacaciones_feriados_2026/view" }]),
      1, 0, 730, formatDate(addDays(today, -1)) + " 15:30:00"
    );

    // 7. Initial Daily Report (reportes_diarios)
    const reportData = {
      fecha: formatDate(today),
      ausentes_hoy: {
        total: 4,
        por_tipo: { vacaciones: 2, permiso: 1, incapacidad: 1 },
        por_departamento: { "Ingeniería": 2, "Operaciones & Cloud": 1, "Recursos Humanos": 1 }
      },
      solicitudes_pendientes: {
        total: 3,
        mas_de_3_dias: 2
      },
      incapacidades_activas: {
        total: 2,
        dias_acumulados_mes: 15
      },
      rotacion_mensual: {
        ingresos_mes: 2,
        salidas_mes: 0,
        tasa_rotacion_acumulada_pct: 3.8
      },
      pasivo_vacaciones_riesgo: {
        colaboradores_con_mas_de_20_dias: 4,
        colaborador_ids: [5, 8, 12, 19]
      },
      metricas_chatbot: {
        consultas_dia_anterior: 18,
        porcentaje_resuelto_sin_escalar: 88.9,
        latencia_promedio_ms: 685
      },
      top_temas_consultados: [
        { tema: "Vacaciones y Feriados", consultas: 7 },
        { tema: "Teletrabajo y Horas Extra", consultas: 4 },
        { tema: "Saldo Personal", consultas: 3 },
        { tema: "Beneficios y Seguros", consultas: 2 },
        { tema: "Permisos y Licencias", consultas: 2 }
      ],
      preguntas_no_respondidas_rag: [
        "¿La empresa da bono por mascotas?",
        "¿Tienen convenio con gimnasios en Heredia?"
      ]
    };

    const resumenTexto = 
      "En la jornada de hoy se registran 4 colaboradores ausentes en la organización (2 por vacaciones, 1 por permiso y 1 por incapacidad médica en Operaciones & Cloud). " +
      "Se mantienen 3 solicitudes pendientes de aprobación en el sistema, de las cuales 2 superan los 3 días sin respuesta por parte de las jefaturas directas. " +
      "Actualmente hay 2 incapacidades médicas activas que acumulan 15 días en el mes, y se detectan 4 colaboradores con más de 20 días de vacaciones acumulados que representan riesgo de pasivo laboral. " +
      "El chatbot de RRHH atendió 18 consultas con una resolución del 88.9% sin requerir escalamiento y una latencia promedio de 685 milisegundos, siendo vacaciones y feriados el tema de mayor demanda.";

    insertReporte.run(
      formatDate(today),
      JSON.stringify(reportData),
      resumenTexto,
      "Agente Analista de Reportes"
    );
  });

  transaction();
  console.log("Database seeded successfully with 52 collaborators and full operational history!");
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
