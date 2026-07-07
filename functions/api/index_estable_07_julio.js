import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const systemPromptSQLTemplate = `Eres el asistente virtual experto del panel SIES (Sistema de Información de Educación Superior) en Chile.
Tu tarea principal es decidir si la entrada del usuario requiere buscar datos o si es conversación general.

REGLA 1 (Conversación):
Si el usuario saluda, o su consulta es puramente social o de ayuda general, responde con conversación natural anteponiendo "CHAT: " al inicio.
Ejemplo: "CHAT: Entiendo, ¿qué datos necesitas?"

REGLA 2 (Datos SQL):
Si el usuario pide datos (universidades, vacantes, alumnos, aranceles, carreras) o hace preguntas de SEGUIMIENTO ("¿y en 2024?", "¿y de psicología?", "segmentalo por año"), DEBES generar SOLO la consulta SQL en PostgreSQL y NADA MÁS. Usa el historial para entender el contexto.
ESQUEMA DE TABLAS:
1. Tabla "oferta": Guarda la oferta académica, cupos y costos monetarios.
   Columnas: año, tipo_institucion_1, nombre_ies, nombre_sede, nombre_carrera, modalidad, jornada, nivel_global, vacantes_semestre_uno (cantidad de cupos), matricula_anual (COSTO EN DINERO $, NO cantidad de alumnos), arancel_anual (costo anual en $), region_sede.
2. Tabla "matricula": Guarda la cantidad de alumnos (personas) matriculados.
   Columnas: año, tipo_institucion_1, nombre_institucion (OJO: en esta tabla se llama así, NO nombre_ies), nombre_sede, nombre_carrera, modalidad, jornada, nivel_global, total_matricula (cantidad total de alumnos), total_matricula_primer_año, total_matricula_mujeres, total_matricula_hombres.

Ejemplos SQL:
- Para evolución de alumnos en U. Autónoma: SELECT año, SUM(total_matricula) FROM matricula WHERE nombre_institucion = 'UNIVERSIDAD AUTONOMA DE CHILE' GROUP BY año ORDER BY año DESC
- Para comparar vacantes vs matrícula: SELECT o.año, SUM(o.vacantes_semestre_uno), SUM(m.total_matricula) FROM oferta o LEFT JOIN matricula m ON o.nombre_ies = m.nombre_institucion AND o.nombre_carrera = m.nombre_carrera AND o.año = m.año WHERE o.nombre_carrera ILIKE '%Medicina%' GROUP BY o.año
- Usa SIEMPRE LIMIT 100
- Usa ILIKE para búsquedas de texto.
- REGLA DE ACENTOS: Reemplaza las vocales con tilde por el comodín \`_\`. Ejemplo: \`ILIKE '%Psicolog_a%'\`.`;

function getSystemPromptResponse(dataStr, numRows) {
    return `Eres un analista de datos experto, amable y conversacional que trabaja para el panel universitario SIES en Chile.
Resultados SQL (max 20): ${dataStr}
Total de registros encontrados: ${numRows}

REGLAS:
- Eres una IA conversacional: responde con un tono cálido, natural y humano.
- Puedes hacer una breve introducción amistosa sobre el contexto de los datos que estás entregando.
- Presenta los números y hallazgos de forma clara (usa viñetas o listas si ayuda a la lectura).
- NUNCA menciones conceptos técnicos internos como "SQL", "filas", "base de datos" o "JSON".
- Destaca en negritas (**texto**) los montos, nombres de universidades y carreras.
- Si no hay datos, explícalo amablemente e invita al usuario a hacer otra consulta.`;
}

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

function json(d, s = 200) {
    return new Response(JSON.stringify(d), { status: s, headers });
}

