"""Global QA for the generated guide. Usage: python3 qa.py"""

import json
import re
from html.parser import HTMLParser
from pathlib import Path

GUIA = Path(__file__).resolve().parent.parent
VOID = {"br", "img", "hr", "meta", "link", "input", "source", "path", "rect", "circle", "polygon", "line", "stop"}


class Balance(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"</{tag}> vs {self.stack[-1] if self.stack else None}")


total, problems = 0, []
for spec_path in sorted((GUIA / "_build" / "content").glob("*.json")):
    spec = json.loads(spec_path.read_text())
    page = GUIA / spec["lab"]
    src = page.read_text()
    mins = sum(s["minutes"] for s in spec["steps"])
    total += mins
    imgs = [b["src"] for s in spec["steps"] for b in s["blocks"] if b["type"] == "image"]
    imgs += [b["src"] for b in spec.get("intro", []) if b["type"] == "image"]
    missing = [i for i in imgs if not (GUIA / i).exists()]
    visible = re.sub(r"<style.*?</style>|<script.*?</script>", "", src, flags=re.S)
    sql_refs = re.findall(r"[\w/]+\.sql\b", re.sub(r"<[^>]+>", " ", visible))
    blocks = src.count('class="code-block"')
    copies = src.count("copyCode(this)")
    bal = Balance()
    bal.feed(re.sub(r"<script.*?</script>", "", src, flags=re.S))
    print(f"{spec['lab']:30} pasos={len(spec['steps']):2} min={mins:2} bloques={blocks:3} copiar={copies:3} imgs={len(imgs):2}")
    if missing:
        problems.append(f"{spec['lab']}: imagenes inexistentes {missing}")
    if sql_refs:
        problems.append(f"{spec['lab']}: menciona {sorted(set(sql_refs))}")
    if blocks != copies:
        problems.append(f"{spec['lab']}: bloques sin boton copiar")
    if bal.errors or bal.stack:
        problems.append(f"{spec['lab']}: HTML desbalanceado {bal.errors[:3]} abiertos={bal.stack[-3:]}")
print(f"TOTAL = {total} min")
print("\n".join(problems) or "QA OK")
