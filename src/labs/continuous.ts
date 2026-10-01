import { type Continuous, expDist, normalDist, uniformDist } from '../core/dist';
import { Rng } from '../core/rng';
import { Histogram, RunningStats, lowerBound, upperBound } from '../core/stats';
import { fmt, int, pct, scope, showFor, tidy } from '../ui/dom';
import { bindData } from '../ui/data';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport } from '../ui/export';
import { Morph, Plot, type Scale, curve, linear, palette, xAxis } from '../ui/plot';
import { labState } from '../ui/state';

type Kind = 'normal' | 'uniform' | 'exponential';
const BINS = 60;
const MAX = 50000;

interface Model {
  kind: Kind;
  dist: Continuous;
  draw(r: Rng): number;
  /** Sensible starting interval for the markers. */
  a: number;
  b: number;
}

export function init(): void {
  const s = scope('continuous');
  const { $, num, setText, on } = s;
  const st = labState(s);

  function model(): Model {
    const kind = $<HTMLSelectElement>('dist').value as Kind;
    if (kind === 'normal') {
      const mu = num('nMu', 100);
      const sigma = num('nSigma', 15);
      return { kind, dist: normalDist(mu, sigma), draw: (r) => mu + sigma * r.normal(), a: mu - sigma, b: mu + sigma };
    }
    if (kind === 'uniform') {
      let lo = num('uA', 0);
      let hi = num('uB', 100);
      if (lo > hi) [lo, hi] = [hi, lo];
      if (lo === hi) hi = lo + 1;
      const w = hi - lo;
      return { kind, dist: uniformDist(lo, hi), draw: (r) => r.uniform(lo, hi), a: lo + w / 4, b: hi - w / 4 };
    }
    const mean = 1 / num('eRate', 0.05);
    return { kind, dist: expDist(mean), draw: (r) => r.exponential(mean), a: 0, b: mean };
  }

  let m = model();
  let rng = new Rng(st.seed());
  /** The sample in ascending order (for counting an interval by binary search). */
  const data = new Float64Array(MAX + 1);
  /** The same values in the order they were drawn (the rows of the data table). */
  const raw = new Float64Array(MAX + 1);
  /** Copy of the simulated values, kept from the first edit so they can be restored. */
  let backup: Float64Array | null = null;
  let selBin: number | null = null;
  let n = 0;
  let stats = new RunningStats();
  let hist = new Histogram(m.dist.lo, m.dist.hi, BINS);
  let a = m.a;
  let b = m.b;
  let sx: Scale = linear(0, 1, 0, 1);
  const morph = new Morph();

  const hLo = $('hLo');
  const hHi = $('hHi');
  const markersOn = () => st.checked('markers');
  const inside = () => (n ? upperBound(data, n, b) - lowerBound(data, n, a) : 0);

  /** Rebuild the bins when the sample reaches outside the current plotting range. */
  function rebin(): void {
    const lo = n ? Math.min(m.dist.lo, data[0]) : m.dist.lo;
    const hi = n ? Math.max(m.dist.hi, data[n - 1]) : m.dist.hi;
    if (lo !== hist.lo || hi !== hist.hi) morph.snap();
    hist = new Histogram(lo, hi, BINS);
    for (let i = 0; i < n; i++) hist.add(data[i]);
  }

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const left = 14;
    const right = w - 14;
    const base = h - 52;
    const top = 10;
    const { lo, hi, width } = hist;
    sx = linear(lo, hi, left, right);
    const theory = st.checked('theory');
    // The curve is scaled to expected counts per bin, so it sits directly on the bars.
    const scale = (n || 1) * width;
    let peakDensity = 0;
    for (let i = 0; i <= 120; i++) peakDensity = Math.max(peakDensity, m.dist.pdf(lo + ((hi - lo) * i) / 120));

    const target = new Float64Array(BINS + 1);
    target.set(hist.counts);
    target[BINS] = Math.max(hist.max, theory || !n ? peakDensity * scale : 0) * 1.1 || 1;
    const shown = morph.step(target);
    const sy = linear(0, shown[BINS], base, top);
    const show = markersOn();
    const xa = sx(a);
    const xb = sx(b);

    const bw = (right - left) / BINS;
    for (let i = 0; i < BINS; i++) p.mark(i, left + i * bw, top, bw, base - top);
    const bars = (color: string) => {
      ctx.fillStyle = color;
      for (let i = 0; i < BINS; i++) {
        if (shown[i] < 1e-9) continue;
        const y = sy(shown[i]);
        ctx.fillRect(left + i * bw, y, Math.max(1, bw - 1), base - y);
      }
    };

    if (show) {
      ctx.globalAlpha = 0.45;
      bars(c.bar);
      ctx.globalAlpha = 1;
      // Clip to the interval and repaint, so a bar cut by a marker is coloured exactly up to it.
      ctx.save();
      ctx.beginPath();
      ctx.rect(xa, 0, xb - xa, h);
      ctx.clip();
      ctx.clearRect(xa, top, xb - xa, base - top);
      ctx.fillStyle = c.accentSoft;
      ctx.fillRect(xa, top, xb - xa, base - top);
      bars(c.accent);
      ctx.restore();
      ctx.fillStyle = c.accent;
      ctx.fillRect(Math.round(xa) - 1, top, 2, base - top + 22);
      ctx.fillRect(Math.round(xb) - 1, top, 2, base - top + 22);
    } else bars(c.bar);

    if (selBin !== null) {
      const y = Math.min(sy(shown[selBin]), base - 6);
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(left + selBin * bw - 1, y - 2, bw + 1, base - y + 2);
    }
    if (theory || !n) {
      ctx.strokeStyle = c.gold;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      curve(p, sx, sy, lo, hi, (x) => m.dist.pdf(x) * scale);
    }
    xAxis(p, sx, base, lo, hi);

    for (const [el, value] of [[hLo, a], [hHi, b]] as const) {
      el.hidden = !show;
      el.style.left = `${sx(value)}px`;
      el.firstElementChild!.textContent = fmt(value, 2);
      el.setAttribute('aria-valuenow', value.toFixed(2));
      el.setAttribute('aria-valuemin', lo.toFixed(2));
      el.setAttribute('aria-valuemax', hi.toFixed(2));
    }
    if (morph.moving) p.request();
  });

  function fill(animate: boolean): void {
    const d = m.dist;
    const P = d.cdf(b) - d.cdf(a);
    const values: Record<string, string> = { P: fmt(P, 4) };
    if (m.kind === 'normal') {
      Object.assign(values, {
        a: tidy(a, 2),
        b: tidy(b, 2),
        mu: tidy(d.mean),
        sigma: tidy(d.sd),
        za: fmt((a - d.mean) / d.sd, 2),
        zb: fmt((b - d.mean) / d.sd, 2),
      });
    } else if (m.kind === 'uniform') {
      const lo = Math.min(num('uA', 0), num('uB', 100));
      const hi = Math.max(num('uA', 0), num('uB', 100));
      Object.assign(values, {
        a: tidy(Math.min(hi, Math.max(lo, a)), 2),
        b: tidy(Math.min(hi, Math.max(lo, b)), 2),
        min: tidy(lo),
        max: tidy(hi),
      });
    } else {
      Object.assign(values, { a: tidy(Math.max(0, a), 2), b: tidy(Math.max(0, b), 2), lam: tidy(1 / d.mean, 4) });
    }
    const eqs = $('eqs');
    fillEq(eqs, values, animate);
    describeEq(
      eqs.querySelector<HTMLElement>(':scope > :not([hidden])')!,
      `The probability that X lies between ${fmt(a, 2)} and ${fmt(b, 2)} is ${fmt(P, 4)}.`,
    );
    const k = inside();
    $('eqNote').innerHTML = n
      ? `Theory: <b>${pct(P, 2)}</b>. Your sample: <b>${int(k)}</b> of <b>${int(n)}</b> = <b>${pct(k / n, 2)}</b>. Gap: <b>${fmt(100 * Math.abs(k / n - P), 2)}</b> points.`
      : `Theory: <b>${pct(P, 2)}</b>. Generate a sample to compare.`;
  }

  function render(animate: boolean): void {
    const d = m.dist;
    const show = markersOn();
    const k = inside();
    setText('pEmp', show && n ? pct(k / n, 1) : '—');
    setText('pEmpSub', show ? (n ? `${int(k)} of ${int(n)}` : 'no sample') : 'markers off');
    setText('pTheo', show ? pct(d.cdf(b) - d.cdf(a), 2) : '—');
    setText('sN', int(n));
    setText('sMean', n ? fmt(stats.mean, 2) : '—');
    setText('sSd', n > 1 ? fmt(stats.sd, 2) : '—');
    setText('tMean', `theory ${fmt(d.mean, 2)}`);
    setText('tSd', `theory ${fmt(d.sd, 2)}`);
    $<HTMLInputElement>('lo').value = String(+a.toFixed(2));
    $<HTMLInputElement>('hi').value = String(+b.toFixed(2));
    fill(animate);
    plot.request();
  }

  /** Rebuild the sorted copy, the statistics and the bins from the rows. */
  function recompute(): void {
    data.set(raw.subarray(0, n));
    data.subarray(0, n).sort();
    stats = new RunningStats();
    for (let i = 0; i < n; i++) stats.push(raw[i]);
    rebin();
  }

  function generate(): void {
    n = num('count', 1000, true);
    for (let i = 0; i < n; i++) raw[i] = m.draw(rng);
    backup = null;
    selBin = null;
    recompute();
    render(true);
    table.refresh();
  }

  function addOne(): void {
    if (n >= MAX) return;
    const x = m.draw(rng);
    raw[n] = x;
    if (backup) {
      const grown = new Float64Array(n + 1);
      grown.set(backup);
      grown[n] = x;
      backup = grown;
    }
    const at = upperBound(data, n, x);
    data.copyWithin(at + 1, at, n);
    data[at] = x;
    n++;
    stats.push(x);
    if (x < hist.lo || x > hist.hi) rebin();
    else hist.add(x);
    render(true);
    table.refresh();
  }

  function reset(keepMarkers = false): void {
    m = model();
    rng = new Rng(st.seed());
    n = 0;
    backup = null;
    selBin = null;
    stats = new RunningStats();
    rebin();
    if (!keepMarkers) {
      a = m.a;
      b = m.b;
    }
    showFor($('params'), m.kind);
    showFor($('eqs'), m.kind);
    render(false);
    table.refresh();
  }

  /** Move one marker; the pair can meet but never cross. */
  function setMarker(which: 'a' | 'b', value: number, animate: boolean): void {
    const v = Math.min(hist.hi, Math.max(hist.lo, value));
    if (which === 'a') a = Math.min(v, b);
    else b = Math.max(v, a);
    render(animate);
  }

  for (const [el, which] of [[hLo, 'a'], [hHi, 'b']] as const) {
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      el.classList.add('drag');
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      setMarker(which, sx.invert(e.clientX - plot.host.getBoundingClientRect().left), false);
    });
    const release = () => {
      if (!el.classList.contains('drag')) return;
      el.classList.remove('drag');
      render(true);
      table.refresh();
      st.sync();
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
      if (!dir) return;
      e.preventDefault();
      const step = ((hist.hi - hist.lo) / 200) * (e.shiftKey ? 10 : 1);
      setMarker(which, (which === 'a' ? a : b) + dir * step, false);
      st.sync();
    });
  }

  const table = bindData(s, [
    {
      name: 'Sample',
      columns: [
        { key: 'i', label: '#', get: (r) => r + 1 },
        { key: 'x', label: 'x', get: (r) => raw[r], format: (v) => fmt(v, 3), edit: {} },
        { key: 'z', label: 'z-score', get: (r) => (raw[r] - m.dist.mean) / m.dist.sd, format: (v) => fmt(v, 2) },
        { key: 'in', label: 'In interval', get: (r) => (raw[r] >= a && raw[r] <= b ? 'yes' : 'no') },
      ],
      count: () => n,
      set(row, _key, value) {
        backup ??= raw.slice(0, n);
        raw[row] = value;
        recompute();
        render(true);
      },
      edited: () => backup !== null,
      restore() {
        if (!backup) return;
        raw.set(backup);
        backup = null;
        recompute();
        render(true);
      },
      chips: () => [{ label: 'Inside the interval', test: (r) => raw[r] >= a && raw[r] <= b }],
    },
  ]);
  // Click a bar to list the observations in that bin.
  plot.onPick = (bin) => {
    selBin = bin;
    plot.request();
    if (bin === null) return table.filter(null);
    const lo = hist.lo + bin * hist.width;
    const hi = lo + hist.width;
    const last = bin === BINS - 1;
    table.open({
      filter: { label: `${tidy(lo, 2)} ≤ x ${last ? '≤' : '<'} ${tidy(hi, 2)}`, test: (r) => raw[r] >= lo && (last ? raw[r] <= hi : raw[r] < hi) },
    });
  };

  // A shared link may carry marker positions; read them before the first reset overwrites the fields.
  const url = new URL(location.href).searchParams;
  const given = (key: string): number | null => {
    const v = parseFloat(url.get(key) ?? '');
    return Number.isFinite(v) ? v : null;
  };
  const [urlLo, urlHi] = [given('lo'), given('hi')];

  st.bindParams(
    ['dist', 'nMu', 'nSigma', 'uA', 'uB', 'eRate', 'count', 'theory', 'markers', 'lo', 'hi', 'seed'],
    (id) => {
      if (id === 'lo') setMarker('a', num('lo', a), true);
      else if (id === 'hi') setMarker('b', num('hi', b), true);
      else if (id === 'theory' || id === 'markers') render(false);
      else if (id !== 'count') {
        reset();
        generate();
      }
    },
  );
  st.bindNewSeed(() => {
    reset(true);
    generate();
  });
  on('one', addOne);
  on('many', generate);
  on('clear', () => reset(true));
  bindExport(s, plot, () => ['x', ...Array.from(raw.subarray(0, n))].join('\n'));

  reset();
  a = urlLo ?? a;
  b = Math.max(a, urlHi ?? b);
  generate();
  s.ready();
}
