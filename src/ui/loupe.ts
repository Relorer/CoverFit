import { refs } from './dom';

const VERT = `
attribute vec2 pos;
varying vec2 vUv;
void main() {
  vUv = vec2(pos.x * 0.5 + 0.5, 0.5 - pos.y * 0.5);
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D tex;
uniform vec2 res;
uniform vec2 c;
uniform vec2 b;
uniform float r;
varying vec2 vUv;

float sdf(vec2 p) {
  vec2 q = abs(p - c) - b + vec2(r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 read(vec2 p) {
  return texture2D(tex, clamp(p / res, 0.0, 1.0));
}

void main() {
  vec2 p = vUv * res;
  float d = sdf(p);
  vec4 col = read(p);

  float ds = sdf(p - vec2(0.0, 9.0));
  float sh = (1.0 - smoothstep(-8.0, 26.0, ds)) * 0.14;
  if (d > 0.0) {
    col = vec4(col.rgb * (1.0 - sh), col.a) + vec4(0.0, 0.0, 0.0, sh * (1.0 - col.a));
  }

  if (d < 1.0) {
    float e = 1.5;
    vec2 n = normalize(vec2(
      sdf(p + vec2(e, 0.0)) - sdf(p - vec2(e, 0.0)),
      sdf(p + vec2(0.0, e)) - sdf(p - vec2(0.0, e))
    ) + 1e-5);
    float bevel = min(b.y, max(22.0, b.y * 0.36));
    float t = clamp(-d / bevel, 0.0, 1.0);
    float edge = pow(1.0 - t, 2.4);

    vec2 mag = c + (p - c) / 1.25;
    vec2 off = n * edge * bevel * 0.66;
    vec2 q = mag + off;
    vec4 mid = read(q);
    vec4 g = vec4(read(q + off * 0.3).r, mid.g, read(q - off * 0.3).b, mid.a);

    vec2 L = normalize(vec2(-0.55, -0.85));
    float rim = smoothstep(0.0, 1.6, -d) * (1.0 - smoothstep(1.6, 4.5, -d));
    float lit = max(dot(n, L), 0.0);
    float far = max(dot(n, -L), 0.0);
    g.rgb *= 1.03;
    float light = rim * (0.18 + 0.75 * lit) + rim * far * 0.22 + edge * 0.05;
    g += vec4(vec3(light), light);
    g = clamp(g, 0.0, 1.0);

    float a = 1.0 - smoothstep(-0.6, 0.6, d);
    col = mix(col, g, a);
  }
  gl_FragColor = col;
}`;

const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface WebGLG {
  g: WebGLRenderingContext;
  prog: WebGLProgram;
  tex: WebGLTexture;
  ready: boolean;
  u(n: string): WebGLUniformLocation;
}
interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
}

let cv: HTMLCanvasElement | null = null;
let gl: WebGLG | null = null;
let texCanvas: HTMLCanvasElement | null = null;
let rafId = 0;
let W = 0;
let H = 0;
let px = 1;
let diam = 240;
let active = false;
let grab: { dx: number; dy: number } | null = null;
const ball: BallState = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

function compile(g: WebGLRenderingContext): WebGLProgram | null {
  const sh = (type: number, src: string): WebGLShader => {
    const s = g.createShader(type)!;
    g.shaderSource(s, src);
    g.compileShader(s);
    return s;
  };
  const prog = g.createProgram()!;
  g.attachShader(prog, sh(g.VERTEX_SHADER, VERT));
  g.attachShader(prog, sh(g.FRAGMENT_SHADER, FRAG));
  g.linkProgram(prog);
  if (!g.getProgramParameter(prog, g.LINK_STATUS)) return null;
  return prog;
}

const draw = (): void => {
  const G = gl;
  const c = cv;
  if (!G || !c || !G.ready || !W || !H) return;
  const { g, prog, u } = G;
  const s = ball;
  const sp = Math.hypot(s.vx, s.vy);
  const stretch = still ? 0 : Math.min(0.14, sp * 0.012);
  const ax = sp > 0.01 ? Math.abs(s.vx) / sp : 1;
  const rad = diam / 2;
  const bx = rad * (1 + stretch * ax - stretch * 0.5 * (1 - ax));
  const by = rad * (1 + stretch * (1 - ax) - stretch * 0.5 * ax);
  g.viewport(0, 0, c.width, c.height);
  g.useProgram(prog);
  g.uniform2f(u('res'), c.width, c.height);
  g.uniform2f(u('c'), s.x * px, s.y * px);
  g.uniform2f(u('b'), bx * px, by * px);
  g.uniform1f(u('r'), Math.min(bx, by) * px);
  g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
};

const pageCss = (): string => {
  let css = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) css += `${rule.cssText}\n`;
    } catch {}
  }
  return css;
};

