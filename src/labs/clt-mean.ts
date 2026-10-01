import { normPdf } from '../core/dist';
import { type PopKind, type Population, population } from '../core/populations';
import { Rng } from '../core/rng';
import { Histogram, RunningStats, Series } from '../core/stats';
import { fmt, int, reducedMotion, scope, tidy } from '../ui/dom';
import { bindData } from '../ui/data';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport } from '../ui/export';
import { Morph, Plot, curve, label, linear, palette, triangle, tween, xAxis } from '../ui/plot';
import { labState } from '../ui/state';

const BINS = 80;
/** Sample means kept for the data table and CSV (the histogram itself is unlimited). */
const KEPT = 50000;
const SPREAD = { normal: 0.12, exp: 0.15, bimodal: 0.07 };

export function init(): void {
  const s = scope('clt-mean');
  const { $, num, setText, on } = s;
  const st = labState(s);

  let max = 1000;
  let pop: Population = population('uniform', max, SPREAD);
  let rng = new Rng(st.seed());
  let n = 5;
  let hist = new Histogram(0, max, BINS);
  let means = new RunningStats();
  let all = new Series();
  let sample: Float64Array = new Float64Array(0);
  let sampleMean = NaN;
  /** The sample as drawn, kept from the first edit so it can be restored. */
  let backup: Float64Array | null = null;
  let selBin: number | null = null;
  /** In-flight animation: which phase is running and how far along it is. */
  let anim: { phase: 'drop' | 'fall'; t: number } | null = null;
  let finishAnim: (() => void) | null = null;
  const morph = new Morph();

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const d = pop.dist;
    const left = 16;
    const right = w - 16;
    const sx = linear(0, max, left, right);
    const theory = st.checked('theory');
    const se = d.sd / Math.sqrt(n);

    // Panel geometry: population, current sample, sampling distribution.
    const popTop = 24;
    const popBase = Math.round(h * 0.2);
    const smpLabel = popBase + 34;
    const smpBase = smpLabel + 62;
    const distLabel = smpBase + 34;
    const distTop = distLabel + 22;
    const distBase = h - 26;

    // 1. Population: the exact density, not a simulated histogram.
    let peak = 0;
    for (let i = 0; i <= 200; i++) peak = Math.max(peak, d.pdf((max * i) / 200));
    const sp = linear(0, peak * 1.05, popBase, popTop);
    ctx.fillStyle = c.pop;
    curve(p, sx, sp, 0, max, d.pdf, popBase);
    label(p, 'Population', left, 4);
    label(p, `μ = ${tidy(d.mean, 1)}   σ = ${tidy(d.sd, 1)}`, right, 4, 'right', true);
    ctx.strokeStyle = c.gold;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx(d.mean), popTop - 4);
    ctx.lineTo(sx(d.mean), popBase);
    ctx.stroke();
    ctx.setLineDash([]);
    xAxis(p, sx, popBase, 0, max);

    // 2. Current sample.
    label(p, `Sample of ${n}`, left, smpLabel);
    if (sample.length) {
      const drop = anim?.phase === 'drop' ? anim.t : 1;
      const y = popBase + (smpBase - 6 - popBase) * drop;
      ctx.fillStyle = c.ink;
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.62;
      for (let i = 0; i < sample.length; i++) {
        ctx.beginPath();
        ctx.arc(sx(sample[i]), y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (drop === 1) {
        label(p, `x̄ = ${fmt(sampleMean, 1)}`, right, smpLabel, 'right', true);
        if (anim?.phase !== 'fall') {
          ctx.fillStyle = c.accent;
          triangle(ctx, sx(sampleMean), smpBase, 7);
        }
      }
    }
    xAxis(p, sx, smpBase, 0, max);

    // 3. Sampling distribution of the mean.
    const total = means.n;
    label(p, 'Sample means', left, distLabel);
    label(p, `${int(total)} samples`, right, distLabel, 'right', true);
    const scale = (total || 1) * hist.width;
    const target = new Float64Array(BINS + 1);
    target.set(hist.counts);
    target[BINS] = Math.max(hist.max, theory || !total ? scale * normPdf(d.mean, d.mean, se) : 0) * 1.12 || 1;
    const shown = morph.step(target);
    const sd = linear(0, shown[BINS], distBase, distTop);
    const bw = (right - left) / BINS;
    ctx.fillStyle = c.bar;
    for (let i = 0; i < BINS; i++) {
      p.mark(i, left + i * bw, distTop, bw, distBase - distTop);
      if (shown[i] < 1e-9) continue;
      const y = sd(shown[i]);
      ctx.fillRect(left + i * bw, y, Math.max(1, bw - 1), distBase - y);
    }
    if (selBin !== null) {
      const y = Math.min(sd(shown[selBin]), distBase - 6);
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(left + selBin * bw - 1, y - 2, bw + 1, distBase - y + 2);
    }
    if (theory || !total) {
      ctx.strokeStyle = c.gold;
      ctx.lineWidth = 2;
      curve(p, sx, sd, 0, max, (x) => scale * normPdf(x, d.mean, se));
    }
    if (anim?.phase === 'fall') {
      // The mean travels from the sample panel to the top of the bar it will join.
      const bin = Math.min(BINS - 1, Math.max(0, Math.floor(sampleMean / hist.width)));
      const land = sd(hist.counts[bin] + 1);
      ctx.fillStyle = c.accent;
      triangle(ctx, sx(sampleMean), smpBase + (land - smpBase) * anim.t, 7);
    }
    xAxis(p, sx, distBase, 0, max);
    if (morph.moving && !anim) p.request();
  });

  function draw(size: number): { values: Float64Array; mean: number } {
    const values = new Float64Array(size);
    let sum = 0;
    for (let i = 0; i < size; i++) sum += values[i] = pop.draw(rng);
    return { values, mean: sum / size };
  }

  function record(mean: number): void {
    hist.add(mean);
    means.push(mean);
    if (all.n < KEPT) all.push(mean);
  }

  function render(animate: boolean): void {
    const d = pop.dist;
    const se = d.sd / Math.sqrt(n);
    const total = means.n;
    setText('sN', int(total));
    setText('sMean', total ? fmt(means.mean, 2) : '—');
    setText('sSe', total > 1 ? fmt(means.sd, 2) : '—');
    setText('tMean', `μ = ${fmt(d.mean, 2)}`);
    setText('tSe', `σ/√n = ${fmt(se, 2)}`);
    if (sample.length) {
      fillEq($('eqMean'), { sum: fmt(sampleMean * n, 1), n: String(n), xbar: fmt(sampleMean, 1) }, animate);
      describeEq($('eqMean'), `The sample mean is ${fmt(sampleMean, 1)}.`);
    }
    fillEq($('eqSe'), { sigma: fmt(d.sd, 2), n: String(n), se: fmt(se, 2) }, animate);
    describeEq($('eqSe'), `The standard error of the mean is ${fmt(d.sd, 2)} divided by the square root of ${n}, which is ${fmt(se, 2)}.`);
    $('eqNote').innerHTML =
      total > 1
        ? `SD of your <b>${int(total)}</b> means: <b>${fmt(means.sd, 2)}</b>. Formula: <b>${fmt(se, 2)}</b>. Single values vary by <b>${fmt(d.sd, 2)}</b>.`
        : 'Draw a sample to fill in the numbers.';
    plot.request();
    data.refresh();
  }

  function one(): void {
    finishAnim?.();
    const smp = draw(n);
    sample = smp.values;
    sampleMean = smp.mean;
    backup = null;
    const commit = () => {
      anim = null;
      finishAnim = null;
      record(smp.mean);
      render(true);
    };
    if (reducedMotion()) return commit();
    anim = { phase: 'drop', t: 0 };
    const frame = (t: number) => {
      anim!.t = t;
      plot.now();
    };
    finishAnim = tween(260, frame, () => {
      anim = { phase: 'fall', t: 0 };
      finishAnim = tween(420, frame, commit);
    });
  }

  function many(): void {
    finishAnim?.();
    const count = num('count', 1000, true);
    for (let i = 0; i < count - 1; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) sum += pop.draw(rng);
      record(sum / n);
    }
    // Keep the final sample of the batch so the middle panel and the equation show real values.
    const smp = draw(n);
    sample = smp.values;
    sampleMean = smp.mean;
    backup = null;
    record(smp.mean);
    render(true);
  }

  function reset(): void {
    finishAnim?.();
    anim = null;
    finishAnim = null;
    max = num('xmax', 1000, true);
    n = num('n', 5, true);
    pop = population($<HTMLSelectElement>('dist').value as PopKind, max, SPREAD);
    rng = new Rng(st.seed());
    hist = new Histogram(0, max, BINS);
    means = new RunningStats();
    all = new Series();
    sample = new Float64Array(0);
    sampleMean = NaN;
    backup = null;
    selBin = null;
    render(false);
  }

  const meanOf = (v: Float64Array) => v.reduce((sum, x) => sum + x, 0) / v.length;
  const data = bindData(s, [
    {
      // Editing an observation moves this sample's mean; the pile below keeps the mean as drawn.
      name: 'Current sample',
      columns: [
        { key: 'i', label: '#', get: (r) => r + 1 },
        { key: 'x', label: 'x', get: (r) => sample[r], format: (v) => fmt(v, 2), edit: {} },
        { key: 'd', label: 'x − x̄', get: (r) => sample[r] - sampleMean, format: (v) => fmt(v, 2) },
      ],
      count: () => sample.length,
      set(row, _key, value) {
        backup ??= sample.slice();
        sample[row] = value;
        sampleMean = meanOf(sample);
        render(true);
      },
      edited: () => backup !== null,
      restore() {
        if (!backup) return;
        sample = backup;
        backup = null;
        sampleMean = meanOf(sample);
        render(true);
      },
    },
    {
      name: 'Sample means',
      columns: [
        { key: 'i', label: 'Sample', get: (r) => r + 1 },
        { key: 'm', label: 'x̄', get: (r) => all.data[r], format: (v) => fmt(v, 2) },
      ],
      count: () => all.n,
    },
  ]);
  // Click a bar of the bottom panel to list the sample means in that bin.
  plot.onPick = (bin) => {
    selBin = bin;
    plot.request();
    if (bin === null) return data.filter(null);
    const lo = bin * hist.width;
    const hi = lo + hist.width;
    data.open({ source: 1, filter: { label: `${tidy(lo, 1)} ≤ x̄ < ${tidy(hi, 1)}`, test: (r) => all.data[r] >= lo && all.data[r] < hi } });
  };

  st.bindParams(['dist', 'n', 'count', 'theory', 'xmax', 'seed'], (id) => {
    if (id === 'theory') plot.request();
    else if (id !== 'count') {
      reset();
      many();
    }
  });
  st.bindNewSeed(() => {
    reset();
    many();
  });
  on('one', one);
  on('many', many);
  on('clear', reset);
  bindExport(s, plot, () => ['sample_mean', ...Array.from(all.data.subarray(0, all.n))].join('\n'));

  reset();
  many();
  s.ready();
}
