/**
 * Show the loading mark in a lab's chart frame while `work` is pending. The mark itself fades in
 * only after 280 ms (a CSS delay), so fast work finishes before anything appears.
 */
export function withLoader<T>(panel: HTMLElement, work: Promise<T>): Promise<T> {
  panel.classList.remove('ready');
  panel.setAttribute('aria-busy', 'true');
  const done = () => {
    panel.classList.add('ready');
    panel.removeAttribute('aria-busy');
  };
  work.then(done, done);
  return work;
}
