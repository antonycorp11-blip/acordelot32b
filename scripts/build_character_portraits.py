#!/usr/bin/env python3
"""Extract a clean full-body portrait from frame zero of each idle sheet."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "characters" / "portraits"
OUT.mkdir(parents=True, exist_ok=True)
for name in ("akles", "wins", "huans"):
    src = Image.open(ROOT / "public" / "assets" / "characters" / name / f"{name}_idle.png").convert("RGBA")
    frame = src.crop((0, 0, 156, 340))
    frame.save(OUT / f"{name}.webp", "WEBP", quality=92, method=6)
    print(name, frame.size)
