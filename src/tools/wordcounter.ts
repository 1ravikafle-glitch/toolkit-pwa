import { el, fmtNum, h } from '../ui';

const LABELS: [string, string][] = [
  ['words', 'Words'],
  ['chars', 'Characters'],
  ['charsNoSpace', 'Characters (no spaces)'],
  ['sentences', 'Sentences'],
  ['paragraphs', 'Paragraphs'],
  ['reading', 'Reading time'],
];

export function render(root: HTMLElement): void {
  const textarea = el('textarea', {
    rows: '8',
    placeholder: 'Paste or type your text here…',
  }) as HTMLTextAreaElement;

  const stats = new Map<string, HTMLElement>();
  const rows = el('div', { class: 'panel panel-gap' });
  for (const [key, label] of LABELS) {
    const v = el('span', { class: 'v' }, '0');
    stats.set(key, v);
    rows.append(el('div', { class: 'stat-row' }, el('span', { class: 'k' }, label), v));
  }

  function count(): void {
    const text = textarea.value;
    const trimmed = text.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const sentences =
      trimmed === '' ? 0 : (trimmed.match(/[.!?…]+(?=\s|$)/g) ?? [trimmed]).length;
    const paragraphs = trimmed === '' ? 0 : trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length;
    const minutes = words / 200;

    stats.get('words')!.textContent = fmtNum(words, 0);
    stats.get('chars')!.textContent = fmtNum(text.length, 0);
    stats.get('charsNoSpace')!.textContent = fmtNum(text.replace(/\s/g, '').length, 0);
    stats.get('sentences')!.textContent = fmtNum(sentences, 0);
    stats.get('paragraphs')!.textContent = fmtNum(paragraphs, 0);
    stats.get('reading')!.textContent =
      words === 0 ? '0 s' : minutes < 1 ? `${Math.ceil(minutes * 60)} s` : `${fmtNum(minutes, 1)} min`;
  }

  textarea.addEventListener('input', count);

  const clearBtn = el('button', { class: 'btn btn-secondary', type: 'button' }, 'Clear');
  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    count();
    textarea.focus();
  });

  const panel = el(
    'div',
    { class: 'panel' },
    el('label', { class: 'field-label' }, 'Your text'),
    textarea,
    clearBtn
  );

  root.append(
    h('<a class="back-link" href="#/">‹ All tools</a>'),
    h('<h1 class="large-title">Word Counter</h1>'),
    h('<p class="subtitle">Words, characters, sentences and reading time — live.</p>'),
    panel,
    rows
  );

  count();
}
