"""Agrega 'resumen' a cada step y comentarios breves a las sentencias SQL sin comentario
en los labs 4 a 7. Solo agrega lineas de comentario; no toca el codigo.
Uso: python3 add_explicaciones_4a7.py
"""

import json
import re

from add_comments import statements_with_spans
from check_coverage import CONTENT

# Por lab, en orden de aparicion: (prefijo esperado de la sentencia, comentario).
# comentario None = la sentencia queda cubierta por el comentario de su grupo.
COMMENTS = {
    "lab4_multimodal": [
        ("USE ROLE accountadmin", "Contexto: rol, base, esquema y warehouse del lab"),
        ("USE DATABASE tb_101", None),
        ("USE SCHEMA public", None),
        ("USE WAREHOUSE tb_analyst_wh", None),
        ("ALTER STAGE archivos REFRESH", "Sincroniza el catalogo de archivos del stage"),
        ("SELECT relative_path, size", "Lista los archivos disponibles y su tamano"),
        ("SELECT AI_TRANSCRIBE", "Transcribe una llamada separando a cada hablante"),
        ("SELECT", "Extrae datos clave de cada contrato Word"),
        ("SELECT AI_COMPLETE('claude-sonnet-4-5',", "Lee la cedula y devuelve sus datos en JSON"),
    ],
    "lab5_gobierno": [
        ("USE ROLE accountadmin", "Contexto: rol administrador y base de datos"),
        ("USE DATABASE tb_101", None),
        # Limpieza: cubierta por el comentario "(Re-ejecutable) ..." del grupo
        ("DROP ROLE IF EXISTS", None),
        ("ALTER TAG IF EXISTS", None),
        ("DROP MASKING POLICY IF EXISTS governance.mask_string_pii", None),
        ("DROP MASKING POLICY IF EXISTS governance.mask_date_pii", None),
        ("DROP ROW ACCESS POLICY", None),
        ("DROP TABLE IF EXISTS", None),
        ("DROP SNOWFLAKE.DATA_PRIVACY", None),
        ("USE ROLE useradmin", "useradmin es el rol que crea roles"),
        ("CREATE OR REPLACE ROLE tb_data_steward", "Crea el rol de Data Steward"),
        ("USE ROLE securityadmin", "securityadmin administra los permisos"),
        ("GRANT OPERATE, USAGE ON WAREHOUSE", "Permisos del steward: computo, base, esquemas y clientes"),
        ("GRANT USAGE ON DATABASE", None),
        ("GRANT USAGE ON ALL SCHEMAS", None),
        ("GRANT SELECT ON ALL TABLES", None),
        ("GRANT ALL ON SCHEMA", None),
        ("SET my_user", "Guarda tu usuario en una variable de sesion"),
        ("GRANT ROLE tb_data_steward TO USER", "Asigna el rol a tu usuario"),
        ("GRANT ROLE tb_data_steward TO ROLE sysadmin", "Cuelga el rol de sysadmin (buena practica)"),
        ("USE ROLE tb_data_steward", "Trabaja como Data Steward con su warehouse"),
        ("USE WAREHOUSE tb_dev_wh", None),
        ("USE ROLE accountadmin", "Vuelve a accountadmin para crear el tag"),
        ("CREATE OR REPLACE TAG", "Crea el tag pii para marcar columnas sensibles"),
        ("GRANT APPLY TAG", "Permite al steward aplicar tags y masking"),
        ("GRANT APPLY MASKING POLICY", None),
        ("GRANT APPLY ROW ACCESS POLICY", "Permisos de row policies y clasificacion automatica"),
        ("GRANT EXECUTE AUTO CLASSIFICATION", None),
        ("GRANT DATABASE ROLE SNOWFLAKE.CLASSIFICATION_ADMIN", None),
        ("GRANT CREATE SNOWFLAKE.DATA_PRIVACY", None),
        ("USE ROLE tb_data_steward", "Vuelve al rol de Data Steward"),
        ("CREATE OR REPLACE SNOWFLAKE.DATA_PRIVACY", "Crea el perfil de clasificacion con auto tag"),
        ("CALL SYSTEM$CLASSIFY", "Clasifica la tabla de clientes y aplica tags"),
        ("CREATE OR REPLACE MASKING POLICY governance.mask_string_pii", "Enmascara texto salvo para roles administradores"),
        ("CREATE OR REPLACE MASKING POLICY governance.mask_date_pii", "Deja solo el anio de las fechas sensibles"),
        ("USE ROLE tb_analyst", "Consulta como analista: veras PII enmascarada"),
        ("USE WAREHOUSE tb_analyst_wh", None),
        ("SELECT TOP 10", None),
        ("USE ROLE tb_admin", "Misma consulta como admin: veras datos en claro"),
        ("SELECT TOP 10", None),
        ("USE ROLE tb_data_steward", "Contexto: steward con su warehouse"),
        ("USE WAREHOUSE tb_dev_wh", None),
        ("CREATE OR REPLACE TABLE governance.row_policy_map", "Tabla de mapeo rol a pais permitido"),
        ("INSERT INTO governance.row_policy_map", "El data engineer solo vera Estados Unidos"),
        ("CREATE OR REPLACE ROW ACCESS POLICY", "Decide fila por fila que paises ve cada rol"),
        ("ALTER TABLE raw_customer.customer_loyalty", "Aplica la politica sobre la columna country"),
        ("USE ROLE tb_data_engineer", "Prueba como data engineer"),
        ("USE ROLE tb_analyst", "Prueba como analista"),
        ("USE ROLE sysadmin", "Contexto: sysadmin con warehouse de desarrollo"),
        ("USE WAREHOUSE tb_dev_wh", None),
        ("SELECT SNOWFLAKE.CORE.DUPLICATE_COUNT", "Cuenta ids de cliente duplicados"),
        ("SELECT governance.invalid_email_count", "Ejecuta la DMF propia sobre los emails"),
        ("ALTER TABLE raw_customer.customer_loyalty", "Asocia la DMF de emails a la columna e_mail"),
    ],
    "lab6_marketplace": [
        ("USE ROLE accountadmin", "Solo accountadmin puede instalar listings"),
        ("GRANT IMPORTED PRIVILEGES", "Da acceso a la base compartida a todos los roles"),
        ("USE ROLE tb_analyst", "Contexto: rol analista, base y warehouse"),
        ("USE DATABASE tb_101", None),
        ("USE WAREHOUSE tb_analyst_wh", None),
    ],
    "lab7_semantica_busqueda": [
        ("USE ROLE accountadmin", "Contexto: rol, base y warehouse del lab"),
        ("USE DATABASE tb_101", None),
        ("USE WAREHOUSE tb_de_wh", None),
        ("SELECT COUNT(*) AS filas", "Verifica filas, rango de fechas y ventas totales"),
        ("SELECT marca, sentimiento", "Cuenta reviews por marca y sentimiento"),
        ("CREATE OR REPLACE CORTEX SEARCH SERVICE", "Crea la busqueda semantica sobre las reviews"),
        ("CREATE OR REPLACE SEMANTIC VIEW", "Crea la Semantic View: tablas, relaciones, metricas"),
        ("SHOW SEMANTIC VIEWS", "Lista las Semantic Views del esquema"),
        ("DESCRIBE SEMANTIC VIEW", "Muestra la definicion completa de la SV"),
        ("GRANT SELECT ON SEMANTIC VIEW", "Permite al analista consultar la Semantic View"),
        ("GRANT USAGE ON CORTEX SEARCH SERVICE", "Permite al analista usar el servicio de busqueda"),
    ],
}

