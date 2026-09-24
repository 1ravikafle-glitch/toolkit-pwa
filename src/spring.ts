// Spring physics using Apple's two designer-friendly parameters:
// - damping: damping ratio ζ (1.0 = critically damped, no overshoot; <1 = bounce)
// - response: characteristic time in seconds (not a fixed duration)
//
// Integrates semi-implicitly at ~240Hz inside rAF. Interruptible by design:
// retarget() keeps the current value and velocity, so a new animation starts
// from the live presentation value with no jump and no velocity "brick wall".

export interface SpringHandle {
  /** Re-aim the spring, carrying current velocity unless overridden. */
  retarget(to: number, velocity?: number): void;
  /** Cancel without completing. */
  stop(): void;
}

export interface SpringOptions {
  damping?: number;
  response?: number;
  /** Initial velocity in units/second (gesture velocity handoff). */
  velocity?: number;
}

/**
 * Apple's momentum projection (Designing Fluid Interfaces): where a flick is
 * GOING, not where it was released. Exponential-decay form, px units,
 * decelerationRate ≈ 0.998 for normal scroll feel.
 */
export function project(velocityPx: number, decelerationRate = 0.998): number {
  return (velocityPx / 1000) * (decelerationRate / (1 - decelerationRate));
}

export function spring(
  from: number,
  to: number,
  opts: SpringOptions,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): SpringHandle {
  const zeta = opts.damping ?? 1.0;
  const response = Math.max(0.05, opts.response ?? 0.4);
  const omega = (2 * Math.PI) / response;
  const stiffness = omega * omega;
  const damping = 2 * zeta * omega;

  let value = from;
  let velocity = opts.velocity ?? 0;
  let target = to;
  let raf = 0;
  let last = 0;
  let finished = false;

  const settle = (): void => {
    finished = true;
    cancelAnimationFrame(raf);
    value = target;
    velocity = 0;
    onUpdate(value);
    onComplete?.();
  };

  const frame = (time: number): void => {
    if (finished) return;
    const dt = last === 0 ? 1 / 60 : Math.min((time - last) / 1000, 1 / 30);
    last = time;
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const accel = -stiffness * (value - target) - damping * velocity;
      velocity += accel * h;
      value += velocity * h;
    }
    if (Math.abs(value - target) < 0.0004 && Math.abs(velocity) < 0.03) {
      settle();
      return;
    }
    onUpdate(value);
    raf = requestAnimationFrame(frame);
  };

  raf = requestAnimationFrame(frame);

  return {
    retarget(next, nextVelocity) {
      target = next;
      if (nextVelocity !== undefined) velocity = nextVelocity;
      if (finished) {
        finished = false;
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    },
    stop() {
      finished = true;
      cancelAnimationFrame(raf);
    },
  };
}
