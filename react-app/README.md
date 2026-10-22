# Tasty Bytes Command Center

Centro de mando en React (Next.js 16) para el HOL **Zero to Snowflake**. Corre dentro de Snowflake con **Snowflake App Runtime** y reune en una sola pantalla:

- **KPIs animados**: ventas, ordenes, ticket promedio, camiones y ciudades, con crecimiento contra el mismo periodo del anio anterior.
- **Globo 3D interactivo** (deck.gl `GlobeView`): columnas 3D de ventas por ciudad, arcos animados y rotacion automatica. Al hacer clic en una ciudad se resalta.
- **Analitica avanzada** (ECharts):
  - tendencia mensual 2019-2022;
  - top 10 marcas (se puede hacer clic);
  - mapa de calor dia de la semana × mes;
  - sentimiento por marca calculado con `AI_SENTIMENT`.
- **Voz del cliente**: reviews con sentimiento, que se filtran por la marca seleccionada.
- **Chat con el agente de Snowflake CoWork** (`TASTY_BYTES_AGENT`), con streaming token a token. Muestra:
  - el razonamiento del agente;
  - las herramientas usadas (Cortex Analyst, Cortex Search, el procedimiento de pronostico y la de graficas);
  - el SQL generado;
  - las graficas Vega-Lite;
  - las reviews citadas.

## Datos

Todo es en vivo, sin datos simulados. Los objetos se crean en los tracks 0, 6, 7 y 8 del HOL.

| Objeto | Uso |
|---|---|
| `TB_101.ANALYTICS.VENTAS_DIARIAS` | KPIs, tendencia, marcas, mapa de calor, globo |
| `TB_101.ANALYTICS.CIUDADES` | Coordenadas de las 30 ciudades |
| `TB_101.ANALYTICS.REVIEWS_SENTIMIENTO` | Sentimiento por marca y feed de reviews |
| `SNOWFLAKE_INTELLIGENCE.AGENTS.TASTY_BYTES_AGENT` | Chat conversacional |

## Arquitectura

```
app/api/dashboard  -> 7 queries en paralelo (binds, owner's rights)
app/api/reviews    -> reviews filtradas por marca (bind)
app/api/agent      -> SSE: en App Runtime llama al REST agents:run (stream=true)
                      con el token del servicio; en local usa DATA_AGENT_RUN por SQL
components/        -> globe-map, charts, kpi-cards, agent-chat, vega-chart, reviews-feed
```

## Correr localmente

```bash
npm install
SNOWFLAKE_CONNECTION_NAME=<tu_conexion> SNOWFLAKE_ROLE=TB_ANALYST SNOWFLAKE_WAREHOUSE=TB_ANALYST_WH npm run dev
```

La primera consulta abre el navegador para el login SSO de Snowflake.

## Desplegar en Snowflake App Runtime

Requiere Snowflake CLI 3.26 o superior (`pip install -U snowflake-cli`).

```bash
snow app deploy --verbose -c <tu_conexion>
snow app open -c <tu_conexion>
```

`app.yml` (v2) despliega en tu base de datos personal (`database: USER$`) usando el warehouse `TB_ANALYST_WH`.
