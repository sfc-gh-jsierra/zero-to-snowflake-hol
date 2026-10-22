/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 8: AGENTE DE SNOWFLAKE COWORK  (~14 min)
  Un agente que entiende datos (Analyst), lee lo que dicen los clientes
  (Search), grafica (data_to_chart) y ACTUA con logica propia (custom tool).
*******************************************************************************/
USE ROLE accountadmin;
USE DATABASE tb_101;
USE WAREHOUSE tb_analyst_wh;

/*----------------------------------------------------------------------------
  PARTE 1 - Herramienta propia (custom tool): pronostico de ventas
  Un stored procedure normal: el agente lo llamara cuando le pidan proyectar.
----------------------------------------------------------------------------*/
CREATE OR REPLACE PROCEDURE analytics.sp_pronostico_ventas(marca STRING, meses_futuros NUMBER)
RETURNS STRING
LANGUAGE SQL
COMMENT = 'Proyecta las ventas mensuales de una marca con tendencia lineal sobre los ultimos 12 meses'
AS
$$
DECLARE
    resultado STRING;
    rs RESULTSET;
BEGIN
    rs := (
    WITH mensual AS (
        SELECT DATE_TRUNC('month', fecha) AS mes, SUM(ventas) AS ventas
        FROM tb_101.analytics.ventas_diarias
        WHERE marca ILIKE :marca
        GROUP BY mes
        QUALIFY ROW_NUMBER() OVER (ORDER BY mes DESC) BETWEEN 2 AND 13   -- 12 meses completos
    ),
    modelo AS (
        SELECT REGR_SLOPE(ventas, DATEDIFF('month', '2019-01-01', mes))     AS pendiente,
               REGR_INTERCEPT(ventas, DATEDIFF('month', '2019-01-01', mes)) AS intercepto,
               MAX(mes) AS ultimo_mes, AVG(ventas) AS promedio
        FROM mensual
    ),
    futuro AS (
        SELECT DATEADD('month', s.n, m.ultimo_mes) AS mes,
               ROUND(m.intercepto + m.pendiente * DATEDIFF('month', '2019-01-01', DATEADD('month', s.n, m.ultimo_mes)), 0) AS ventas_proyectadas
        FROM modelo m,
             (SELECT SEQ4() + 1 AS n FROM TABLE(GENERATOR(ROWCOUNT => 24))) s
        WHERE s.n <= LEAST(GREATEST(:meses_futuros, 1), 12)
    )
    SELECT 'Pronostico para ' || :marca || ' (tendencia lineal, ultimos 12 meses). '
           || 'Promedio mensual actual: $' || TO_VARCHAR((SELECT ROUND(promedio,0) FROM modelo), '999,999,999') || '. '
           || 'Proyeccion: ' || LISTAGG(TO_VARCHAR(mes, 'YYYY-MM') || ' = $' || TO_VARCHAR(ventas_proyectadas, '999,999,999'), '; ')
              WITHIN GROUP (ORDER BY mes) AS texto
    FROM futuro
    );
    LET c CURSOR FOR rs;
    OPEN c;
    FETCH c INTO resultado;
    CLOSE c;
    RETURN COALESCE(:resultado, 'No encontre ventas para la marca ' || :marca);
END;
$$;

-- Probamos la herramienta antes de entregarsela al agente
CALL analytics.sp_pronostico_ventas('Freezing Point', 3);

/*----------------------------------------------------------------------------
  PARTE 2 - Crear el agente (el mismo que veras en Snowflake CoWork)
----------------------------------------------------------------------------*/
CREATE SCHEMA IF NOT EXISTS snowflake_intelligence.agents;

CREATE OR REPLACE AGENT snowflake_intelligence.agents.tasty_bytes_agent
  COMMENT = 'Analista de negocio de Tasty Bytes: ventas, clientes, clima y pronosticos'
  PROFILE = '{"display_name": "Tasty Bytes Copilot", "color": "blue"}'
  FROM SPECIFICATION
$$
models:
  orchestration: auto

orchestration:
  budget:
    seconds: 120
    tokens: 32000

instructions:
  response: >
    Responde siempre en espanol, de forma ejecutiva y concisa. Empieza con la
    respuesta directa (una cifra o conclusion), luego 2-4 bullets de contexto.
    Formatea montos en USD con separador de miles. Cuando haya series de tiempo
    o rankings, genera una grafica. Cierra con una recomendacion accionable.
  orchestration: >
    Usa VentasTastyBytes para cualquier pregunta de ventas, ordenes, ticket
    promedio, marcas, ciudades, paises, productos o clima.
    Usa ReviewsClientes para saber que dicen u opinan los clientes, quejas o
    elogios; filtra por marca cuando el usuario la mencione.
    Usa PronosticoVentas solo cuando pidan proyectar, pronosticar o estimar
    ventas futuras de una marca.
    Si la pregunta combina numeros y opiniones, usa ambas herramientas y
    relaciona los hallazgos.
  sample_questions:
    - question: "Cuales son las 5 marcas con mas ventas en 2022? Muestralo en una grafica"
    - question: "Que dicen los clientes de Freezing Point?"
    - question: "Que ciudad tiene el mejor ticket promedio y que opinan ahi los clientes?"
    - question: "Pronostica las ventas de Kitakata Ramen Bar para los proximos 3 meses"
    - question: "Llueve menos = vendemos mas? Analiza Seattle en 2022"

