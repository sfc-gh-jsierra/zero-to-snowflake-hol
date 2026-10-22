/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 7: CAPA SEMANTICA + BUSQUEDA  (~9 min)
  Preparamos los datos para que un agente los entienda:
   - Tablas de negocio curadas (ventas diarias, reviews con sentimiento, ciudades)
   - Cortex Search sobre las reviews (texto no estructurado)
   - Semantic View con metricas, dimensiones, sinonimos y preguntas verificadas
*******************************************************************************/
USE ROLE accountadmin;
USE DATABASE tb_101;
USE WAREHOUSE tb_de_wh;

/*----------------------------------------------------------------------------
  PARTE 1 - Tablas de negocio curadas
  (VENTAS_DIARIAS y VENTAS_ITEMS_MES se crean en el setup: resumen ~670M lineas)
----------------------------------------------------------------------------*/
SELECT COUNT(*) AS filas, MIN(fecha) AS desde, MAX(fecha) AS hasta, SUM(ventas) AS ventas_totales
FROM analytics.ventas_diarias;

-- Coordenadas de las 30 ciudades (para mapas en las apps)
CREATE OR REPLACE TABLE analytics.ciudades (
    ciudad STRING, pais STRING, latitud FLOAT, longitud FLOAT, poblacion NUMBER
) AS
SELECT c.city, c.country, g.lat, g.lon, TRY_TO_NUMBER(c.city_population)
FROM raw_pos.country c
JOIN (SELECT column1 city, column2 lat, column3 lon FROM VALUES
    ('Melbourne',-37.8136,144.9631),('Sydney',-33.8688,151.2093),('Rio de Janeiro',-22.9068,-43.1729),
    ('Sao Paulo',-23.5505,-46.6333),('Montreal',45.5017,-73.5673),('Toronto',43.6532,-79.3832),
    ('Vancouver',49.2827,-123.1207),('Cairo',30.0444,31.2357),('London',51.5074,-0.1278),
    ('Manchester',53.4808,-2.2426),('Nice',43.7102,7.2620),('Paris',48.8566,2.3522),
    ('Berlin',52.5200,13.4050),('Hamburg',53.5511,9.9937),('Munich',48.1351,11.5820),
    ('Delhi',28.7041,77.1025),('Mumbai',19.0760,72.8777),('Tokyo',35.6762,139.6503),
    ('Krakow',50.0647,19.9450),('Warsaw',52.2297,21.0122),('Cape Town',-33.9249,18.4241),
    ('Seoul',37.5665,126.9780),('Barcelona',41.3874,2.1686),('Madrid',40.4168,-3.7038),
    ('Stockholm',59.3293,18.0686),('Boston',42.3601,-71.0589),('Denver',39.7392,-104.9903),
    ('New York City',40.7128,-74.0060),('San Mateo',37.5630,-122.3255),('Seattle',47.6062,-122.3321)
) g ON g.city = c.city;

-- Reviews en ingles con sentimiento precalculado con IA (una muestra de 2,000)
CREATE OR REPLACE TABLE analytics.reviews_sentimiento AS
SELECT
    review_id, truck_brand_name AS marca, primary_city AS ciudad, date AS fecha, review,
    AI_SENTIMENT(review):categories[0]:sentiment::STRING AS sentimiento
FROM (
    SELECT * FROM harmonized.truck_reviews_v
    WHERE language ILIKE 'en%' AND review IS NOT NULL
    ORDER BY HASH(review_id)
    LIMIT 2000
);

SELECT marca, sentimiento, COUNT(*) AS reviews
FROM analytics.reviews_sentimiento GROUP BY ALL ORDER BY marca, reviews DESC;

/*----------------------------------------------------------------------------
  PARTE 2 - Cortex Search: busqueda hibrida (semantica + palabras clave)
----------------------------------------------------------------------------*/
CREATE OR REPLACE CORTEX SEARCH SERVICE analytics.tasty_bytes_review_search
    ON review
    ATTRIBUTES marca, ciudad, sentimiento
    WAREHOUSE = tb_de_wh
    TARGET_LAG = '1 day'
AS (
    SELECT review, review_id, marca, ciudad, sentimiento, fecha
    FROM analytics.reviews_sentimiento
);

