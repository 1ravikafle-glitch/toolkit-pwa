import { el, h, ICONS } from './ui';
import * as settings from './settings';
import { SettingsDrawer } from './menu';
import * as converter from './tools/converter';
import * as tip from './tools/tip';
import * as bmi from './tools/bmi';
import * as wordcounter from './tools/wordcounter';
import * as password from './tools/password';
import { NavStack } from './stack';
import './style.css';

// QR rendering is the heaviest dependency and only the QR tool needs it,
// so it loads on first open — the home screen boots without it.
type QrModule = typeof import('./tools/qr');
const lazyTools: Record<string, () => Promise<QrModule>> = {
  qr: () => import('./tools/qr'),
};

type Tool = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  render: ((root: HTMLElement) => void) | null;
};

const TOOLS: Tool[] = [
  { id: 'convert', name: 'Unit Converter', desc: 'Length, weight, temp, area, volume, speed', icon: ICONS.swap, color: '#0071e3', render: converter.render },
  { id: 'tip', name: 'Tip & Split', desc: 'Calculate tip and split the bill', icon: ICONS.money, color: '#34c759', render: tip.render },
  { id: 'bmi', name: 'BMI Calculator', desc: 'Body mass index, metric or imperial', icon: ICONS.person, color: '#ff9500', render: bmi.render },
  { id: 'password', name: 'Password Generator', desc: 'Strong random passwords, local only', icon: ICONS.key, color: '#ff3b30', render: password.render },
  { id: 'words', name: 'Word Counter', desc: 'Words, chars, sentences, reading time', icon: ICONS.text, color: '#5856d6', render: wordcounter.render },
  { id: 'qr', name: 'QR Codes', desc: 'Generate and scan QR codes', icon: ICONS.qr, color: '#00c7be', render: null },
];

/** Resolve a tool's render fn, lazy-loading the QR module on first open. */
async function resolveRender(tool: Tool): Promise<(root: HTMLElement) => void> {
  if (tool.render) return tool.render;
  const mod = await (lazyTools[tool.id]?.() ?? Promise.reject(new Error(`no module for ${tool.id}`)));
  tool.render = mod.render;
  return tool.render;
}

function renderHome(root: HTMLElement): void {
  const grid = el('div', { class: 'tool-grid' });
  for (const tool of TOOLS) {
    const card = el(
      'button',
      { class: 'tool-card', type: 'button' },
      el('div', { class: 'icon', style: `background:${tool.color}` }, h(tool.icon)),
      el('div', { class: 'name' }, tool.name),
      el('div', { class: 'desc' }, tool.desc)
    );
    card.addEventListener('click', () => {
      location.hash = `#/${tool.id}`;
    });
    grid.append(card);
  }

  root.append(
    el('h1', { class: 'large-title' }, 'ToolKit'),
    el(
      'p',
      { class: 'subtitle' },
      'Everyday utilities that are free, private and work offline. No ads, no accounts, no data collection.'
    ),
    grid,
    el('h2', { class: 'section-title' }, 'Why ToolKit?'),
    el(
      'div',
      { class: 'panel' },
      row('Cost', '100% free — forever'),
      row('Privacy', 'Everything runs on your device'),
      row('Offline', 'Works with no internet after first load'),
      row('Install', 'Installable on phone and desktop like a native app')
    )
  );

  function row(k: string, v: string): HTMLElement {
    return el(
      'div',
      { class: 'stat-row' },
      el('span', { class: 'k' }, k),
      el('span', { class: 'v', style: 'font-weight:400;text-align:right;max-width:60%' }, v)
    );
  }
}

let nav: NavStack | null = null;

function route(animated = true): void {
  if (!nav) return;
  const id = location.hash.replace(/^#\/?/, '');
  const tool = TOOLS.find((t) => t.id === id);
  if (tool) {
    if (nav.openId === tool.id) return;
    document.title = `${tool.name} — ToolKit`;
    void resolveRender(tool).then((render) => {
      nav?.push({ id: tool.id, name: tool.name, render }, animated);
    });
  } else {
    document.title = 'ToolKit — Everyday Utilities';
    nav.pop(animated);
  }
}

function boot(): void {
  const app = document.getElementById('app');
  if (!app) return;

  settings.initSettings(); // theme + text scale (bootstrap already avoided first-paint flash)

  // Home lives in a persistent layer so push/pop can parallax it underneath.
  const homeLayer = el('div', { class: 'home-layer' });
  app.append(homeLayer);
  renderHome(homeLayer);

  // Settings side menu — theme + text size live here now
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.append(h(ICONS.sliders));
  const drawer = new SettingsDrawer(menuBtn);
  menuBtn?.addEventListener('click', () => drawer.toggle());

  const topbar = document.querySelector<HTMLElement>('.topbar');
  const syncTopbar = (): void => {
    if (topbar) {
      document.documentElement.style.setProperty('--topbar-h', `${topbar.offsetHeight}px`);
    }
  };
  syncTopbar();
  window.addEventListener('resize', syncTopbar);

  // Scroll-edge effect: the fade under the floating bar appears only when
  // content is actually passing beneath it (window scroll or a pushed view).
  document.addEventListener(
    'scroll',
    (e) => {
      if (!topbar) return;
      const t = e.target as EventTarget | null;
      const y =
        t === document || t === null
          ? window.scrollY
          : (t as HTMLElement).scrollTop;
      topbar.classList.toggle('has-underlap', y > 4);
    },
    true
  );

  nav = new NavStack(homeLayer);
  window.addEventListener('hashchange', () => route(true));
  route(false); // initial load: deep links render settled, no entrance animation
}

boot();

// ---- PWA: service worker ----
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Relative URL: works on project pages subpaths too.
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => {
      /* offline support unavailable */
    });
  });
}

// ---- Install prompt ----
let deferredPrompt: BeforeInstallPromptEvent | null = null;
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  const btn = document.getElementById('install-btn');
  if (btn) btn.hidden = false;
});

document.getElementById('install-btn')?.addEventListener('click', () => {
  if (!deferredPrompt) return;
  void deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => {
    deferredPrompt = null;
    const btn = document.getElementById('install-btn');
    if (btn) btn.hidden = true;
  });
});
