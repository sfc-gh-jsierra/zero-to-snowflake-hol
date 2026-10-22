"""Validador del HOL: ejecuta un .sql sentencia por sentencia y reporta errores/tiempos.
Uso: python _validar.py 01_fundamentos.sql [conexion]
Las sentencias precedidas por un comentario con [ERROR ESPERADO] deben fallar."""
import sys, time, re
import snowflake.connector

def split_sql(text):
    stmts, buf, in_dollar = [], [], False
    for line in text.splitlines():
        if line.count("$$") % 2 == 1:
            in_dollar = not in_dollar
        buf.append(line)
        if not in_dollar and line.rstrip().endswith(";"):
            stmts.append("\n".join(buf)); buf = []
    if "".join(buf).strip():
        stmts.append("\n".join(buf))
    return stmts

def code_only(s):
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    return "\n".join(l for l in s.splitlines() if not l.strip().startswith("--")).strip()

path = sys.argv[1]; conn_name = sys.argv[2] if len(sys.argv) > 2 else "DEMO_JSIERRA"
con = snowflake.connector.connect(connection_name=conn_name)
cur = con.cursor()
fails, total_t = 0, time.time()
for raw in split_sql(open(path).read()):
    sql = code_only(raw)
    if not sql or sql == ";":
        continue
    expected = "[ERROR ESPERADO]" in raw
    t = time.time()
    try:
        cur.execute(sql)
        rows = cur.fetchmany(3) if cur.description else []
        status = "UNEXPECTED-OK" if expected else "OK"
        if expected: fails += 1
        info = str(rows)[:160]
    except Exception as e:
        status = "EXPECTED-ERR" if expected else "FAIL"
        if not expected: fails += 1
        info = str(e).splitlines()[-1][:200]
    print(f"[{status:13}] {time.time()-t:6.1f}s | {sql.splitlines()[0][:70]} | {info}")
print(f"\n==> {path}: {fails} fallos, total {time.time()-total_t:.0f}s")
