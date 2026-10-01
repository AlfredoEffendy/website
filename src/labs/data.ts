// "Your data": paste or open a table of numbers and run the same analyses the simulations teach.
// One variable gives a histogram and a t interval; two give a scatter plot and a slope test.
import { type Parsed, parseCsv } from '../core/csv';
import { tCrit } from '../core/dist';
import { MAX_ROWS } from '../core/limits';
import { Rng } from '../core/rng';
import { type Fit, Histogram, RunningStats, bandHalfWidth, ols } from '../core/stats';
import { bindData } from '../ui/data';
import { fmt, int, pPhrase, pValue, pct, scope, showFor, tidy } from '../ui/dom';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport, csvRow } from '../ui/export';
import { withLoader } from '../ui/loader';
import { FONT, Morph, Plot, linear, palette, ticks, triangle, xAxis, yLabels } from '../ui/plot';
import { labState } from '../ui/state';

/** Column names come from the file: keep them short and free of markup characters. */
const clean = (name: string) => name.replace(/[<>&"'`]/g, '').slice(0, 60) || 'Column';

/** Above this many points a scatter plot is drawn as a density raster instead of one mark per point. */
const DENSE = 20000;

/** Parse an opened file in a worker; fall back to this thread where workers are unavailable. */
function readFile(file: File): Promise<{ parsed: Parsed; echo: string }> {
  try {
    const worker = new Worker(new URL('../core/csv-worker.ts', import.meta.url), { type: 'module' });
    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        worker.terminate();
        resolve(e.data);
      };
      worker.onerror = (e) => {
        worker.terminate();
        reject(e);
      };
      worker.postMessage(file);
    });
  } catch {
    return file.text().then((text) => ({ parsed: parseCsv(text, MAX_ROWS), echo: text.length > 20000 ? '' : text }));
  }
}

let raster: HTMLCanvasElement | null = null;

/** Scatter as a raster: each pixel's opacity grows with the log of how many points land on it. */
function density(
  ctx: CanvasRenderingContext2D,
  color: string,
  px: Float64Array,
  py: Float64Array,
  sx: (v: number) => number,
  sy: (v: number) => number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const counts = new Uint32Array(w * h);
  let max = 0;
  for (let i = 0; i < px.length; i++) {
    const cx = (sx(px[i]) - x) | 0;
    const cy = (sy(py[i]) - y) | 0;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const k = cy * w + cx;
    if (++counts[k] > max) max = counts[k];
  }
  raster ??= document.createElement('canvas');
  raster.width = w;
  raster.height = h;
  const g = raster.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, 1, 1);
  const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
  const img = g.createImageData(w, h);
  const d = img.data;
  const scale = 185 / Math.log1p(max || 1);
  for (let k = 0; k < counts.length; k++) {
    if (!counts[k]) continue;
    const o = k * 4;
    d[o] = r;
    d[o + 1] = gr;
    d[o + 2] = b;
    d[o + 3] = 70 + Math.log1p(counts[k]) * scale;
  }
  g.putImageData(img, 0, 0);
  ctx.drawImage(raster, x, y);
}