RESUMENES = {
    "lab4_multimodal": [
        "Preparamos el contexto y confirmamos que audios, documentos e imagenes ya estan en Snowflake, listos para analizarlos con IA.",
        "Convertimos llamadas de servicio en texto, medimos su sentimiento y obtenemos recomendaciones de mejora, todo con una consulta SQL.",
        "Extraemos automaticamente las partes, fechas y valores de contratos Word, sin leerlos a mano ni sacar los archivos de Snowflake.",
        "Usamos IA de vision para leer una cedula, revisar seguridad industrial en una foto y peritar un choque para seguros.",
    ],
    "lab5_gobierno": [
        "Fijamos el contexto y limpiamos corridas anteriores para que el lab de gobierno se pueda repetir sin errores.",
        "Creamos un rol de Data Steward con permisos minimos y vemos que hoy los datos personales de clientes estan expuestos.",
        "Dejamos que Snowflake detecte y etiquete automaticamente los datos personales, sin revisar columna por columna.",
        "Ocultamos los datos personales segun el rol con una sola regla sobre el tag, que protege columnas actuales y futuras.",
        "Limitamos que filas ve cada rol segun el pais, para que cada equipo vea solo los clientes que le corresponden.",
        "Medimos la calidad de los datos (nulos, duplicados, emails invalidos) y dejamos un monitoreo automatico ante cada cambio.",
        "Activamos el Trust Center para detectar riesgos de seguridad de la cuenta, como usuarios sin MFA, y ver como corregirlos.",
    ],
    "lab6_marketplace": [
        "Obtenemos gratis datos de clima del Marketplace, compartidos en vivo por el proveedor, sin copiar archivos ni crear pipelines.",
        "Exploramos el clima del proveedor y lo filtramos a las ciudades donde opera Tasty Bytes con una vista.",
        "Unimos nuestras ventas con el clima de terceros en una vista lista para analizar el impacto del tiempo en el negocio.",
        "Probamos con datos si la lluvia reduce las ventas en Seattle y lo graficamos sin salir del SQL File.",
    ],
    "lab7_semantica_busqueda": [
        "Revisamos las tablas de negocio curadas y agregamos coordenadas de ciudades, base limpia para que la IA responda bien.",
        "Calculamos con IA el sentimiento de 2,000 reviews de clientes para poder filtrarlas y analizarlas despues.",
        "Creamos un buscador semantico sobre las reviews que entiende el significado de las quejas, no solo palabras exactas.",
        "Definimos el diccionario de negocio (Semantic View) que la IA usa para traducir preguntas en espanol a SQL correcto.",
        "Consultamos la Semantic View con nombres de negocio y damos acceso al rol analista que usara el agente.",
        "Hacemos preguntas en espanol en Cortex Analyst y comprobamos que la IA escribe el SQL correcto usando el diccionario.",
    ],
}


