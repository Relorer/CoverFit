import type { Layout } from './ratio';
import { t } from '../i18n';

export const FIELD_COLOR = '#f1f1f3';

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error(t('error_no_2d_context'));
  return ctx;
}

export function imageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
  return ctx2d(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

export function canvasFromImageData(data: ImageData): HTMLCanvasElement {
  const canvas = createCanvas(data.width, data.height);
  ctx2d(canvas).putImageData(data, 0, 0);
  return canvas;
}
export function drawScene(
  source: ImageBitmap,
  layout: Layout,
  fill?: { first: string; second: string },
): HTMLCanvasElement {
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = ctx2d(canvas);
  if (fill) {
    ctx.fillStyle = fill.first;
    ctx.fillRect(0, 0, layout.width, layout.top);
    ctx.fillRect(0, layout.top, layout.left, layout.drawH);
    ctx.fillStyle = fill.second;
    ctx.fillRect(0, layout.top + layout.drawH, layout.width, layout.height - layout.top - layout.drawH);
    ctx.fillRect(layout.left + layout.drawW, layout.top, layout.width - layout.left - layout.drawW, layout.drawH);
  } else {
    ctx.fillStyle = FIELD_COLOR;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const { x, y, w, h } = layout.srcRect;
  ctx.drawImage(source, x, y, w, h, layout.left, layout.top, layout.drawW, layout.drawH);
  return canvas;
}
export function drawSourcePreview(source: ImageBitmap, layout: Layout): HTMLCanvasElement {
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = ctx2d(canvas);
  ctx.fillStyle = FIELD_COLOR;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const scale = Math.min(layout.width / source.width, layout.height / source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  ctx.drawImage(source, (layout.width - w) / 2, (layout.height - h) / 2, w, h);
  return canvas;
}
export function presentCanvas(target: HTMLCanvasElement, source: HTMLCanvasElement): void {
  if (target.width !== source.width || target.height !== source.height) {
    target.width = source.width;
    target.height = source.height;
  }
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error(t('error_no_2d_context'));
  ctx.drawImage(source, 0, 0);
}
export function buildMask(layout: Layout): HTMLCanvasElement {
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = ctx2d(canvas);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(layout.left, layout.top, layout.drawW, layout.drawH);
  return canvas;
}

export function resizeCanvas(
  source: HTMLCanvasElement,
  width: number,
  height: number,
  nearest = false,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  const ctx = ctx2d(canvas);
  ctx.imageSmoothingEnabled = !nearest;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}
export function compositeGenerated(
  scene: HTMLCanvasElement,
  generated: HTMLCanvasElement,
  knownRect: { x: number; y: number; w: number; h: number },
): HTMLCanvasElement {
  const out = createCanvas(scene.width, scene.height);
  const ctx = ctx2d(out);
  ctx.drawImage(scene, 0, 0);

  const { x, y, w, h } = knownRect;
  const rects: Array<[number, number, number, number]> = [
    [0, 0, scene.width, y],
    [0, y + h, scene.width, scene.height - (y + h)],
    [0, y, x, h],
    [x + w, y, scene.width - (x + w), h],
  ];
  ctx.save();
  ctx.beginPath();
  for (const [rx, ry, rw, rh] of rects) {
    if (rw > 0 && rh > 0) ctx.rect(rx, ry, rw, rh);
  }
  ctx.clip();
  ctx.drawImage(generated, 0, 0);
  ctx.restore();
  return out;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(t('error_to_blob_null')))),
      type,
      quality,
    );
  });
}
