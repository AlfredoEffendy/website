import { tCrit, zCrit } from '../core/dist';
import { type PopKind, type Population, population } from '../core/populations';
import { Rng } from '../core/rng';
import { fmt, int, pct, scope, showFor, tidy } from '../ui/dom';
import { bindData } from '../ui/data';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport, csvRow } from '../ui/export';
import { Plot, curve, label, linear, palette, triangle, xAxis } from '../ui/plot';
import { labState } from '../ui/state';

const MAX = 1000;
const SHOWN = 100;
/** Intervals kept for CSV export (the tally itself is unlimited). */
const KEPT = 50000;
const SPREAD = { normal: 0.1, exp: 0.12, bimodal: 0.06 };

interface Interval {
  mean: number;
  sd: number;
  lo: number;
  hi: number;
  hit: boolean;
}

export function init(): void {
  const s = scope('confidence-intervals');
  const { $, num, setText, on } = s;
  const st = labState(s);

  let pop: Population = population('uniform', MAX, SPREAD);
  let rng = new Rng(st.seed());
  let n = 10;
  let level = 0.95;
  let mode: 't' | 'z' = 't';
  let crit = 0;
  /** Every interval so far, oldest first (capped at KEPT). */
  let kept: Interval[] = [];
  let count = 0;
  let hits = 0;
  let sample: Float64Array = new Float64Array(0);
  /** The interval shown in the middle panel: the newest one, or a rebuild after an edit. */
  let current: Interval | null = null;
  /** The sample as drawn, kept from the first edit so it can be restored. */
  let backup: Float64Array | null = null;
  /** Index into `kept` of the interval chosen on the chart or in the table. */
  let sel: number | null = null;

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const d = pop.dist;
    const left = 16;
    const right = w - 26;
    const sx = linear(0, MAX, left, right);
    const mu = sx(d.mean);

    const popTop = 24;
    const popBase = Math.round(h * 0.15);
    const smpLabel = popBase + 34;
    const smpBase = smpLabel + 74;
    const stackLabel = smpBase + 34;
    const stackTop = stackLabel + 24;
    const stackBase = h - 26;

    // 1. Population with its exact mean.
    let peak = 0;
    for (let i = 0; i <= 200; i++) peak = Math.max(peak, d.pdf((MAX * i) / 200));
    const sp = linear(0, peak * 1.05, popBase, popTop);
    ctx.fillStyle = c.pop;
    curve(p, sx, sp, 0, MAX, d.pdf, popBase);
    label(p, 'Population', left, 4);
    label(p, `μ = ${tidy(d.mean, 1)}   σ = ${tidy(d.sd, 1)}`, right, 4, 'right', true);
    xAxis(p, sx, popBase, 0, MAX);

    // The true mean runs through all three panels.
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(mu, popTop - 4);
    ctx.lineTo(mu, popBase);
    ctx.moveTo(mu, smpLabel + 18);
    ctx.lineTo(mu, smpBase);
    ctx.moveTo(mu, stackTop - 6);
    ctx.lineTo(mu, stackBase);
    ctx.stroke();

    // 2. Current sample and the interval built from it.
    label(p, `Sample of ${n}`, left, smpLabel);
    const now = current;
    if (now && sample.length) {
      ctx.fillStyle = c.ink;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < sample.length; i++) {
        ctx.beginPath();
        ctx.arc(sx(sample[i]), smpBase - 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const y = smpBase - 30;
      const a = Math.max(left, sx(now.lo));
      const b = Math.min(right, sx(now.hi));
      ctx.strokeStyle = now.hit ? c.ok : c.bad;
      ctx.lineWidth = now.hit ? 2 : 3.5;
      ctx.beginPath();
      ctx.moveTo(a, y);
      ctx.lineTo(b, y);
      ctx.moveTo(a, y - 6);
      ctx.lineTo(a, y + 6);
      ctx.moveTo(b, y - 6);
      ctx.lineTo(b, y + 6);
      ctx.stroke();
      ctx.fillStyle = c.accent;
      triangle(ctx, sx(now.mean), y - 3, 6);
    }
    xAxis(p, sx, smpBase, 0, MAX);

    // 3. The stack: newest on top. A miss is heavier and flagged at the edge, not only recoloured.
    label(p, `Latest ${SHOWN} intervals`, left, stackLabel);
    label(p, `${int(count)} drawn`, right, stackLabel, 'right', true);
    const gap = (stackBase - stackTop - 4) / SHOWN;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rows = Math.min(SHOWN, kept.length);
    for (let i = 0; i < rows; i++) {
      const at = kept.length - 1 - i;
      const ci = kept[at];
      const y = stackTop + 2 + i * gap;
      p.mark(at, left, y - gap / 2, right - left, gap);
      if (at === sel) {
        ctx.fillStyle = c.accentSoft;
        ctx.fillRect(left, y - 5, right - left, 10);
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(Math.max(left, sx(ci.lo)), y);
        ctx.lineTo(Math.min(right, sx(ci.hi)), y);
        ctx.stroke();
      }
      ctx.strokeStyle = ctx.fillStyle = ci.hit ? c.ok : c.bad;
      ctx.globalAlpha = ci.hit ? 0.75 : 1;
      ctx.lineWidth = ci.hit ? 1.2 : 2.4;
      ctx.beginPath();
      ctx.moveTo(Math.max(left, sx(ci.lo)), y);
      ctx.lineTo(Math.min(right, sx(ci.hi)), y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx(ci.mean), y, ci.hit ? 1.6 : 2.4, 0, Math.PI * 2);
      ctx.fill();
      if (!ci.hit) ctx.fillText('×', right + 14, y + 0.5);
    }
    ctx.globalAlpha = 1;
    xAxis(p, sx, stackBase, 0, MAX);
  });

  function build(values: Float64Array): Interval {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[i];
    const mean = sum / n;
    let ss = 0;
    for (let i = 0; i < n; i++) ss += (values[i] - mean) ** 2;
    const sd = Math.sqrt(ss / (n - 1));
    // t uses the sample's own s; z uses the population σ, which is why it needs σ to be known.
    const margin = (crit * (mode === 't' ? sd : pop.dist.sd)) / Math.sqrt(n);
    const lo = mean - margin;
    const hi = mean + margin;
    return { mean, sd, lo, hi, hit: pop.dist.mean >= lo && pop.dist.mean <= hi };
  }

  function draw(times: number): void {
    const buffer = new Float64Array(n);
    for (let k = 0; k < times; k++) {
      for (let i = 0; i < n; i++) buffer[i] = pop.draw(rng);
      const ci = build(buffer);
      count++;
      if (ci.hit) hits++;
      kept.push(ci);
    }
    if (kept.length > KEPT) kept = kept.slice(kept.length - KEPT);
    sample = buffer.slice();
    current = kept[kept.length - 1];
    backup = null;
    sel = null;
    render(true);
  }

  function verdict(): string {
    if (count < 30) return 'too few to judge';
    const z = (hits / count - level) / Math.sqrt((level * (1 - level)) / count);
    if (Math.abs(z) <= 2.576) return `consistent with ${pct(level, 0)}`;
    return z < 0 ? `below ${pct(level, 0)}, beyond chance` : `above ${pct(level, 0)}, beyond chance`;
  }

  function render(animate: boolean): void {
    const d = pop.dist;
    setText('sN', int(count));
    setText('sHits', int(hits));
    setText('sRate', count ? pct(hits / count, 1) : '—');
    setText('verdict', count ? verdict() : '');
    setText('tRate', pct(level, 0));
    setText('tMean', fmt(d.mean, 1));
    setText('tSd', `σ = ${fmt(d.sd, 1)}`);
    const now = current;
    const badge = $('hit');
    badge.hidden = !now;
    if (now) {
      const shown = mode === 't' ? now.sd : d.sd;
      const margin = (crit * shown) / Math.sqrt(n);
      setText('ciText', `x̄ = ${fmt(now.mean, 1)}, s = ${fmt(now.sd, 1)}  →  [${fmt(now.lo, 1)}, ${fmt(now.hi, 1)}]`);
      badge.className = `badge ${now.hit ? 'ok' : 'bad'}`;
      badge.textContent = now.hit ? '✓ Captured' : '✕ Missed';
      const eqs = $('eqs');
      fillEq(
        eqs,
        { xbar: fmt(now.mean, 1), crit: fmt(crit, 3), sd: fmt(shown, 1), n: String(n), m: fmt(margin, 1) },
        animate,
      );
      describeEq(
        eqs.querySelector<HTMLElement>(':scope > :not([hidden])')!,
        `The interval is ${fmt(now.mean, 1)} plus or minus ${fmt(margin, 1)}.`,
      );
      $('eqNote').innerHTML =
        `Interval: <b>${fmt(now.lo, 1)}</b> to <b>${fmt(now.hi, 1)}</b>. True mean <b>${fmt(d.mean, 1)}</b>: <b>${now.hit ? 'captured' : 'missed'}</b>. ` +
        `Multiplier <b>${fmt(crit, 3)}</b> is ${mode === 't' ? `<i>t</i> with ${n - 1} df` : '<i>z</i>'} at ${pct(level, 0)}.`;
    } else {
      setText('ciText', 'Draw a sample to build an interval.');
      setText('eqNote', 'Draw a sample to fill in the numbers.');
    }
    plot.request();
    data.refresh();
  }

  function reset(): void {
    n = num('n', 10, true);
    level = +$<HTMLSelectElement>('level').value;
    mode = st.radio('type') as 't' | 'z';
    crit = mode === 't' ? tCrit(level, n - 1) : zCrit(level);
    pop = population($<HTMLSelectElement>('dist').value as PopKind, MAX, SPREAD);
    rng = new Rng(st.seed());
    kept = [];
    count = 0;
    hits = 0;
    sample = new Float64Array(0);
    current = null;
    backup = null;
    sel = null;
    showFor($('eqs'), mode);
    render(false);
  }

  const data = bindData(s, [
    {
      // Editing a value rebuilds this one interval; the running tally keeps the interval as drawn.
      name: 'Current sample',
      columns: [
        { key: 'i', label: '#', get: (r) => r + 1 },
        { key: 'x', label: 'x', get: (r) => sample[r], format: (v) => fmt(v, 2), edit: {} },
        { key: 'd', label: 'x − x̄', get: (r) => sample[r] - (current?.mean ?? 0), format: (v) => fmt(v, 2) },
      ],
      count: () => sample.length,
      set(row, _key, value) {
        backup ??= sample.slice();
        sample[row] = value;
        current = build(sample);
        render(true);
      },
      edited: () => backup !== null,
      restore() {
        if (!backup) return;
        sample = backup;
        backup = null;
        current = build(sample);
        render(true);
      },
    },
    {
      name: 'All intervals',
      columns: [
        { key: 'i', label: '#', get: (r) => count - kept.length + r + 1 },
        { key: 'm', label: 'x̄', get: (r) => kept[r].mean, format: (v) => fmt(v, 1) },
        { key: 's', label: 's', get: (r) => kept[r].sd, format: (v) => fmt(v, 1) },
        { key: 'lo', label: 'Lower', get: (r) => kept[r].lo, format: (v) => fmt(v, 1) },
        { key: 'hi', label: 'Upper', get: (r) => kept[r].hi, format: (v) => fmt(v, 1) },
        { key: 'hit', label: 'Captured', get: (r) => (kept[r].hit ? 'yes' : 'no') },
      ],
      count: () => kept.length,
      chips: () => [{ label: 'Missed only', test: (r) => !kept[r].hit }],
      onSelect(row) {
        sel = row;
        plot.request();
      },
    },
  ]);
  plot.onPick = (at) => {
    sel = at;
    plot.request();
    if (at !== null) data.open({ source: 1, row: at });
  };

  const batch = () => draw(num('count', 100, true));
  st.bindParams(['dist', 'n', 'name:type', 'level', 'count', 'seed'], (id) => {
    if (id !== 'count') {
      reset();
      batch();
    }
  });
  st.bindNewSeed(() => {
    reset();
    batch();
  });
  on('one', () => draw(1));
  on('many', batch);
  on('clear', reset);
  bindExport(s, plot, () =>
    [
      csvRow(['sample_mean', 'sample_sd', 'lower', 'upper', 'captured']),
      ...kept.map((ci) => csvRow([ci.mean, ci.sd, ci.lo, ci.hi, ci.hit ? 1 : 0])),
    ].join('\n'),
  );

  reset();
  batch();
  s.ready();
}
