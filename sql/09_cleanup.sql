/*******************************************************************************
  ZERO TO SNOWFLAKE - CLEANUP (opcional, al terminar el HOL)
  Elimina todo lo creado en el laboratorio. No se puede deshacer
  (salvo con UNDROP dentro del periodo de Time Travel).
*******************************************************************************/
USE ROLE accountadmin;

-- Apps
DROP STREAMLIT IF EXISTS tb_101.analytics.tasty_bytes_copilot;
-- La app React se elimina desde la carpeta react-app con:  snow app teardown --force

-- Agente: quitarlo de Snowflake CoWork y borrarlo
EXECUTE IMMEDIATE $$
BEGIN
    ALTER SNOWFLAKE INTELLIGENCE SNOWFLAKE_INTELLIGENCE_OBJECT_DEFAULT
        DROP AGENT snowflake_intelligence.agents.tasty_bytes_agent;
    RETURN 'Agente retirado de CoWork';
EXCEPTION
    WHEN OTHER THEN RETURN 'El agente no estaba publicado';
END;
$$;
DROP AGENT IF EXISTS snowflake_intelligence.agents.tasty_bytes_agent;

-- Gobierno (las politicas se desasocian antes de borrar la base)
ALTER TABLE IF EXISTS tb_101.raw_customer.customer_loyalty DROP ALL ROW ACCESS POLICIES;
ALTER TAG IF EXISTS tb_101.governance.pii UNSET MASKING POLICY tb_101.governance.mask_string_pii, MASKING POLICY tb_101.governance.mask_date_pii;
DROP ROLE IF EXISTS tb_data_steward;

-- Base de datos del lab, Marketplace, warehouses y roles
DROP DATABASE IF EXISTS tb_101;
DROP DATABASE IF EXISTS zts_weathersource;
DROP WAREHOUSE IF EXISTS my_wh;
DROP WAREHOUSE IF EXISTS tb_de_wh;
DROP WAREHOUSE IF EXISTS tb_dev_wh;
DROP WAREHOUSE IF EXISTS tb_analyst_wh;
DROP WAREHOUSE IF EXISTS tb_cortex_wh;
DROP RESOURCE MONITOR IF EXISTS my_resource_monitor;
DROP ROLE IF EXISTS tb_admin;
DROP ROLE IF EXISTS tb_data_engineer;
DROP ROLE IF EXISTS tb_dev;
DROP ROLE IF EXISTS tb_analyst;
