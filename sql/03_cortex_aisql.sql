/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 3: CORTEX AISQL  (~10 min)
  IA generativa con SQL, sin APIs, sin mover los datos.
  ANTES (UI, 3 min): AI & ML > Studio > Cortex Playground. Compara dos modelos
  resumiendo una review de TB_101.HARMONIZED.TRUCK_REVIEWS_V.
*******************************************************************************/
USE ROLE tb_analyst;
USE DATABASE tb_101;
USE WAREHOUSE tb_analyst_wh;

/*----------------------------------------------------------------------------
  PARTE 1 - Preguntas libres a un LLM
----------------------------------------------------------------------------*/
SELECT AI_COMPLETE('claude-sonnet-4-5',
  'En 3 bullets: que debe medir una cadena de food trucks para crecer?') AS respuesta;

/*----------------------------------------------------------------------------
  PARTE 2 - AI_SENTIMENT: como se sienten los clientes con cada marca?
  Devuelve un OBJECT: categories[0]:sentiment = positive | negative | neutral | mixed
----------------------------------------------------------------------------*/
WITH muestra AS (
    SELECT truck_brand_name, review
    FROM harmonized.truck_reviews_v
    WHERE language ILIKE '%en%' AND review IS NOT NULL
    LIMIT 50   -- muestra para el lab (~25 s); en produccion se corre sobre todo
)
SELECT
    truck_brand_name,
    COUNT(*) AS reviews,
    COUNT_IF(s = 'positive') AS positivas,
    COUNT_IF(s = 'negative') AS negativas,
    COUNT_IF(s IN ('neutral','mixed')) AS neutras_mixtas,
    ROUND(100 * positivas / reviews, 1) AS pct_positivas
FROM (
    SELECT truck_brand_name,
           AI_SENTIMENT(review):categories[0]:sentiment::STRING AS s
    FROM muestra
)
GROUP BY truck_brand_name
ORDER BY pct_positivas DESC;

-- Sentimiento por ASPECTO del negocio
SELECT
    review,
    AI_SENTIMENT(review, ['comida', 'precio', 'servicio', 'tiempo de espera']) AS sentimiento_por_aspecto
FROM harmonized.truck_reviews_v
WHERE language ILIKE '%en%' AND review IS NOT NULL
LIMIT 5;

/*----------------------------------------------------------------------------
  PARTE 3 - AI_CLASSIFY: de que hablan los clientes?
----------------------------------------------------------------------------*/
WITH clasificadas AS (
    SELECT
        truck_brand_name,
        AI_CLASSIFY(review, ['Calidad de comida', 'Precio', 'Experiencia de servicio', 'Actitud del personal']):labels[0]::STRING AS categoria
    FROM harmonized.truck_reviews_v
    WHERE language ILIKE '%en%' AND review IS NOT NULL AND LENGTH(review) > 30
    LIMIT 150
)
SELECT truck_brand_name, categoria, COUNT(*) AS reviews
FROM clasificadas
GROUP BY ALL
ORDER BY truck_brand_name, reviews DESC;

/*----------------------------------------------------------------------------
  PARTE 4 - AI_EXTRACT: informacion puntual desde texto libre
----------------------------------------------------------------------------*/
-- Tomamos primero una muestra pequena (el LIMIT va ANTES de llamar a la IA)
WITH muestra AS (
    SELECT truck_brand_name, review
    FROM harmonized.truck_reviews_v
    WHERE language ILIKE '%en%' AND review IS NOT NULL
      AND (review ILIKE '%cold%' OR review ILIKE '%wait%' OR review ILIKE '%disappoint%')
    LIMIT 8
)
SELECT
    truck_brand_name,
    review,
    AI_EXTRACT(
        text => review,
        responseFormat => {
            'queja_principal': 'Cual es la queja principal del cliente? Responde en espanol',
            'plato_mencionado': 'Que plato o producto menciona?',
            'volveria': 'El cliente volveria? (SI / NO / NO SE)'
        }
    ):response AS extraccion
FROM muestra;

/*----------------------------------------------------------------------------
  PARTE 5 - AI_SUMMARIZE_AGG + AI_TRANSLATE: resumen ejecutivo por marca
----------------------------------------------------------------------------*/
SELECT
    truck_brand_name,
    AI_TRANSLATE(AI_SUMMARIZE_AGG(review), 'en', 'es') AS resumen_ejecutivo
FROM (
    SELECT truck_brand_name, review
    FROM harmonized.truck_reviews_v
    WHERE truck_brand_name IN ('Freezing Point', 'Better Off Bread', 'Kitakata Ramen Bar')
      AND language ILIKE '%en%' AND review IS NOT NULL
    LIMIT 90
)
GROUP BY truck_brand_name;

/*  Bonus CoCo: abre Cortex Code (panel derecho) y pidele:
    "Analiza si el sentimiento de las reviews se relaciona con las ventas por
     marca en TB_101 y muestrame una grafica"                                 */
