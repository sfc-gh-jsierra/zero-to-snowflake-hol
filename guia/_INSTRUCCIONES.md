# Instrucciones de construccion — Guia HTML del HOL "Zero to Snowflake: de los fundamentos a los agentes"

Documento obligatorio para cada subagente que genere un archivo de esta guia. Duracion total del HOL: **90 minutos**. Idioma: **espanol neutro LATAM**, tono directo y practico (estilo del quickstart oficial "Zero to Snowflake" y del SQL de jparrado).

Raiz del proyecto: `/Users/jsierra/partners/HOL/zero-to-snowflake/`
Carpeta de salida: `/Users/jsierra/partners/HOL/zero-to-snowflake/guia/`

---

## 1. Archivos de referencia (LEER antes de escribir)

| Archivo | Uso |
|---|---|
| `guia/_plantilla_base.html` | Bloque `<style>` (lineas 5-490) y bloque `<script>` (lineas 492-673) COMPLETOS. Se copian **verbatim** en cada archivo. No modificar ni recortar. |
| `/Users/jsierra/partners/HOL/credibanco-unificado/lab1_ingesta.html` | Referencia de **estructura HTML** (header, hero, progress-tracker, steps-nav, step-card, completion, footer). Copiar el PATRON de marcado, nunca el contenido de Credibanco. |
| `/Users/jsierra/partners/HOL/credibanco-unificado/index.html` | Referencia de estructura para el `index.html` (portada del workshop con tarjetas de labs). |
| `sql/0X_*.sql` | **Fuente unica de verdad del SQL.** Cada bloque SQL de la guia se copia EXACTO del archivo del track (validados en vivo, 0 fallos). No reescribir, no "mejorar", no agregar sentencias. Se puede partir un archivo en varios pasos por sus bloques `PARTE N`. |
| `streamlit-app/streamlit_app.py` | Codigo completo de la app Streamlit (lab 9). |
| `react-app/` | App React desplegable (lab 9). |

---

## 2. Estructura obligatoria de cada lab (en este orden)

```
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LAB N: {titulo} | Zero to Snowflake HOL</title>
  <style> ...CSS completo de _plantilla_base.html, verbatim... </style>
</head>
<body data-hol-id="z2s-labN-{slug}">
  <header class="hol-header">   <!-- logo SVG inline (copiar de lab1_ingesta.html) + "Snowflake" + hol-badge "Hands-On Lab" + header-nav (Vision General, Requisitos, Pasos, Recursos) + link "Indice" a index.html -->
  <section class="hero-section">  <!-- industry-tag "TASTY BYTES · FOOD TRUCKS GLOBALES", hero-title "LAB N: ...", hero-subtitle con Objetivo, hero-meta (duracion, nivel, N pasos), hero-cta, hero-visual con .arch-diagram de texto -->
  <section class="content-section" id="overview">          <!-- que vas a construir y por que importa -->
  <section class="content-section alt-bg" id="prerequisites"> <!-- de que labs depende -->
  <aside class="progress-tracker" id="progressTracker">     <!-- barra + steps-nav con TODOS los pasos y su timing -->
  <main class="steps-container" id="steps">
      <div class="callout callout-warning">  <!-- banner obligatorio: "Datos de ejemplo: Tasty Bytes es una empresa ficticia de Snowflake; los datos son sinteticos y publicos (s3://sfquickstarts/frostbyte_tastybytes/)." -->
      <article class="step-card" id="step-1" data-step="1"> ... </article>
      ...
  </main>
  <section class="content-section" id="resources">  <!-- enlaces a docs.snowflake.com relevantes -->
  <section class="completion-section">               <!-- cierre + boton al siguiente lab -->
  <footer class="hol-footer">  © 2026 Snowflake Inc. All Rights Reserved. </footer>
  <script> ...JS completo de _plantilla_base.html, verbatim... </script>
</body>
</html>
```

### Anatomia de un step-card

