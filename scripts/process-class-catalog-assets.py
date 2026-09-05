#!/usr/bin/env python3
"""Recorta as pranchas de armas/equipamentos das classes Vocal e Cordas.

Preserva a arte original, remove apenas o fundo magenta conectado às bordas,
recorta títulos/legendas e salva PNGs transparentes prontos para UI e arma
flutuante em public/assets/catalogo/<classe>/.
"""

from collections import deque
from pathlib import Path
import re
import sys
import unicodedata

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "equipamentos e armas cordas e voz "
OUTPUT = ROOT / "public" / "assets" / "catalogo"


def slug(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_")


WEAPON_SHEETS = [
    # arquivo, classe, tier, nomes, faixa vertical sem título/legenda
    ("4AF31CBC-0278-4F28-AB4C-55D7E4154987.PNG", "vocal", 1,
     ["Cajado do Corista Jovem", "Microfone Rústico", "Bastão do Eco Inicial", "Cajado da Voz Errante"], (255, 940)),
    ("522A97F0-3884-4581-976D-92DB549EB1B0.PNG", "vocal", 2,
     ["Microfone de Acordelot", "Cajado do Solista", "Bastão do Coral Azul", "Microfone Harmônico", "Cajado do Soprano Peregrino"], (230, 940)),
    ("EB4EBAC4-9EC2-40FC-A950-C188A7C2B756.PNG", "vocal", 4,
     ["Grande Microfone do Maestro", "Cajado da Ópera Real", "Bastão da Catedral Sonora", "Microfone do Virtuoso Coral"], (185, 940)),
    ("DAFBBFBC-AF48-4DF1-8A8C-817F09D909A8.PNG", "vocal", 5,
     ["Virtuose Vocal", "Voz Celestial", "Réquiem do Silêncio"], (155, 950)),
    ("B138780E-0C32-4946-B664-C50E34422F11.PNG", "cordas", 1,
     ["Arco do Cordel Jovem", "Lira Rústica", "Violino de Caça", "Alaúde de Madeira"], (115, 940)),
    ("BB00C8F0-B761-4801-8DAA-2539CCFF948D.PNG", "cordas", 2,
     ["Arco do Violão Harmônico", "Baixo Resonante", "Lira de Acordelot", "Violino Azul", "Harpa do Peregrino"], (115, 935)),
    ("02FE4E84-3278-4D75-84C4-EAA4C5F25089.PNG", "cordas", 3,
     ["Guitarra Celeste", "Violoncelo Resonante", "Harpa Lunar", "Alaúde Real"], (115, 950)),
    ("2F687D31-3E8E-4059-B57E-957910973BDF.PNG", "cordas", 4,
     ["Concerto das Cordas", "Harpa do Maestro", "Baixo Magistral", "Sinfonia do Luthier"], (110, 940)),
    ("B6C8E627-D0F3-419D-87A3-694128AF8BE7.PNG", "cordas", 5,
     ["Virtuose das Cordas", "Arco da Seresta Celestial", "Réquiem do Violino"], (100, 950)),
]

EQUIP_SHEETS = [
    # arquivo, classe, tier, conjunto superior, conjunto inferior
    ("716107DD-64B7-45EC-A4B7-3EF0364D0654.PNG", "vocal", 1, "Aprendiz Vocal", "Eco de Carvalho"),
    ("02AD2C93-19DF-443E-825F-2F21510A5036.PNG", "vocal", 2, "Solista Solitário", "Coral de Acordelot"),
    ("AD5ABA5B-0734-4ABA-BA99-A4F700165077.PNG", "vocal", 3, "Diva Lunar", "Tenor Resonante"),
    ("C318ED4B-4F2C-4729-89A5-EFE64F817EEE.PNG", "vocal", 4, "Maestro Vocal", "Ópera Real"),
    ("4A73BB68-A644-474C-A002-66F3E0C2BA06.PNG", "vocal", 5, "Virtuose Vocal", "Voz Celestial"),
    ("4D00A549-9518-4617-A099-C1E589FC179B.PNG", "cordas", 1, "Aprendiz das Cordas", "Lira de Carvalho"),
    ("98FFE46A-9EAB-45C7-9793-808E990DC073.PNG", "cordas", 2, "Violinista Solitário", "Violinista de Acordelot"),
    ("0BD13F6C-2396-4C13-A3C3-3367A9D77AAC.PNG", "cordas", 3, "Harpa Lunar", "Baixo Resonante"),
    ("9A30600E-AB87-4EA9-8A40-E106D839E125.PNG", "cordas", 4, "Maestro das Cordas", "Luthier Real"),
    ("FD6CB4F0-DFF8-4859-B780-CFE200BEEB40.PNG", "cordas", 5, "Virtuose das Cordas", "Sinfonia Celestial"),
]

SLOTS = ("colar", "anel", "aura", "catalisador")


def is_magenta_background(pixel) -> bool:
    r, g, b, _ = pixel
    high = max(r, b)
    if high < 65 or min(r, b) < 45:
        return False
    return g < high * 0.62 and 0.58 < r / max(1, b) < 2.25


def remove_connected_background(image: Image.Image) -> Image.Image:
    out = image.convert("RGBA")
    px = out.load()
    width, height = out.size
    seen = bytearray(width * height)
    queue = deque()

    def seed(x: int, y: int):
        idx = y * width + x
        if not seen[idx] and is_magenta_background(px[x, y]):
            seen[idx] = 1
            queue.append((x, y))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)

    while queue:
        x, y = queue.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            idx = ny * width + nx
            if not seen[idx] and is_magenta_background(px[nx, ny]):
                seen[idx] = 1
                queue.append((nx, ny))
    return out


