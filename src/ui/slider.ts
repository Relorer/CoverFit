import { state } from '../state';
import { refs } from './dom';

const clamp = (v: number): number => Math.min(1, Math.max(0, v));

let goal: number | null = null;
let pos = 0.5;
let spring = 0.5;
let vel = 0;
let raf = 0;
let last = 0;
let drag: { v: number; t: number; last: number } | null = null;

/** Draws the jelly divider: the cut curve, the glowing line, the knob and the tag fades. */
export function renderCompare(): void {
  const el = refs!.slider;
  const w = el.clientWidth;
  const h = el.clientHeight;
  const x = pos * w;
  const b = Math.min(9, Math.max(-9, (pos - spring) * w * 0.5));
  const edge = x - b;
  if (el.classList.contains('view-both') && !refs!.afterCanvas.hidden) {
    refs!.afterCanvas.style.clipPath = `path("M ${edge} 0 Q ${x + b} ${h / 2} ${edge} ${h} L ${w} ${h} L ${w} 0 Z")`;
  } else {
    refs!.afterCanvas.style.removeProperty('clip-path');
  }
  refs!.linePath.setAttribute('d', `M ${edge} 0 Q ${x + b} ${h / 2} ${edge} ${h}`);
  refs!.grip.style.left = `${x}px`;
  refs!.tagAfter.style.opacity = String(clamp((0.86 - pos) * 4));
  refs!.tagBefore.style.opacity = String(clamp((pos - 0.14) * 4));
  el.setAttribute('aria-valuenow', String(Math.round(pos * 100)));
}

function frame(now: number): void {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (goal !== null) {
    pos += (goal - pos) * (1 - 4e-4 ** dt);
    if (Math.abs(goal - pos) < 5e-4) {
      pos = goal;
      goal = null;
    }
  }
  vel += ((pos - spring) * 620 - vel * 44) * dt;
  spring += vel * dt;
  renderCompare();
  if (goal === null && Math.abs(pos - spring) < 6e-4 && Math.abs(vel) < 0.002) {
    spring = pos;
    vel = 0;
    renderCompare();
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(frame);
}

function run(): void {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

/** Sets the divider instantly, e.g. when a result appears. */
export function setComparePos(to: number): void {
  goal = null;
  pos = clamp(to);
  spring = pos;
  vel = 0;
  renderCompare();
}

function glide(to: number): void {
  goal = clamp(to);
  run();
}

function frac(clientX: number): number {
  const rect = refs!.slider.getBoundingClientRect();
  return rect.width === 0 ? 0.5 : clamp((clientX - rect.left) / rect.width);
}

/** Wires pointer drag with a springy divider, flick-to-edge release and arrow keys. */
export function initSlider(): void {
  const el = refs!.slider;
  el.addEventListener('pointerdown', (e) => {
    if (refs!.afterCanvas.hidden || state.viewMode !== 'both') return;
    el.setPointerCapture(e.pointerId);
    el.dataset.held = '';
    drag = { v: 0, t: performance.now(), last: frac(e.clientX) };
    glide(drag.last);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = frac(e.clientX);
    const now = performance.now();
    drag = { v: (p - drag.last) / Math.max(1, now - drag.t), t: now, last: p };
    goal = null;
    pos = p;
    run();
  });
  const release = (e: PointerEvent): void => {
    if (!drag) return;
    const flick = Math.abs(drag.v) > 0.0025 ? (drag.v > 0 ? 1 : 0) : null;
    drag = null;
    delete el.dataset.held;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (flick !== null) glide(flick);
    else run();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (refs!.handle.hidden) return;
    e.preventDefault();
    glide((goal ?? pos) + (e.key === 'ArrowRight' ? 0.1 : -0.1));
  });
}
