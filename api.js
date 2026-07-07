/**
 * API + Dashboard SIES — BigQuery
 * SQL directo a BigQuery, milisegundos de respuesta
 */

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter._data === '1') {
      return getJsonData(e);
    }
    if (e && e.parameter && e.parameter._test === '1') {
      return testPage();
    }
    if (e && e.parameter && e.parameter._bq === '1') {
      return bigqueryStats();
    }
    return HtmlService.createHtmlOutputFromFile('frontend_vue')
      .setTitle('Dashboard SIES - Oferta Académica')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function bigqueryStats() {
  try {
    var sql = "SELECT `Año`, COUNT(*) as cnt FROM SIES.Oferta GROUP BY `Año` ORDER BY `Año`";
    var request = { query: sql, useLegacySql: false, location: 'northamerica-northeast1' };
    var result = BigQuery.Jobs.query(request, 'dotacion-ua');
    var rows = result.rows || [];
    var data = rows.map(function(r) {
      return { año: r.f[0].v, filas: parseInt(r.f[1].v) };
    });
    var total = data.reduce(function(s, r) { return s + r.filas; }, 0);
    return jsonResponse({ totalFilas: total, porAño: data });
  } catch (e) {
    return jsonResponse({ error: e.message });
  }
}

function testPage() {
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head></head><body>' +
    '<h1>Test</h1>' +
    '<div id="msg" style="color:red">JS no funciona</div>' +
    '<script>document.getElementById("msg").textContent="JS FUNCIONA - "+new Date();</script>' +
    '<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js" onerror="document.getElementById(\'msg\').textContent+=\' | VUE CDN ERROR\'"></script>' +
    '<script>document.getElementById("msg").textContent+=" | Vue="+typeof Vue</script>' +
    '</body></html>'
  ).setTitle('Test')
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getJsonData(e) {
  var params = e ? e.parameter : {};
  var sql = "SELECT * FROM SIES.Oferta";
  var where = [];

  if (params._anio) where.push("`Año` = " + parseInt(params._anio));

  if (where.length) sql += " WHERE " + where.join(" AND ");
  sql += " ORDER BY `Año` DESC, `Nombre IES`, `Nombre Carrera`";

  if (params._limit) sql += " LIMIT " + parseInt(params._limit);

  var request = { query: sql, useLegacySql: false, location: 'northamerica-northeast1' };
  var result = BigQuery.Jobs.query(request, 'dotacion-ua');

  // Convertir a array de objetos
  var rows = result.rows || [];
  var cols = (result.schema && result.schema.fields) ? result.schema.fields.map(function(f) { return f.name; }) : [];
  var data = rows.map(function(row) {
    var obj = {};
    row.f.forEach(function(field, i) { obj[cols[i]] = field.v; });
    return obj;
  });

  return jsonResponse(data);
}

/**
 * Chat con Gemini — NL → SQL → BigQuery → Respuesta natural
 */
function chatWithData(question) {
  var apiKey = getChatApiKey();
  if (!apiKey) return { error: 'Falta GROQ_API_KEY en Script Properties' };

  // Test Groq primero
  var test = testGroq();
  if (test.error || test.code !== 200) {
    return { error: 'Groq API no accesible: ' + JSON.stringify(test) };
  }

  var schema = getTableSchema();
  var sql = generateSQL(question, schema);
  if (!sql) return { error: 'No pude generar una consulta SQL para tu pregunta. Schema usado: ' + schema.substring(0, 200) };

  var data = executeSQL(sql);
  if (!data) return { error: 'Error ejecutando SQL: ' + sql.substring(0, 200) };

  var response = generateResponse(question, sql, data);

  return {
    question: question,
    sql: sql,
    rows: data ? data.length : 0,
    response: response,
    data: data ? data.slice(0, 20) : []
  };
}

var CHAT_MODEL = 'llama-3.3-70b-versatile';