```html
<article class="step-card" id="step-N" data-step="N">
  <div class="step-header">
    <div class="step-number">N</div>
    <div class="step-info">
      <h2 class="step-title">{titulo}</h2>
      <span class="step-duration">~X min</span>
    </div>
    <button class="step-toggle" aria-expanded="true">
      <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
    </button>
  </div>
  <div class="step-content">
    <span class="modalidad-badge sql">SQL</span>      <!-- o .ui / .coco / .cli -->
    <div class="step-criterio"><strong>Criterio de exito:</strong> {resultado esperado verificable}</div>
    <div class="step-description">{contexto breve: que hace y por que importa}</div>
    <div class="code-block" data-language="sql">
      <div class="code-header">
        <span class="code-language">SQL</span>
        <div class="code-actions"><button class="btn-copy" onclick="copyCode(this)" title="Copiar codigo">Copiar</button></div>
      </div>
      <pre><code>{SQL EXACTO, con &lt; &gt; &amp; escapados}</code></pre>
    </div>
    <div class="evidencia"><strong>Resultado verificado:</strong> {cifra real de la seccion 5}</div>  <!-- cuando aplique -->
    <div class="step-actions"><button class="btn-check" onclick="markStepComplete(N)">Marcar paso N como completado</button></div>
  </div>
</article>
```

Componentes disponibles en el CSS: `callout callout-info|callout-warning|callout-tip`, `div.wow` + `div.wow-titulo` (momento "wow"), `div.bug-real` + `div.bug-titulo` (gotcha real encontrado en la validacion), `div.evidencia`, `div.prompt-label` + `div.prompt-coco` (prompts para Cortex Code), `strong.ubicate` (ruta en la UI), `details.underlying`, `div.table-wrap` + `table.data-table`, `span.modalidad-badge sql|ui|coco|cli`.

---

## 3. Reglas duras (no negociables)

1. **Cero dependencias externas.** Prohibido Google Fonts, CDNs, `<script src>`, imagenes remotas. Logo SVG inline. Unica excepcion: `<a href>` a `docs.snowflake.com`, `snowflake.com/en/developers/guides`, `github.com/sfc-gh-jparrado/HOL`.
2. **Prohibido inventar cifras.** Todo numero sale de la seccion 5. Si no esta, no se escribe.
3. **SQL exacto** del archivo `sql/` del track. Escapar `<`, `>`, `&` dentro de `<pre><code>`.
4. **Sintaxis Cortex moderna**: `AI_COMPLETE`, `AI_SENTIMENT`, `AI_CLASSIFY`, `AI_EXTRACT`, `AI_SUMMARIZE_AGG`, `AI_TRANSLATE`, `AI_TRANSCRIBE`. Nunca `SNOWFLAKE.CORTEX.COMPLETE`/`SENTIMENT` legacy.
5. **IDs consecutivos** `id="step-1"`..`id="step-N"` sin huecos; `data-step` igual; cada paso con su `.step-nav-item data-step="N"` en el `steps-nav`.
6. **Suma de timings**: los `~X min` de los pasos suman EXACTO la duracion del `hero-meta` (ver seccion 4).
7. **Siglas expandidas** en su primera mencion por archivo: DMF (Data Metric Function), PII (Personally Identifiable Information), RBAC (Role-Based Access Control), DT (Dynamic Table), SV (Semantic View), SP (Stored Procedure), SSE (Server-Sent Events), SPCS (Snowpark Container Services), LLM (Large Language Model).
8. Snowflake CoWork es el nombre actual de Snowflake Intelligence. En el texto usar "Snowflake CoWork"; en SQL se mantienen los nombres reales de objetos (`SNOWFLAKE_INTELLIGENCE...`).
9. Cada lab enlaza al siguiente en su `completion-section` y al `index.html` en el header.
10. Bloques de UI (Snowsight / CoWork / CoCo) usan `modalidad-badge ui` o `coco` y pasos numerados con `<ol>` y `strong.ubicate` para rutas de menu.

---

## 4. Mapa de labs (archivo, fuente, duracion)

