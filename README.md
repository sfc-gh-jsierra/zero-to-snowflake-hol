# HOL Zero to Snowflake: de los fundamentos a los agentes de IA (90 min)

Hands-on Lab sobre los datos de **Tasty Bytes**, basado en el quickstart oficial [Zero to Snowflake](https://www.snowflake.com/en/developers/guides/zero-to-snowflake/) y en el SQL en español de [jparrado/HOL](https://github.com/sfc-gh-jparrado/HOL). La versión original se extendió hasta llegar a un **agente de Snowflake CoWork** que se consume desde apps **Streamlit** y **React**.

Todo se validó en vivo en la cuenta demo `DEMO_JSIERRA` el 2026-10-13: 0 fallos en los 9 scripts SQL, 5/5 preguntas del agente correctas y las dos apps desplegadas.

**Guía en línea:** https://sfc-gh-jsierra.github.io/zero-to-snowflake-hol/  
**Descarga completa (ZIP):** https://github.com/sfc-gh-jsierra/zero-to-snowflake-hol/archive/refs/heads/main.zip

## Contenido

| Carpeta | Qué hay |
|---|---|
| `guia/` | **Guía HTML paso a paso, 100% copiar y pegar.** Abrir `guia/index.html`. Tiene 11 labs: cada paso explica qué hace y por qué, trae el código listo para copiar y dice qué se debe ver, con las imágenes y GIFs del quickstart oficial (`guia/img/quickstart/`). Los asistentes no necesitan ningún `.sql`. |
| `guia/_build/` | Fuente de la guía: `content/<lab>.json` (pasos), `build_labs.py` (genera los HTML) y `check_coverage.py` (verifica que cada sentencia validada de `sql/` aparezca en la guía). |
| `sql/` | **Solo para instructores:** los scripts validados por track, `00_setup` a `09_cleanup`, más `_validar.py` para validar automáticamente contra una cuenta. Son la fuente de verdad del código de la guía. |
| `archivos/` | 7 archivos multimodales (audio, contratos .docx, imágenes) para el stage `TB_101.PUBLIC.ARCHIVOS`. |
| `streamlit-app/` | App Streamlit en Snowflake `TASTY_BYTES_COPILOT`: KPIs, mapa 3D, Altair y chat con el agente. |
| `react-app/` | App React (Next.js 16) **Tasty Bytes Command Center** para Snowflake App Runtime: globo 3D, ECharts y chat con streaming. |

PPT: [HOL - Zero to Snowflake (Google Slides)](https://docs.google.com/presentation/d/1cvnwWlCz91N5c45D9J9Ap0sAAfRJRkzXJxkLkfvB49c), una copia de "HOL - MAR 2026" con una slide por track.

## Agenda

| Lab | Tema | Min |
|---|---|---|
| 0 | Setup: carga desde S3 + archivos + capa de negocio | 7 |
| 1 | Fundamentos: warehouses, cache, clonación, SWAP, UNDROP, resource monitor | 8 |
| 2 | Pipeline: S3 → VARIANT/FLATTEN → Dynamic Tables | 8 |
| 3 | Cortex AISQL | 9 |
| 4 | IA multimodal: audio, documentos, imágenes | 7 |
| 5 | Gobierno con Horizon: clasificación, masking, RLS, DMFs | 9 |
| 6 | Marketplace (Weather Source) | 5 |
| 7 | Tablas curadas + Cortex Search + Semantic View | 9 |
| 8 | Agente de Snowflake CoWork con 4 herramientas | 12 |
| 9 | Apps: Streamlit + React (Snowflake App Runtime) | 12 |
| 10 | Cierre y cleanup | 4 |

## Preparación del instructor

1. Cuentas con Cortex Code y Snowflake CoWork habilitados, y `CORTEX_ENABLED_CROSS_REGION = 'ANY_REGION'`.
2. Compartir el link de la guía. Desde el repositorio, los asistentes descargan `archivos/` y las apps; en el lab 9 pueden descargar el código de Streamlit o pedírselo a Cortex Code.
3. Opcional: precargar los datos ejecutando `sql/00_setup.sql`, que tarda unos 5.5 min en XLARGE.
4. Validar una cuenta completa con `cd sql && for f in 0*.sql; do python3 _validar.py $f <conexion>; done`. El orden `00` a `08` es el del lab.

## Editar la guía

1. Editar `guia/_build/content/<lab>.json`. Si cambia el SQL, cambiarlo primero en `sql/` y validarlo con `_validar.py`.
2. `python3 guia/_build/build_labs.py` regenera los HTML.
3. `python3 guia/_build/check_coverage.py` debe dar 0 sentencias faltantes.

## Notas importantes

- La app React se despliega en la base personal (`USER$`) y corre con el rol con el que se desplegó. Si ese rol no hereda `TB_ANALYST`, ejecutar `GRANT ROLE TB_ANALYST TO ROLE <rol>`. ACCOUNTADMIN y SYSADMIN ya lo heredan.
- `snow app` requiere Snowflake CLI **3.26+**.
- La Streamlit usa solo paquetes preinstalados, así que no necesita una External Access Integration.
