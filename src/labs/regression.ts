import { tCrit } from '../core/dist';
import { Rng } from '../core/rng';
import { type Fit, bandHalfWidth, ols } from '../core/stats';
import { clockTime, fmt, int, pPhrase, pValue, pct, scope, tidy } from '../ui/dom';
import { bindData } from '../ui/data';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport, csvRow } from '../ui/export';
import { FONT, Plot, type Scale, linear, palette, ticks } from '../ui/plot';
import { labState } from '../ui/state';

type Preset = 'a' | 'b';
const DEFAULTS: Record<Preset, { rho: number; n: number }> = { a: { rho: 0, n: 50 }, b: { rho: 0.7, n: 20 } };

export function init(): void {
  const s = scope('regression');
  const { $, num, setText, on } = s;
  const st = labState(s);

  let rng = new Rng(st.seed());
  let xs = new Float64Array(0);
  let ys = new Float64Array(0);
  let popFit: Fit | null = null;
  let sampleIdx: Uint32Array | null = null;
  /** The sample's own coordinates. They start as copies of population points and can be edited or dragged. */
  let sX = new Float64Array(0);
  let sY = new Float64Array(0);
  let edited = false;
  let sel: number | null = null;
  let scaleX: Scale = linear(0, 1, 0, 1);
  let scaleY: Scale = linear(0, 1, 0, 1);
  let pending: Fit | null = null;
  let fit: Fit | null = null;
  let recorded = false;
  let history: { time: string; n: number; slope: number; intercept: number; p: number }[] = [];
  let pValues: number[] = [];
  let bounds = { x0: -4, x1: 4, y0: -4, y1: 4 };

  // The population can hold 50,000 points, so it is drawn once to its own layer and reused.
  const popLayer = document.createElement('canvas');
  let popKey = '';
  let popVersion = 0;

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const left = 50;
    const right = w - 14;
    const top = 12;
    const base = h - 30;
    const sx = (scaleX = linear(bounds.x0, bounds.x1, left, right));
    const sy = (scaleY = linear(bounds.y0, bounds.y1, base, top));

    // Numbered axes; the graph-paper background supplies the grid.
    ctx.font = FONT;
    ctx.fillStyle = c.muted;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    for (const v of ticks(bounds.x0, bounds.x1, 8)) {
      const x = Math.round(sx(v));
      ctx.fillRect(x, base, 1, 4);
      ctx.fillText(tidy(v), x, base + 7);
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (const v of ticks(bounds.y0, bounds.y1, 6)) {
      const y = Math.round(sy(v));
      ctx.fillRect(left - 4, y, 4, 1);
      ctx.fillText(tidy(v), left - 7, y);
    }
    ctx.strokeStyle = c.lineStrong;
    ctx.lineWidth = 1;
    ctx.strokeRect(left + 0.5, top + 0.5, right - left - 1, base - top - 1);
    if (!xs.length) return;

    const key = `${popVersion}|${p.canvas.width}x${p.canvas.height}|${c.muted}`;
    if (key !== popKey) {
      popKey = key;
      const dpr = p.canvas.width / w;
      popLayer.width = p.canvas.width;
      popLayer.height = p.canvas.height;
      const g = popLayer.getContext('2d')!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = c.muted;
      const big = xs.length > 4000;
      // More points need lighter ink, or dense regions turn solid.
      g.globalAlpha = xs.length > 15000 ? 0.14 : big ? 0.24 : 0.34;
      for (let i = 0; i < xs.length; i++) {
        const x = sx(xs[i]);
        const y = sy(ys[i]);
        if (big) g.fillRect(x - 1, y - 1, 2, 2);
        else {
          g.beginPath();
          g.arc(x, y, 2, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    ctx.drawImage(popLayer, 0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, right - left, base - top);
    ctx.clip();

    if (st.checked('popLine') && popFit) {
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(sx(bounds.x0), sy(popFit.intercept + popFit.slope * bounds.x0));
      ctx.lineTo(sx(bounds.x1), sy(popFit.intercept + popFit.slope * bounds.x1));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (fit) {
      const f = fit;
      const x0 = bounds.x0;
      const x1 = bounds.x1;
      const crit = tCrit(num('level', 95) / 100, f.df);
      const band = (prediction: boolean, color: string, alpha: number) => {
        const steps = 80;
        const up: [number, number][] = [];
        const down: [number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const x = x0 + ((x1 - x0) * i) / steps;
          const mid = f.intercept + f.slope * x;
          const half = bandHalfWidth(f, x, crit, prediction);
          up.push([sx(x), sy(mid + half)]);
          down.push([sx(x), sy(mid - half)]);
        }
        ctx.beginPath();
        up.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        for (let i = steps; i >= 0; i--) ctx.lineTo(down[i][0], down[i][1]);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        for (const edge of [up, down]) {
          ctx.beginPath();
          edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        }
        ctx.setLineDash([]);
      };
      if (st.checked('pi')) band(true, c.gold, 0.13);
      if (st.checked('ci')) band(false, c.accent, 0.14);
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx(x0), sy(f.intercept + f.slope * x0));
      ctx.lineTo(sx(x1), sy(f.intercept + f.slope * x1));
      ctx.stroke();
    }

    if (sampleIdx) {
      ctx.fillStyle = c.accent;
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 1.25;
      for (let i = 0; i < sX.length; i++) {
        const x = sx(sX[i]);
        const y = sy(sY[i]);
        p.mark(i, x - 5, y - 5, 10, 10);
        ctx.beginPath();
        ctx.arc(x, y, i === sel ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (i === sel) {
          ctx.strokeStyle = c.ink;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = c.surface;
          ctx.lineWidth = 1.25;
        }
      }
    }
    ctx.restore();
  });

  const preset = (): Preset => st.radio('preset') as Preset;
  const alpha = (): number => num('alpha', 0.05);

  function generate(): void {
    const N = num('N', 500, true);
    const rho = num('rho', 0);
    const scaled = preset() === 'b';
    const noise = Math.sqrt(Math.max(0, 1 - rho * rho));
    rng = new Rng(st.seed());
    xs = new Float64Array(N);
    ys = new Float64Array(N);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < N; i++) {
      const z0 = rng.normal();
      const z1 = rng.normal();
      // Standard scale for "no relationship"; a realistic scale (x around 50, y around 150) otherwise.
      const x = scaled ? 50 + 15 * z0 : z0;
      const y = scaled ? 150 + 75 * (rho * z0 + noise * z1) : rho * z0 + noise * z1;
      xs[i] = x;
      ys[i] = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const px = (x1 - x0) * 0.06;
    const py = (y1 - y0) * 0.06;
    bounds = { x0: x0 - px, x1: x1 + px, y0: y0 - py, y1: y1 + py };
    popFit = ols(xs, ys);
    popVersion++;
    sampleIdx = null;
    sX = new Float64Array(0);
    sY = new Float64Array(0);
    edited = false;
    sel = null;
    pending = null;
    fit = null;
    history = [];
    pValues = [];
    render(false);
  }

  /** Simple random sample without replacement; returns its least-squares fit. */
  function takeSample(): Fit {
    const n = Math.min(num('n', 50, true), xs.length);
    const idx = rng.sampleIndices(xs.length, n);
    sX = new Float64Array(n);
    sY = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      sX[i] = xs[idx[i]];
      sY[i] = ys[idx[i]];
    }
    sampleIdx = idx;
    edited = false;
    sel = null;
    return ols(sX, sY);
  }

  /** Fit the sample as it now stands. An edited sample is shown but never enters the tally or history. */
  function refit(animate: boolean): void {
    pending = fit = ols(sX, sY);
    recorded = true;
    render(animate);
  }

  function collect(): void {
    if (!xs.length) return;
    pending = takeSample();
    fit = null;
    recorded = false;
    render(false);
  }

  function record(f: Fit): void {
    history.unshift({ time: clockTime(), n: f.n, slope: f.slope, intercept: f.intercept, p: f.p });
    if (history.length > 5) history.pop();
  }

  function analyze(): void {
    if (!pending) return;
    fit = pending;
    if (!recorded) {
      recorded = true;
      pValues.push(fit.p);
      record(fit);
    }
    render(true);
  }

  function analyzeMany(): void {
    if (!xs.length) return;
    for (let i = 0; i < 1000; i++) {
      pending = takeSample();
      pValues.push(pending.p);
    }
    fit = pending;
    recorded = true;
    record(fit!);
    render(true);
  }

  function clearSample(): void {
    sampleIdx = null;
    sX = new Float64Array(0);
    sY = new Float64Array(0);
    edited = false;
    sel = null;
    pending = null;
    fit = null;
    render(false);
  }

  function clearAll(): void {
    xs = new Float64Array(0);
    ys = new Float64Array(0);
    popFit = null;
    history = [];
    pValues = [];
    clearSample();
  }

  function render(animate: boolean): void {
    const hasPop = xs.length > 0;
    const hasSample = sampleIdx !== null;
    const a = alpha();
    $<HTMLButtonElement>('collect').disabled = !hasPop;
    $<HTMLButtonElement>('many').disabled = !hasPop;
    $<HTMLButtonElement>('analyze').disabled = !hasSample;
    $<HTMLButtonElement>('clearSample').disabled = !hasSample;

    setText('tB1', popFit ? `β₁ = ${fmt(popFit.slope, 4)}` : '');
    setText('tB0', popFit ? `β₀ = ${fmt(popFit.intercept, 4)}` : '');
    if (fit) {
      const sig = fit.p <= a;
      setText('sR', fmt(fit.r, 4));
      setText('sB1', fmt(fit.slope, 4));
      setText('sB0', fmt(fit.intercept, 4));
      setText('sT', fmt(fit.t, 3));
      setText('sDf', `${fit.df} df`);
      setText('sP', pValue(fit.p));
      setText('sSig', sig ? '✓ significant' : '✕ not significant');
      fillEq($('eqSlope'), { sxy: fmt(fit.sxy, 2), sxx: fmt(fit.sxx, 2), b1: fmt(fit.slope, 4) }, animate);
      fillEq($('eqT'), { b1: fmt(fit.slope, 4), se: fmt(fit.seSlope, 4), t: fmt(fit.t, 3) }, animate);
      describeEq($('eqSlope'), `The slope is ${fmt(fit.slope, 4)}.`);
      describeEq($('eqT'), `The t statistic is ${fmt(fit.t, 3)}.`);
      const sign = fit.intercept < 0 ? '−' : '+';
      $('eqNote').innerHTML =
        `<b><i>ŷ</i> = ${fmt(fit.slope, 3)}<i>x</i> ${sign} ${fmt(Math.abs(fit.intercept), 3)}</b>. ` +
        `<i>t</i> = <b>${fmt(fit.t, 3)}</b> on <b>${fit.df}</b> df gives exact ${pPhrase(fit.p)}, ` +
        `${sig ? 'below' : 'above'} <i>α</i> = ${tidy(a)}.`;
    } else {
      for (const id of ['sR', 'sB1', 'sB0', 'sT', 'sP']) setText(id, '—');
      setText('sDf', '');
      setText('sSig', '');
      setText('eqNote', hasSample ? 'Sample collected. Analyze it to fit the line.' : 'Analyze a sample to fill in the numbers.');
    }

    const total = pValues.length;
    const sigCount = pValues.reduce((sum, p) => sum + (p <= a ? 1 : 0), 0);
    $('tally').innerHTML = !hasPop
      ? 'Generate a population to begin.'
      : total
        ? `<span>Significant at <i>α</i> = ${tidy(a)}: <b>${int(sigCount)}</b> of <b>${int(total)}</b> samples (<b>${pct(sigCount / total, 1)}</b>)</span>` +
          (num('n', 50, true) > xs.length ? '<span>Sample size limited to the population size.</span>' : '') +
          (edited ? '<span class="badge bad">Edited sample: not in the tally</span>' : '')
        : 'Analyze samples to start the tally.';

    $('history').innerHTML = history.length
      ? history
          .map((r) => {
            const sig = r.p <= a;
            return `<tr><td>${r.time}</td><td>${r.n}</td><td><b>${fmt(r.slope, 4)}</b></td><td><b>${fmt(r.intercept, 4)}</b></td><td>${pValue(r.p)}</td><td><span class="badge ${sig ? 'ok' : 'bad'}">${sig ? '✓ significant' : '✕ not significant'}</span></td></tr>`;
          })
          .join('')
      : '<tr><td class="empty" colspan="6">No estimates yet.</td></tr>';
    plot.request();
    data.refresh();
  }

  const data = bindData(s, [
    {
      name: 'Sample',
      columns: [
        { key: 'i', label: '#', get: (r) => r + 1 },
        { key: 'x', label: 'x', get: (r) => sX[r], format: (v) => fmt(v, 3), edit: {} },
        { key: 'y', label: 'y', get: (r) => sY[r], format: (v) => fmt(v, 3), edit: {} },
        { key: 'fit', label: 'Fitted', get: (r) => (fit ? fit.intercept + fit.slope * sX[r] : NaN), format: (v) => fmt(v, 3) },
        { key: 'res', label: 'Residual', get: (r) => (fit ? sY[r] - fit.intercept - fit.slope * sX[r] : NaN), format: (v) => fmt(v, 3) },
      ],
      count: () => sX.length,
      set(row, key, value) {
        (key === 'x' ? sX : sY)[row] = value;
        edited = true;
        refit(true);
      },
      edited: () => edited,
      restore() {
        if (!sampleIdx) return;
        sampleIdx.forEach((i, r) => {
          sX[r] = xs[i];
          sY[r] = ys[i];
        });
        edited = false;
        refit(true);
      },
      onSelect(row) {
        sel = row;
        plot.request();
      },
    },
  ]);
  plot.onPick = (i) => {
    sel = i;
    plot.request();
    if (i !== null) data.open({ row: i });
  };
  // Drag a sample point (mouse or pen) and watch the line, bands and p-value follow.
  plot.onDrag = (i, x, y, done) => {
    sX[i] = Math.min(bounds.x1, Math.max(bounds.x0, scaleX.invert(x)));
    sY[i] = Math.min(bounds.y1, Math.max(bounds.y0, scaleY.invert(y)));
    edited = true;
    sel = i;
    refit(done);
  };

  function start(): void {
    generate();
    collect();
    analyze();
  }

  st.bindParams(['name:preset', 'rho', 'N', 'n', 'ci', 'pi', 'popLine', 'level', 'alpha', 'seed'], (id) => {
    if (id === 'name:preset') {
      const d = DEFAULTS[preset()];
      $<HTMLInputElement>('rho').value = String(d.rho);
      $<HTMLInputElement>('n').value = String(d.n);
      st.sync();
      start();
    } else if (id === 'rho' || id === 'N' || id === 'seed') start();
    else if (id === 'n') {
      collect();
      analyze();
    } else render(false);
  });
  st.bindNewSeed(start);
  on('gen', generate);
  on('collect', collect);
  on('analyze', analyze);
  on('many', analyzeMany);
  on('clearSample', clearSample);
  on('clear', clearAll);
  bindExport(s, plot, () => {
    // The sample (with fitted values) when there is one; otherwise the whole population.
    if (sampleIdx && fit) {
      const f = fit;
      return [
        csvRow(['x', 'y', 'fitted', 'residual']),
        ...Array.from(sX, (x, i) => {
          const yhat = f.intercept + f.slope * x;
          return csvRow([x, sY[i], yhat, sY[i] - yhat]);
        }),
      ].join('\n');
    }
    return [csvRow(['x', 'y']), ...Array.from(xs, (x, i) => csvRow([x, ys[i]]))].join('\n');
  });

  // Scenario B's own defaults apply when the link names the scenario but not the values.
  const url = new URL(location.href).searchParams;
  if (preset() === 'b') {
    if (!url.has('rho')) $<HTMLInputElement>('rho').value = String(DEFAULTS.b.rho);
    if (!url.has('n')) $<HTMLInputElement>('n').value = String(DEFAULTS.b.n);
  }
  start();
  s.ready();
}
