"""Check every statement of the validated sql/*.sql appears verbatim in the lab JSON.

Usage: python3 check_coverage.py   -> prints missing statements per lab, exit 1 if any.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "guia" / "_build" / "content"
MAP = {
    "lab0_setup": "00_setup.sql",
    "lab1_fundamentos": "01_fundamentos.sql",
    "lab2_pipeline": "02_pipeline.sql",
    "lab3_cortex_aisql": "03_cortex_aisql.sql",
    "lab4_multimodal": "04_ia_multimodal.sql",
    "lab5_gobierno": "05_gobierno.sql",
    "lab6_marketplace": "06_marketplace.sql",
    "lab7_semantica_busqueda": "07_semantica_busqueda.sql",
    "lab8_agente_cowork": "08_agente_cowork.sql",
    "lab10_cierre": "09_cleanup.sql",
}


def norm(s: str) -> str:
    s = re.sub(r"/\*.*?\*/", " ", s, flags=re.S)
    s = re.sub(r"--[^\n]*", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def statements(sql: str) -> list[str]:
    # $$ bodies contain semicolons: keep them whole
    out, buf, in_dollar = [], [], False
    for line in sql.splitlines():
        buf.append(line)
        if line.count("$$") % 2 == 1:
            in_dollar = not in_dollar
        if not in_dollar and line.rstrip().endswith(";"):
            stmt = norm("\n".join(buf))
            if stmt and stmt != ";":
                out.append(stmt.rstrip(";").strip())
            buf = []
    return out


def main() -> int:
    bad = 0
    for lab, sqlf in MAP.items():
        p = CONTENT / f"{lab}.json"
        if not p.exists():
            print(f"{lab}: SIN JSON")
            bad += 1
            continue
        spec = json.loads(p.read_text())
        blob = norm(" ".join(
            b["code"] for s in spec["steps"] for b in s["blocks"] if b["type"] == "code"
        ))
        miss = [s for s in statements((ROOT / "sql" / sqlf).read_text()) if s not in blob]
        print(f"{lab}: {len(miss)} sentencias faltantes")
        for m in miss:
            print("   -", m[:140])
        bad += len(miss)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
