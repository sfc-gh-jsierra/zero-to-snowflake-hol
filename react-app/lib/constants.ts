/** App title — displayed in the nav header and browser tab */
export const APP_TITLE = "Tasty Bytes Command Center"

/** Path to the logo in /public (used in the header and as favicon) */
export const LOGO_SRC = "/icon.svg"

/** Fully qualified Cortex Agent used by the conversational panel */
export const AGENT_DB = "SNOWFLAKE_INTELLIGENCE"
export const AGENT_SCHEMA = "AGENTS"
export const AGENT_NAME = "TASTY_BYTES_AGENT"

/** Years available in TB_101.ANALYTICS.VENTAS_DIARIAS */
export const YEARS = [2019, 2020, 2021, 2022] as const
export const DEFAULT_YEAR = 2022

export const SUGGESTED_QUESTIONS = [
  "Cuales son las 5 marcas con mas ventas en 2022? Muestralo en una grafica",
  "Que dicen los clientes de Freezing Point?",
  "Que ciudad tiene el mejor ticket promedio y que opinan ahi los clientes?",
  "Pronostica las ventas de Kitakata Ramen Bar para los proximos 3 meses",
  "Llueve menos = vendemos mas? Analiza Seattle en 2022",
]
