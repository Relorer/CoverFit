
export interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TilingPlan {
  win: number;
  overlap: number;
  count: number;
}
export function planTiling(
  canvasW: number,
  canvasH: number,
  opts: { maxArea?: number; cap?: number } = {},
): TilingPlan | null {
  const maxArea = opts.maxArea ?? 4_200_000;
  const cap = opts.cap ?? 2048;

  const limit = Math.min(cap, canvasW, canvasH, Math.sqrt(maxArea));
  const win = Math.floor(limit / 32) * 32;
  if (win < 256) return null;

  const overlap = Math.min(Math.floor(win / 3), Math.max(64, Math.floor(win / 6 / 16) * 16));

  const stride = win - overlap;
  const nx = Math.max(1, Math.ceil((canvasW - win) / stride) + 1);
  const ny = Math.max(1, Math.ceil((canvasH - win) / stride) + 1);
  return { win, overlap, count: nx * ny };
}

function axisPositions(len: number, win: number, stride: number): number[] {
  const last = len - win;
  if (last <= 0) return [0];
  const n = Math.ceil(last / stride) + 1;
  const step = last / (n - 1);
  const pos: number[] = [];
  for (let i = 0; i < n - 1; i++) pos.push(Math.round(i * step));
  pos.push(last);
  return pos;
}
export function planWindows(
  canvasW: number,
  canvasH: number,
  win: number,
  overlap: number,
  known: { x: number; y: number; w: number; h: number },
): Win[] {
  const stride = Math.max(1, win - overlap);
  const xs = axisPositions(canvasW, win, stride);
  const ys = axisPositions(canvasH, win, stride);

  const kcx = known.x + known.w / 2;
  const kcy = known.y + known.h / 2;

  interface Ranked extends Win {
    d: number;
  }
  const ranked: Ranked[] = [];
  for (const y of ys) {
    for (const x of xs) {
      const dx = Math.max(0, Math.max(known.x - (x + win), x - (known.x + known.w)));
      const dy = Math.max(0, Math.max(known.y - (y + win), y - (known.y + known.h)));
      const d =
        Math.max(dx, dy) + 0.001 * (Math.abs(x + win / 2 - kcx) + Math.abs(y + win / 2 - kcy));
      ranked.push({ x, y, w: win, h: win, d });
    }
  }
  ranked.sort((a, b) => a.d - b.d);
  return ranked.map(({ x, y, w, h }) => ({ x, y, w, h }));
}
export function windowIsKnown(
  win: Win,
  known: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    win.x >= known.x &&
    win.y >= known.y &&
    win.x + win.w <= known.x + known.w &&
    win.y + win.h <= known.y + known.h
  );
}
export function windowWeights(
  win: Win,
  canvasW: number,
  canvasH: number,
  overlap: number,
): Float32Array {
  const { x, y, w, h } = win;
  const out = new Float32Array(w * h);
  const ramp = Math.max(1, overlap);
  for (let j = 0; j < h; j++) {
    const cy = y + j;
    const wy =
      cy - y < ramp && y > 0
        ? (cy - y + 1) / ramp
        : y + h - 1 - cy < ramp && y + h < canvasH
          ? (y + h - 1 - cy) / ramp
          : 1;
    const rowOff = j * w;
    for (let i = 0; i < w; i++) {
      const cx = x + i;
      const wx =
        cx - x < ramp && x > 0
          ? (cx - x + 1) / ramp
          : x + w - 1 - cx < ramp && x + w < canvasW
            ? (x + w - 1 - cx) / ramp
            : 1;
      out[rowOff + i] = Math.min(1, wx * wy);
    }
  }
  return out;
}
export function featheredHoleAlpha(
  mask: HTMLCanvasElement,
  radius: number,
): Float32Array {
  const width = mask.width;
  const height = mask.height;
  const pixels = width * height;

  const ctx = mask.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  const src = ctx.getImageData(0, 0, width, height).data;

  const cur = new Float32Array(pixels);
  for (let i = 0, p = 0; i < pixels; i++, p += 4) cur[i] = 1 - src[p] / 255;

  const r = Math.max(0, Math.round(radius));
  if (r > 0) {
    const tmp = new Float32Array(pixels);
    const w = 2 * r + 1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let i = -r; i <= r; i++) sum += cur[row + Math.min(width - 1, Math.max(0, i))];
      for (let x = 0; x < width; x++) {
        tmp[row + x] = sum / w;
        sum -= cur[row + Math.min(width - 1, Math.max(0, x - r))];
        sum += cur[row + Math.min(width - 1, Math.max(0, x + r + 1))];
      }
    }
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let j = -r; j <= r; j++) sum += tmp[Math.min(height - 1, Math.max(0, j)) * width + x];
      for (let y = 0; y < height; y++) {
        cur[y * width + x] = sum / w;
        sum -= tmp[Math.min(height - 1, Math.max(0, y - r)) * width + x];
        sum += tmp[Math.min(height - 1, Math.max(0, y + r + 1)) * width + x];
      }
    }
  }
  return cur;
}
