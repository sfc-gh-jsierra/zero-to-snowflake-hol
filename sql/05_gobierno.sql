/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 5: GOBIERNO CON HORIZON  (~9 min)
  RBAC, clasificacion automatica de PII, masking por tags, row access policy
  y calidad de datos con Data Metric Functions.
*******************************************************************************/
USE ROLE accountadmin;
USE DATABASE tb_101;

-- (Re-ejecutable) Limpia el resultado de una corrida anterior de este track
ALTER TABLE IF EXISTS raw_customer.customer_loyalty DROP ALL ROW ACCESS POLICIES;
DROP ROLE IF EXISTS tb_data_steward;
ALTER TAG IF EXISTS governance.pii UNSET MASKING POLICY governance.mask_string_pii, MASKING POLICY governance.mask_date_pii;
DROP MASKING POLICY IF EXISTS governance.mask_string_pii;
DROP MASKING POLICY IF EXISTS governance.mask_date_pii;
DROP ROW ACCESS POLICY IF EXISTS governance.customer_loyalty_policy;
DROP TABLE IF EXISTS governance.row_policy_map;
DROP SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE IF EXISTS governance.tb_classification_profile;

/*----------------------------------------------------------------------------
  PARTE 1 - RBAC: un rol de Data Steward
----------------------------------------------------------------------------*/
USE ROLE useradmin;
CREATE OR REPLACE ROLE tb_data_steward COMMENT = 'Data Steward de Tasty Bytes';

USE ROLE securityadmin;
GRANT OPERATE, USAGE ON WAREHOUSE tb_dev_wh TO ROLE tb_data_steward;
GRANT USAGE ON DATABASE tb_101 TO ROLE tb_data_steward;
GRANT USAGE ON ALL SCHEMAS IN DATABASE tb_101 TO ROLE tb_data_steward;
GRANT SELECT ON ALL TABLES IN SCHEMA tb_101.raw_customer TO ROLE tb_data_steward;
GRANT ALL ON SCHEMA tb_101.governance TO ROLE tb_data_steward;

SET my_user = CURRENT_USER();
GRANT ROLE tb_data_steward TO USER IDENTIFIER($my_user);
GRANT ROLE tb_data_steward TO ROLE sysadmin;

USE ROLE tb_data_steward;
USE WAREHOUSE tb_dev_wh;
-- nombres, emails, telefonos en claro
SELECT TOP 20 * FROM raw_customer.customer_loyalty;

/*----------------------------------------------------------------------------
  PARTE 2 - Clasificacion automatica de datos sensibles (PII)
----------------------------------------------------------------------------*/
USE ROLE accountadmin;
CREATE OR REPLACE TAG governance.pii;
GRANT APPLY TAG ON ACCOUNT TO ROLE tb_data_steward;
GRANT APPLY MASKING POLICY ON ACCOUNT TO ROLE tb_data_steward;
GRANT APPLY ROW ACCESS POLICY ON ACCOUNT TO ROLE tb_data_steward;
GRANT EXECUTE AUTO CLASSIFICATION ON SCHEMA raw_customer TO ROLE tb_data_steward;
GRANT DATABASE ROLE SNOWFLAKE.CLASSIFICATION_ADMIN TO ROLE tb_data_steward;
GRANT CREATE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE ON SCHEMA governance TO ROLE tb_data_steward;

USE ROLE tb_data_steward;
CREATE OR REPLACE SNOWFLAKE.DATA_PRIVACY.CLASSIFICATION_PROFILE governance.tb_classification_profile(
    {'minimum_object_age_for_classification_days': 0,
     'maximum_classification_validity_days': 30,
     'auto_tag': true});

-- Toda columna clasificada como nombre/telefono/email/etc. recibe el tag PII
CALL governance.tb_classification_profile!SET_TAG_MAP(
  {'column_tag_map':[{
      'tag_name':'tb_101.governance.pii',
      'tag_value':'pii',
      'semantic_categories':['NAME','PHONE_NUMBER','POSTAL_CODE','DATE_OF_BIRTH','CITY','EMAIL']}]});

CALL SYSTEM$CLASSIFY('tb_101.raw_customer.customer_loyalty', 'tb_101.governance.tb_classification_profile');

-- Que encontro la IA de clasificacion?
SELECT column_name, tag_name, tag_value, apply_method
FROM TABLE(INFORMATION_SCHEMA.TAG_REFERENCES_ALL_COLUMNS('raw_customer.customer_loyalty', 'table'))
ORDER BY column_name;