export default async function (req) {
    // Manejar preflight OPTIONS para CORS
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    const client = new Client({
        hostname: Deno.env.get("DB_HOST"),
        port: 5432,
        database: Deno.env.get("DB_NAME"),
        user: Deno.env.get("DB_USER"),
        password: Deno.env.get("DB_PASSWORD"),
        tls: { enabled: true },
    });

    await client.connect();

    try {
        if (path.endsWith("/rpc/debug")) {
            const { rows: colOferta } = await client.queryObject("SELECT column_name FROM information_schema.columns WHERE table_name = 'oferta'");
            const { rows: colMatricula } = await client.queryObject("SELECT column_name FROM information_schema.columns WHERE table_name = 'matricula'");
            return json({ oferta: colOferta.map(r=>r.column_name), matricula: colMatricula.map(r=>r.column_name) });
        }

        // --- 1. ENDPOINTS ORIGINALES ---
        if (path.endsWith("/stats")) {
            const { rows } = await client.queryObject("SELECT get_db_stats_v2() AS result");
            return json(rows[0].result);
        }

        if (path.endsWith("/filter-options")) {
            const { rows } = await client.queryObject("SELECT get_filter_options() AS result");
            return json(rows[0].result);
        }

        if (path.endsWith("/proyectos")) {
            const { rows } = await client.queryObject("SELECT * FROM v_stats_proyectos ORDER BY año_reporte DESC LIMIT 50");
            const { rows: cnt } = await client.queryObject("SELECT COUNT(*)::int AS c FROM v_stats_proyectos");
            return json({ total: cnt[0].c, data: rows });
        }

        // --- 2. ENDPOINTS NUEVOS PARA SIES (OFERTA Y MATRICULA) ---
        
        // Obtener filtros iniciales de Oferta Académica (Años y Universidades únicas)
        if (path.endsWith("/sies-filtros")) {
            const { rows: rowsAnios } = await client.queryObject("SELECT DISTINCT año FROM oferta WHERE año IS NOT NULL ORDER BY año DESC;");
            const { rows: rowsUniv } = await client.queryObject("SELECT DISTINCT nombre_ies FROM oferta WHERE nombre_ies IS NOT NULL ORDER BY nombre_ies ASC;");
            
            const anios = rowsAnios.map(r => r.año);
            const univs = rowsUniv.map(r => r.nombre_ies);

            return json({ anios, universidades: univs });
        }

        // Carga de datos de la tabla Oferta (con filtros y paginación)
        if (path.endsWith("/sies-oferta")) {
            const limit = parseInt(url.searchParams.get("limit") || "25");
            const offset = parseInt(url.searchParams.get("offset") || "0");
            
            const anio = url.searchParams.get("año");
            const univ = url.searchParams.get("nombre_ies");
            const nivel = url.searchParams.get("nivel_global");
            const vigencia = url.searchParams.get("vigencia");
            const busqueda = url.searchParams.get("busqueda");
            
            const orderCol = url.searchParams.get("orderCol") || "año";
            const orderDir = url.searchParams.get("orderDir") || "desc";

            // Construir consulta dinámica segura
            let query = "SELECT * FROM oferta WHERE 1=1";
            const queryParams = [];
            let paramIdx = 1;

            if (anio) {
                query += ` AND año = $${paramIdx++}`;
                queryParams.push(parseInt(anio));
            }
            if (univ) {
                query += ` AND nombre_ies = $${paramIdx++}`;
                queryParams.push(univ);
            }
            if (nivel) {
                query += ` AND nivel_global = $${paramIdx++}`;
                queryParams.push(nivel);
            }
            if (vigencia) {
                query += ` AND vigencia = $${paramIdx++}`;
                queryParams.push(vigencia);
            }
            if (busqueda) {
                query += ` AND nombre_carrera ILIKE $${paramIdx++}`;
                queryParams.push(`%${busqueda}%`);
            }

            // Sanitizar columna de ordenación
            const validCols = ["año", "nombre_ies", "nombre_sede", "nombre_carrera", "nivel_global", "modalidad", "vacantes_semestre_uno", "arancel_anual", "vigencia"];
            const cleanOrderCol = validCols.includes(orderCol.toLowerCase()) ? orderCol.toLowerCase() : "año";
            const cleanOrderDir = orderDir.toLowerCase() === "asc" ? "ASC" : "DESC";

            // --- CÁLCULO DE KPIs DE OFERTA DESGLOSADOS (REVERSO) ---
            let queryKpisOferta = "SELECT COUNT(DISTINCT nombre_carrera)::numeric as carreras_unicas, COUNT(DISTINCT nombre_sede)::numeric as sedes_unicas, SUM(vacantes_semestre_uno)::numeric as total_vacantes, ROUND(AVG(arancel_anual) FILTER (WHERE arancel_anual > 0))::numeric as arancel_promedio, MAX(arancel_anual)::numeric as arancel_max, (MIN(arancel_anual) FILTER (WHERE arancel_anual > 0))::numeric as arancel_min, (COUNT(*) FILTER (WHERE nivel_global = 'Pregrado'))::numeric as carreras_pregrado, (COUNT(*) FILTER (WHERE nivel_global = 'Posgrado'))::numeric as carreras_postgrado, (SUM(vacantes_semestre_uno) FILTER (WHERE modalidad = 'Presencial'))::numeric as vacantes_presencial, (SUM(vacantes_semestre_uno) FILTER (WHERE modalidad != 'Presencial'))::numeric as vacantes_no_presencial FROM oferta WHERE 1=1";
            const queryParamsKpiOf = [];
            let paramIdxKpiOf = 1;

            if (anio) {
                queryKpisOferta += ` AND año = $${paramIdxKpiOf++}`;
                queryParamsKpiOf.push(parseInt(anio));
            }
            if (univ) {
                queryKpisOferta += ` AND nombre_ies = $${paramIdxKpiOf++}`;
                queryParamsKpiOf.push(univ);
            }
            if (nivel) {
                queryKpisOferta += ` AND nivel_global = $${paramIdxKpiOf++}`;
                queryParamsKpiOf.push(nivel);
            }
            if (vigencia) {
                queryKpisOferta += ` AND vigencia = $${paramIdxKpiOf++}`;
                queryParamsKpiOf.push(vigencia);
            }

            const { rows: kpisOfertaResult } = await client.queryObject(queryKpisOferta, queryParamsKpiOf);
            const offerKpis = kpisOfertaResult[0] || {};

            // --- CÁLCULO DE KPIs DE MATRÍCULA ---
            let queryMat = "SELECT SUM(total_matricula)::numeric AS mat_total, SUM(total_matricula_primer_año)::numeric AS mat_nueva, SUM(total_matricula_mujeres)::numeric AS mat_mujeres, SUM(total_matricula_hombres)::numeric AS mat_hombres, (SUM(total_matricula) FILTER (WHERE jornada = 'Diurna'))::numeric AS mat_diurna, (SUM(total_matricula) FILTER (WHERE jornada = 'Vespertina'))::numeric AS mat_vespertina FROM matricula WHERE 1=1";
            const queryParamsMat = [];
            let paramIdxMat = 1;

            if (anio) {
                const anioMat = parseInt(anio) > 2025 ? 2025 : parseInt(anio);
                queryMat += ` AND año = $${paramIdxMat++}`;
                queryParamsMat.push(anioMat);
            }
            if (univ) {
                queryMat += ` AND nombre_institucion = $${paramIdxMat++}`;
                queryParamsMat.push(univ);
            }
            if (nivel) {
                queryMat += ` AND nivel_global = $${paramIdxMat++}`;
                queryParamsMat.push(nivel);
            }

            const { rows: matResult } = await client.queryObject(queryMat, queryParamsMat);
            const matKpis = matResult[0] || {};

            // --- EVOLUCIÓN HISTÓRICA PARA SPARKLINES (2018 A 2026) ---
            // Construimos queries agrupadas por año respetando la Universidad y Nivel seleccionados
            let queryHistOferta = "SELECT año, COUNT(DISTINCT nombre_carrera)::numeric as carreras_unicas, COUNT(*)::numeric as total_programas, (COUNT(*) FILTER (WHERE nivel_global = 'Pregrado'))::numeric as programas_pregrado, (COUNT(*) FILTER (WHERE nivel_global = 'Posgrado'))::numeric as programas_postgrado, SUM(vacantes_semestre_uno)::numeric as total_vacantes, ROUND(AVG(arancel_anual) FILTER (WHERE arancel_anual > 0))::numeric as arancel_promedio FROM oferta WHERE año >= 2018 AND año <= 2026";
            const queryParamsHist = [];
            let paramIdxHist = 1;

            if (univ) {
                queryHistOferta += ` AND nombre_ies = $${paramIdxHist++}`;
                queryParamsHist.push(univ);
            }
            if (nivel) {
                queryHistOferta += ` AND nivel_global = $${paramIdxHist++}`;
                queryParamsHist.push(nivel);
            }
            queryHistOferta += " GROUP BY año ORDER BY año ASC";

            const { rows: histOfertaResult } = await client.queryObject(queryHistOferta, queryParamsHist);

            // Histórico para Matrícula (2018 a 2025)
            let queryHistMat = "SELECT año, SUM(total_matricula)::numeric as mat_total, SUM(total_matricula_primer_año)::numeric as mat_nueva, SUM(total_matricula_mujeres)::numeric as mat_mujeres, SUM(total_matricula_hombres)::numeric as mat_hombres FROM matricula WHERE año >= 2018 AND año <= 2025";
            const queryParamsHistMat = [];
            let paramIdxHistMat = 1;

            if (univ) {
                queryHistMat += ` AND nombre_institucion = $${paramIdxHistMat++}`;
                queryParamsHistMat.push(univ);
            }
            if (nivel) {
                queryHistMat += ` AND nivel_global = $${paramIdxHistMat++}`;
                queryParamsHistMat.push(nivel);
            }
            queryHistMat += " GROUP BY año ORDER BY año ASC";

            const { rows: histMatResult } = await client.queryObject(queryHistMat, queryParamsHistMat);

            // Query para contar total de filas coincidentes
            const countQuery = query.replace("SELECT *", "SELECT COUNT(*)::numeric AS total");
            const { rows: countResult } = await client.queryObject(countQuery, queryParams);
            const total = Number(countResult[0].total || 0);

            // Query final con paginación
            query += ` ORDER BY ${cleanOrderCol} ${cleanOrderDir}, nombre_ies ASC, nombre_carrera ASC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
            queryParams.push(limit);
            queryParams.push(offset);

            const { rows: data } = await client.queryObject(query, queryParams);

            // Convertir cualquier BigInt a Number para la serialización segura en JSON
            const convertNum = (val) => val !== null ? Number(val) : 0;

            return json({
                total,
                data,
                kpis: {
                    total_carreras: convertNum(offerKpis.carreras_pregrado) + convertNum(offerKpis.carreras_postgrado),
                    carreras_unicas: convertNum(offerKpis.carreras_unicas),
                    sedes_unicas: convertNum(offerKpis.sedes_unicas),
                    total_vacantes: convertNum(offerKpis.total_vacantes),
                    arancel_promedio: convertNum(offerKpis.arancel_promedio),
                    
                    // Reverso Oferta
                    carreras_pregrado: convertNum(offerKpis.carreras_pregrado),
                    carreras_postgrado: convertNum(offerKpis.carreras_postgrado),
                    vacantes_presencial: convertNum(offerKpis.vacantes_presencial),
                    vacantes_no_presencial: convertNum(offerKpis.vacantes_no_presencial),
                    arancel_max: convertNum(offerKpis.arancel_max),
                    arancel_min: convertNum(offerKpis.arancel_min),

                    // KPIs de Matrícula
                    mat_total: convertNum(matKpis.mat_total),
                    mat_nueva: convertNum(matKpis.mat_nueva),
                    mat_mujeres: convertNum(matKpis.mat_mujeres),
                    mat_hombres: convertNum(matKpis.mat_hombres),
                    mat_diurna: convertNum(matKpis.mat_diurna),
                    mat_vespertina: convertNum(matKpis.mat_vespertina),

                    // Series de Evolución Histórica para Sparklines
                    historico_oferta: histOfertaResult.map(h => ({
                        anio: convertNum(h.año),
                        carreras_unicas: convertNum(h.carreras_unicas),
                        total_programas: convertNum(h.total_programas),
                        programas_pregrado: convertNum(h.programas_pregrado),
                        programas_postgrado: convertNum(h.programas_postgrado),
                        total_vacantes: convertNum(h.total_vacantes),
                        arancel_promedio: convertNum(h.arancel_promedio)
                    })),
                    historico_matricula: histMatResult.map(h => ({
                        anio: convertNum(h.año),
                        mat_total: convertNum(h.mat_total),
                        mat_nueva: convertNum(h.mat_nueva),
                        mat_mujeres: convertNum(h.mat_mujeres),
                        mat_hombres: convertNum(h.mat_hombres)
                    }))
                }
            });
        }

        // Ejecución de SQL de solo lectura para el Asistente IA (Chat)
        if (path.endsWith("/rpc/execute_sql_query")) {
            if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
            const body = await req.json();
            const sql = body.query || "";
            
            if (!sql.toUpperCase().trim().startsWith("SELECT")) {
                return json({ error: "Solo se permiten consultas SELECT" }, 400);
            }
            if (sql.includes(";")) {
                return json({ error: "No se permiten múltiples sentencias (;) por seguridad" }, 400);
            }

            // Auto-corrección de alucinaciones del LLM (BigQuery -> PostgreSQL)
            let safeSql = sql.replace(/`/g, '"'); // Reemplazar backticks por comillas dobles
            safeSql = safeSql.replace(/"?Nombre IES"?/gi, 'nombre_ies');
            safeSql = safeSql.replace(/"?Año"?/gi, 'año');
            safeSql = safeSql.replace(/"?Tipo Institución 1"?/gi, 'tipo_institucion_1');
            safeSql = safeSql.replace(/"?Nombre Sede"?/gi, 'nombre_sede');
            safeSql = safeSql.replace(/"?Nombre Carrera"?/gi, 'nombre_carrera');
            safeSql = safeSql.replace(/"?Área Carrera Genérica"?/gi, 'area_carrera_generica'); // no existe en DB, pero por si acaso
            safeSql = safeSql.replace(/"?Modalidad"?/gi, 'modalidad');
            safeSql = safeSql.replace(/"?Jornada"?/gi, 'jornada');
            safeSql = safeSql.replace(/"?Nivel Global"?/gi, 'nivel_global');
            safeSql = safeSql.replace(/"?Nivel Carrera"?/gi, 'nivel_carrera');
            safeSql = safeSql.replace(/"?Vacantes Semestre Uno"?/gi, 'vacantes_semestre_uno');
            safeSql = safeSql.replace(/"?Matrícula Anual"?/gi, 'matricula_anual');
            safeSql = safeSql.replace(/"?Arancel Anual"?/gi, 'arancel_anual');
            safeSql = safeSql.replace(/"?Región Sede"?/gi, 'region_sede');

            try {
                const { rows } = await client.queryObject(safeSql);
                return json(rows);
            } catch (err) {
                return json({ error: err.message }, 400);
            }
        }

        // Endpoint de Chat con Inteligencia Artificial Integrada (Groq)
        if (path.endsWith("/rpc/chat")) {
            if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
            
            const groqKey = req.headers.get("X-Groq-Key");
            if (!groqKey) {
                return json({ error: "Missing X-Groq-Key header" }, 401);
            }

            const body = await req.json();
            const msgText = body.message || "";
            const history = body.history || [];

            // Función de utilidad para llamar a Groq con array de mensajes
            async function llamarGroq(messagesArray) {
                const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + groqKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: messagesArray,
                        temperature: 0.2,
                        max_tokens: 1000
                    })
                });
                if (!groqRes.ok) {
                    const err = await groqRes.text();
                    throw new Error(`Groq API error: ${err}`);
                }
                const data = await groqRes.json();
                return data.choices[0].message.content;
            }



            try {
                // Construimos el array de mensajes para Groq
                const sqlMessages = [
                    { role: 'system', content: systemPromptSQLTemplate },
                    ...history,
                    { role: 'user', content: msgText }
                ];

                const sqlCrudo = await llamarGroq(sqlMessages);
                const sql = sqlCrudo.replace(/```sql\s*/gi, '').replace(/```\s*/g, '').trim();

                // Si es un saludo, retornarlo directamente
                if (sql.toUpperCase().startsWith('CHAT:')) {
                    return json({ reply: sql.substring(5).trim(), sql: null });
                }

                if (!sql.toUpperCase().startsWith('SELECT')) {
                    throw new Error("El modelo generó un SQL inválido: " + sql);
                }

                // Autocorrección de seguridad
                let safeSql = sql.replace(/`/g, '"');
                safeSql = safeSql.replace(/"?Nombre IES"?/gi, 'nombre_ies');
                safeSql = safeSql.replace(/"?Año"?/gi, 'año');
                safeSql = safeSql.replace(/"?Tipo Institución 1"?/gi, 'tipo_institucion_1');
                safeSql = safeSql.replace(/"?Nombre Sede"?/gi, 'nombre_sede');
                safeSql = safeSql.replace(/"?Nombre Carrera"?/gi, 'nombre_carrera');
                safeSql = safeSql.replace(/"?Modalidad"?/gi, 'modalidad');
                safeSql = safeSql.replace(/"?Jornada"?/gi, 'jornada');
                safeSql = safeSql.replace(/"?Nivel Global"?/gi, 'nivel_global');
                safeSql = safeSql.replace(/"?Nivel Carrera"?/gi, 'nivel_carrera');
                safeSql = safeSql.replace(/"?Vacantes Semestre Uno"?/gi, 'vacantes_semestre_uno');
                safeSql = safeSql.replace(/"?Matrícula Anual"?/gi, 'matricula_anual');
                safeSql = safeSql.replace(/"?Arancel Anual"?/gi, 'arancel_anual');
                safeSql = safeSql.replace(/"?Región Sede"?/gi, 'region_sede');

                // PASO 2: Ejecutar en base de datos local con AUTO-REPARACIÓN
                let rows = [];
                try {
                    const res = await client.queryObject(safeSql);
                    rows = res.rows;
                } catch (dbError) {
                    // Si falla el SQL, le pedimos a la IA que lo repare
                    console.log("SQL Original falló:", dbError.message);
                    
                    const fixPrompt = [
                        ...sqlMessages,
                        { role: 'assistant', content: sql },
                        { role: 'user', content: `Ese código SQL falló con este error de PostgreSQL: "${dbError.message}". Analiza el error y genera ÚNICAMENTE la sentencia SQL corregida. Recuerda revisar bien los nombres de las tablas y columnas. Sin markdown.` }
                    ];
                    
                    const sqlReparadoCrudo = await llamarGroq(fixPrompt);
                    safeSql = sqlReparadoCrudo.replace(/```sql\s*/gi, '').replace(/```\s*/g, '').trim();
                    safeSql = safeSql.replace(/`/g, '"');
                    
                    // Segundo y último intento
                    const res2 = await client.queryObject(safeSql);
                    rows = res2.rows;
                }

                // PASO 3: Generar respuesta en lenguaje natural
                const dataStr = JSON.stringify(rows.slice(0, 20), (key, value) => typeof value === 'bigint' ? value.toString() : value).substring(0, 3000);
                const systemPromptResponse = getSystemPromptResponse(dataStr, rows.length);

                const responseMessages = [
                    { role: 'system', content: systemPromptResponse },
                    ...history,
                    { role: 'user', content: msgText }
                ];

                const respuestaFinal = await llamarGroq(responseMessages);

                return json({ reply: respuestaFinal, sql: safeSql });

            } catch (err) {
                return json({ error: err.message }, 400);
            }
        }

        return json({ error: "not found" }, 404);
    } catch (e) {
        return json({ error: e.message }, 500);
    } finally {
        await client.end();
    }
}