def finish(crop: Image.Image, max_size: int = 512) -> Image.Image:
    bbox = crop.getbbox()
    if not bbox:
        raise RuntimeError("recorte vazio")
    crop = crop.crop(bbox)
    if max(crop.size) > max_size:
        ratio = max_size / max(crop.size)
        crop = crop.resize((max(1, round(crop.width * ratio)), max(1, round(crop.height * ratio))), Image.Resampling.LANCZOS)
    return crop


def save_asset(image: Image.Image, class_key: str, kind: str, name: str) -> str:
    asset_slug = f"{class_key}_{slug(name)}"
    out_dir = OUTPUT / class_key / kind
    out_dir.mkdir(parents=True, exist_ok=True)
    finish(image).save(out_dir / f"{asset_slug}.png", optimize=True)
    return asset_slug


def process_weapon_sheets():
    count = 0
    for filename, class_key, tier, names, (top, bottom) in WEAPON_SHEETS:
        if len(sys.argv) > 1 and sys.argv[1] not in filename:
            continue
        source = remove_connected_background(Image.open(SOURCE / filename))
        cell_w = source.width / len(names)
        for index, name in enumerate(names):
            left = round(index * cell_w) + 4
            right = round((index + 1) * cell_w) - 4
            item_top = top + (45 if filename.startswith("DAFBBFBC") and index == 2 else 0)
            asset_slug = save_asset(source.crop((left, item_top, right, bottom)), class_key, "armas", name)
            print(f"✓ {class_key} T{tier} arma {asset_slug}")
            count += 1
    return count


def process_equipment_sheets():
    count = 0
    for filename, class_key, tier, upper_set, lower_set in EQUIP_SHEETS:
        if len(sys.argv) > 1 and sys.argv[1] not in filename:
            continue
        source = remove_connected_background(Image.open(SOURCE / filename))
        cell_w = source.width / 4
        for row, set_name in enumerate((upper_set, lower_set)):
            top, bottom = ((190, 610) if row == 0 else (690, source.height))
            for index, slot in enumerate(SLOTS):
                left = round(index * cell_w) + 4
                right = round((index + 1) * cell_w) - 4
                name = f"{slot} {set_name}"
                asset_slug = save_asset(source.crop((left, top, right, bottom)), class_key, "equipamentos", name)
                print(f"✓ {class_key} T{tier} equip {asset_slug}")
                count += 1
    return count


if __name__ == "__main__":
    total = process_weapon_sheets() + process_equipment_sheets()
    print(f"\n{total} imagens recortadas em {OUTPUT}")