def main() -> None:
    for lab, rules in COMMENTS.items():
        p = CONTENT / f"{lab}.json"
        spec = json.loads(p.read_text())
        resumenes = RESUMENES[lab]
        assert len(resumenes) == len(spec["steps"]), (lab, len(spec["steps"]))
        queue = list(rules)
        added = 0
        for step, resumen in zip(spec["steps"], resumenes):
            assert len(resumen.split()) <= 25, resumen
            # Reinsertar claves para dejar "resumen" justo despues de "badge"
            items = [(k, v) for k, v in step.items() if k != "resumen"]
            step.clear()
            for k, v in items:
                step[k] = v
                if k == "badge":
                    step["resumen"] = resumen
            for b in step["blocks"]:
                if b["type"] != "code" or b.get("lang", "sql") != "sql":
                    continue
                lines = b["code"].split("\n")
                inserts = []
                for start, _ in statements_with_spans(b["code"]):
                    if start > 0 and lines[start - 1].strip().startswith("--"):
                        continue
                    prefix, comment = queue.pop(0)
                    assert lines[start].strip().startswith(prefix), (lab, prefix, lines[start])
                    if comment:
                        indent = re.match(r"\s*", lines[start]).group(0)
                        inserts.append((start, f"{indent}-- {comment}"))
                for start, c in reversed(inserts):
                    lines.insert(start, c)
                    added += 1
                b["code"] = "\n".join(lines)
        assert not queue, (lab, queue)
        p.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")
        print(f"{lab}: {len(resumenes)} resumenes, {added} comentarios")


if __name__ == "__main__":
    main()