-- Prueba: "que dicen de comida fria o espera larga" en una marca
SELECT PARSE_JSON(
  SNOWFLAKE.CORTEX.SEARCH_PREVIEW('tb_101.analytics.tasty_bytes_review_search',
    '{"query": "cold food long wait", "columns": ["review","marca","ciudad","sentimiento"],
      "filter": {"@eq": {"marca": "Freezing Point"}}, "limit": 3}')
):results AS resultados;

/*----------------------------------------------------------------------------
  PARTE 3 - Semantic View: el "diccionario de negocio" para la IA
----------------------------------------------------------------------------*/
CREATE OR REPLACE SEMANTIC VIEW analytics.sv_tasty_bytes
  TABLES (
    ventas AS analytics.ventas_diarias
      PRIMARY KEY (fecha, truck_id)
      WITH SYNONYMS = ('ventas diarias', 'ordenes', 'transacciones')
      COMMENT = 'Ventas diarias por food truck. Usar para ventas, ordenes y ticket promedio por marca, ciudad, pais o fecha',
    items AS analytics.ventas_items_mes
      PRIMARY KEY (mes, truck_id, item_menu)
      WITH SYNONYMS = ('productos', 'menu', 'platos')
      COMMENT = 'Ventas mensuales por item del menu. Usar SOLO para preguntas por producto o item del menu',
    ciudades AS analytics.ciudades
      PRIMARY KEY (ciudad)
      COMMENT = 'Ciudades donde opera Tasty Bytes con coordenadas y poblacion',
    clima AS analytics.daily_sales_by_weather_v
      PRIMARY KEY (fecha, ciudad)
      COMMENT = 'Clima diario por ciudad desde Weather Source (Marketplace), junto con las ventas del dia'
  )
  RELATIONSHIPS (
    ventas_a_ciudad AS ventas (ciudad) REFERENCES ciudades,
    items_a_ciudad  AS items (ciudad) REFERENCES ciudades,
    clima_a_ciudad  AS clima (ciudad) REFERENCES ciudades
  )
  FACTS (
    ventas.f_ventas   AS ventas,
    ventas.f_unidades AS unidades,
    ventas.f_ordenes  AS ordenes,
    items.f_ventas_item   AS ventas,
    items.f_unidades_item AS unidades,
    clima.f_ventas_clima  AS ventas_diarias,
    clima.f_temp      AS temp_promedio_f,
    clima.f_lluvia    AS precipitacion_in,
    clima.f_viento    AS viento_max_mph
  )
  DIMENSIONS (
    ventas.fecha      AS fecha WITH SYNONYMS = ('dia', 'date') COMMENT = 'Fecha de la venta',
    ventas.anio       AS YEAR(fecha) WITH SYNONYMS = ('year') COMMENT = 'Anio de la venta',
    ventas.mes        AS DATE_TRUNC('month', fecha) WITH SYNONYMS = ('month') COMMENT = 'Mes de la venta',
    ventas.marca      AS marca WITH SYNONYMS = ('brand', 'food truck', 'truck brand') COMMENT = 'Marca del food truck, ej. Freezing Point, Kitakata Ramen Bar',
    ventas.tipo_menu  AS tipo_menu WITH SYNONYMS = ('tipo de comida', 'cuisine', 'menu type') COMMENT = 'Tipo de comida, ej. Ramen, Tacos, BBQ, Ice Cream',
    ventas.truck_id   AS truck_id WITH SYNONYMS = ('camion', 'truck') COMMENT = 'Identificador del camion',
    ventas.es_franquicia AS es_franquicia COMMENT = 'TRUE si el camion es de un franquiciado',
    ventas.pais_venta AS pais COMMENT = 'Pais de la venta',
    items.mes_item    AS mes COMMENT = 'Mes de la venta del item',
    items.marca_item  AS marca COMMENT = 'Marca del food truck que vende el item',
    items.item_menu   AS item_menu WITH SYNONYMS = ('producto', 'plato', 'menu item') COMMENT = 'Nombre del item del menu',
    items.categoria_item AS categoria_item WITH SYNONYMS = ('categoria') COMMENT = 'Categoria del item: Main, Beverage, Dessert, Snack',
    ciudades.ciudad   AS ciudad WITH SYNONYMS = ('city') COMMENT = 'Ciudad',
    ciudades.pais     AS pais WITH SYNONYMS = ('country') COMMENT = 'Pais',
    ciudades.latitud  AS latitud COMMENT = 'Latitud de la ciudad',
    ciudades.longitud AS longitud COMMENT = 'Longitud de la ciudad',
    clima.fecha_clima AS fecha COMMENT = 'Fecha de la observacion del clima'
  )
  METRICS (
    ventas.ventas_totales    AS SUM(ventas.f_ventas) WITH SYNONYMS = ('revenue', 'ingresos', 'facturacion', 'sales') COMMENT = 'Ventas totales en USD',
    ventas.unidades_vendidas AS SUM(ventas.f_unidades) WITH SYNONYMS = ('cantidad') COMMENT = 'Unidades vendidas',
    ventas.numero_ordenes    AS SUM(ventas.f_ordenes) WITH SYNONYMS = ('pedidos', 'orders') COMMENT = 'Numero de ordenes',
    ventas.ticket_promedio   AS SUM(ventas.f_ventas) / NULLIF(SUM(ventas.f_ordenes), 0) WITH SYNONYMS = ('average order value', 'AOV') COMMENT = 'Venta promedio por orden en USD',
    ventas.camiones_activos  AS COUNT(DISTINCT ventas.truck_id) COMMENT = 'Camiones con ventas',
    items.ventas_item        AS SUM(items.f_ventas_item) COMMENT = 'Ventas en USD del item del menu',
    items.unidades_item      AS SUM(items.f_unidades_item) COMMENT = 'Unidades vendidas del item del menu',
    clima.ventas_dia_clima   AS SUM(clima.f_ventas_clima) COMMENT = 'Ventas del dia, para analizar contra el clima',
    clima.temperatura_promedio AS AVG(clima.f_temp) COMMENT = 'Temperatura promedio en Fahrenheit',
    clima.lluvia_promedio    AS AVG(clima.f_lluvia) COMMENT = 'Precipitacion promedio diaria en pulgadas',
    clima.viento_promedio    AS AVG(clima.f_viento) COMMENT = 'Velocidad maxima de viento promedio en mph'
  )
  COMMENT = 'Modelo de negocio de Tasty Bytes: ventas, productos, ciudades y clima'
  AI_SQL_GENERATION 'Las ventas estan en USD. Los datos van de 2019 a 2022; si no se indica el anio usa 2022. Para preguntas por producto usa la tabla items; para todo lo demas usa ventas. Redondea montos a 2 decimales.'
  AI_VERIFIED_QUERIES (
    top_marcas AS (
      QUESTION 'Cuales son las 5 marcas con mas ventas en 2022?'
      ONBOARDING_QUESTION TRUE
      SQL 'SELECT marca, SUM(ventas) AS ventas_totales FROM tb_101.analytics.ventas_diarias WHERE YEAR(fecha) = 2022 GROUP BY marca ORDER BY ventas_totales DESC LIMIT 5'
    ),
    ventas_pais_mes AS (
      QUESTION 'Como evolucionaron las ventas por mes en 2022 por pais?'
      ONBOARDING_QUESTION TRUE
      SQL 'SELECT pais, DATE_TRUNC(''month'', fecha) AS mes, SUM(ventas) AS ventas_totales FROM tb_101.analytics.ventas_diarias WHERE YEAR(fecha) = 2022 GROUP BY pais, mes ORDER BY pais, mes'
    )
  );

SHOW SEMANTIC VIEWS IN SCHEMA analytics;
DESCRIBE SEMANTIC VIEW analytics.sv_tasty_bytes;

-- Consultar la Semantic View con SQL: metricas y dimensiones por nombre de negocio
SELECT * FROM SEMANTIC_VIEW(
    analytics.sv_tasty_bytes
    DIMENSIONS ciudades.pais
    METRICS ventas.ventas_totales, ventas.numero_ordenes, ventas.ticket_promedio
) ORDER BY ventas_totales DESC;

-- Permisos para el rol analista (el que usa el agente)
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO ROLE tb_analyst;
GRANT SELECT ON SEMANTIC VIEW analytics.sv_tasty_bytes TO ROLE tb_analyst;
GRANT USAGE ON CORTEX SEARCH SERVICE analytics.tasty_bytes_review_search TO ROLE tb_analyst;

/*  UI: AI & ML > Cortex Analyst > SV_TASTY_BYTES > "Playground" y pregunta:
    "Que tipo de menu vende mas en Tokyo?"  -> revisa el SQL generado.         */
