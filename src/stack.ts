// Fluid navigation stack per Apple's "Designing Fluid Interfaces":
// - push/pop are springs (damping 1.0, response 0.4) — interruptible at any moment
// - edge swipe tracks the pointer 1:1, respecting the grab offset
// - release velocity is projected (exponential deceleration) to choose the target,
//   then handed off to the spring so drag → animation has no seam
// - underlying home layer parallaxes at 25% and dims under a scrim
// - enter/exit share the same path (right edge ↔ right edge)
// - haptic tick fires on the commit frame (causality + harmony)

import { project, spring, type SpringHandle } from './spring';
import { el, haptic } from './ui';

export type PushedTool = {
  id: string;
  name: string;
  render: (root: HTMLElement) => void;
};

type Sample = { t: number; x: number };
type Drag = {
  x0: number;
  y0: number;
  p0: number;
  w: number;
  decided: boolean;
  pid: number;
  captured: Element | null;
  hist: Sample[];
};

const EDGE = 32; // edge zone where a swipe-back may start
const DECIDE = 10; // hysteresis before committing to horizontal intent
const HOME_PARALLAX = 0.25;

export class NavStack {
  private view: HTMLElement | null = null;
  private readonly scrim: HTMLElement;
  private readonly home: HTMLElement;
  private anim: SpringHandle | null = null;
  private drag: Drag | null = null;
  private p = 1; // 0 = tool covering, 1 = tool fully off-screen right
  private toolId: string | null = null;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(home: HTMLElement) {
    this.home = home;
    this.scrim = el('div', { class: 'stack-scrim', 'aria-hidden': 'true' });
    document.body.append(this.scrim);
    window.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('resize', this.onResize);
    this.apply(1);
  }

  get openId(): string | null {
    return this.toolId;
  }

  /** Write the presentation state for progress p (all layers derive from it). */
  private apply(p: number): void {
    this.p = p;
    const w = window.innerWidth;
    const pc = Math.min(1, Math.max(0, p));
    if (this.view) {
      // Clamp only the leftward overshoot of the top layer (cancel bounce);
      // rightward overshoot runs off-screen where it is invisible anyway.
      this.view.style.transform = `translate3d(${Math.max(0, p * w)}px, 0, 0)`;
      this.view.style.visibility = p >= 1 ? 'hidden' : '';
    }
    this.home.style.transform = `translate3d(${-(1 - pc) * w * HOME_PARALLAX}px, 0, 0)`;
    this.scrim.style.opacity = String((1 - pc) * 0.4);
    this.scrim.style.visibility = pc >= 1 ? 'hidden' : 'visible';
  }

  private animate(
    to: number,
    opts: { damping: number; response: number; velocity?: number },
    onDone: () => void
  ): void {
    this.anim?.stop();
    this.anim = spring(
      this.p,
      to,
      opts,
      (v) => this.apply(v),
      () => {
        this.anim = null;
        onDone();
      }
    );
  }

  push(tool: PushedTool, animated: boolean): void {
    this.finishNow();
    const view = el('div', {
      class: 'view',
      role: 'region',
      'aria-label': tool.name,
      'data-tool': tool.id,
    });
    const inner = el('div', { class: 'view-inner' });
    view.append(inner);
    document.body.append(view); // attach BEFORE render so document queries inside render() resolve
    tool.render(inner);
    this.view = view;
    this.toolId = tool.id;

    if (!animated || this.reduced.matches) {
      this.apply(0);
      return;
    }
    this.apply(1); // start from the right edge it will exit toward
    view.classList.add('is-animating');
    this.animate(0, { damping: 1.0, response: 0.4 }, () =>
      view.classList.remove('is-animating')
    );
  }

  pop(animated: boolean): void {
    if (!this.view) return;
    this.drag = null;
    const view = this.view;
    if (!animated || this.reduced.matches) {
      this.finishNow();
      return;
    }
    view.classList.add('is-animating');
    this.animate(1, { damping: 1.0, response: 0.4 }, () => this.finishPop());
  }

  /** Remove any open view immediately (route edge cases, push-over-push). */
  private finishNow(): void {
    if (!this.view && this.p === 1) return;
    this.anim?.stop();
    this.finishPop();
  }

  private finishPop(): void {
    this.anim = null;
    this.drag = null;
    const view = this.view;
    const poppedId = this.toolId;
    this.view = null;
    this.toolId = null;
    view?.remove();
    this.apply(1);
    // If a swipe (or interruption) closed the view while the hash still points
    // at it, sync the URL — route() no-ops because the view is already gone.
    if (poppedId && location.hash === `#/${poppedId}`) {
      history.replaceState(null, '', `${location.pathname}#/`);
      document.title = 'ToolKit — Everyday Utilities';
    }
    haptic(8); // the screen has committed home — snap feedback
  }

  // ---------- Edge swipe-back gesture ----------

  private onDown = (e: PointerEvent): void => {
    if (!this.view || this.drag) return;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.clientX > EDGE) return;

    // Grab mid-flight: stop the spring and adopt the live presentation value.
    this.anim?.stop();
    this.anim = null;
    const captured = e.target as Element | null;
    try {
      captured?.setPointerCapture?.(e.pointerId);
    } catch {
      /* synthetic pointers have no capture */
    }
    this.view.classList.add('is-animating');
    document.body.classList.add('swiping'); // no text-selection flash mid-gesture
    this.drag = {
      x0: e.clientX,
      y0: e.clientY,
      p0: this.p,
      w: window.innerWidth,
      decided: false,
      pid: e.pointerId,
      captured,
      hist: [{ t: performance.now(), x: e.clientX }],
    };
  };

  private onMove = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d || !this.view) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;

    if (!d.decided) {
      if (dx > DECIDE && Math.abs(dx) > Math.abs(dy)) {
        d.decided = true; // horizontal intent wins — track 1:1 from here
      } else if (Math.abs(dy) > DECIDE) {
        // Vertical scroll intent wins; cancel this recognizer gracefully.
        this.endDrag();
        return;
      } else {
        return;
      }
    }

    this.apply(Math.max(0, d.p0 + dx / d.w)); // 1:1 with the pointer, grab offset respected
    d.hist.push({ t: performance.now(), x: e.clientX });
    if (d.hist.length > 8) d.hist.shift();
  };

  private onUp = (): void => {
    const d = this.drag;
    if (!d) return;
    this.endDrag();
    if (!d.decided || !this.view) return;

    // Release velocity from the last ~60ms of movement.
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

    // Project momentum forward, pick the nearest snap point.
    const projectedP = (this.p * d.w + project(velocity)) / d.w;
    const commit = projectedP > 0.5;
    const velocityP = velocity / d.w; // hand off in progress-units/s
    const view = this.view;

    if (this.reduced.matches) {
      if (commit) this.finishPop();
      else this.apply(0);
      return;
    }

    view.classList.add('is-animating');
    this.animate(
      commit ? 1 : 0,
      // Bounce only because the gesture itself carried momentum.
      { damping: commit ? 0.8 : 1.0, response: 0.3, velocity: velocityP },
      () => {
        if (commit) this.finishPop();
        else view.classList.remove('is-animating');
      }
    );
  };

  private endDrag(): void {
    const d = this.drag;
    this.drag = null;
    document.body.classList.remove('swiping');
    if (!d) return;
    try {
      d.captured?.releasePointerCapture?.(d.pid);
    } catch {
      /* already released */
    }
  }

  private onResize = (): void => {
    this.apply(this.p);
  };
}
