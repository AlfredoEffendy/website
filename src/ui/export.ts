import type { Scope } from './dom';
import { type Plot, palette } from './plot';

function download(name: string, blob: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const stamp = (): string => new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');

/** One CSV row; values with commas, quotes or line breaks are quoted. */
export const csvRow = (cells: (string | number)[]): string =>
  cells
    .map((c) => {
      const s = String(c);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');

/**
 * Wire a lab's export buttons and its click-to-edit chart labels.
 * The PNG is composed fresh: paper, graph-paper grid, the chart, and the title and axis labels
 * exactly as edited on screen.
 */
export function bindExport(s: Scope, plot: Plot, csv: () => string): void {
  const labels = ['figTitle', 'figX', 'figY'].map((id) => s.$(id));
  for (const el of labels) {
    // Plain text only; fall back for engines without contenteditable="plaintext-only".
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        el.blur();
      }
    });
    el.addEventListener('blur', () => {
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      el.textContent = text || el.dataset.default!;
    });
  }
  const [title, xLabel, yLabel] = labels.map((el) => () => el.textContent ?? '');

  s.on('csv', () => download(`stats-engine-${s.slug}-${stamp()}.csv`, new Blob([csv()], { type: 'text/csv' })));

  s.on('png', () => {
    const c = palette();
    const dpr = plot.canvas.width / plot.w;
    const pad = { top: 46, right: 14, bottom: 40, left: 34 };
    const W = plot.w + pad.left + pad.right;
    const H = plot.h + pad.top + pad.bottom;
    const out = document.createElement('canvas');
    out.width = Math.round(W * dpr);
    out.height = Math.round(H * dpr);
    const g = out.getContext('2d')!;
    g.scale(dpr, dpr);
    g.fillStyle = c.surface;
    g.fillRect(0, 0, W, H);

    // Graph paper behind the chart, matching the on-screen background.
    for (const [step, color] of [[8, c.gridMinor], [40, c.gridMajor]] as const) {
      g.strokeStyle = color;
      g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= plot.w; x += step) {
        g.moveTo(pad.left + x + 0.5, pad.top);
        g.lineTo(pad.left + x + 0.5, pad.top + plot.h);
      }
      for (let y = 0; y <= plot.h; y += step) {
        g.moveTo(pad.left, pad.top + y + 0.5);
        g.lineTo(pad.left + plot.w, pad.top + y + 0.5);
      }
      g.stroke();
    }
    g.drawImage(plot.canvas, pad.left, pad.top, plot.w, plot.h);

    g.fillStyle = c.ink;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = '600 19px "Encode Sans Condensed", "Arial Narrow", sans-serif';
    g.fillText(title(), pad.left, pad.top / 2);
    g.fillStyle = c.muted;
    g.font = '600 12px "Open Sans", system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(xLabel(), pad.left + plot.w / 2, pad.top + plot.h + 20);
    g.save();
    g.translate(pad.left / 2, pad.top + plot.h / 2);
    g.rotate(-Math.PI / 2);
    g.fillText(yLabel(), 0, 0);
    g.restore();
    g.textAlign = 'right';
    g.font = '400 10px "Open Sans", system-ui, sans-serif';
    g.fillText('Stats Engine', W - pad.right, H - 10);

    out.toBlob((blob) => blob && download(`stats-engine-${s.slug}-${stamp()}.png`, blob), 'image/png');
  });
}
