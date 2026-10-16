// Safe rendering of the agent's simple Markdown (bold, lists, links). Builds DOM nodes, never HTML strings.

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** Text without Markdown markers, used while the answer types out. */
export function toPlain(md: string): string {
  return md
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*#+\s+/gm, '')
    .replace(INLINE, (_m, bold, label) => bold ?? label);
}

/** Replace el's content with the formatted answer. */
export function renderMarkdown(el: HTMLElement, md: string): void {
  const frag = document.createDocumentFragment();
  md.replace(/^\s*#+\s+/gm, '')
    .split('\n')
    .forEach((rawLine, i, lines) => {
      const bullet = /^\s*[-*]\s+/.test(rawLine);
      const line = rawLine.replace(/^\s*[-*]\s+/, '');
      if (bullet) frag.append('• ');
      let last = 0;
      for (const m of line.matchAll(INLINE)) {
        frag.append(line.slice(last, m.index));
        if (m[1]) {
          const b = document.createElement('strong');
          b.textContent = m[1];
          frag.append(b);
        } else {
          const a = document.createElement('a');
          a.href = m[3];
          a.textContent = m[2];
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          frag.append(a);
        }
        last = (m.index ?? 0) + m[0].length;
      }
      frag.append(line.slice(last));
      if (i < lines.length - 1) frag.append('\n');
    });
  el.replaceChildren(frag);
}
