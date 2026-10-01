// Teaching overview: the solo-instructor cards open in place, and a soft light follows the pointer.
import '../site';

for (const card of document.querySelectorAll<HTMLElement>('[data-card]')) {
  const button = card.querySelector<HTMLButtonElement>('.t-card-btn')!;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    card.classList.toggle('open', open);
  });
  // The light sits where the pointer is (mouse and pen only; touch simply opens the card).
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}
