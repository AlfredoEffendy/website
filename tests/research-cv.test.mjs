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

  it('is plain: title, the PDF, then the C.V.\'s own sections', () => {
    expect(html).toContain('<h1>C.V.</h1>');
    expect(words).toContain('Download C.V. (PDF)');
    const headings = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(headings).toEqual([
      'Education',
      'Working Papers',
      'Selected Work in Progress',
      'Instructor of Record',
      'Teaching Assistant',
      'Fellowships and Awards',
      'Professional Service',
      'Non-Academic Employment',
      'References',
    ]);
  });

  it('links the paper only to its PDF and keeps contact details private', () => {
    expect(words).not.toContain('Read the summary');
    expect(html).not.toContain('when-yield-curves-invert-together/');
    expect(words).not.toMatch(PHONE);
    expect(new Set(html.match(/[a-z0-9.]+@uw\.edu/g))).toEqual(new Set(['aeffendy@uw.edu']));
  });

  it('drops the decorative pieces', () => {
    expect(html).not.toMatch(/cv-int|cv-market|style="--i|cv-actions/);
  });
});