| Lab | Archivo | Fuente SQL | Duracion | Pasos sugeridos (titulo · min) |
|---|---|---|---|---|
| index | `index.html` | — | 90 min total | Portada: agenda, arquitectura, tarjetas de los 11 labs con duracion |
| 0 | `lab0_setup.html` | `sql/00_setup.sql` + carpeta `archivos/` | 7 | 1 Abrir Workspaces y crear SQL File · 1 / 2 Ejecutar setup completo (Run All) · 4 / 3 Subir archivos multimodales al stage ARCHIVOS · 1 / 4 Verificar la carga · 1 |
| 1 | `lab1_fundamentos.html` | `sql/01_fundamentos.sql` | 8 | por PARTE 1-5 (2/2/2/1/1) |
| 2 | `lab2_pipeline.html` | `sql/02_pipeline.sql` | 8 | PARTE 1 ingesta S3 · 2 / PARTE 2 VARIANT/FLATTEN · 2 / PARTE 3 DTs (dividir en 2 pasos) · 2+2 |
| 3 | `lab3_cortex_aisql.html` | `sql/03_cortex_aisql.sql` | 9 | Playground (UI) · 2 / PARTE 1 · 1 / PARTE 2 · 2 / PARTE 3 · 1 / PARTE 4 · 1 / PARTE 5 · 1 / Bonus CoCo · 1 |
| 4 | `lab4_multimodal.html` | `sql/04_ia_multimodal.sql` | 7 | Audio · 3 / Documentos · 2 / Imagenes · 2 |
| 5 | `lab5_gobierno.html` | `sql/05_gobierno.sql` | 9 | PARTE 1 RBAC · 1 / PARTE 2 Clasificacion · 2 / PARTE 3 Masking · 2 / PARTE 4 RLS · 2 / PARTE 5 DMFs · 2 |
| 6 | `lab6_marketplace.html` | `sql/06_marketplace.sql` | 5 | Obtener listing (UI o SQL) · 2 / Vistas clima + ventas · 2 / Analisis Seattle · 1 |
| 7 | `lab7_semantica_busqueda.html` | `sql/07_semantica_busqueda.sql` | 9 | Tablas curadas · 2 / Cortex Search · 2 / Semantic View · 3 / Probar en Cortex Analyst (UI) · 2 |
| 8 | `lab8_agente_cowork.html` | `sql/08_agente_cowork.sql` | 12 | Custom tool SP · 2 / Crear agente · 2 / Permisos + publicar · 1 / Probar por SQL · 1 / Usar en CoWork (UI, 5 preguntas) · 4 / Editar el agente (UI) · 2 |
| 9 | `lab9_apps.html` | `streamlit-app/`, `react-app/` | 12 | Streamlit: crear app en Snowsight y pegar codigo · 4 / Explorar Copilot Streamlit · 2 / React: desplegar con Snowflake App Runtime · 4 / Explorar Command Center · 2 |
| 10 | `lab10_cierre.html` | `sql/09_cleanup.sql` | 4 | Recap y arquitectura final · 2 / Siguientes pasos + comunidad · 1 / Cleanup opcional · 1 |

Suma: 7+8+8+9+7+9+5+9+12+12+4 = **90 min**.

---

## 5. Cifras verificadas en vivo (cuenta demo, 2026-10-13) — fuente de verdad

### Setup (lab 0)
- `00_setup.sql` completo (carga desde S3 con `tb_de_wh` en XLARGE + capa de negocio): **5 min 27 s**.
- Filas cargadas: `raw_pos.order_header` **248,201,269**; `raw_pos.order_detail` **673,655,465**; `raw_customer.customer_loyalty` **222,540**; `raw_support.truck_reviews` **124,593**; `raw_pos.truck` **450**.
- Capa de negocio (`analytics.ventas_diarias` + `analytics.ventas_items_mes`) sobre ~670M lineas: **17 s** en XLARGE (Gen2). `ventas_diarias`: **261,847** filas, 2019-01-01 a 2022-11-01, ventas totales **$10,110,817,820**.
- Archivos del stage `@tb_101.public.archivos` (7): CONTRATO_ARRENDAMIENTO_01.docx, CONTRATO_ARRENDAMIENTO_02.docx, TELCO.png, cedula.jpg, choque.png, ofreciendo-producto.mp3, problema-servicio.mp3.
- Bugs reales corregidos en el setup oficial: (a) `tb_data_engineer` no tenia USAGE sobre `public.csv_ff` (fallaba el stage del menu); (b) `tb_analyst` no tenia SELECT sobre `raw_customer` ni `CORTEX_USER`; (c) el grant correcto es `GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER` (no `GRANT SNOWFLAKE.CORTEX_USER`).

