import { binomPmf, choose, poisPmf } from '../core/dist';
import { Rng } from '../core/rng';
import { IntegerCounts, RunningStats } from '../core/stats';
import { fmt, int, scope, showFor, tidy } from '../ui/dom';
import { bindData } from '../ui/data';
import { describeEq, fillEq } from '../ui/eq';
import { bindExport, csvRow } from '../ui/export';
import { Morph, Plot, linear, palette, ticks, xAxis, yLabels } from '../ui/plot';
import { labState } from '../ui/state';

type Kind = 'uniform' | 'binomial' | 'poisson';

interface Model {
  kind: Kind;
  title: string;
  label: string;
  draw(r: Rng): number;
  pmf(k: number): number;
  mean: number;
  sd: number;
  /** Range of outcomes worth showing before any data arrive. */
  lo: number;
  hi: number;
  maxPmf: number;
}

export function init(): void {
  const s = scope('discrete');
  const { $, num, setText, on } = s;
  const st = labState(s);

  function model(): Model {
    const kind = $<HTMLSelectElement>('dist').value as Kind;
    if (kind === 'uniform') {
      let a = num('uMin', 1, true);
      let b = num('uMax', 8, true);
      if (a > b) {
        [a, b] = [b, a];
        $<HTMLInputElement>('uMin').value = String(a);
        $<HTMLInputElement>('uMax').value = String(b);
      }
      const m = b - a + 1;
      return {
        kind,
        title: 'Discrete uniform',
        label: 'Outcome',
        draw: (r) => r.int(a, b),
        pmf: (k) => (k >= a && k <= b ? 1 / m : 0),
        mean: (a + b) / 2,
        sd: Math.sqrt((m * m - 1) / 12),
        lo: a,
        hi: b,
        maxPmf: 1 / m,
      };
    }
    if (kind === 'binomial') {
      const n = num('bN', 20, true);
      const p = num('bP', 0.2);
      const mean = n * p;
      const sd = Math.sqrt(n * p * (1 - p));
      const wide = n > 60;
      return {
        kind,
        title: 'Binomial',
        label: 'Successes',
        draw: (r) => r.binomial(n, p),
        pmf: (k) => binomPmf(k, n, p),
        mean,
        sd,
        lo: wide ? Math.max(0, Math.floor(mean - 5 * sd)) : 0,
        hi: wide ? Math.min(n, Math.ceil(mean + 5 * sd)) : n,
        maxPmf: binomPmf(Math.min(n, Math.floor((n + 1) * p)), n, p),
      };
    }
    const lambda = num('pLam', 4);
    const unit = $<HTMLSelectElement>('pUnit').value;
    const root = Math.sqrt(lambda);
    return {
      kind,
      title: 'Poisson',
      label: `Events per ${unit}`,
      draw: (r) => r.poisson(lambda),
      pmf: (k) => poisPmf(k, lambda),
      mean: lambda,
      sd: root,
      lo: Math.max(0, Math.floor(lambda - 5 * root)),
      hi: Math.ceil(lambda + 5 * root + 3),
      maxPmf: poisPmf(Math.floor(lambda), lambda),
    };
  }

  let m = model();
  let rng = new Rng(st.seed());
  let counts = new IntegerCounts();
  let stats = new RunningStats();
  let last: number | null = null;
  /** Outcome chosen by clicking a bar or a table row; the equation follows it. */
  let sel: number | null = null;
  let busy = false;
  const morph = new Morph();

  const range = (): [number, number] => {
    const N = counts.total;
    return [Math.min(m.lo, N ? counts.lo : m.lo), Math.max(m.hi, N ? counts.hi : m.hi)];
  };

  const plot = new Plot($('plot'), (p) => {
    const { ctx, w, h } = p;
    const c = palette();
    const N = counts.total;
    const [lo, hi] = range();
    const theory = st.checked('theory');
    const left = 44;
    const right = w - 12;
    const base = h - 28;
    const scaleN = N || 1;
    const span = hi - lo + 1;

    // Bars and the y-scale ease toward their new values together.
    const target = new Float64Array(span + 1);
    for (let i = 0; i < span; i++) target[i] = counts.get(lo + i);
    target[span] = Math.max(N ? counts.max : 0, theory || !N ? scaleN * m.maxPmf : 0) * 1.14 || 1;
    const shown = morph.step(target);
    const sx = linear(lo - 0.5, hi + 0.5, left, right);
    const sy = linear(0, shown[span], base, 12);
    if (N) yLabels(p, sy, left, shown[span]);

    const slot = (right - left) / span;
    const bw = Math.max(1, Math.min(slot * 0.72, 56));
    for (let i = 0; i < span; i++) {
      const x = sx(lo + i);
      p.mark(lo + i, x - slot / 2, 12, slot, base - 12);
      const y = sy(shown[i]);
      if (shown[i] >= 1e-9) {
        ctx.fillStyle = lo + i === last ? c.accent : c.bar;
        ctx.fillRect(x - bw / 2, y, bw, base - y);
      }
      if (lo + i === sel) {
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - bw / 2 - 2, Math.min(y, base - 6) - 2, bw + 4, base - Math.min(y, base - 6) + 2);
      }
    }

    if (theory || !N) {
      ctx.strokeStyle = c.gold;
      ctx.lineWidth = 2;
      const half = Math.max(2, Math.min(slot * 0.46, 34));
      ctx.beginPath();
      for (let k = lo; k <= hi; k++) {
        const y = Math.round(sy(scaleN * m.pmf(k))) + 0.5;
        ctx.moveTo(sx(k) - half, y);
        ctx.lineTo(sx(k) + half, y);
      }
      ctx.stroke();
    }

    const values = span <= 25 ? Array.from({ length: span }, (_, i) => lo + i) : ticks(lo, hi, 12).filter(Number.isInteger);
    xAxis(p, sx, base, lo - 0.5, hi + 0.5, { values, format: (v) => tidy(v) });
    if (morph.moving) p.request();
  });

  function fill(animate: boolean): void {
    const eqs = $('eqs');
    const N = counts.total;
    const k = sel ?? last;
    if (k === null) {
      setText('eqNote', 'Run an experiment to fill in the numbers.');
      return;
    }
    const P = m.pmf(k);
    const values: Record<string, string> = { k: String(k), P: fmt(P, 4) };
    if (m.kind === 'uniform') {
      values.a = String(m.lo);
      values.b = String(m.hi);
    } else if (m.kind === 'binomial') {
      const n = num('bN', 20, true);
      const p = num('bP', 0.2);
      const C = choose(n, k);
      values.C = C < 1e9 ? int(C) : C.toExponential(2).replace('e+', '×10^');
      values.p = tidy(p);
      values.q = tidy(1 - p);
      values.nk = String(n - k);
    } else {
      values.lam = tidy(m.mean);
    }
    fillEq(eqs, values, animate);
    const seen = counts.get(k);
    describeEq(
      eqs.querySelector<HTMLElement>(':scope > :not([hidden])')!,
      `The probability that the outcome equals ${k} is ${fmt(P, 4)}.`,
    );
    $('eqNote').innerHTML = `Outcome <b>${k}</b>: seen in <b>${int(seen)}</b> of <b>${int(N)}</b> runs (<b>${fmt(seen / N, 4)}</b>). Formula: <b>${fmt(P, 4)}</b>.`;
  }

  function render(animate: boolean): void {
    const N = counts.total;
    setText('resValueLabel', m.label);
    setText('resValue', last === null ? '—' : String(last));
    setText('sN', int(N));
    setText('sMean', N ? fmt(stats.mean, 3) : '—');
    setText('sSd', N > 1 ? fmt(stats.sd, 3) : '—');
    setText('tMean', `theory ${fmt(m.mean, 3)}`);
    setText('tSd', `theory ${fmt(m.sd, 3)}`);
    fill(animate);
    plot.request();
    data.refresh();
  }

  function apply(count: number): void {
    for (let i = 0; i < count; i++) {
      last = m.draw(rng);
      counts.add(last);
      stats.push(last);
    }
    render(true);
  }

  function run(batch: boolean): void {
    if (busy) return;
    const count = batch ? num('count', 100, true) : 1;
    const delay = num('delay', 0, true);
    if (!delay) return apply(count);
    busy = true;
    s.panel.classList.add('busy');
    for (const id of ['one', 'many']) $<HTMLButtonElement>(id).disabled = true;
    setTimeout(() => {
      busy = false;
      s.panel.classList.remove('busy');
      for (const id of ['one', 'many']) $<HTMLButtonElement>(id).disabled = false;
      apply(count);
    }, delay);
  }

  function reset(): void {
    m = model();
    rng = new Rng(st.seed());
    counts = new IntegerCounts();
    stats = new RunningStats();
    last = null;
    sel = null;
    showFor($('params'), m.kind);
    showFor($('eqs'), m.kind);
    render(false);
  }

  const outcome = (row: number) => range()[0] + row;
  const data = bindData(s, [
    {
      name: 'Outcomes',
      columns: [
        { key: 'k', label: 'Outcome', get: outcome },
        { key: 'count', label: 'Count', get: (r) => counts.get(outcome(r)) },
        { key: 'share', label: 'Share', get: (r) => (counts.total ? counts.get(outcome(r)) / counts.total : 0), format: (v) => fmt(v, 4) },
        { key: 'p', label: 'P(X = k)', get: (r) => m.pmf(outcome(r)), format: (v) => fmt(v, 4) },
        { key: 'exp', label: 'Expected', get: (r) => counts.total * m.pmf(outcome(r)), format: (v) => fmt(v, 2) },
      ],
      count: () => range()[1] - range()[0] + 1,
      onSelect(row) {
        sel = row === null ? null : outcome(row);
        fill(true);
        plot.request();
      },
    },
  ]);
  plot.onPick = (key) => {
    sel = key;
    fill(true);
    plot.request();
    if (key !== null) data.open({ row: key - range()[0] });
  };

  st.bindParams(['dist', 'uMin', 'uMax', 'bN', 'bP', 'pLam', 'pUnit', 'count', 'theory', 'delay', 'seed'], (id) => {
    if (id === 'theory') plot.request();
    else if (id !== 'count' && id !== 'delay') reset();
  });
  st.bindNewSeed(() => {
    reset();
    apply(num('count', 100, true));
  });
  on('one', () => run(false));
  on('many', () => run(true));
  on('clear', reset);
  bindExport(s, plot, () => {
    const [lo, hi] = range();
    const N = counts.total;
    const rows = [csvRow(['outcome', 'count', 'share', 'probability', 'expected_count'])];
    for (let k = lo; k <= hi; k++) {
      const n = counts.get(k);
      rows.push(csvRow([k, n, N ? n / N : 0, m.pmf(k), N * m.pmf(k)]));
    }
    return rows.join('\n');
  });

  reset();
  apply(num('count', 100, true));
  s.ready();
}
