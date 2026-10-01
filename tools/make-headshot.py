"""Crop the author's headshot (notes/source/headshot.jpg) square and write the home page's two sizes.

Run from the project root: /opt/anaconda3/bin/python tools/make-headshot.py   (needs Pillow with WebP)
Replace notes/source/headshot.jpg with a larger original and rerun to sharpen the result.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "notes" / "source" / "headshot.jpg"
OUT = ROOT / "static" / "img"

img = Image.open(SRC).convert("RGB")
w, h = img.size
side = min(w, h)
left = (w - side) // 2
square = img.crop((left, 0, left + side, side))  # keep the top of the frame: the face is in the upper half
OUT.mkdir(parents=True, exist_ok=True)
for px in (200, 400):
    out = OUT / f"alfredo-effendy-{px}.webp"
    square.resize((min(px, side),) * 2, Image.LANCZOS).save(out, "WEBP", quality=82, method=6)
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size} bytes)")
# Link-preview image (og:image): JPEG, because not every app that shows previews reads WebP.
og = OUT / "alfredo-effendy-og.jpg"
square.resize((min(400, side),) * 2, Image.LANCZOS).save(og, "JPEG", quality=85, optimize=True, progressive=True)
print(f"wrote {og.relative_to(ROOT)} ({og.stat().st_size} bytes)")
