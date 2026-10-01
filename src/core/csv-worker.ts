// Reads an opened file off the main thread, so the page keeps animating while a large file parses.
// The columns come back as transferred buffers (no copy).
import { parseCsv } from './csv';
import { MAX_BYTES, MAX_ROWS } from './limits';

self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  const cut = file.size > MAX_BYTES;
  let text = await (cut ? file.slice(0, MAX_BYTES) : file).text();
  // A cut usually lands mid-line: drop the partial last line.
  if (cut) text = text.slice(0, text.lastIndexOf('\n') + 1);
  const parsed = parseCsv(text, MAX_ROWS);
  parsed.truncated ||= cut;
  // Small files are echoed back so they can be shown in the text box.
  const echo = text.length > 20000 ? '' : text;
  self.postMessage({ parsed, echo }, { transfer: parsed.columns.map((c) => c.buffer) });
};