function getChatApiKey() {
  var key = PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY');
  if (!key) throw new Error('Falta GROQ_API_KEY en Script Properties. Ve a Proyecto > Propiedades del proyecto > Script Properties y agrega la clave.');
  return key;
}

function getTableSchema() {
  try {
    var request = {
      query: 'SELECT column_name, data_type FROM SIES.INFORMATION_SCHEMA.COLUMNS WHERE table_name = "Oferta"',
      useLegacySql: false,
      location: 'northamerica-northeast1'
    };
    var result = BigQuery.Jobs.query(request, 'dotacion-ua');
    var rows = result.rows || [];
    if (rows.length) {
      return rows.map(function(r) {
        return r.f[0].v + ' (' + r.f[1].v + ')';
      }).join(', ');
    }
  } catch (e) {
    console.error('INFORMATION_SCHEMA fallo:', e.message);
  }
  // Fallback: schema hardcodeado
  return 'Año (INT64), Tipo Institución 1 (STRING), Nombre IES (STRING), Nombre Sede (STRING), Nombre Carrera (STRING), Área Carrera Genérica (STRING), Grado Académico (STRING), Modalidad (STRING), Jornada (STRING), Nivel Global (STRING), Nivel Carrera (STRING), Vacantes Semestre Uno (INT64), Matrícula Anual (STRING), Arancel Anual (FLOAT64), Acreditación Carrera o Programa (STRING), Vigencia (STRING), Duración Estudios (INT64), Región Sede (STRING), Ponderación Notas (FLOAT64), Ponderación Ranking Notas (FLOAT64), Ponderación Lenguaje (FLOAT64), Ponderación Matemáticas (FLOAT64), Ponderación Matemáticas 2 (FLOAT64), Ponderación Historia (FLOAT64), Ponderación Ciencias (FLOAT64), Ponderación Otros (FLOAT64)';
}

function generateSQL(question, schema) {
  var prompt = [
    'Eres un asistente SQL para BigQuery. La tabla se llama `SIES.Oferta` con estas columnas:',
    '',
    schema,
    '',
    'Ejemplos de valores:',
    '- Nombre IES: "UNIVERSIDAD AUTONOMA DE CHILE", "PONTIFICIA UNIVERSIDAD CATOLICA DE CHILE"',
    '- Año: 2018 a 2026 (ignora cualquier consulta de años anteriores)',
    '- Nivel Global: "Pregrado", "Postgrado"',
    '- Modalidad: "Presencial", "No Presencial"',
    '- Región Sede: "Metropolitana", "REGION DE LA ARAUCANIA", etc.',
    '- Área Carrera Genérica: "Enfermería", "Ingeniería", "Derecho", etc.',
    '- Vigencia: "Vigente con estudiantes nuevos", "Vigente sin estudiantes nuevos"',
    '- Vacantes Semestre Uno: número entero',
    '- Arancel Anual: número en pesos chilenos',
    '',
    'IMPORTANTE:',
    '- Usa siempre `LIMIT 100` al final',
    '- Los nombres de columna tienen espacios, usa backticks: `Nombre IES`',
    '- NUNCA uses DELETE, UPDATE, INSERT, DROP, ALTER',
    '- Solo SELECT',
    '- La UA es "UNIVERSIDAD AUTONOMA DE CHILE" (sin tilde en AUTONOMA)',
    '',
    'Pregunta del usuario: ' + question,
    '',
    'Responde UNICAMENTE con la consulta SQL, sin explicaciones ni markdown. Solo el SQL puro.'
  ].join('\n');

  var sql = callLLM(prompt);
  if (!sql) return null;

  // Limpiar respuesta (quitar ```sql ... ```)
  sql = sql.replace(/```sql\s*/gi, '').replace(/```\s*/g, '').trim();

  // Validar que sea SELECT
  if (!sql.toUpperCase().startsWith('SELECT')) {
    console.error('Groq no genero SELECT:', sql.substring(0, 200));
    return null;
  }

  return sql;
}