const paint = async (): Promise<void> => {
  const G = gl;
  const c = cv;
  if (!G || !c || !W || !H) return;
  try {
    const pg = texCanvas ?? (texCanvas = document.createElement('canvas'));
    pg.width = Math.round(W * px);
    pg.height = Math.round(H * px);
    const ctx = pg.getContext('2d')!;
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script, link, style').forEach((n) => n.remove());
    clone.querySelector('#loupe')?.remove();
    const live = Array.from(document.querySelectorAll('input'));
    Array.from(clone.querySelectorAll('input')).forEach((n, i) => {
      if (live[i].value) n.setAttribute('value', live[i].value);
    });
    for (const id of ['img-before', 'img-after']) {
      const src = document.getElementById(id) as HTMLCanvasElement | null;
      const dst = clone.querySelector(`#${id}`) as HTMLCanvasElement | null;
      const r = src?.getBoundingClientRect();
      if (!src || !dst || !r?.width || src.hidden) continue;
      const tile = document.createElement('canvas');
      tile.width = Math.max(1, Math.round(r.width * px));
      tile.height = Math.max(1, Math.round(r.height * px));
      tile.getContext('2d')!.drawImage(src, 0, 0, tile.width, tile.height);
      const thumb = new Image();
      for (const a of Array.from(dst.attributes)) thumb.setAttribute(a.name, a.value);
      thumb.src = tile.toDataURL('image/png');
      dst.replaceWith(thumb);
    }
    const sheet = document.createElement('style');
    sheet.textContent = `*{backface-visibility:hidden}\n${pageCss()}`;
    clone.querySelector('head')!.prepend(sheet);
    clone.querySelector('body')!.style.cssText =
      `position:absolute;left:0;top:0;margin:0;padding:0;width:${W}px;height:${H}px;transform:scale(${px});transform-origin:0 0;`;
    const markup = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pg.width}" height="${pg.height}"><foreignObject x="0" y="0" width="${pg.width}" height="${pg.height}">${markup}</foreignObject></svg>`;
    const shot = new Image();
    await new Promise<void>((resolve, reject) => {
      shot.onload = () => resolve();
      shot.onerror = reject;
      shot.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    });
    ctx.drawImage(shot, 0, 0, pg.width, pg.height);
    const { g, tex } = G;
    g.bindTexture(g.TEXTURE_2D, tex);
    g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, pg);
    G.ready = true;
    draw();
  } catch (e) {
    console.warn(e);
    loupeHide();
  }
};

const run = (): void => {
  if (rafId) return;
  let prev = 0;
  const tick = (t: number): void => {
    const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
    prev = t;
    const s = ball;
    if (still) {
      s.x = s.tx; s.y = s.ty; s.vx = 0; s.vy = 0;
    } else {
      const k = 0.22;
      const d = Math.pow(0.66, dt);
      s.vx = (s.vx + (s.tx - s.x) * k * dt) * d;
      s.vy = (s.vy + (s.ty - s.y) * k * dt) * d;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    draw();
    const moving = Math.abs(s.tx - s.x) > 0.05 || Math.abs(s.ty - s.y) > 0.05 || Math.abs(s.vx) > 0.05 || Math.abs(s.vy) > 0.05 || grab !== null;
    rafId = moving ? requestAnimationFrame(tick) : 0;
  };
  rafId = requestAnimationFrame(tick);
};

const resize = (): void => {
  const c = cv;
  if (!c) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!vw || !vh) return;
  W = vw; H = vh;
  px = Math.min(2, window.devicePixelRatio || 1, (gl?.g.MAX_TEXTURE_SIZE ?? 2048) / Math.max(vw, vh));
  c.width = Math.round(W * px);
  c.height = Math.round(H * px);
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  diam = clamp(Math.min(W, H) * 0.42, 150, 360);
  if (!active) { ball.x = ball.tx; ball.y = ball.ty; }
};

const show = (x: number, y: number): void => {
  const c = cv;
  if (!gl || !c || active) return;
  active = true;
  refs!.loupe.hidden = false;
  document.body.style.pointerEvents = 'none';
  resize();
  ball.x = ball.tx = x;
  ball.y = ball.ty = y;
  void paint().then(() => {
    if (!active) return;
    c.hidden = false;
    run();
  });
};

export function loupeHide(): void {
  if (!active) return;
  active = false;
  document.body.style.pointerEvents = '';
  cancelAnimationFrame(rafId);
  rafId = 0;
  grab = null;
  if (gl) gl.ready = false;
  if (cv) cv.hidden = true;
  refs!.loupe.hidden = true;
};

export function loupeInit(): void {
  cv = refs!.loupeCanvas;
  if (!cv) return;
  const g = cv.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true });
  if (!g) return;
  const prog = compile(g);
  if (!prog) return;
  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
  const loc = g.getAttribLocation(prog, 'pos');
  g.enableVertexAttribArray(loc);
  g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
  const tex = g.createTexture()!;
  g.bindTexture(g.TEXTURE_2D, tex);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
  gl = { g, prog, tex, ready: false, u: (n: string): WebGLUniformLocation => g.getUniformLocation(prog, n)! };

  window.addEventListener('resize', () => {
    resize();
    if (active) void paint();
  });
  window.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
  window.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });

  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 1 || document.body.classList.contains('modal-open')) return;
    e.preventDefault();
    e.stopPropagation();
    show(e.clientX, e.clientY);
    grab = { dx: 0, dy: 0 };
  }, { capture: true });

  window.addEventListener('pointermove', (e) => {
    if (!active || !grab) return;
    ball.tx = e.clientX - grab.dx;
    ball.ty = e.clientY - grab.dy;
    run();
  });

  window.addEventListener('pointerup', loupeHide);
  window.addEventListener('pointercancel', loupeHide);
}
