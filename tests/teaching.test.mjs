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
      'Each course below has a page with an interactive illustration helpful for the course, the topics it covers and its syllabus. Stats Engine has more statistics simulations.',
    );
    expect(words).not.toMatch(/I built|I use in class/);
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

describe('every course page', () => {
  const slugs = { 'bbus-221': ['winter-2026', 'spring-2026'], 'qmeth-201': ['summer-2025'], 'econ-301': ['winter-2025'], 'econ-200': ['summer-2024'] };

  /** Each course's Sources: the UW catalogue, plus the public UW Time Schedule where there is one. */
  const SOURCES = {
    'bbus-221': ['https://www.washington.edu/students/crscatb/bbus.html#bbus221'],
    'qmeth-201': ['https://www.washington.edu/students/crscat/qmeth.html#qmeth201', 'https://www.washington.edu/students/timeschd/SUM2025/qmeth.html#qmeth201'],
    'econ-301': ['https://www.washington.edu/students/crscat/econ.html#econ301', 'https://www.washington.edu/students/timeschd/WIN2025/econ.html#econ301'],
    'econ-200': ['https://www.washington.edu/students/crscat/econ.html#econ200', 'https://www.washington.edu/students/timeschd/SUM2024/econ.html#econ200'],
  };

  it('lists only the catalogue and the time schedule as sources, and links nothing else outside the site', () => {
    for (const [slug, expected] of Object.entries(SOURCES)) {
      const html = page(`teaching/${slug}/index.html`).body('../../');
      const sources = html.match(/<ol class="c-sources">([\s\S]*?)<\/ol>/)[1];
      expect([...sources.matchAll(/href="([^"]+)"/g)].map((m) => m[1]), slug).toEqual(expected);
      const external = new Set([...html.matchAll(/href="(https?:[^"]+)"/g)].map((m) => m[1]));
      expect([...external].filter((u) => !expected.includes(u)), slug).toEqual([]);
    }
  });

  it('still links the author\'s own syllabi in the line under the title', () => {
    for (const [slug, terms] of Object.entries(slugs)) {
      const html = page(`teaching/${slug}/index.html`).body('../../');
      for (const t of terms) expect(html, slug).toContain(`href="../../files/syllabi/${slug}-${t}.pdf"`);
    }
  });
});

describe('QMETH 201 course page', () => {
  const html = page('teaching/qmeth-201/index.html').body('../../');

  it('draws its topics from the author\'s own Summer 2025 syllabus, not a 2005 one', () => {
    expect(html).not.toMatch(/htamura|Tamura|2005/);
    expect(text(html)).toContain('Hypothesis tests for one population mean and for one population proportion.');
  });
});

describe('B BUS 221 course page', () => {
  const html = page('teaching/bbus-221/index.html').body('../../');

  it('draws its topics from the author\'s own 2026 syllabi, not other instructors\' ECON 201 syllabi', () => {
    expect(html).not.toMatch(/ECON 201 [ACD] syllabus|syllabi\/2025\/|Econ%20201|Syllabus_201D|cnedita/);
    expect(text(html)).toContain('Money and banking; monetary policy and the Federal Reserve System.');
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
