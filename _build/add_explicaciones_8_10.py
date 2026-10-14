"""Agrega 'resumen' por step y comentarios breves en codigo para lab8, lab9 y lab10.
Solo inserta lineas de comentario; no modifica codigo. Idempotente."""

import json
import re
from pathlib import Path

CONTENT = Path(__file__).parent / "content"

RESUMENES = {
    "lab8_agente_cowork": [
        "Creamos un stored procedure de pronostico que el agente podra usar como herramienta para proyectar ventas futuras.",
        "Creamos el agente Tasty Bytes Copilot que combina ventas, reviews, pronosticos y graficas en una sola conversacion.",
        "Damos permisos al analista y publicamos el agente en Snowflake CoWork para que el negocio lo use.",
        "Probamos el agente con una llamada SQL para confirmar que responde antes de abrirlo al negocio.",
        "Conversamos con el agente en CoWork y vemos como elige herramientas, genera SQL y cita reviews.",
        "Ajustamos el estilo del agente desde la interfaz, sin codigo, y comprobamos el cambio al instante.",
    ],
    "lab9_apps": [
        "Creamos una app Streamlit dentro de Snowflake con dashboard y chat con el agente, sin servidores externos.",
        "Recorremos las cinco pestanas de la app para ver datos en vivo y el agente integrado en una aplicacion.",
        "Desplegamos una app web React en Snowflake App Runtime para llevar los datos a una experiencia a medida.",
        "Exploramos el Command Center y entendemos como la app consulta datos y conversa con el agente en streaming.",
    ],
    "lab10_cierre": [
        "Repasamos la arquitectura completa construida y ubicamos cada lab y funcionalidad de Snowflake usada.",
        "Compartimos recursos y comunidad para seguir practicando y llevar lo aprendido a proyectos reales.",
        "Borramos opcionalmente todo lo creado en el HOL para dejar la cuenta limpia y sin consumo.",
    ],
}