/*----------------------------------------------------------------------------
  PARTE 3 - Masking dinamico basado en tags
----------------------------------------------------------------------------*/
CREATE OR REPLACE MASKING POLICY governance.mask_string_pii AS (val STRING) RETURNS STRING ->
    CASE WHEN CURRENT_ROLE() IN ('ACCOUNTADMIN', 'TB_ADMIN') THEN val
         ELSE '****MASKED****' END;

CREATE OR REPLACE MASKING POLICY governance.mask_date_pii AS (val DATE) RETURNS DATE ->
    CASE WHEN CURRENT_ROLE() IN ('ACCOUNTADMIN', 'TB_ADMIN') THEN val
         ELSE DATE_TRUNC('year', val) END;

-- Una sola vez sobre el TAG: protege todas las columnas PII, hoy y manana
ALTER TAG governance.pii SET
    MASKING POLICY governance.mask_string_pii,
    MASKING POLICY governance.mask_date_pii;

USE ROLE tb_analyst;
USE WAREHOUSE tb_analyst_wh;
SELECT TOP 10 customer_id, first_name, last_name, e_mail, phone_number, birthday_date, country
-- enmascarado
FROM raw_customer.customer_loyalty;

USE ROLE tb_admin;
SELECT TOP 10 customer_id, first_name, last_name, e_mail, phone_number, birthday_date, country
-- en claro
FROM raw_customer.customer_loyalty;

/*----------------------------------------------------------------------------
  PARTE 4 - Seguridad a nivel de fila (Row Access Policy)
----------------------------------------------------------------------------*/
USE ROLE tb_data_steward;
USE WAREHOUSE tb_dev_wh;
CREATE OR REPLACE TABLE governance.row_policy_map (role STRING, country_permission STRING);
INSERT INTO governance.row_policy_map VALUES ('TB_DATA_ENGINEER', 'United States');

CREATE OR REPLACE ROW ACCESS POLICY governance.customer_loyalty_policy
AS (country STRING) RETURNS BOOLEAN ->
    CURRENT_ROLE() IN ('ACCOUNTADMIN', 'SYSADMIN', 'TB_ADMIN', 'TB_ANALYST')
    OR EXISTS (SELECT 1 FROM governance.row_policy_map rp
               WHERE rp.role = CURRENT_ROLE() AND rp.country_permission = country);

ALTER TABLE raw_customer.customer_loyalty
    ADD ROW ACCESS POLICY governance.customer_loyalty_policy ON (country);

USE ROLE tb_data_engineer;
-- solo US
SELECT country, COUNT(*) AS clientes FROM raw_customer.customer_loyalty GROUP BY country;

USE ROLE tb_analyst;
-- todos
SELECT country, COUNT(*) AS clientes FROM raw_customer.customer_loyalty GROUP BY country;

/*----------------------------------------------------------------------------
  PARTE 5 - Calidad de datos: Data Metric Functions
----------------------------------------------------------------------------*/
-- sysadmin es el duenio de las tablas: puede asociarles DMFs
USE ROLE sysadmin;
USE WAREHOUSE tb_dev_wh;
-- DMFs de sistema
SELECT SNOWFLAKE.CORE.NULL_PERCENT(SELECT e_mail FROM raw_customer.customer_loyalty)      AS pct_email_nulo;
SELECT SNOWFLAKE.CORE.DUPLICATE_COUNT(SELECT customer_id FROM raw_customer.customer_loyalty) AS ids_duplicados;

-- DMF propia: emails con formato invalido
CREATE OR REPLACE DATA METRIC FUNCTION governance.invalid_email_count(t TABLE(email STRING))
RETURNS NUMBER AS
'SELECT COUNT_IF(email IS NOT NULL AND NOT REGEXP_LIKE(email, ''^[^@]+@[^@]+\\.[^@]+$'')) FROM t';

SELECT governance.invalid_email_count(SELECT e_mail FROM raw_customer.customer_loyalty) AS emails_invalidos;

-- Monitoreo automatico cada vez que cambie la tabla
ALTER TABLE raw_customer.customer_loyalty SET DATA_METRIC_SCHEDULE = 'TRIGGER_ON_CHANGES';
ALTER TABLE raw_customer.customer_loyalty
    ADD DATA METRIC FUNCTION governance.invalid_email_count ON (e_mail);

/*  UI: Catalog > TB_101 > RAW_CUSTOMER > CUSTOMER_LOYALTY > pestana "Data Quality"
    y Governance & Security > Trust Center para el escaneo de seguridad de la cuenta. */
