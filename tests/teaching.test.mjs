import { describe, expect, it } from 'vitest';
import { pages } from '../tools/pages/teaching.mjs';

const all = await pages();
const page = (path) => all.find((p) => p.path === path);
/** Visible text: line breaks as spaces, screen-reader-only spans dropped, tags removed. */
const text = (html) =>
  html.replace(/<br>/g, ' ').replace(/<span class="sr">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

describe('teaching overview', () => {
  const overview = page('teaching/index.html');
  const html = overview.body('../');
  const words = text(html);

  it('is a plain page with the two lists, like the Google Site', () => {
    expect(html).toContain('<h1>Teaching</h1>');
    expect(words).toContain(
      'Each course I teach as instructor of record has a page with an interactive illustration I built for it, the topics it covers and its syllabus. Stats Engine collects the statistics simulations I use in class.',
    );
    expect(html).toContain('<a href="../stats-engine/">Stats Engine</a>');
    expect(html.indexOf('<h2>Instructor of Record</h2>')).toBeGreaterThan(0);
    expect(html.indexOf('<h2>Teaching Assistant</h2>')).toBeGreaterThan(html.indexOf('<h2>Instructor of Record</h2>'));
    expect(overview.entry).toBeUndefined();
    expect(html).not.toMatch(/data-card|class="stat|ta-span|t-card|badge/);
  });

  it('groups the instructor-of-record courses by unit and links each to its page and syllabi', () => {
    const units = ['University of Washington Bothell, School of Business', 'University of Washington, Foster School of Business', 'University of Washington, Department of Economics'];
    const at = units.map((u) => html.indexOf(`<h3>${u}</h3>`));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain('<a href="../teaching/bbus-221/">B BUS 221: Introduction to Macroeconomics</a>');
    expect(words).toContain('B BUS 221: Introduction to Macroeconomics Winter 2026 (Syllabus), Spring 2026 (Syllabus)');
    expect(html).toContain('Winter 2026 (<a href="../files/syllabi/bbus-221-winter-2026.pdf" type="application/pdf">Syllabus</a>)');
    expect(words).toContain('ECON 200: Introduction to Microeconomics Summer 2024 (Syllabus)');
  });

  it('lists every teaching-assistant course with its quarters, oldest first', () => {
    for (const line of [
      'BUS AN 510: Probability and Statistics Summer 2025, Summer 2026',
      'SCM 501: Probability and Statistics Summer 2026',
      'QMETH 201: Introduction to Statistical Methods Spring 2024, Fall 2024, Fall 2025',
      'STAT 311: Elements of Statistical Methods Summer 2022, Spring 2023, Summer 2023, Fall 2023, Winter 2024, Spring 2024',
      'ECON 201: Introduction to Macroeconomics Winter 2022, Fall 2022, Winter 2023',
      'ECON 345: Global Health Economics Spring 2022',
      'ACMS 37020: Projects in Actuarial Science Spring 2019, Fall 2019',
      'ACMS 10145: Statistics for Business Fall 2018',
    ])
      expect(words).toContain(line);
    expect(html).toContain('<h3>University of Notre Dame, Department of Applied and Computational Mathematics and Statistics</h3>');
  });
});

describe('course page', () => {
  const html = page('teaching/bbus-221/index.html').body('../../');

  it('has a plain header line and keeps its interactive', () => {
    expect(html).toContain('<h1>B BUS 221: Introduction to Macroeconomics</h1>');
    expect(text(html)).toContain('Instructor of record · School of Business, University of Washington Bothell · Winter and Spring 2026 · Syllabus: Winter 2026, Spring 2026');
    expect(html).toContain('id="bbus-221-tool"');
    // The interactive keeps its own styling (it has an "Illustrative" badge); the page around it is plain.
    expect(html.slice(0, html.indexOf('<section class="c-tool"'))).not.toMatch(/badge|c-crumb|t-h2/);
  });
});