tools:
  - tool_spec:
      type: "cortex_analyst_text_to_sql"
      name: "VentasTastyBytes"
      description: >
        Datos estructurados de Tasty Bytes (2019-2022): ventas en USD, ordenes,
        unidades, ticket promedio por marca, tipo de menu, item, ciudad, pais,
        fecha, y clima diario por ciudad. NO contiene texto de reviews.
  - tool_spec:
      type: "cortex_search"
      name: "ReviewsClientes"
      description: >
        Busqueda semantica sobre reviews escritas por clientes de los food
        trucks. Atributos filtrables: MARCA, CIUDAD, SENTIMIENTO (positive,
        negative, neutral, mixed). Usar para opiniones, quejas y elogios.
  - tool_spec:
      type: "generic"
      name: "PronosticoVentas"
      description: >
        Proyecta las ventas mensuales futuras de UNA marca usando la tendencia
        lineal de los ultimos 12 meses. Devuelve un texto con el promedio actual
        y la proyeccion mes a mes.
      input_schema:
        type: "object"
        properties:
          marca:
            type: "string"
            description: "Nombre exacto de la marca, ej. 'Freezing Point', 'Kitakata Ramen Bar'"
          meses_futuros:
            type: "number"
            description: "Cantidad de meses a proyectar, entre 1 y 12. Por defecto 3"
        required: ["marca", "meses_futuros"]
  - tool_spec:
      type: "data_to_chart"
      name: "data_to_chart"
      description: "Genera visualizaciones a partir de los datos devueltos por otras herramientas"

tool_resources:
  VentasTastyBytes:
    semantic_view: "TB_101.ANALYTICS.SV_TASTY_BYTES"
    execution_environment:
      type: "warehouse"
      warehouse: "TB_ANALYST_WH"
      query_timeout: 120
  ReviewsClientes:
    search_service: "TB_101.ANALYTICS.TASTY_BYTES_REVIEW_SEARCH"
    max_results: 5
    id_column: "REVIEW_ID"
    title_column: "MARCA"
  PronosticoVentas:
    type: "procedure"
    identifier: "TB_101.ANALYTICS.SP_PRONOSTICO_VENTAS"
    execution_environment:
      type: "warehouse"
      warehouse: "TB_ANALYST_WH"
      query_timeout: 60
$$;

DESCRIBE AGENT snowflake_intelligence.agents.tasty_bytes_agent;

/*----------------------------------------------------------------------------
  PARTE 3 - Permisos: quien puede usar el agente
----------------------------------------------------------------------------*/
GRANT USAGE ON DATABASE snowflake_intelligence TO ROLE tb_analyst;
GRANT USAGE ON SCHEMA snowflake_intelligence.agents TO ROLE tb_analyst;
GRANT USAGE ON AGENT snowflake_intelligence.agents.tasty_bytes_agent TO ROLE tb_analyst;
GRANT USAGE ON PROCEDURE tb_101.analytics.sp_pronostico_ventas(STRING, NUMBER) TO ROLE tb_analyst;
GRANT USAGE ON WAREHOUSE tb_analyst_wh TO ROLE tb_analyst;

/*----------------------------------------------------------------------------
  PARTE 4 - Publicar el agente en Snowflake CoWork
----------------------------------------------------------------------------*/
CREATE SNOWFLAKE INTELLIGENCE IF NOT EXISTS SNOWFLAKE_INTELLIGENCE_OBJECT_DEFAULT;
-- (si ya estaba publicado, el bloque lo indica en vez de fallar)
EXECUTE IMMEDIATE $$
BEGIN
    ALTER SNOWFLAKE INTELLIGENCE SNOWFLAKE_INTELLIGENCE_OBJECT_DEFAULT
        ADD AGENT snowflake_intelligence.agents.tasty_bytes_agent;
    RETURN 'Agente publicado en Snowflake CoWork';
EXCEPTION
    WHEN OTHER THEN RETURN 'El agente ya estaba publicado en CoWork';
END;
$$;

/*----------------------------------------------------------------------------
  PARTE 5 - Probar el agente desde SQL (lo mismo que hara la app)
----------------------------------------------------------------------------*/
SELECT TRY_PARSE_JSON(
  SNOWFLAKE.CORTEX.DATA_AGENT_RUN(
    'SNOWFLAKE_INTELLIGENCE.AGENTS.TASTY_BYTES_AGENT',
    $${"messages":[{"role":"user","content":[{"type":"text","text":"Cuales son las 3 marcas con mas ventas en 2022?"}]}]}$$
  )
):content AS respuesta_agente;

/*  AHORA EN COWORK (UI, ~8 min):
    1. Abre Snowflake CoWork: menu AI & ML > Snowflake CoWork (o ai.snowflake.com)
    2. Elige el agente "Tasty Bytes Copilot" y prueba las 5 preguntas sugeridas.
    3. Abre "Show details" en cada respuesta: herramientas usadas, SQL generado
       y citas de reviews.
    4. Edita el agente: AI & ML > Agents > TASTY_BYTES_AGENT > Edit >
       Orchestration > cambia la instruccion de respuesta (ej. "responde como
       un chef") > Save y vuelve a preguntar.                                  */
