# Brief: breves explicaciones de que se esta haciendo

Trabajas sobre `guia/_build/content/<lab>.json`. Lee `guia/_build/BRIEF.md` como contexto.
No cambies ninguna linea de codigo que no sea un comentario.

1. Agrega a CADA step un campo `"resumen"`: una frase en espanol de maximo 25 palabras, en lenguaje de negocio, que diga que vamos a lograr y para que sirve.
   Ejemplo: "Encendemos computo propio y comprobamos que en Snowflake el almacenamiento y el computo son independientes."
   Se muestra como "En este paso: ..." arriba del paso. Ponlo justo despues de "badge".
2. En cada bloque `code` con lang sql, toda sentencia que NO tenga una linea `-- ...` justo encima debe llevar UN comentario breve en espanol (maximo ~10 palabras, sin tildes ni n con tilde dentro del codigo) que diga que hace.
   Ejemplo: `-- Crea el warehouse suspendido para la demo`.
   - Respeta la indentacion de la sentencia.
   - En bloques muy largos y repetitivos (por ejemplo, 9 COPY INTO o muchos GRANT seguidos) basta con un comentario por grupo.
   - Los bloques bash, python y text: un comentario breve en las lineas clave (`#` para bash y python).
3. Edita con Python (`json.load` y luego `json.dump(..., ensure_ascii=False, indent=2)`) escribiendo el script en un archivo. No uses heredocs largos en la terminal: se cuelgan.
4. Al terminar, ejecuta desde `guia/_build`:
   - `python3 build_labs.py <labs>`
   - `python3 check_coverage.py`: debe dar 0 sentencias faltantes.
   - `python3 qa.py`: debe salir solo el aviso conocido de `session.sql` en lab9.
5. Responde con:
   - el numero de resumenes agregados;
   - el numero de comentarios agregados por lab;
   - 2 ejemplos de cada cosa.
