import { describe, expect, it } from 'vitest';
import { pages as cvPages } from '../tools/pages/cv.mjs';
import { pages as researchPages } from '../tools/pages/research.mjs';

/** Any phone-number shape, e.g. "(555) 010-4477" or "555-010-4477"; never write a real number into this public repo. */
const PHONE = /\(\d{3}\)\s?\d{3}[-.\s]\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/;

describe('the phone-number guard', () => {
  it('recognises a phone number in either common shape', () => {
    expect('Phone: (555) 010-4477').toMatch(PHONE);
    expect('Phone: 555-010-4477').toMatch(PHONE);
    expect('2024–2026 · 319C Savery Hall, Seattle, WA 98195').not.toMatch(PHONE);
  });
});

const text = (html) =>
  html.replace(/<br>/g, ' ').replace(/<span class="sr">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

describe('research page', () => {
  it('is a single plain page', () => {
    expect(researchPages.map((p) => p.path)).toEqual(['research/index.html']);
  });

  const html = researchPages[0].body('../');
  const words = text(html);

  it('lists the job market paper with a link to its PDF and its abstract', () => {
    expect(html).toContain('<h1>Research</h1>');
    expect(html).toContain('<h2>Working Papers</h2>');
    expect(html).toContain('<a href="../files/when-yield-curves-invert-together.pdf" type="application/pdf">When Yield Curves Invert Together: Currency Crash Risk</a>');
    expect(words).toContain('(Job Market Paper)');
    expect(words).toContain(
      'A yield-curve inversion is a well-documented leading indicator of domestic slowdown, but a single inversion does not reveal whether the expected slowdown is country-specific or global.',
    );
  });

  it('lists the work in progress with its descriptions', () => {
    expect(html).toContain('<h2>Work in Progress</h2>');
    expect(words).toContain('Maintaining Carry Structure in Machine Learning Carry Trade');
    expect(words).toContain('This paper is utilizing time series machine learning methods');
    expect(words).toContain('Cross-Asset Inversion Clocks');
  });

  it('has no summary article, figures or interactive', () => {
    expect(html).not.toMatch(/when-yield-curves-invert-together\/|research\/jmp|<img|<button|r-int/);
  });
});

describe('C.V. page', () => {
  const html = cvPages[0].body('../');
  const words = text(html);

  it('is plain: title, the PDF, then only the sections no other page has', () => {
    expect(html).toContain('<h1>C.V.</h1>');
    // Same link as on the home page: opens the PDF in the browser, no forced download.
    expect(html).toContain('<p><a href="../files/alfredo-effendy-cv.pdf" type="application/pdf">C.V. (PDF)</a></p>');
    expect(html).not.toContain(' download');
    const headings = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(headings).toEqual(['Education', 'Fellowships and Awards', 'Professional Service', 'Non-Academic Employment', 'References']);
  });

  it('lists the 2026 Graduate Staff Assistant role first under Professional Service', () => {
    const service = html.slice(html.indexOf('<h2>Professional Service</h2>'), html.indexOf('<h2>Non-Academic Employment</h2>'));
    const items = [...service.matchAll(/<li><span class="cv-yr">([^<]*)<\/span><span>(.*?)<\/span><\/li>/g)].map((m) => [m[1], m[2]]);
    expect(items[0]).toEqual(['2026', 'Graduate Staff Assistant, Department of Economics']);
    expect(items).toHaveLength(4);
  });

  it('points to Research and Teaching instead of repeating them', () => {
    expect(words).toContain('Research and teaching: see the Research and Teaching pages.');
    expect(html).toContain('<a href="../research/">Research</a>');
    expect(html).toContain('<a href="../teaching/">Teaching</a>');
    expect(words).not.toMatch(/When Yield Curves Invert Together|Maintaining Carry Structure|B BUS 221|STAT 311|Syllabus/);
  });

  it('links the paper only to its PDF and keeps contact details private', () => {
    expect(words).not.toContain('Read the summary');
    expect(html).not.toContain('when-yield-curves-invert-together/');
    expect(words).not.toMatch(PHONE);
    // Contact details live on the home page and in the PDF; the C.V. page shows no address or email at all.
    expect(html).not.toMatch(/@uw\.edu|Savery Hall|cv-addr/);
  });

  it('drops the decorative pieces', () => {
    expect(html).not.toMatch(/cv-int|cv-market|style="--i|cv-actions/);
  });
});
