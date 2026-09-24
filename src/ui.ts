// Small DOM helpers shared by all tools

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function h(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const node = root.querySelector(sel);
  if (!node) throw new Error(`Missing element: ${sel}`);
  return node as HTMLElement;
}

/** Fire a haptic tick on the same frame as the visual/haptic event (causality + harmony). */
export function haptic(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported (e.g. iOS Safari) */
  }
}

/**
 * One icon family for the whole app: SF-Symbols-style stroke glyphs on a24 grid,
 * currentColor, round caps. No emoji in UI chrome (anti-slop law 5).
 */
const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  swap: svg('<path d="M4 8h13"/><path d="m14 5 3 3-3 3"/><path d="M20 16H7"/><path d="m10 13-3 3 3 3"/>'),
  money: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.5c0-1.1-1.3-1.8-3-1.8s-3 .8-3 1.9c0 2.6 6 1.4 6 4 0 1.1-1.3 1.9-3 1.9s-3-.8-3-1.9"/>'),
  person: svg('<circle cx="12" cy="7.5" r="3.5"/><path d="M5.5 21v-1.5a6.5 6.5 0 0 1 13 0V21"/>'),
  key: svg('<circle cx="8.5" cy="15.5" r="4"/><path d="m11.5 12.5 8-8"/><path d="m16.5 7.5 2 2"/><path d="m19 5 2 2"/>'),
  text: svg('<path d="M4 7h16"/><path d="M4 12h11"/><path d="M4 17h16"/>'),
  qr: svg('<path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M16 4h3a1 1 0 0 1 1 1v3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M8 20H5a1 1 0 0 1-1-1v-3"/><rect x="8" y="8" width="8" height="8" rx="1.5"/>'),
  camera: svg('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.4-2h6.8l1.4 2h1.7A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/><circle cx="12" cy="12.5" r="3.5"/>'),
  stop: svg('<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  trash: svg('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>'),
  eye: svg('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-3 3.9"/><path d="M6.6 6.6A16.7 16.7 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  wifi: svg('<path d="M2 9a15 15 0 0 1 20 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor" stroke="none"/>'),
  image: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m4 17 5-4 4 3 3-2 4 3"/>'),
  reload: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  sliders: svg('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
};

/** Swap an icon-only button's glyph (keeps its label/aria intact). */
export function setIcon(btn: HTMLElement, iconHtml: string): void {
  btn.replaceChildren(h(iconHtml));
}

let toastTimer: number | undefined;
export function toast(msg: string): void {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 1800);
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied');
    haptic(8);
  } catch {
    // Fallback for insecure contexts
    const ta = el('textarea', { style: 'position:fixed;opacity:0' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('Copied');
    haptic(8);
  }
}

export function fmtNum(n: number, maxFrac = 6): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e15)) return n.toExponential(4);
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}