### Lab 1 Fundamentos (32 s de ejecucion total)
- Query ventas por marca sobre ~670M lineas en XLarge: **7.5 s** la primera vez, **1.2 s** la segunda (Result Cache, sin computo). Top: Nani's Kitchen $1,097,256,393 (todos los anios).
- `UPDATE ... SET make='Ford' WHERE make='Ford_'`: **85** filas. Despues del SWAP: Ford **161**, Freightliner **148**, Custom **54**.
- El SELECT con `my_wh` suspendido y AUTO_RESUME=FALSE falla con "Warehouse 'MY_WH' is suspended" (error esperado didactico).

### Lab 2 Pipeline (27 s)
- `COPY INTO menu_staging`: **100** filas desde `menu.csv.gz`.
- `ALTER DYNAMIC TABLE harmonized.ingredient REFRESH` tras el Banh Mi: `insertedRows: 5`; aparecen French Baguette y Pickled Daikon con menu_ids [157].
- Camion 15, enero: Hoagie Roll **5,835** y Lettuce **5,835** (2022); los ingredientes del Banh Mi aparecen con 2 unidades.
- `ingredient_usage_by_truck` se crea en **~9 s** con el warehouse temporalmente en LARGE.

### Lab 3 Cortex AISQL (~81 s total)
- AI_SENTIMENT sobre muestra de 50 reviews: ~25 s. Gotcha real: poner `AI_SENTIMENT(...)` en el WHERE junto a un LIMIT evaluaba la IA sobre muchas filas (303 s); la solucion es tomar la muestra en un CTE primero.

### Lab 4 Multimodal (54 s total)
- `problema-servicio.mp3`: **71.8 s** de audio, transcrito con etiquetas SPEAKER_00/SPEAKER_01.
- Contrato 01: arrendador **MARIA ELENA RODRIGUEZ CASTILLO**, arrendatario **CARLOS ANDRES MORENO LOPEZ**.
- Cedula: nombres **GERONIMO**, apellidos **VELEZ RUIZ**.
- Choque: Renault Twingo vs motocicleta.
- Gotcha real: TELCO.png devolvia NULL con claude-sonnet-4-5; con **pixtral-large** describe 2 personas trabajando en una torre con casco y arnes.

### Lab 5 Gobierno (47 s, re-ejecutable)
- Clasificacion automatica: BIRTHDAY_DATE detectado como DATE_OF_BIRTH y tagueado PII.
- Como `tb_analyst`: nombres/email/telefono = `****MASKED****`, cumpleanos 1953-12-01 se ve 1953-01-01. Como `tb_admin`: Rodolfo Tucker, Rodolfo.Tucker@ymail.com.
- Row Access Policy: `tb_data_engineer` solo ve **United States: 46,300** clientes; `tb_analyst` ve todos los paises.
- Gotchas reales: `useradmin` no puede `USE DATABASE` (se arranca con accountadmin); asociar DMFs requiere OWNERSHIP de la tabla (la Parte 5 corre con `sysadmin`).

### Lab 6 Marketplace
- Listing: **"Pelmorex Weather Source: Frostbyte"** (global name `GZSOZ1LLEL`), base `ZTS_WEATHERSOURCE`.
- Seattle 2022-02-01: ventas **$234,563.25**, temperatura promedio **39.4 F**, precipitacion 0.03 in.

