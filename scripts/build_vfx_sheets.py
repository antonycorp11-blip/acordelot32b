#!/usr/bin/env python3
"""Build lightweight, progressive 4x4 combat VFX sprite sheets."""
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance, ImageFilter
import math

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "art_src" / "vfx"
OUT = ROOT / "public" / "assets" / "vfx"

SPECS = {
    "wins_note": (384, 192, "line"),
    "wins_chorus": (256, 256, "radial"),
    "wins_aria": (320, 256, "radial"),
    "huans_arrow": (384, 192, "line"),
    "huans_step": (384, 192, "line"),
    "huans_rain": (256, 256, "radial"),
    "akles_cannon": (512, 256, "line"),
}


def keyed_rgba(im: Image.Image, radial: bool) -> Image.Image:
    im = im.convert("RGBA")
    alpha = im.getchannel("A")
    if alpha.getextrema() == (255, 255):
        # Image generation sometimes delivers a dark preview matte. Convert
        # low-luminance pixels back to transparency while preserving glow.
        lum = im.convert("L")
        alpha = lum.point(lambda v: max(0, min(255, (v - 5) * 5)))
    if radial:
        w, h = im.size
        # Build the feather at low resolution, then upscale smoothly. This is
        # deterministic and much faster than visiting every 2K source pixel.
        mw, mh = 128, 128
        mask = Image.new("L", (mw, mh))
        px = mask.load()
        for y in range(mh):
            ny = (y - mh / 2) / (mh / 2)
            for x in range(mw):
                nx = (x - mw / 2) / (mw / 2)
                edge = max(0.0, min(1.0, (1.08 - math.hypot(nx, ny)) / .22))
                px[x, y] = int(255 * edge)
        mask = mask.resize((w, h), Image.Resampling.BILINEAR)
        alpha = ImageChops.multiply(alpha, mask)
    im.putalpha(alpha)
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def fit(im: Image.Image, w: int, h: int, scale: float) -> Image.Image:
    ratio = min((w * .94) / im.width, (h * .90) / im.height) * scale
    size = (max(1, int(im.width * ratio)), max(1, int(im.height * ratio)))
    return im.resize(size, Image.Resampling.LANCZOS)


def frame(src: Image.Image, w: int, h: int, mode: str, index: int) -> Image.Image:
    t = index / 15
    appear = min(1.0, t / .27)
    disappear = min(1.0, (1.0 - t) / .22)
    opacity = min(appear, disappear)
    pulse = 1.0 + math.sin(t * math.pi * 5) * .035 * appear
    scale = (.35 + .65 * (1 - (1 - appear) ** 3)) * pulse
    layer = fit(src, w, h, scale)
    if mode == "line":
        reveal = max(.05, min(1.0, t / .34))
        visible_w = max(1, int(layer.width * reveal))
        layer = layer.crop((0, 0, visible_w, layer.height))
    layer.putalpha(layer.getchannel("A").point(lambda a: int(a * opacity)))
    if .25 < t < .85:
        layer = ImageEnhance.Brightness(layer).enhance(1.0 + .12 * math.sin(t * math.pi * 4) ** 2)
    canvas = Image.new("RGBA", (w, h))
    x = (w - layer.width) // 2
    y = (h - layer.height) // 2
    if mode == "line":
        x = int(w * .03)
    canvas.alpha_composite(layer, (x, y))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (w, h, mode) in SPECS.items():
        source = keyed_rgba(Image.open(SRC / f"{name}_source.png"), mode == "radial")
        sheet = Image.new("RGBA", (w * 4, h * 4))
        for i in range(16):
            sheet.alpha_composite(frame(source, w, h, mode, i), ((i % 4) * w, (i // 4) * h))
        sheet.save(OUT / f"{name}_sheet.webp", "WEBP", lossless=False, quality=84, method=4)
        print(f"{name}: {sheet.width}x{sheet.height}")


if __name__ == "__main__":
    main()
