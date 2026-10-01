import { reducedMotion } from './dom';

/**
 * Fill the numeric row of an equation. Each slot briefly shows its symbol, which lifts away
 * as the number drops in; slots run left to right so the eye follows the substitution.
 * Pass animate = false for continuous updates (dragging), where motion would only be noise.
 */
export function fillEq(root: HTMLElement, values: Record<string, string>, animate = true): void {
  const slots = root.querySelectorAll<HTMLElement>('.slot');
  const move = animate && !reducedMotion() && 'animate' in root;
  let i = 0;
  slots.forEach((slot) => {
    if (slot.closest('[hidden]')) return;
    const value = values[slot.dataset.k!];
    if (value === undefined) return;
    slot.textContent = value;
    slot.classList.add('filled');
    if (!move) return;
    const delay = i++ * 45;
    const timing = { duration: 260, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' as const };
    slot.animate([{ color: 'transparent' }, { color: 'transparent', offset: 0.4 }, {}], timing);
    slot.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-.5em)' },
      ],
      { ...timing, pseudoElement: '::before' },
    );
  });
}

/** Plain-language reading of the equation for assistive technology. */
export function describeEq(root: HTMLElement, text: string): void {
  root.setAttribute('aria-label', text);
}
