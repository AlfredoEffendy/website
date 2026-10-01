"""Extract the job market paper's figures as WebP images for the research article.

Reads  static/files/when-yield-curves-invert-together.pdf  and writes
       static/research/jmp/<id>.webp       1800 px wide, for the figure viewer (zoom)
       static/research/jmp/<id>-900.webp   900 px wide, for the article column
Each file is kept at or under 160 KB: lossless when that fits (vector line art often does),
otherwise lossy at the highest quality that fits.

Clip rectangles are PDF points (x0, y0, x1, y1) on the given 1-based PDF page; they frame the
figure itself, without its caption (the article prints its own caption).

Run:  python tools/extract-figures.py        (Python 3.12, PyMuPDF, Pillow)
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "static" / "files" / "when-yield-curves-invert-together.pdf"
OUT = ROOT / "static" / "research" / "jmp"
BUDGET = 160 * 1024
WIDTHS = {"": 1800, "-900": 900}

# id: (pdf page, clip). Only the figures the article shows.
FIGURES: dict[str, tuple[int, tuple[float, float, float, float]]] = {
    "fig1": (3, (80.7, 69, 531.3, 425.3)),
    "fig2": (10, (80.7, 124, 531.3, 506)),
    "fig3": (13, (80.7, 69, 531.3, 532.8)),
    "fig5": (19, (120.5, 344.6, 491.5, 580.2)),
    "fig6": (23, (80.7, 69, 531.3, 254.7)),
    "fig7": (32, (111.1, 69, 500.9, 296)),
}


def encode(img: Image.Image, prefer_lossless: bool) -> tuple[bytes, str]:
    """Lossless if it fits the budget (and, for the reading size, is not larger than near-lossless
    quality 90); otherwise the highest lossy quality that fits."""
    buf = io.BytesIO()
    img.save(buf, "WEBP", lossless=True, quality=100, method=6)
    lossless = buf.getvalue()
    if not prefer_lossless:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=90, method=6)
        if buf.tell() < len(lossless):
            return buf.getvalue(), "q90"
    if len(lossless) <= BUDGET:
        return lossless, "lossless"
    for q in range(92, 39, -4):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= BUDGET:
            return buf.getvalue(), f"q{q}"
    raise SystemExit(f"cannot fit {img.size} under {BUDGET} bytes")


def main() -> None:
    if not PDF.exists():
        sys.exit(f"missing {PDF}")
    OUT.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(PDF)
    for fid, (page_no, clip) in FIGURES.items():
        page = doc[page_no - 1]
        rect = fitz.Rect(*clip)
        for suffix, width in WIDTHS.items():
            zoom = width / rect.width
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=rect, alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            # Rounding the clip outward can add a pixel; trim to the exact width (the edges are margin).
            if img.width > width:
                img = img.crop((0, 0, width, img.height))
            data, how = encode(img, prefer_lossless=suffix == "")
            path = OUT / f"{fid}{suffix}.webp"
            path.write_bytes(data)
            print(f"{path.relative_to(ROOT).as_posix()}  {img.width}x{img.height}  {len(data) // 1024} KB  {how}")


if __name__ == "__main__":
    main()
