/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 6: MARKETPLACE  (~4 min)
  Datos de clima de terceros, en vivo, sin ETL ni copias.
  UI (alternativa): Data Products > Marketplace > busca "Weather Source frostbyte"
  > "Pelmorex Weather Source: Frostbyte" > Get > nombre ZTS_WEATHERSOURCE > rol PUBLIC
*******************************************************************************/
USE ROLE accountadmin;

-- Instalar el listing gratuito por SQL (equivale al boton "Get")
CREATE DATABASE IF NOT EXISTS zts_weathersource FROM LISTING 'GZSOZ1LLEL';
GRANT IMPORTED PRIVILEGES ON DATABASE zts_weathersource TO ROLE public;

USE ROLE tb_analyst;
USE DATABASE tb_101;
USE WAREHOUSE tb_analyst_wh;

-- Datos de clima diario por codigo postal, compartidos en vivo por el proveedor
SELECT * FROM zts_weathersource.onpoint_id.history_day LIMIT 10;

-- Vista: clima diario en las ciudades donde opera Tasty Bytes
CREATE OR REPLACE VIEW harmonized.daily_weather_v
COMMENT = 'Clima diario (Weather Source) en las ciudades de Tasty Bytes'
AS
SELECT
    hd.*,
    TO_VARCHAR(hd.date_valid_std, 'YYYY-MM') AS yyyy_mm,
    pc.city_name AS city,
    c.country    AS country_desc
FROM zts_weathersource.onpoint_id.history_day hd
JOIN zts_weathersource.onpoint_id.postal_codes pc
  ON pc.postal_code = hd.postal_code AND pc.country = hd.country
JOIN raw_pos.country c
  ON c.iso_country = hd.country AND c.city = hd.city_name;

-- Vista: ventas diarias + clima por ciudad (1st party + 3rd party)
CREATE OR REPLACE VIEW analytics.daily_sales_by_weather_v
COMMENT = 'Ventas diarias de Tasty Bytes enriquecidas con clima'
AS
WITH ventas AS (
    SELECT DATE(o.order_ts) AS fecha, o.primary_city AS ciudad, o.country AS pais,
           SUM(o.price) AS ventas_diarias
    FROM analytics.orders_v o
    GROUP BY ALL
)
SELECT
    v.fecha, v.ciudad, v.pais, v.ventas_diarias,
    ROUND(AVG(w.avg_temperature_air_2m_f), 1)     AS temp_promedio_f,
    ROUND(AVG(w.tot_precipitation_in), 2)         AS precipitacion_in,
    ROUND(AVG(w.max_wind_speed_100m_mph), 1)      AS viento_max_mph
FROM ventas v
LEFT JOIN harmonized.daily_weather_v w
  ON w.date_valid_std = v.fecha AND w.city = v.ciudad AND w.country_desc = v.pais
GROUP BY ALL;

-- Llueve = venden menos? Seattle, febrero 2022
SELECT fecha, ventas_diarias, temp_promedio_f, precipitacion_in, viento_max_mph
FROM analytics.daily_sales_by_weather_v
WHERE ciudad = 'Seattle' AND fecha BETWEEN '2022-02-01' AND '2022-02-28'
ORDER BY fecha;
/*  Tip: en los resultados haz clic en "Chart" y grafica VENTAS_DIARIAS vs PRECIPITACION_IN */
