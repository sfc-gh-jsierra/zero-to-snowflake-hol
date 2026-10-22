/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 2: PIPELINE SEMI-ESTRUCTURADO  (~9 min)
  Stage S3 -> COPY INTO -> VARIANT / FLATTEN -> Dynamic Tables encadenadas.
*******************************************************************************/
USE ROLE tb_data_engineer;
USE DATABASE tb_101;
USE WAREHOUSE tb_de_wh;

/*----------------------------------------------------------------------------
  PARTE 1 - Ingesta desde S3
----------------------------------------------------------------------------*/
CREATE OR REPLACE STAGE raw_pos.menu_stage
    COMMENT = 'Stage del menu de Tasty Bytes'
    URL = 's3://sfquickstarts/frostbyte_tastybytes/raw_pos/menu/'
    FILE_FORMAT = public.csv_ff;

LIST @raw_pos.menu_stage;

CREATE OR REPLACE TABLE raw_pos.menu_staging
(
    menu_id NUMBER(19,0),
    menu_type_id NUMBER(38,0),
    menu_type VARCHAR,
    truck_brand_name VARCHAR,
    menu_item_id NUMBER(38,0),
    menu_item_name VARCHAR,
    item_category VARCHAR,
    item_subcategory VARCHAR,
    cost_of_goods_usd NUMBER(38,4),
    sale_price_usd NUMBER(38,4),
    menu_item_health_metrics_obj VARIANT
);

COPY INTO raw_pos.menu_staging FROM @raw_pos.menu_stage;

SELECT * FROM raw_pos.menu_staging LIMIT 10;

/*----------------------------------------------------------------------------
  PARTE 2 - JSON nativo con VARIANT: notacion ":" , "[ ]" y "::"
----------------------------------------------------------------------------*/
SELECT menu_item_health_metrics_obj FROM raw_pos.menu_staging LIMIT 5;

SELECT
    menu_item_name,
    menu_item_health_metrics_obj:menu_item_id::INTEGER                       AS menu_item_id,
    menu_item_health_metrics_obj:menu_item_health_metrics[0]:ingredients::ARRAY AS ingredientes
FROM raw_pos.menu_staging;

-- FLATTEN: una fila por cada ingrediente
SELECT
    m.menu_item_name,
    i.value::STRING AS ingrediente
FROM raw_pos.menu_staging m,
     LATERAL FLATTEN(INPUT => m.menu_item_health_metrics_obj:menu_item_health_metrics[0]:ingredients::ARRAY) i
LIMIT 20;

/*----------------------------------------------------------------------------
  PARTE 3 - Dynamic Tables: pipeline declarativo que se refresca solo
----------------------------------------------------------------------------*/
CREATE OR REPLACE DYNAMIC TABLE harmonized.ingredient
    TARGET_LAG = '1 minute'
    WAREHOUSE = tb_de_wh
AS
SELECT
    i.value::STRING          AS ingredient_name,
    ARRAY_AGG(m.menu_item_id) AS menu_ids
FROM raw_pos.menu_staging m,
     LATERAL FLATTEN(INPUT => m.menu_item_health_metrics_obj:menu_item_health_metrics[0]:ingredients::ARRAY) i
GROUP BY i.value::STRING;

SELECT * FROM harmonized.ingredient LIMIT 20;

-- Better Off Bread lanza un Banh Mi con ingredientes nuevos
INSERT INTO raw_pos.menu_staging
SELECT 10101, 15, 'Sandwiches', 'Better Off Bread', 157, 'Banh Mi', 'Main', 'Cold Option', 9.0, 12.0,
PARSE_JSON('{
  "menu_item_health_metrics": [{
      "ingredients": ["French Baguette","Mayonnaise","Pickled Daikon","Cucumber","Pork Belly"],
      "is_dairy_free_flag": "N", "is_gluten_free_flag": "N",
      "is_healthy_flag": "Y", "is_nut_free_flag": "Y"
  }],
  "menu_item_id": 157
}');

-- Esperar ~1 minuto (TARGET_LAG) o forzar el refresco:
ALTER DYNAMIC TABLE harmonized.ingredient REFRESH;

SELECT * FROM harmonized.ingredient
WHERE ingredient_name IN ('French Baguette', 'Pickled Daikon');

-- Segunda DT: ingrediente -> item del menu (depende de la anterior)
CREATE OR REPLACE DYNAMIC TABLE harmonized.ingredient_to_menu_lookup
    TARGET_LAG = '1 minute'
    WAREHOUSE = tb_de_wh
AS
SELECT
    i.ingredient_name,
    m.menu_item_health_metrics_obj:menu_item_id::INTEGER AS menu_item_id
FROM raw_pos.menu_staging m,
     LATERAL FLATTEN(INPUT => m.menu_item_health_metrics_obj:menu_item_health_metrics[0]:ingredients) f
JOIN harmonized.ingredient i ON f.value::STRING = i.ingredient_name;

-- Simulamos una orden de 2 Banh Mi en el camion 15
INSERT INTO raw_pos.order_header
SELECT 459520441, 15, 1030, 101565, NULL, 200322900,
       TO_TIMESTAMP_NTZ('08:00:00','hh:mi:ss'), TO_TIMESTAMP_NTZ('14:00:00','hh:mi:ss'),
       NULL, TO_TIMESTAMP_NTZ('2022-01-27 08:21:08.000'), NULL, 'USD', 14.00, NULL, NULL, 14.00;

INSERT INTO raw_pos.order_detail
SELECT 904745311, 459520441, 157, NULL, 0, 2, 14.00, 28.00, NULL;

-- Tercera DT: consumo mensual de ingredientes por camion (US).
-- Une ~670M lineas: le damos musculo temporalmente al warehouse
ALTER WAREHOUSE tb_de_wh SET WAREHOUSE_SIZE = 'large';

CREATE OR REPLACE DYNAMIC TABLE harmonized.ingredient_usage_by_truck
    TARGET_LAG = '2 minutes'
    WAREHOUSE = tb_de_wh
AS
SELECT
    oh.truck_id,
    EXTRACT(YEAR FROM oh.order_ts) AS order_year,
    MONTH(oh.order_ts)             AS order_month,
    i.ingredient_name,
    SUM(od.quantity)               AS total_ingredients_used
FROM raw_pos.order_detail od
JOIN raw_pos.order_header oh               ON od.order_id = oh.order_id
JOIN harmonized.ingredient_to_menu_lookup iml ON od.menu_item_id = iml.menu_item_id
JOIN harmonized.ingredient i               ON iml.ingredient_name = i.ingredient_name
JOIN raw_pos.location l                    ON l.location_id = oh.location_id
WHERE l.country = 'United States'
GROUP BY oh.truck_id, order_year, order_month, i.ingredient_name;

ALTER WAREHOUSE tb_de_wh SET WAREHOUSE_SIZE = 'xsmall';

-- Ingredientes que necesita el camion 15 en enero (incluye el Banh Mi)
SELECT truck_id, order_year, ingredient_name, SUM(total_ingredients_used) AS total_usado
FROM harmonized.ingredient_usage_by_truck
WHERE order_month = 1 AND truck_id = 15
GROUP BY ALL
ORDER BY total_usado DESC;

/*  UI: Catalog > Database Explorer > TB_101 > HARMONIZED > Dynamic Tables >
    INGREDIENT_USAGE_BY_TRUCK > pestana "Graph" para ver el DAG del pipeline. */
