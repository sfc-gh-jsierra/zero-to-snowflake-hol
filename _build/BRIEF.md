# Brief para escribir el contenido de un lab (JSON)

Proyecto: HOL "Zero to Snowflake" personalizado, en espanol, de 90 min, para partners de Chile y Argentina.
Raiz: /Users/jsierra/partners/HOL/zero-to-snowflake

## Objetivo
Cada lab HTML debe ser 100% copiar-pegar y explicado, como el quickstart oficial, pero en formato HOL.
El asistente NUNCA abre un .sql: todo lo que tiene que ejecutar esta en la guia, con su explicacion.

## Lo que produces
Un archivo `guia/_build/content/<lab>.json` con el esquema documentado en `guia/_build/build_labs.py`.
Referencia OBLIGATORIA de estilo y granularidad: `guia/_build/content/lab1_fundamentos.json`.
Luego ejecuta:
- `python3 guia/_build/build_labs.py <lab>`: regenera el HTML.
- `python3 guia/_build/check_coverage.py`: tu lab debe dar "0 sentencias faltantes".

## Reglas
1. Fuente del SQL: el `.sql` validado de `sql/` (te digo cual). Incluye TODAS sus sentencias, copiadas TEXTUALMENTE (mismos nombres, mismos valores; solo puedes quitar o cambiar comentarios). No inventes SQL nuevo ni lo "mejores": ya esta validado en vivo.
2. Granularidad: un bloque de codigo = 1 a 4 sentencias relacionadas. Antes de cada bloque, un "text" que explica QUE hace y POR QUE (concepto de Snowflake, en lenguaje claro). Despues, un "expected" con lo que debe ver (mensaje, numero de filas o columnas clave) o un callout warning si es un [ERROR ESPERADO].
3. Narrativa: inspirate en la seccion correspondiente del quickstart oficial (`/tmp/sfq/site/sfguides/src/zero-to-snowflake/zero-to-snowflake.md`). Traduce y adapta las explicaciones al espanol, sin tildes problematicas (puedes usar tildes en HTML; evita caracteres raros en codigo).
4. Imagenes: usa las del quickstart que apliquen (lista en `guia/_build/assets_list.txt`, rutas relativas `img/quickstart/...`) con su caption. Los headers (`*_header.png`) solo como imagen inicial de un lab si encaja. NO inventes rutas.
5. Pasos de UI (Snowsight, CoWork, Marketplace, Cortex Playground, Streamlit): badge "UI", con instrucciones numeradas de clic en un "text" (`<ol><li>`) mas el GIF o PNG del quickstart si existe.
6. Duracion: la suma de "minutes" debe ser EXACTA a la meta del lab (te la doy). Los minutos son enteros y >=1. Agrupa para cumplirla.
7. El primer step (o "intro") recuerda crear un SQL File nuevo en Workspaces con un nombre sugerido. Nunca menciones archivos .sql del repo ni "copia todo el archivo".
8. Conserva los mensajes clave del HTML actual del lab (lee el HTML actual en `guia/<lab>.html`: tiene callouts y criterios ya validados) y reusa sus datos de "que deberias ver". En `/tmp/guia_backup/` hay una copia de respaldo.
9. HTML dentro de strings JSON: usa `<p>`, `<code>`, `<strong>`, `<em>`, `<ol>/<ul>/<li>`. Escapa bien el JSON (usa python `json.dump` si te es mas facil, con `ensure_ascii=False`, `indent=2`).
10. Tras el build, revisa en el HTML resultante que tu lab no menciona `.sql` (grep). El hero y la seccion de prerequisitos estan FUERA de `<main>`; si mencionan "Ejecutaste 00_setup.sql" o similar, corrige ese texto directamente en el HTML (por ejemplo, "Completaste el LAB 0 (setup)").
11. No toques otros labs ni los `.sql`.

## Entrega
Responde con:
- los pasos (titulo y minutos) y el total;
- la salida de check_coverage de tu lab;
- las imagenes que usaste;
- cualquier duda o desviacion.