# (step, block, inicio exacto de la linea (sin indentacion), comentario, ocurrencia)
SQL = "--"
COMENTARIOS = {
    "lab8_agente_cowork": [
        (0, 1, "USE ROLE accountadmin;", "-- Usa el rol administrador de la cuenta"),
        (0, 1, "USE DATABASE tb_101;", "-- Trabaja sobre la base del lab"),
        (0, 1, "USE WAREHOUSE tb_analyst_wh;", "-- Usa el computo del analista"),
        (0, 4, "CREATE OR REPLACE PROCEDURE", "-- Crea el procedimiento de pronostico lineal"),
        (1, 1, "CREATE SCHEMA IF NOT EXISTS", "-- Crea el esquema donde viven los agentes"),
        (1, 5, "CREATE OR REPLACE AGENT", "-- Crea el agente desde su especificacion YAML"),
        (1, 8, "DESCRIBE AGENT", "-- Revisa herramientas y perfil del agente"),
        (2, 1, "GRANT USAGE ON DATABASE", "-- Da al analista acceso al agente y sus recursos"),
        (2, 4, "CREATE SNOWFLAKE INTELLIGENCE", "-- Crea el objeto de CoWork si no existe"),
        (3, 1, "SELECT TRY_PARSE_JSON(", "-- Pregunta al agente por SQL y extrae la respuesta"),
    ],
    "lab9_apps": [
        (0, 2, "import json", "# Librerias: datos, graficas Altair, mapas pydeck y Streamlit"),
        (0, 2, "AGENT = ", "# Agente de CoWork y esquema con los datos del lab"),
        (0, 2, "@st.cache_resource", "# Sesion de Snowpark compartida por toda la app"),
        (0, 2, "@st.cache_data(ttl=600", "# Ejecuta SQL con binds y cachea el resultado 10 min"),
        (0, 2, "anio = st.segmented_control", "# Filtro global de anio y las cinco pestanas"),
        (0, 2, "kpi = run_query(", "# KPIs del anio y comparacion contra el anio anterior"),
        (0, 2, "ciudades = run_query(", "# Ventas por ciudad para el mapa 3D"),
        (0, 2, "GRID, STEP", "# Ciudad procedural: grilla de edificios, calles y rutas"),
        (0, 2, "hora_df = run_query(", "# Demanda real por hora, ciudad y marca"),
        (0, 2, "@st.fragment(run_every", "# Fragmento que se refresca cada segundo para animar"),
        (0, 2, "items = run_query(", "# Ventas, unidades y precio por item del menu"),
        (0, 2, "sent = run_query(", "# Reviews por marca y sentimiento (AI_SENTIMENT)"),
        (0, 2, "def call_agent(", "# Llama al agente con DATA_AGENT_RUN y el historial"),
        (0, 2, "def render_answer(", "# Dibuja herramientas, SQL, graficas y texto del agente"),
        (0, 2, "pregunta = st.chat_input(", "# Envia la pregunta al agente y guarda la respuesta"),
        (2, 1, "pip install -U snowflake-cli", "# Instala o actualiza Snowflake CLI"),
        (2, 1, "snow --version", "# Verifica la version (3.26 o superior)"),
        (2, 3, "cd react-app", "# Entra a la carpeta de la app React"),
        (2, 3, "snow app setup", "# Prepara la app segun app.yml"),
        (2, 3, "snow app validate", "# Valida la configuracion antes de desplegar"),
        (2, 5, "snow app deploy", "# Construye y despliega la app en Snowflake"),
        (2, 5, "snow app open", "# Abre la app en el navegador"),
        (2, 7, "Despliega esta app", "# Prompt para pegar en Cortex Code"),
        (3, 1, "NAVEGADOR", "# Flujo de una consulta en el Command Center"),
    ],
    "lab10_cierre": [
        (0, 1, "S3 --> RAW", "# Arquitectura final de punta a punta"),
        (2, 3, "USE ROLE accountadmin;", "-- Usa el rol administrador para limpiar"),
        (2, 5, "DROP AGENT IF EXISTS", "-- Borra el agente"),
        (2, 7, "ALTER TAG IF EXISTS", "-- Quita las masking policies del tag PII"),
        (2, 7, "DROP ROLE IF EXISTS tb_data_steward", "-- Borra el rol de data steward"),
        (2, 9, "DROP DATABASE IF EXISTS zts_weathersource", "-- Borra la base del Marketplace"),
        (2, 10, "DROP WAREHOUSE IF EXISTS my_wh", "-- Borra los warehouses del lab"),
        (2, 11, "DROP WAREHOUSE IF EXISTS tb_cortex_wh", "-- Borra el warehouse de Cortex"),
        (2, 11, "DROP RESOURCE MONITOR", "-- Borra el monitor de recursos"),
        (2, 12, "DROP ROLE IF EXISTS tb_admin", "-- Borra los roles del lab"),
        (2, 14, "snow app teardown", "# Elimina la app React (desde react-app)"),
    ],
}


def add_resumen(step: dict, texto: str) -> bool:
    if "resumen" in step:
        return False
    nuevo = {}
    for k, v in step.items():
        nuevo[k] = v
        if k == "badge":
            nuevo["resumen"] = texto
    if "resumen" not in nuevo:
        nuevo["resumen"] = texto
    step.clear()
    step.update(nuevo)
    return True


def insert_comment(block: dict, anchor: str, comment: str) -> bool:
    lines = block["code"].split("\n")
    for i, line in enumerate(lines):
        if line.strip().startswith(anchor):
            prev = lines[i - 1].strip() if i > 0 else ""
            if prev == comment:
                return False  # ya insertado
            indent = re.match(r"\s*", line).group(0)
            lines.insert(i, indent + comment)
            block["code"] = "\n".join(lines)
            return True
    raise SystemExit(f"ancla no encontrada: {anchor!r}")


def main() -> None:
    total_res = 0
    for lab, resumenes in RESUMENES.items():
        p = CONTENT / f"{lab}.json"
        spec = json.loads(p.read_text())
        assert len(spec["steps"]) == len(resumenes), lab
        for step, r in zip(spec["steps"], resumenes):
            total_res += add_resumen(step, r)
        n = 0
        for s, b, anchor, comment in COMENTARIOS[lab]:
            block = spec["steps"][s]["blocks"][b]
            assert block["type"] == "code", (lab, s, b)
            n += insert_comment(block, anchor, comment)
        p.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")
        print(f"{lab}: comentarios agregados {n}")
    print(f"resumenes agregados: {total_res}")


if __name__ == "__main__":
    main()
