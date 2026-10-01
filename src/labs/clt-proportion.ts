import { binomPmf, normPdf } from '../core/dist';
import { Rng } from '../core/rng';
import { RunningStats } from '../core/stats';
import { fmt, int, scope, tidy } from '../ui/dom';
import { bindData } from '../ui/data';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport, csvRow } from '../ui/export';
import { FONT, Morph, Plot, curve, linear, palette, ticks, xAxis, yLabels } from '../ui/plot';
import { labState } from '../ui/state';

export function init(): void {
  const s = scope('clt-proportion');
  const { $, num, setText, on } = s;
  const st = labState(s);

  let p = 0.05;
  let n = 20;
  let rng = new Rng(st.seed());
  let counts = new Uint32Array(n + 1);
  let stats = new RunningStats();
  let kMin = Infinity;
  let kMax = -Infinity;
  let maxCount = 0;
  /** Trial-by-trial outcomes of the most recent sample (1 = success). */
  let trials = new Uint8Array(0);
  let lastK = -1;
  let sel: number | null = null;
  const morph = new Morph();

  const dots = new Plot($('dots'), (pl) => {
    const { ctx, w, h } = pl;
    const c = palette();
    if (!trials.length || trials.length > 500) return;
    // Largest dot pitch at which every trial fits in the strip.
    let pitch = Math.min(22, Math.floor(Math.sqrt((w * h) / trials.length)));
    while (pitch > 3 && Math.floor(w / pitch) * Math.floor(h / pitch) < trials.length) pitch--;
    const cols = Math.max(1, Math.floor(w / pitch));
    const r = Math.max(1.2, pitch * 0.36);
    const y0 = (h - Math.ceil(trials.length / cols) * pitch) / 2;
    for (let i = 0; i < trials.length; i++) {
      ctx.beginPath();
      ctx.arc((i % cols) * pitch + pitch / 2, y0 + Math.floor(i / cols) * pitch + pitch / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = trials[i] ? c.accent : c.pop;
      ctx.fill();
    }
  });

  const plot = new Plot($('plot'), (pl) => {
    const { ctx, w, h } = pl;
    const c = palette();
    const total = stats.n;
    const mean = n * p;
    const sd = Math.sqrt(n * p * (1 - p));
    const theory = st.checked('theory');
    const left = 44;
    const right = w - 12;
    const base = h - 28;
    const top = 14;

    // Window in units of the success count k, centred on where the distribution lives. It is
    // allowed to run past 0 or n, so an ill-fitting normal curve is seen spilling into values a
    // proportion cannot take.
    let lo = mean - 4.5 * sd;
    let hi = mean + 4.5 * sd;
    if (total) {
      lo = Math.min(lo, kMin - 0.5);
      hi = Math.max(hi, kMax + 0.5);
    }
    const k0 = Math.max(0, Math.ceil(lo));
    const k1 = Math.min(n, Math.floor(hi));
    const span = k1 - k0 + 1;
    const sx = linear(lo, hi, left, right);
    const scale = total || 1;
    const peakPmf = binomPmf(Math.min(n, Math.floor((n + 1) * p)), n, p);

    const target = new Float64Array(span + 1);
    for (let i = 0; i < span; i++) target[i] = counts[k0 + i];
    target[span] =
      Math.max(total ? maxCount : 0, theory || !total ? scale * Math.max(peakPmf, normPdf(mean, mean, sd)) : 0) * 1.14 || 1;
    const shown = morph.step(target);
    const sy = linear(0, shown[span], base, top);
    if (total) yLabels(pl, sy, left, shown[span]);

    // Shade the region where no proportion can exist.
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    for (const [from, to, align] of [[lo, -0.5, 'right'], [n + 0.5, hi, 'left']] as const) {
      if (to <= from) continue;
      const x0 = sx(from);
      const x1 = sx(to);
      ctx.fillStyle = c.tint;
      ctx.fillRect(x0, top, x1 - x0, base - top);
      if (x1 - x0 > 62) {
        ctx.fillStyle = c.muted;
        ctx.textAlign = align;
        ctx.fillText('impossible', align === 'right' ? x1 - 6 : x0 + 6, top + 4);
      }
    }

    const slot = Math.abs(sx(1) - sx(0));
    const bw = Math.max(1, Math.min(slot * 0.78, 60));
    for (let i = 0; i < span; i++) {
      const x = sx(k0 + i);
      pl.mark(k0 + i, x - slot / 2, top, slot, base - top);
      const y = sy(shown[i]);
      if (shown[i] >= 1e-9) {
        ctx.fillStyle = k0 + i === lastK ? c.accent : c.bar;
        ctx.fillRect(x - bw / 2, y, bw, base - y);
      }
      if (k0 + i === sel) {
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - bw / 2 - 2, Math.min(y, base - 6) - 2, bw + 4, base - Math.min(y, base - 6) + 2);
      }
    }

    if (theory || !total) {
      ctx.strokeStyle = c.gold;
      ctx.lineWidth = 2;
      curve(pl, sx, sy, lo, hi, (x) => scale * normPdf(x, mean, sd));
      ctx.fillStyle = c.gold;
      const r = Math.max(1.5, Math.min(4, slot * 0.28));
      for (let k = k0; k <= k1; k++) {
        ctx.beginPath();
        ctx.arc(sx(k), sy(scale * binomPmf(k, n, p)), r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const values = span <= 21 ? Array.from({ length: span }, (_, i) => k0 + i) : ticks(k0, k1, 10).filter(Number.isInteger);
    xAxis(pl, sx, base, lo, hi, { values, format: (k) => tidy(k / n, n > 100 ? 3 : 2) });
    if (morph.moving) pl.request();
  });

  function add(k: number): void {
    const count = ++counts[k];
    if (count > maxCount) maxCount = count;
    if (k < kMin) kMin = k;
    if (k > kMax) kMax = k;
    stats.push(k / n);
  }

  /** One sample drawn trial by trial, so the dot strip shows what actually happened. */
  function drawVisible(): void {
    trials = new Uint8Array(n);
    let k = 0;
    for (let i = 0; i < n; i++) if ((trials[i] = rng.bernoulli(p) ? 1 : 0)) k++;
    lastK = k;
    add(k);
  }

  function render(animate: boolean): void {
    const total = stats.n;
    const se = Math.sqrt((p * (1 - p)) / n);
    setText('pOut', fmt(p, 2));
    setText('sN', int(total));
    setText('sMean', total ? fmt(stats.mean, 4) : '—');
    setText('sSe', total > 1 ? fmt(stats.sd, 4) : '—');
    setText('tMean', `p = ${fmt(p, 4)}`);
    setText('tSe', `theory ${fmt(se, 4)}`);
    if (lastK >= 0) {
      setText('phat', fmt(lastK / n, 3));
      setText('raw', n > 500 ? `${int(lastK)} of ${int(n)} (dots hidden above 500)` : `${int(lastK)} of ${int(n)}`);
      fillEq($('eqPhat'), { x: String(lastK), n: String(n), phat: fmt(lastK / n, 3) }, animate);
      describeEq($('eqPhat'), `The sample proportion is ${lastK} out of ${n}, which is ${fmt(lastK / n, 3)}.`);
    } else {
      setText('phat', '—');
      setText('raw', '');
    }
    fillEq($('eqSe'), { p: tidy(p), q: tidy(1 - p), n: String(n), se: fmt(se, 4) }, animate);
    describeEq($('eqSe'), `The standard error of the sample proportion is ${fmt(se, 4)}.`);

    const np = n * p;
    const nq = n * (1 - p);
    const safe = np >= 10 && nq >= 10;
    $('cond').innerHTML =
      `<span class="badge ${safe ? 'ok' : 'bad'}">${safe ? '✓ Bell curve fits' : '✕ Bell curve unreliable'}</span>` +
      `<span><i>np</i> = <b>${tidy(np, 1)}</b>, <i>n</i>(1 − <i>p</i>) = <b>${tidy(nq, 1)}</b>. Both should reach 10.</span>`;
    $('eqNote').innerHTML =
      total > 1
        ? `Your <b>${int(total)}</b> values of <i>p̂</i>: mean <b>${fmt(stats.mean, 4)}</b>, SD <b>${fmt(stats.sd, 4)}</b>. Theory: <b>${fmt(p, 4)}</b> and <b>${fmt(se, 4)}</b>.`
        : 'Draw a sample to fill in the numbers.';
    plot.request();
    dots.request();
    data.refresh();
  }

  function one(): void {
    drawVisible();
    render(true);
  }

  function many(): void {
    const count = num('count', 1000, true);
    for (let i = 0; i < count - 1; i++) add(rng.binomial(n, p));
    drawVisible();
    render(true);
  }

  function reset(): void {
    p = num('p', 0.05);
    n = num('n', 20, true);
    rng = new Rng(st.seed());
    counts = new Uint32Array(n + 1);
    stats = new RunningStats();
    kMin = Infinity;
    kMax = -Infinity;
    maxCount = 0;
    trials = new Uint8Array(0);
    lastK = -1;
    sel = null;
    morph.snap();
    render(false);
  }

  const data = bindData(s, [
    {
      name: 'Proportions',
      columns: [
        { key: 'k', label: 'Successes', get: (r) => r },
        { key: 'phat', label: 'p̂', get: (r) => r / n, format: (v) => fmt(v, 3) },
        { key: 'count', label: 'Samples', get: (r) => counts[r] },
        { key: 'p', label: 'Binomial P', get: (r) => binomPmf(r, n, p), format: (v) => fmt(v, 4) },
        { key: 'exp', label: 'Expected', get: (r) => stats.n * binomPmf(r, n, p), format: (v) => fmt(v, 2) },
      ],
      count: () => n + 1,
      chips: () => [{ label: 'Observed only', test: (r) => counts[r] > 0 }],
      onSelect(row) {
        sel = row;
        plot.request();
      },
    },
  ]);
  plot.onPick = (k) => {
    sel = k;
    plot.request();
    if (k !== null) data.open({ row: k });
  };

  st.bindParams(['p', 'n', 'count', 'theory', 'seed'], (id) => {
    if (id === 'theory') plot.request();
    else if (id !== 'count') {
      reset();
      many();
    }
  });
  // Show the slider's value while it is being dragged; the lab reruns when it is released.
  $('p').addEventListener('input', () => setText('pOut', fmt(num('p', 0.05), 2)));
  st.bindNewSeed(() => {
    reset();
    many();
  });
  on('one', one);
  on('many', many);
  on('clear', reset);
  bindExport(s, plot, () => {
    const total = stats.n;
    const rows = [csvRow(['successes', 'p_hat', 'count', 'binomial_probability', 'expected_count'])];
    for (let k = 0; k <= n; k++) {
      const pmf = binomPmf(k, n, p);
      if (counts[k] || pmf > 1e-9) rows.push(csvRow([k, k / n, counts[k], pmf, total * pmf]));
    }
    return rows.join('\n');
  });

  reset();
  many();
  s.ready();
}
