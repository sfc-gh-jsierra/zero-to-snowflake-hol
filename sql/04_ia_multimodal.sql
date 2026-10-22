/*******************************************************************************
  ZERO TO SNOWFLAKE - TRACK 4: IA MULTIMODAL  (~7 min)
  Audio, documentos e imagenes con SQL.
  PREVIO: sube los archivos de la carpeta /archivos al stage TB_101.PUBLIC.ARCHIVOS
  (Catalog > TB_101 > PUBLIC > Stages > ARCHIVOS > + Files)
*******************************************************************************/
USE ROLE accountadmin;
USE DATABASE tb_101;
USE SCHEMA public;
USE WAREHOUSE tb_analyst_wh;

ALTER STAGE archivos REFRESH;
SELECT relative_path, size FROM DIRECTORY(@archivos);

/*----------------------------------------------------------------------------
  PARTE 1 - Audio: AI_TRANSCRIBE + sentimiento + recomendacion
----------------------------------------------------------------------------*/
-- Una llamada al call center, con separacion por hablante
SELECT AI_TRANSCRIBE(TO_FILE('@archivos', 'problema-servicio.mp3'),
                     {'timestamp_granularity': 'speaker'}) AS transcripcion;

-- Todas las llamadas: transcribir, medir y recomendar en un solo query
WITH audios AS (
    SELECT relative_path,
           AI_TRANSCRIBE(TO_FILE('@archivos', relative_path)):text::STRING AS texto
    FROM DIRECTORY(@archivos)
    WHERE relative_path ILIKE '%.mp3'
)
SELECT
    relative_path,
    texto,
    AI_SENTIMENT(texto, ['profesionalismo', 'resolucion', 'tiempo de espera']) AS sentimiento,
    AI_COMPLETE('claude-sonnet-4-5',
        'Como podria mejorar el agente esta atencion? Maximo 3 bullets de 10 palabras: ' || texto) AS recomendacion
FROM audios;

/*----------------------------------------------------------------------------
  PARTE 2 - Documentos: AI_EXTRACT sobre contratos .docx
----------------------------------------------------------------------------*/
SELECT
    relative_path,
    AI_EXTRACT(
        file => TO_FILE('@archivos', relative_path),
        responseFormat => [
            ['arrendatario',          'Quien es el arrendatario?'],
            ['arrendador',            'Quien es el arrendador?'],
            ['fecha_inicio',          'Fecha de inicio del contrato (YYYY-MM-DD)?'],
            ['valor_contrato',        'Valor del contrato en numeros?'],
            ['inmueble_direccion',    'Direccion del inmueble?'],
            ['terminacion_anticipada','Tiene clausula de terminacion anticipada (SI/NO)?']
        ]
    ):response AS datos_contrato
FROM DIRECTORY(@archivos)
WHERE relative_path ILIKE '%.docx';

/*----------------------------------------------------------------------------
  PARTE 3 - Imagenes: LLM multimodal
----------------------------------------------------------------------------*/
-- Documento de identidad -> JSON estructurado
SELECT AI_COMPLETE('claude-sonnet-4-5',
    PROMPT('Extrae de esta cedula en JSON: numero, nombres, apellidos, fecha_nacimiento, lugar_nacimiento, es_mayor_de_edad (SI/NO). Solo el JSON. {0}',
           TO_FILE('@archivos', 'cedula.jpg'))) AS cedula;

-- Seguridad industrial en una foto de campo (otro modelo: pixtral-large de Mistral)
SELECT AI_COMPLETE('pixtral-large',
    PROMPT('Describe la imagen en espanol con: cantidad_personas, usan_elementos_seguridad, tipo_elementos, zona_senalizada, tipo_trabajo (suelo/altura), riesgos. {0}',
           TO_FILE('@archivos', 'TELCO.png'))) AS inspeccion;

-- Peritaje de un choque para seguros
SELECT AI_COMPLETE('claude-sonnet-4-5',
    PROMPT('Eres perito de seguros. Describe danos visibles, severidad (baja/media/alta) y partes a reparar. {0}',
           TO_FILE('@archivos', 'choque.png'))) AS peritaje;
