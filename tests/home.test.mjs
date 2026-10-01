import { describe, expect, it } from 'vitest';
import { LAB_REDIRECT, pages } from '../tools/pages/home.mjs';

const home = async () => (await pages())[0];
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');

/** Runs the head script against a fake location; returns the URLs it navigated to. */
function redirect(search, hash = '') {
  const calls = [];
  new Function('location', LAB_REDIRECT)({ search, hash, replace: (u) => calls.push(u) });
  return calls;
}

describe('old shared lab links', () => {
  it('forward to the same run under stats-engine/', () => {
    expect(redirect('?lab=regression&seed=7', '#x')).toEqual(['stats-engine/?lab=regression&seed=7#x']);
    expect(redirect('?theme=dark&lab=data')).toEqual(['stats-engine/?theme=dark&lab=data']);
  });
  it('leave every other address alone', () => {
    expect(redirect('')).toEqual([]);
    expect(redirect('?theme=dark')).toEqual([]);
    expect(redirect('?labx=1')).toEqual([]);
  });
});

describe('home page', () => {
  it('is the site root and runs the redirect in <head>', async () => {
    const p = await home();
    expect(p.path).toBe('index.html');
    expect(p.current).toBe('home');
    expect(p.extraHead).toContain(LAB_REDIRECT);
  });

  it('says who the author is, in the Google Site wording', async () => {
    const html = (await home()).body('./');
    expect(html).toContain('<h1>Alfredo Effendy</h1>');
    const words = text(html);
    expect(words).toContain('I am an Economics Ph.D. candidate at the University of Washington.');
    expect(words).toContain('My research interests are in International Finance, Asset Pricing, Risk Management, and Big Data Analysis.');
    expect(words).toContain('I am on the 2026–2027 academic job market.');
    // The menu already links Teaching and Stats Engine; the home page does not repeat them.
    expect(words).not.toMatch(/Teaching page|Stats Engine/);
  });

  it('links the C.V. and the paper, and gives the contact details', async () => {
    const html = (await home()).body('./');
    expect(html).toContain('href="./files/alfredo-effendy-cv.pdf"');
    expect(html).toContain('href="./files/when-yield-curves-invert-together.pdf"');
    const words = text(html);
    for (const line of ['Department of Economics', 'University of Washington', '319C Savery Hall, Seattle, WA 98195', 'aeffendy@uw.edu']) expect(words).toContain(line);
    expect(html).toContain('href="mailto:aeffendy@uw.edu"');
  });

  it('shows the headshot with its size and both resolutions', async () => {
    const html = (await home()).body('./');
    expect(html).toMatch(/<img class="h-photo" src="\.\/img\/alfredo-effendy-200\.webp" srcset="[^"]*\.\/img\/alfredo-effendy-400\.webp 2x" width="200" height="200" alt="Alfredo Effendy"/);
  });

  it('stays plain: no hero, cards, key-number tiles or buttons', async () => {
    const html = (await home()).body('./');
    expect(html).not.toMatch(/<dl|class="btn|h-hero|h-paper|h-tool/);
  });
});