function executeSQL(sql) {
  try {
    var request = { query: sql, useLegacySql: false, location: 'northamerica-northeast1' };
    var result = BigQuery.Jobs.query(request, 'dotacion-ua');
    var rows = result.rows || [];
    var cols = (result.schema && result.schema.fields) ? result.schema.fields.map(function(f) { return f.name; }) : [];
    return rows.map(function(row) {
      var obj = {};
      row.f.forEach(function(field, i) { obj[cols[i]] = field.v; });
      return obj;
    });
  } catch (e) {
    console.error('SQL Error:', e.message);
    return null;
  }
}

function generateResponse(question, sql, data) {
  var dataStr = data ? JSON.stringify(data.slice(0, 20)).substring(0, 3000) : 'Sin resultados';
  var prompt = [
    'Eres un asistente amable que ayuda a analizar datos de educación superior en Chile (SIES).',
    'Responde en español, de forma clara y directa. Usa formato legible.',
    '',
    'Pregunta del usuario: ' + question,
    'SQL ejecutado: ' + sql,
    'Resultados (max 20 filas): ' + dataStr,
    'Total de filas: ' + (data ? data.length : 0),
    '',
    'Da una respuesta conversacional explicando los resultados. Si hay muchas filas, resume los hallazgos clave. Si el total es 0, explica que no se encontraron datos.',
    'Incluye contexto relevante sobre las universidades chilenas si aplica. NO uses markdown, solo texto plano.'
  ].join('\n');

  return callLLM(prompt);
}

function callLLM(prompt) {
  var url = 'https://api.groq.com/openai/v1/chat/completions';
  var payload = {
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1000
  };
  var options = {
    method: 'post',
    headers: { Authorization: 'Bearer ' + getChatApiKey() },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var text = response.getContentText();
    
    if (code !== 200) {
      console.error('Groq HTTP ' + code + ': ' + text.substring(0, 500));
      return null;
    }
    
    var json = JSON.parse(text);
    if (json.choices && json.choices[0] && json.choices[0].message) {
      return json.choices[0].message.content.trim();
    }
    console.error('Groq respuesta inesperada: ' + text.substring(0, 500));
    return null;
  } catch (e) {
    console.error('Groq fetch error: ' + e.message);
    return null;
  }
}

