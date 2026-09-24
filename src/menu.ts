// Settings side menu — theme and text size live here.
// Motion follows the app's existing vocabulary: finger → spring (damping 1.0,
// response 0.3), 1:1 drag with grab offset, momentum projection on release,
// velocity handoff, grabbable mid-flight, Escape + scrim + focus return.
import { project, spring, type SpringHandle } from './spring';
import { el, h, haptic, ICONS } from './ui';
import * as settings from './settings';

function segmentedSetting(
  title: string,
  options: [string, string][],
  activeId: string,
  pick: (id: string) => void
): HTMLElement {
  const seg = el('div', { class: 'segmented', role: 'group', 'aria-label': title });
  for (const [label, id] of options) {
    const b = el('button', { type: 'button', 'data-id': id }, label);
    if (id === activeId) b.classList.add('active');
    b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      pick(id);
      haptic(5); // selection tick, same frame as the visual
    });
    seg.append(b);
  }
  return el('div', {}, el('label', { class: 'field-label' }, title), seg);
}

type Drag = {
  x0: number;
  y0: number;
  p0: number;
  w: number;
  decided: boolean;
  pid: number;
  captured: Element | null;
  hist: { t: number; x: number }[];
};

const DECIDE = 10;
const RB_C = 0.55; // rubber-band constant (skill §9): progressive edge resistance

/** Rubber-band overshoot in progress units — the further past, the less it follows. */
function rubberband(overshoot: number): number {
  return (overshoot * RB_C) / (1 + RB_C * Math.abs(overshoot));
}