export function init(): void {
  const s = scope('data');
  const { $, setText, on } = s;
  const st = labState(s);

  let names: string[] = [];
  let cols: Float64Array[] = [];
  let rows = 0;
  let backup: Float64Array[] | null = null;
  /** Indices of the chosen columns (y is −1 for a one-variable analysis). */
  let xi = 0;
  let yi = -1;
  // One-variable results.
  let stats = new RunningStats();
  let hist = new Histogram(0, 1, 10);
  let margin = 0;
  // Two-variable results: the rows with both values present, and their fit.
  let px = new Float64Array(0);
  let py = new Float64Array(0);
  let pRow = new Uint32Array(0);
  let fit: Fit | null = null;
  let sel: number | null = null;
  const morph = new Morph();
  const level = () => +$<HTMLSelectElement>('level').value;
  const two = () => yi >= 0 && yi !== xi;

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    if (!rows) {
      ctx.fillStyle = c.muted;
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Paste numbers or open a file', w / 2, h / 2);
      return;
    }
    if (!two()) {
      // Histogram with the mean and its confidence interval above the bars.
      const left = 44;
      const right = w - 12;
      const base = h - 28;
      const top = 34;
      const bins = hist.bins;
      const target = new Float64Array(bins + 1);
      target.set(hist.counts);
      target[bins] = hist.max * 1.1 || 1;
      const shown = morph.step(target);
      const sx = linear(hist.lo, hist.hi, left, right);
      const sy = linear(0, shown[bins], base, top);
      yLabels(p, sy, left, shown[bins]);
      const bw = (right - left) / bins;
      ctx.fillStyle = c.bar;
      for (let i = 0; i < bins; i++) {
        p.mark(i, left + i * bw, top, bw, base - top);
        if (shown[i] < 1e-9) continue;
        const y = sy(shown[i]);
        ctx.fillRect(left + i * bw, y, Math.max(1, bw - 1), base - y);
      }
      if (sel !== null && sel < bins) {
        const y = Math.min(sy(shown[sel]), base - 6);
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(left + sel * bw - 1, y - 2, bw + 1, base - y + 2);
      }
      if (stats.n > 1) {
        const y = 18;
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const a = sx(stats.mean - margin);
        const b = sx(stats.mean + margin);
        ctx.moveTo(a, y);
        ctx.lineTo(b, y);
        ctx.moveTo(a, y - 5);
        ctx.lineTo(a, y + 5);
        ctx.moveTo(b, y - 5);
        ctx.lineTo(b, y + 5);
        ctx.stroke();
        ctx.fillStyle = c.accent;
        triangle(ctx, sx(stats.mean), y - 3, 6);
      }
      xAxis(p, sx, base, hist.lo, hist.hi);
      if (morph.moving) p.request();
      return;
    }

    // Scatter plot with the fitted line and its bands.
    const left = 54;
    const right = w - 14;
    const top = 12;
    const base = h - 30;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < px.length; i++) {
      if (px[i] < x0) x0 = px[i];
      if (px[i] > x1) x1 = px[i];
      if (py[i] < y0) y0 = py[i];
      if (py[i] > y1) y1 = py[i];
    }
    const padX = (x1 - x0 || 1) * 0.06;
    const padY = (y1 - y0 || 1) * 0.06;
    const sx = linear(x0 - padX, x1 + padX, left, right);
    const sy = linear(y0 - padY, y1 + padY, base, top);
    ctx.font = FONT;
    ctx.fillStyle = c.muted;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    for (const v of ticks(x0 - padX, x1 + padX, 8)) {
      ctx.fillRect(Math.round(sx(v)), base, 1, 4);
      ctx.fillText(tidy(v), sx(v), base + 7);
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const v of ticks(y0 - padY, y1 + padY, 6)) {
      ctx.fillRect(left - 4, Math.round(sy(v)), 4, 1);
      ctx.fillText(tidy(v), left - 7, sy(v));
    }
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, base - top - 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, base - top);
    ctx.clip();
    // Many points: shade each pixel by how many points fall on it, under the line and its bands.
    const dense = px.length > DENSE;
    if (dense) density(ctx, c.bar, px, py, sx, sy, left, top, right - left, base - top);
    if (fit && fit.df > 0) {
      const f = fit;
      const crit = tCrit(level(), f.df);
      const band = (prediction: boolean, color: string) => {
        ctx.beginPath();
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const x = x0 - padX + ((x1 - x0 + 2 * padX) * i) / steps;
          ctx.lineTo(sx(x), sy(f.intercept + f.slope * x + bandHalfWidth(f, x, crit, prediction)));
        }
        for (let i = steps; i >= 0; i--) {
          const x = x0 - padX + ((x1 - x0 + 2 * padX) * i) / steps;
          ctx.lineTo(sx(x), sy(f.intercept + f.slope * x - bandHalfWidth(f, x, crit, prediction)));
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.14;
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      if (st.checked('pi')) band(true, c.gold);
      if (st.checked('ci')) band(false, c.accent);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx(x0 - padX), sy(f.intercept + f.slope * (x0 - padX)));
      ctx.lineTo(sx(x1 + padX), sy(f.intercept + f.slope * (x1 + padX)));
      ctx.stroke();
    }
    if (dense) {
      ctx.restore();
      return;
    }
    const many = px.length > 2000;
    ctx.fillStyle = c.bar;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = many ? 0.5 : 1;
    for (let i = 0; i < px.length; i++) {
      const x = sx(px[i]);
      const y = sy(py[i]);
      if (many) ctx.fillRect(x - 1, y - 1, 2, 2);
      else {
        p.mark(pRow[i], x - 5, y - 5, 10, 10);
        ctx.beginPath();
        ctx.arc(x, y, pRow[i] === sel ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  /** Recompute everything from the columns as they now stand. */
  function analyze(animate: boolean): void {
    const used = two() ? 'two' : 'one';
    showFor($('eqs'), used);
    $('toggles').hidden = !two();
    $('eqs').parentElement!.hidden = !rows;
    if (!rows) {
      for (const id of ['s1', 's2', 's3', 's4', 's5']) setText(id, '—');
      setText('note', 'Paste or open a file to begin. Nothing leaves your browser.');
      setText('eqNote', '');
      plot.request();
      table.refresh();
      return;
    }
    const x = cols[xi];
    setText('figX', names[xi]);
    if (!two()) {
      stats = new RunningStats();
      let lo = Infinity;
      let hi = -Infinity;
      for (let i = 0; i < rows; i++) {
        const v = x[i];
        if (Number.isNaN(v)) continue;
        stats.push(v);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const n = stats.n;
      if (hi === lo) hi = lo + 1;
      const bins = Math.max(6, Math.min(60, Math.ceil(Math.sqrt(n))));
      if (bins !== hist.bins || lo !== hist.lo || hi !== hist.hi) morph.snap();
      hist = new Histogram(lo, hi, bins);
      for (let i = 0; i < rows; i++) if (!Number.isNaN(x[i])) hist.add(x[i]);
      const crit = n > 1 ? tCrit(level(), n - 1) : NaN;
      margin = (crit * stats.sd) / Math.sqrt(n);
      setText('figY', 'Count');
      setText('figTitle', `Distribution of ${names[xi]}`);
      const labels = ['Mean', 'SD', `${pct(level(), 0)} interval`, 'Values', 'Range'];
      labels.forEach((t, i) => setText(`s${i + 1}Label`, t));
      setText('s1', fmt(stats.mean, 3));
      setText('s2', fmt(stats.sd, 3));
      setText('s3', n > 1 ? `${fmt(stats.mean - margin, 2)} to ${fmt(stats.mean + margin, 2)}` : '—');
      setText('s4', int(n));
      setText('s5', `${tidy(lo, 2)} to ${tidy(hi, 2)}`);
      if (n > 1) {
        fillEq($('eqs'), { xbar: fmt(stats.mean, 2), crit: fmt(crit, 3), sd: fmt(stats.sd, 2), n: String(n), m: fmt(margin, 2) }, animate);
        describeEq($('eqOne'), `The interval is ${fmt(stats.mean, 2)} plus or minus ${fmt(margin, 2)}.`);
        $('eqNote').innerHTML = `With ${pct(level(), 0)} confidence, the mean behind these <b>${int(n)}</b> values lies between <b>${fmt(stats.mean - margin, 2)}</b> and <b>${fmt(stats.mean + margin, 2)}</b>, if they are a random sample.`;
      } else setText('eqNote', 'Two or more values are needed for an interval.');
    } else {
      const y = cols[yi];
      const keep = new Uint32Array(rows);
      let k = 0;
      for (let i = 0; i < rows; i++) if (!Number.isNaN(x[i]) && !Number.isNaN(y[i])) keep[k++] = i;
      pRow = keep.slice(0, k);
      px = new Float64Array(k);
      py = new Float64Array(k);
      for (let i = 0; i < k; i++) {
        px[i] = x[pRow[i]];
        py[i] = y[pRow[i]];
      }
      fit = px.length > 2 ? ols(px, py) : null;
      setText('figY', names[yi]);
      setText('figTitle', `${names[yi]} against ${names[xi]}`);
      const labels = ['p-value', 'Slope', 'Intercept', 't statistic', 'Correlation r'];
      labels.forEach((t, i) => setText(`s${i + 1}Label`, t));
      if (fit) {
        setText('s1', pValue(fit.p));
        setText('s2', fmt(fit.slope, 4));
        setText('s3', fmt(fit.intercept, 4));
        setText('s4', `${fmt(fit.t, 3)} (${fit.df} df)`);
        setText('s5', fmt(fit.r, 4));
        fillEq($('eqs'), { sxy: fmt(fit.sxy, 2), sxx: fmt(fit.sxx, 2), b1: fmt(fit.slope, 4), se: fmt(fit.seSlope, 4), t: fmt(fit.t, 3) }, animate);
        describeEq($('eqSlope'), `The slope is ${fmt(fit.slope, 4)}.`);
        const sign = fit.intercept < 0 ? '−' : '+';
        $('eqNote').innerHTML = `<b><i>ŷ</i> = ${fmt(fit.slope, 3)}<i>x</i> ${sign} ${fmt(Math.abs(fit.intercept), 3)}</b> from <b>${int(fit.n)}</b> rows. Exact two-sided ${pPhrase(fit.p)}.`;
      } else {
        for (const id of ['s1', 's2', 's3', 's4', 's5']) setText(id, '—');
        setText('eqNote', 'Three or more complete rows are needed to fit a line.');
      }
    }
    plot.request();
    table.refresh();
  }

  function setColumns(): void {
    const options = (blank: string) =>
      (blank ? `<option value="-1">${blank}</option>` : '') + names.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    $('x').innerHTML = options('');
    $('y').innerHTML = options('None');
    xi = 0;
    yi = names.length > 1 ? 1 : -1;
    $<HTMLSelectElement>('x').value = String(xi);
    $<HTMLSelectElement>('y').value = String(yi);
  }

  function load(text: string): void {
    apply(parseCsv(text, MAX_ROWS));
  }

  function apply(parsed: Parsed): void {
    names = parsed.names.map(clean);
    cols = parsed.columns;
    rows = names.length ? parsed.rows : 0;
    backup = null;
    sel = null;
    setColumns();
    const bits = [`${int(rows)} rows`, `${names.length} numeric ${names.length === 1 ? 'column' : 'columns'}`];
    if (parsed.skipped.length) bits.push(`skipped text: ${parsed.skipped.slice(0, 4).join(', ')}`);
    if (parsed.truncated) bits.push(`first ${int(rows)} rows kept`);
    analyze(true);
    setText('note', rows ? bits.join(' · ') : 'No numbers found. Paste a column of values or a CSV with a header row.');
  }

  /** A small made-up class survey, so the tab can be tried without a file. */
  function sample(): string {
    const r = new Rng(7);
    const lines = ['study_hours,exam_score'];
    for (let i = 0; i < 60; i++) {
      const hours = Math.max(0, 6 + 2.5 * r.normal());
      const score = Math.min(100, Math.max(20, 48 + 4.2 * hours + 8 * r.normal()));
      lines.push(`${hours.toFixed(1)},${score.toFixed(0)}`);
    }
    return lines.join('\n');
  }

  const table = bindData(s, [
    {
      name: 'Rows',
      get columns() {
        return [
          { key: 'i', label: '#', get: (r: number) => r + 1 },
          ...names.map((name, c) => ({
            key: String(c),
            label: name,
            get: (r: number) => cols[c][r],
            format: (v: number) => (Number.isNaN(v) ? '' : tidy(v, 4)),
            edit: {},
          })),
        ];
      },
      count: () => rows,
      set(row, key, value) {
        backup ??= cols.map((c) => c.slice());
        cols[+key][row] = value;
        analyze(true);
      },
      edited: () => backup !== null,
      restore() {
        if (!backup) return;
        cols = backup;
        backup = null;
        analyze(true);
      },
      onSelect(row) {
        sel = two() ? row : null;
        plot.request();
      },
    },
  ]);
  plot.onPick = (key) => {
    sel = key;
    plot.request();
    if (key === null) return table.filter(null);
    if (two()) return table.open({ row: key });
    const lo = hist.lo + key * hist.width;
    const hi = lo + hist.width;
    const last = key === hist.bins - 1;
    const x = cols[xi];
    table.open({ filter: { label: `${tidy(lo, 2)} ≤ ${names[xi]} ${last ? '≤' : '<'} ${tidy(hi, 2)}`, test: (r) => x[r] >= lo && (last ? x[r] <= hi : x[r] < hi) } });
  };

  let typing = 0;
  $('paste').addEventListener('input', () => {
    clearTimeout(typing);
    typing = window.setTimeout(() => load($<HTMLTextAreaElement>('paste').value), 300);
  });
  $('file').addEventListener('change', () => {
    const file = $<HTMLInputElement>('file').files?.[0];
    if (!file) return;
    setText('note', `Reading ${file.name}…`);
    withLoader(
      s.panel,
      readFile(file).then(
        ({ parsed, echo }) => {
          $<HTMLTextAreaElement>('paste').value = echo;
          apply(parsed);
        },
        () => setText('note', 'That file could not be read. Try saving it as CSV.'),
      ),
    );
  });
  on('sample', () => {
    const text = sample();
    $<HTMLTextAreaElement>('paste').value = text;
    load(text);
  });
  on('clear', () => {
    $<HTMLTextAreaElement>('paste').value = '';
    load('');
  });
  for (const id of ['x', 'y', 'level', 'ci', 'pi'])
    $(id).addEventListener('change', () => {
      xi = Math.max(0, +$<HTMLSelectElement>('x').value);
      yi = +$<HTMLSelectElement>('y').value;
      sel = null;
      morph.snap();
      table.filter(null);
      analyze(true);
    });
  bindExport(s, plot, () =>
    [csvRow(names), ...Array.from({ length: rows }, (_, r) => csvRow(cols.map((c) => (Number.isNaN(c[r]) ? '' : c[r]))))].join('\n'),
  );

  analyze(false);
  s.ready();
}