// Funcion de diagnostico para probar la conexion Groq
function testGroq() {
  var apiKey = getChatApiKey();
  if (!apiKey) return { error: 'Falta GROQ_API_KEY en Script Properties' };
  try {
    var url = 'https://api.groq.com/openai/v1/chat/completions';
    var options = {
      method: 'post',
      headers: { Authorization: 'Bearer ' + apiKey },
      contentType: 'application/json',
      payload: JSON.stringify({
        model: CHAT_MODEL,
        messages: [{ role: 'user', content: 'Di OK' }],
        max_tokens: 5
      }),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    return {
      code: response.getResponseCode(),
      body: response.getContentText().substring(0, 500)
    };
  } catch (e) {
    return { error: e.message, stack: e.stack ? e.stack.substring(0, 300) : '' };
  }
}

function doPost(e) {
  return jsonResponse({ error: "POST no soportado en BigQuery" });
}

/**
 * Retorna la lista de años disponibles en la tabla SIES.Oferta.
 * Query rápido (~1 seg) — se usa para poblar el filtro de año en el frontend.
 */
function getAniosDisponibles() {
  var sql = 'SELECT DISTINCT `Año` FROM SIES.Oferta WHERE `Año` >= 2018 ORDER BY `Año` DESC';
  var rows = runBigQuery(sql, []);
  return rows.map(function(r) { return parseInt(r['Año']); }).filter(function(a) { return !isNaN(a); });
}

/**
 * Retorna estadísticas agregadas para el panel de Resumen.
 * SQL GROUP BY — sin mover filas completas al cliente.
 */
function getResumenStats() {
  var sqlVacantes = [
    'SELECT `Año`,',
    '  COUNT(*) AS programas,',
    '  SUM(`Vacantes Semestre Uno`) AS vacantes,',
    '  AVG(`Arancel Anual`) AS arancel_prom',
    'FROM SIES.Oferta',
    'WHERE `Año` >= 2018',
    'GROUP BY `Año`',
    'ORDER BY `Año` DESC'
  ].join(' ');
  var porAnio = runBigQuery(sqlVacantes, []);

  var sqlCarreras = 'SELECT COUNT(DISTINCT `Nombre Carrera`) AS carreras FROM SIES.Oferta WHERE `Año` >= 2018';
  var carr = runBigQuery(sqlCarreras, []);

  return {
    porAnio: porAnio,
    totalCarreras: carr.length ? parseInt(carr[0]['carreras']) : 0
  };
}

/**
 * Retorna todos los registros de un año específico.
 * Al filtrar por año: ~10K-15K filas en lugar de 190K.
 */
function getOfertaByAnio(anio) {
  var sql = 'SELECT * FROM SIES.Oferta WHERE `Año` = @anio';
  var params = [
    { name: 'anio', parameterType: { type: 'INT64' }, parameterValue: { value: String(anio) } }
  ];
  return runBigQuery(sql, params);
}

/**
 * Ejecuta una query en BigQuery con paginación completa.
 * Usa Jobs.insert + getQueryResults para manejar resultsets grandes
 * sin cortes por timeout, a diferencia de Jobs.query.
 */
function runBigQuery(sql, queryParameters) {
  var projectId = 'dotacion-ua';
  var location   = 'northamerica-northeast1';

  // 1. Crear job asíncrono
  var jobBody = {
    configuration: {
      query: {
        query: sql,
        useLegacySql: false,
        location: location,
        queryParameters: queryParameters || []
      }
    }
  };
  var job = BigQuery.Jobs.insert(jobBody, projectId);
  var jobId = job.jobReference.jobId;

  // 2. Esperar que complete (polling)
  var maxWait = 60, waited = 0;
  while (waited < maxWait) {
    Utilities.sleep(1000);
    waited++;
    var status = BigQuery.Jobs.get(projectId, jobId, { location: location });
    if (status.status.state === 'DONE') {
      if (status.status.errorResult) {
        throw new Error('BigQuery error: ' + status.status.errorResult.message);
      }
      break;
    }
  }
  if (waited >= maxWait) throw new Error('BigQuery timeout después de ' + maxWait + ' segundos.');

  // 3. Leer resultados con paginación
  var allRows = [];
  var cols = [];
  var pageToken = null;
  var firstPage = true;

  do {
    var opts = { maxResults: 5000, location: location };
    if (pageToken) opts.pageToken = pageToken;

    var page = BigQuery.Jobs.getQueryResults(projectId, jobId, opts);

    if (firstPage) {
      cols = (page.schema && page.schema.fields) ? page.schema.fields.map(function(f) { return f.name; }) : [];
      firstPage = false;
    }

    (page.rows || []).forEach(function(row) {
      var obj = {};
      row.f.forEach(function(field, i) { obj[cols[i]] = field.v; });
      allRows.push(obj);
    });

    pageToken = page.pageToken || null;
  } while (pageToken);

  return allRows;
}

// Mantener compatibilidad con llamadas antiguas
function getDataForDashboard(anio) {
  var activeAnio = anio || 2026;
  var data = getOfertaByAnio(activeAnio);
  
  // Si es la carga inicial (sin año especificado), adjuntar los años disponibles
  if (!anio) {
    var aniosList = getAniosDisponibles();
    return {
      datos: data,
      aniosDisponibles: aniosList,
      initial: true
    };
  }
  
  return data;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
