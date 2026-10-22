"""Re-inject the short '-- ...' comments from sql/*.sql above each statement in the lab JSON code blocks.

Idempotent: statements that already have a comment line right above are left alone.
Usage: python3 add_comments.py
"""

import json
import re

from check_coverage import CONTENT, MAP, ROOT, norm


def comment_map(sql: str) -> dict[str, list[str]]:
    """normalized statement -> '--' comment lines written right above it in the source."""
    out, pending, buf, in_dollar = {}, [], [], False
    for line in sql.splitlines():
        s = line.strip()
        if not buf and not in_dollar:
            if s.startswith("--"):
                pending.append(re.sub(r"\s*--\s*\[ERROR ESPERADO\]", "  (error esperado)", s))
                continue
            if not s or s.startswith("/*") or s.startswith("*") or s.endswith("*/"):
                if not s:
                    pending = pending if pending else []
                continue
        buf.append(line)
        if line.count("$$") % 2 == 1:
            in_dollar = not in_dollar
        if not in_dollar and line.rstrip().endswith(";"):
            key = norm("\n".join(buf)).rstrip(";").strip()
            if pending:
                out.setdefault(key, pending)
            pending, buf = [], []
    return out


def statements_with_spans(code: str):
    lines, start, buf, in_dollar = code.split("\n"), 0, [], False
    for i, line in enumerate(lines):
        if not buf:
            if not line.strip() or line.strip().startswith("--"):
                start = i + 1
                continue
            start = i
        buf.append(line)
        if line.count("$$") % 2 == 1:
            in_dollar = not in_dollar
        if not in_dollar and line.rstrip().endswith(";"):
            yield start, norm("\n".join(buf)).rstrip(";").strip()
            buf = []


def main() -> None:
    added = 0
    for lab, sqlf in MAP.items():
        p = CONTENT / f"{lab}.json"
        cmap = comment_map((ROOT / "sql" / sqlf).read_text())
        spec = json.loads(p.read_text())
        for step in spec["steps"]:
            for b in step["blocks"]:
                if b["type"] != "code" or b.get("lang", "sql") != "sql":
                    continue
                lines = b["code"].split("\n")
                inserts = []
                for start, key in statements_with_spans(b["code"]):
                    prev = lines[start - 1].strip() if start > 0 else ""
                    if key in cmap and not prev.startswith("--"):
                        indent = re.match(r"\s*", lines[start]).group(0)
                        inserts.append((start, [indent + c for c in cmap[key]]))
                for start, cm in reversed(inserts):
                    lines[start:start] = cm
                    added += 1
                b["code"] = "\n".join(lines)
        p.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")
    print(f"comentarios agregados: {added}")


if __name__ == "__main__":
    main()