### Lab 7 Semantica y busqueda (37 s)
- `analytics.reviews_sentimiento`: **2,000** reviews en ingles con sentimiento IA.
- Cortex Search Service creado en **~22 s**.
- `SEMANTIC_VIEW(... DIMENSIONS ciudades.pais METRICS ventas_totales ...)`: India primero con **$1,093,355,250** (2019-2022).
- Gotcha real: la vista oficial `semantic_layer.orders_v` repite `order_total` en cada linea de detalle (sumarla infla las ventas) — por eso la Semantic View se construye sobre tablas agregadas con `SUM(price)`.

### Lab 8 Agente CoWork
- `CALL sp_pronostico_ventas('Freezing Point', 3)`: promedio mensual actual **$14,868,096**; proyeccion 2022-11 = **$20,910,037**.
- 5 preguntas probadas, cada una con la herramienta correcta (latencias 26-70 s):
  1. Top 5 marcas 2022 → VentasTastyBytes + data_to_chart: **Kitakata Ramen Bar $514,197,279.50**, Nani's Kitchen $488,849,952 (las 5 suman ~$2,184.9M).
  2. Freezing Point → ReviewsClientes: elogian Waffle Cone y paletas; quejas por producto en mal estado / temperatura.
  3. Mejor ticket → Analyst + Search: **Manchester $41.48** por orden en 2022.
  4. Pronostico Kitakata 3 meses → PronosticoVentas + chart: **~$184.4M** (2022-11 $59,768,738; 2022-12 $61,471,567; 2023-01 $63,174,397).
  5. Lluvia Seattle 2022 → Analyst: dias sin lluvia vendieron ~**23%** mas; correlacion **-0.33**.
- Gotcha real: en SQL Scripting no se puede usar `SELECT ... INTO` con un `WITH` al inicio; se resuelve con RESULTSET + cursor.

### Lab 9 Apps
- Streamlit `TASTY_BYTES_COPILOT` en `TB_101.ANALYTICS`, container runtime `SYSTEM$ST_CONTAINER_RUNTIME_PY3_11`, pool `SYSTEM_COMPUTE_POOL_CPU`, warehouse `TB_ANALYST_WH`; solo paquetes preinstalados (streamlit, pandas, altair, pydeck) → no requiere EAI.
- React `TASTY_BYTES_COMMAND_CENTER` con Snowflake App Runtime: `snow app deploy` en **4 min 06 s** (build en Snowflake 1 min 37 s). Requiere Snowflake CLI **3.26+** (validado con 3.29.0). Despliega en la base personal `USER$`.
- KPIs 2022 en la app: ventas **$5.08B** (+83.6% vs mismo periodo 2021), **126.32M** ordenes, ticket **$40.21**, **450** camiones, **30** ciudades. Ciudad top: Tokyo **$268.1M**.
- Gotcha real: la app React en `USER$` corre con el rol con que se desplego; si es un rol propio que no hereda TB_ANALYST (y el usuario tiene `DEFAULT_SECONDARY_ROLES = []`), falla con "Database 'TB_101' does not exist or not authorized". Solucion: desplegar con ACCOUNTADMIN/SYSADMIN (que ya heredan TB_ANALYST via TB_ADMIN) o `GRANT ROLE TB_ANALYST TO ROLE <tu_rol>`.

---

## 6. Estilo de contenido

- Cada paso: que haces, por que importa (1-2 frases de negocio Tasty Bytes), codigo, criterio de exito.
- Usa `div.wow` para los momentos clave: cache 7.5s→1.2s, UNDROP, Dynamic Table refrescando sola, transcripcion de audio con SQL, masking por tag, datos de Marketplace sin ETL, el agente eligiendo herramientas, la app React con globo 3D.
- Usa `div.bug-real` para los gotchas reales de la seccion 5 (son oro para el asistente).
- Prompts de Cortex Code (CoCo) en `div.prompt-coco` donde aporten (lab 3 bonus, lab 9 despliegue).
- No mencionar a Credibanco en ningun lugar.
