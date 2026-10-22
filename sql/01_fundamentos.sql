/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 1: FUNDAMENTOS  (~9 min)
  Warehouses, escalamiento, cache de resultados, Zero Copy Cloning,
  SWAP, UNDROP y Resource Monitors.
  Copia todo este archivo en un SQL File de Workspaces y ejecuta bloque a bloque.
*******************************************************************************/
USE ROLE accountadmin;
USE DATABASE tb_101;

/*----------------------------------------------------------------------------
  PARTE 1 - Warehouses: computo independiente del almacenamiento
----------------------------------------------------------------------------*/
SHOW WAREHOUSES;

-- Creamos nuestro propio warehouse (suspendido y SIN auto resume a proposito)
CREATE OR REPLACE WAREHOUSE my_wh
    COMMENT = 'Mi warehouse de Tasty Bytes'
    WAREHOUSE_TYPE = 'standard'
    WAREHOUSE_SIZE = 'xsmall'
    MIN_CLUSTER_COUNT = 1
    MAX_CLUSTER_COUNT = 2
    SCALING_POLICY = 'standard'
    AUTO_SUSPEND = 60
    INITIALLY_SUSPENDED = TRUE
    AUTO_RESUME = FALSE;

USE WAREHOUSE my_wh;

-- Este query falla: el warehouse esta suspendido  -- [ERROR ESPERADO]
SELECT * FROM raw_pos.truck_details;

-- Lo encendemos y activamos auto resume
ALTER WAREHOUSE my_wh RESUME;
ALTER WAREHOUSE my_wh SET AUTO_RESUME = TRUE;

SELECT * FROM raw_pos.truck_details;

/*----------------------------------------------------------------------------
  PARTE 2 - Escalamiento vertical en segundos + cache de resultados
----------------------------------------------------------------------------*/
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'XLarge';

-- Ventas por marca sobre ~670 millones de lineas de detalle (anota el tiempo)
SELECT
    o.truck_brand_name,
    COUNT(DISTINCT o.order_id) AS ordenes,
    SUM(o.price)               AS ventas_totales
FROM analytics.orders_v o
GROUP BY o.truck_brand_name
ORDER BY ventas_totales DESC;

-- Ejecutalo OTRA VEZ: responde en milisegundos desde el Result Cache (sin computo)
SELECT
    o.truck_brand_name,
    COUNT(DISTINCT o.order_id) AS ordenes,
    SUM(o.price)               AS ventas_totales
FROM analytics.orders_v o
GROUP BY o.truck_brand_name
ORDER BY ventas_totales DESC;

-- Volvemos a XSmall: pagas por segundo solo lo que usas
ALTER WAREHOUSE my_wh SET WAREHOUSE_SIZE = 'XSmall';

/*----------------------------------------------------------------------------
  PARTE 3 - Zero Copy Cloning + datos semi-estructurados (VARIANT)
----------------------------------------------------------------------------*/
-- La columna truck_build es un OBJECT con anio, marca y modelo
SELECT truck_build FROM raw_pos.truck_details LIMIT 10;

-- Clon de desarrollo instantaneo, sin duplicar almacenamiento
CREATE OR REPLACE TABLE raw_pos.truck_dev CLONE raw_pos.truck_details;

ALTER TABLE raw_pos.truck_dev ADD COLUMN IF NOT EXISTS year  NUMBER;
ALTER TABLE raw_pos.truck_dev ADD COLUMN IF NOT EXISTS make  VARCHAR(255);
ALTER TABLE raw_pos.truck_dev ADD COLUMN IF NOT EXISTS model VARCHAR(255);

-- Notacion ":" para leer el JSON
UPDATE raw_pos.truck_dev
SET year  = truck_build:year::NUMBER,
    make  = truck_build:make::VARCHAR,
    model = truck_build:model::VARCHAR;

-- Problema de calidad: 'Ford' y 'Ford_'
SELECT make, COUNT(*) AS camiones
FROM raw_pos.truck_dev
GROUP BY make
ORDER BY make;

UPDATE raw_pos.truck_dev SET make = 'Ford' WHERE make = 'Ford_';

-- Promovemos dev a produccion de forma atomica
ALTER TABLE raw_pos.truck_details SWAP WITH raw_pos.truck_dev;

SELECT make, COUNT(*) AS camiones
FROM raw_pos.truck_details
GROUP BY make
ORDER BY camiones DESC;

ALTER TABLE raw_pos.truck_details DROP COLUMN truck_build;

/*----------------------------------------------------------------------------
  PARTE 4 - Time Travel: UNDROP
----------------------------------------------------------------------------*/
-- Ups... borramos la tabla de PRODUCCION por error
DROP TABLE raw_pos.truck_details;

-- No existe  -- [ERROR ESPERADO]
DESCRIBE TABLE raw_pos.truck_details;

-- Sin llamar al DBA ni restaurar backups
UNDROP TABLE raw_pos.truck_details;

SELECT * FROM raw_pos.truck_details LIMIT 10;

DROP TABLE raw_pos.truck_dev;

-- Bonus: Time Travel por tiempo (estado de la tabla hace 1 minuto)
SELECT COUNT(*) FROM raw_pos.truck AT(OFFSET => -60);

/*----------------------------------------------------------------------------
  PARTE 5 - Control de costos: Resource Monitor
----------------------------------------------------------------------------*/
CREATE OR REPLACE RESOURCE MONITOR my_resource_monitor
    WITH CREDIT_QUOTA = 100
    FREQUENCY = MONTHLY
    START_TIMESTAMP = IMMEDIATELY
    TRIGGERS ON 75 PERCENT DO NOTIFY
             ON 90 PERCENT DO SUSPEND
             ON 100 PERCENT DO SUSPEND_IMMEDIATE;

ALTER WAREHOUSE my_wh SET RESOURCE_MONITOR = my_resource_monitor;

SHOW RESOURCE MONITORS LIKE 'MY_RESOURCE_MONITOR';

/*  UI (opcional): Admin > Cost Management > Budgets para presupuestos,
    y la barra de busqueda superior (Universal Search) -> escribe "truck".  */
