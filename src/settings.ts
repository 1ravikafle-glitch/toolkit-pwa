// Appearance preferences: theme + text size. Persisted, applied instantly,
// and a 'resize' event is dispatched on change so topbar measurement and
// fluid-navigation math re-run at the new scale.
import { store } from './store';

export type ThemePref = 'system' | 'light' | 'dark';
export type Scale = 's' | 'm' | 'l' | 'xl';

const THEME_KEY = 'tk-theme';
const SCALE_KEY = 'tk-scale';
const SCALE_PX: Record<Scale, string> = { s: '15px', m: '16px', l: '18px', xl: '20px' };

let mq: MediaQueryList;
try {
  mq = matchMedia('(prefers-color-scheme: dark)');
} catch {
  mq = { matches: false, addEventListener: () => {} } as unknown as MediaQueryList;
}

function readTheme(): ThemePref {
  try {
    // store() writes JSON — parse to stay in sync with it
    const v = JSON.parse(localStorage.getItem(THEME_KEY) ?? 'null');
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

function readScale(): Scale {
  try {
    const v = JSON.parse(localStorage.getItem(SCALE_KEY) ?? 'null') as Scale;
    if (v && v in SCALE_PX) return v;
  } catch {
    /* ignore */
  }
  return 'm';
}

function applyTheme(animate = false): void {
  const pref = readTheme();
  const resolved = pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref;
  const root = document.documentElement;
  if (animate && resolved !== root.dataset.theme) {
    // Ease the dark↔light brightness jump (skill §14): a short color cross-fade
    // instead of an abrupt flip. Non-vestibular — kept under reduced motion too.
    root.classList.add('theme-fading');
    window.setTimeout(() => root.classList.remove('theme-fading'), 350);
  }
  root.dataset.theme = resolved;
}

function applyScale(): void {
  const s = readScale();
  document.documentElement.style.fontSize = s === 'm' ? '' : SCALE_PX[s];
}

/** Call once at boot (after the inline no-flash bootstrap in index.html). */
export function initSettings(): void {
  applyTheme();
  applyScale();
  try {
    mq.addEventListener('change', () => {
      if (readTheme() === 'system') applyTheme(true);
    });
  } catch {
    /* older browsers */
  }
}

export function getThemePref(): ThemePref {
  return readTheme();
}

export function setThemePref(pref: ThemePref): void {
  store(THEME_KEY, pref);
  applyTheme(true);
  window.dispatchEvent(new Event('resize'));
}

export function getScale(): Scale {
  return readScale();
}

export function setScale(scale: Scale): void {
  store(SCALE_KEY, scale);
  applyScale();
  window.dispatchEvent(new Event('resize')); // topbar height + nav math re-sync
}