export class SettingsDrawer {
  private readonly panel: HTMLElement;
  private readonly scrim: HTMLElement;
  private readonly trigger: HTMLElement | null;
  private anim: SpringHandle | null = null;
  private p = 0; // 0 = closed (parked off right), 1 = fully open
  private drag: Drag | null = null;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(trigger: HTMLElement | null) {
    this.trigger = trigger;

    this.scrim = el('div', { class: 'drawer-scrim' });

    const closeBtn = el(
      'button',
      { class: 'icon-btn', type: 'button', 'aria-label': 'Close settings', title: 'Close' },
      h(ICONS.close)
    );
    closeBtn.addEventListener('click', () => this.close());

    const content = el(
      'div',
      {},
      segmentedSetting(
        'Theme',
        [
          ['Light', 'light'],
          ['Dark', 'dark'],
          ['System', 'system'],
        ],
        settings.getThemePref(),
        (id) => settings.setThemePref(id as settings.ThemePref)
      ),
      segmentedSetting(
        'Text size',
        [
          ['Small', 's'],
          ['Default', 'm'],
          ['Large', 'l'],
          ['XL', 'xl'],
        ],
        settings.getScale(),
        (id) => settings.setScale(id as settings.Scale)
      ),
      el(
        'p',
        { class: 'hint' },
        'System follows your device. Text size scales every screen — layouts reflow instead of shrinking.'
      ),
      el('p', { class: 'hint' }, 'Preferences are stored on this device only.')
    );

    this.panel = el(
      'div',
      { class: 'drawer', role: 'dialog', 'aria-label': 'Settings', 'aria-modal': 'true' },
      el('div', { class: 'drawer-head' }, el('h2', { class: 'drawer-title' }, 'Settings'), closeBtn),
      content
    );

    document.body.append(this.scrim, this.panel);
    this.apply(0);

    this.scrim.addEventListener('click', () => this.close());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.p > 0) this.close();
    });

    // Drag-to-dismiss on the drawer surface (1:1, tap-safe via hysteresis)
    this.panel.addEventListener('pointerdown', this.onDown);
    this.panel.addEventListener('pointermove', this.onMove);
    this.panel.addEventListener('pointerup', this.onUp);
    this.panel.addEventListener('pointercancel', this.onUp);

    // Modal focus trap: Tab cycles inside the dialog (aria-modal), Escape leaves.
    this.panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const nodes = [
        ...this.panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((n) => !n.hasAttribute('disabled'));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!this.panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  get isOpen(): boolean {
    return this.p > 0.5;
  }

  toggle(): void {
    if (this.isOpen || this.p > 0) this.close();
    else this.open();
  }

  private apply(p: number): void {
    this.p = p;
    const w = this.panel.offsetWidth || 320;
    // No hard floor on the transform: p>1 (dragged past open) moves the panel
    // left of the screen edge so the rubber-band is visible; p<0 parks further
    // off-right where it is invisible anyway.
    this.panel.style.transform = `translate3d(${(1 - p) * w}px, 0, 0)`;
    // Must be an explicit 'visible' when open: the .drawer class parks at
    // visibility:hidden, so '' would fall back to the class rule and the
    // open drawer would never paint (the bug that hid Appearance).
    this.panel.style.visibility = p <= 0 ? 'hidden' : 'visible';
    const pc = Math.min(1, Math.max(0, p));
    this.scrim.style.opacity = String(pc * 0.45);
    this.scrim.style.visibility = pc <= 0 ? 'hidden' : 'visible';
    document.body.classList.toggle('menu-open', p > 0.01);
    this.trigger?.setAttribute('aria-expanded', p > 0.5 ? 'true' : 'false');
  }

  open(): void {
    if (this.p >= 1) return;
    this.anim?.stop();
    this.panel.style.visibility = 'visible';
    this.scrim.style.visibility = 'visible';
    if (this.reduced.matches) {
      this.apply(1);
      this.focusFirst();
      return;
    }
    this.panel.classList.add('is-animating');
    this.anim = spring(
      this.p,
      1,
      { damping: 1.0, response: 0.3 },
      (v) => this.apply(v),
      () => {
        this.anim = null;
        this.panel.classList.remove('is-animating');
        this.focusFirst();
      }
    );
    haptic(6);
  }

  close(): void {
    if (this.p <= 0) return;
    this.anim?.stop();
    if (this.reduced.matches) {
      this.apply(0);
      this.trigger?.focus();
      return;
    }
    this.panel.classList.add('is-animating');
    this.anim = spring(
      this.p,
      0,
      { damping: 1.0, response: 0.3 },
      (v) => this.apply(v),
      () => {
        this.anim = null;
        this.panel.classList.remove('is-animating');
        this.apply(0);
        this.trigger?.focus();
      }
    );
    haptic(6);
  }

  private focusFirst(): void {
    this.panel.querySelector<HTMLElement>('.drawer-head .icon-btn')?.focus();
  }

  // ---------- drag-to-dismiss ----------

  private onDown = (e: PointerEvent): void => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // Grab at ANY open progress — including mid-close-flight (skill §3):
    // the drag adopts the live presentation value, so grabbing a closing
    // drawer follows the finger instead of finishing the close first.
    if (this.p <= 0 || this.drag) return;
    this.anim?.stop();
    this.anim = null;
    const captured = e.target as Element | null;
    try {
      captured?.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic pointers */
    }
    document.body.classList.add('swiping');
    this.panel.classList.add('is-animating');
    this.drag = {
      x0: e.clientX,
      y0: e.clientY,
      p0: this.p,
      w: this.panel.offsetWidth || 320,
      decided: false,
      pid: e.pointerId,
      captured,
      hist: [{ t: performance.now(), x: e.clientX }],
    };
  };

  private onMove = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.decided) {
      if (Math.abs(dx) > DECIDE && Math.abs(dx) > Math.abs(dy)) {
        d.decided = true;
      } else if (Math.abs(dy) > DECIDE) {
        this.endDrag();
        return;
      } else {
        return;
      }
    }
    // Right-side drawer: dragging right parks it, so progress FALLS as x rises.
    // Past the open edge (raw > 1) resist progressively instead of hard-stopping.
    const raw = d.p0 - dx / d.w;
    this.apply(raw > 1 ? 1 + rubberband(raw - 1) : raw);
    d.hist.push({ t: performance.now(), x: e.clientX });
    if (d.hist.length > 8) d.hist.shift();
  };

  private onUp = (): void => {
    const d = this.drag;
    if (!d) return;
    this.endDrag();
    if (!d.decided) return;

    const now = performance.now();
    const last = d.hist[d.hist.length - 1];
    let older = d.hist[0];
    for (let i = d.hist.length - 1; i >= 0; i--) {
      if (now - d.hist[i].t >= 60) {
        older = d.hist[i];
        break;
      }
    }
    const dt = (last.t - older.t) / 1000;
    const velocity = dt >= 0.008 ? (last.x - older.x) / dt : 0; // px/s

    // Progress falls as the drawer moves right, so project the flick in px
    // toward closed: closingPx = (1 - p) * w, then pick the nearest side.
    const closingPx = (1 - this.p) * d.w;
    const target = closingPx + project(velocity) > d.w / 2 ? 0 : 1;
    const velocityP = -velocity / d.w; // rightward flick -> p decreasing

    if (this.reduced.matches) {
      this.apply(target);
      if (target === 0) this.trigger?.focus();
      return;
    }
    this.panel.classList.add('is-animating');
    this.anim = spring(
      this.p,
      target,
      // Under-damped ONLY here: the release followed a flick, so the gesture
      // itself carried momentum (skill §4) — drawer/sheet values 0.8 / 0.3.
      // Programmatic open/close above stay critically damped.
      { damping: 0.8, response: 0.3, velocity: velocityP },
      (v) => this.apply(v),
      () => {
        this.anim = null;
        this.panel.classList.remove('is-animating');
        if (target === 0) {
          this.apply(0);
          this.trigger?.focus();
        }
      }
    );
  };

  private endDrag(): void {
    const d = this.drag;
    this.drag = null;
    document.body.classList.remove('swiping');
    // A tap or cancelled drag starts no spring, so drop will-change here;
    // the commit path re-adds it right before springing.
    this.panel.classList.remove('is-animating');
    if (!d) return;
    try {
      d.captured?.releasePointerCapture?.(d.pid);
    } catch {
      /* already released */
    }
  }
}
