import { t } from '../i18n';
import { refs } from '../ui/dom';
import { state } from '../state';
import { showResult, setStatus } from '../ui/panels';
import { nextFrame } from './preview';
import { errorText, formatBytes, loadImage } from '../lib/utils';
import {
  createCanvas,
  ctx2d,
  canvasFromImageData,
  canvasToBlob,
  imageDataFromCanvas,
} from '../lib/image';
import { runInpaint } from '../lib/inpaint';
import { runFlux, OUTPAINT_PROMPT } from '../lib/comfygen';
import {
  featheredHoleAlpha,
  planTiling,
  planWindows,
  windowIsKnown,
  windowWeights,
} from '../lib/tiling';
import { getModel, loadModel } from '../lib/models';
import { ensureFluxReady, openSettings } from './comfy';

function blendWindow(
  acc: Float32Array,
  wsum: Float32Array,
  gen: HTMLCanvasElement,
  win: { x: number; y: number; w: number; h: number },
  canvasW: number,
  canvasH: number,
  overlap: number,
): void {
  const data = imageDataFromCanvas(gen).data;
  const weights = windowWeights(win, canvasW, canvasH, overlap);
  for (let j = 0; j < win.h; j++) {
    const row = (win.y + j) * canvasW + win.x;
    for (let i = 0; i < win.w; i++) {
      const w = weights[j * win.w + i];
      if (w <= 0) continue;
      const idx = row + i;
      const p = (j * win.w + i) * 4;
      acc[idx * 3] += data[p] * w;
      acc[idx * 3 + 1] += data[p + 1] * w;
      acc[idx * 3 + 2] += data[p + 2] * w;
      wsum[idx] += w;
    }
  }
}

async function generateViaComfy(): Promise<HTMLCanvasElement> {
  if (!state.comfyInstance) throw new Error(t('comfy_flux_not_connected'));

  setStatus(t('comfy_flux_checking'));
  const scan = await ensureFluxReady();
  if (!scan.ready) {
    openSettings(refs!.settingsBtn);
    throw new Error(t('comfy_flux_missing'));
  }

  const scene = state.scene!;
  const layout = state.layout!;
  const known = state.knownRect!;
  const canvasW = layout.width;
  const canvasH = layout.height;

  const plan = planTiling(canvasW, canvasH);
  if (!plan) throw new Error(t('comfy_flux_too_small'));

  const windows = planWindows(canvasW, canvasH, plan.win, plan.overlap, known).filter(
    (win) => !windowIsKnown(win, known),
  );

  setStatus(t('comfy_flux_generating'));
  await nextFrame();

  const hole = featheredHoleAlpha(state.mask!, Math.max(4, Math.round(plan.overlap / 3)));

  const acc = new Float32Array(canvasW * canvasH * 3);
  const wsum = new Float32Array(canvasW * canvasH);
  const seed = Math.floor(Math.random() * 2 ** 31);

  for (let i = 0; i < windows.length; i++) {
    const win = windows[i];
    const report = (pct: number) =>
      setStatus(t('comfy_flux_gen_window', { idx: i + 1, total: windows.length, pct }));
    report(0);
    await nextFrame();

    const crop = createCanvas(win.w, win.h);
    ctx2d(crop).drawImage(scene, win.x, win.y, win.w, win.h, 0, 0, win.w, win.h);
    const blob = await canvasToBlob(crop, 'image/png');

    const maskCanvas = createCanvas(win.w, win.h);
    const mctx = ctx2d(maskCanvas);
    const mimg = mctx.createImageData(win.w, win.h);
    for (let j = 0; j < win.h; j++) {
      const row = (win.y + j) * canvasW + win.x;
      for (let i2 = 0; i2 < win.w; i2++) {
        const a = Math.round(Math.min(1, Math.max(0, hole[row + i2])) * 255);
        const p = (j * win.w + i2) * 4;
        mimg.data[p] = a;
        mimg.data[p + 1] = a;
        mimg.data[p + 2] = a;
        mimg.data[p + 3] = 255;
      }
    }
    mctx.putImageData(mimg, 0, 0);
    const maskBlob = await canvasToBlob(maskCanvas, 'image/png');

    const { url, revoke } = await runFlux(state.comfyInstance, {
      files: scan.files,
      width: win.w,
      height: win.h,
      seed,
      prompt: OUTPAINT_PROMPT,
      blob,
      maskBlob,
      onProgress: (p) => report(Math.round(p * 100)),
    }).catch((error) => {
      const message = errorText(error);
      if (/failed to fetch|networkerror|load failed/i.test(message)) {
        throw new Error(`${t('comfy_flux_cors')} (${message})`);
      }
      throw error;
    });
    let generated: HTMLImageElement;
    try {
      generated = await loadImage(url);
    } finally {
      revoke();
    }

    const genCanvas = createCanvas(win.w, win.h);
    ctx2d(genCanvas).drawImage(generated, 0, 0, win.w, win.h);
    blendWindow(acc, wsum, genCanvas, win, canvasW, canvasH, plan.overlap);
  }

  setStatus(t('comfy_flux_blending'));
  await nextFrame();

  const sceneData = imageDataFromCanvas(scene).data;
  const rgba = new Uint8ClampedArray(canvasW * canvasH * 4);
  for (let i = 0, p = 0; i < canvasW * canvasH; i++, p += 4) {
    const w = wsum[i];
    const a = hole[i];
    let r = sceneData[p];
    let g = sceneData[p + 1];
    let b = sceneData[p + 2];
    if (w > 1e-6 && a > 0) {
      const gr = acc[i * 3] / w;
      const gg = acc[i * 3 + 1] / w;
      const gb = acc[i * 3 + 2] / w;
      r = r * (1 - a) + gr * a;
      g = g * (1 - a) + gg * a;
      b = b * (1 - a) + gb * a;
    }
    rgba[p] = r;
    rgba[p + 1] = g;
    rgba[p + 2] = b;
    rgba[p + 3] = 255;
  }
  return canvasFromImageData(new ImageData(rgba, canvasW, canvasH));
}

export function generate(): void {
  if (state.busy || !state.scene || !state.layout) return;

  if (state.layout.added === 0) {
    showResult(state.scene);
    return;
  }

  if (!state.mask || !state.knownRect) return;
  state.busy = true;
  refs!.generateBtn.disabled = true;
  refs!.downloadBtn.disabled = true;

  (async () => {
    try {
      const model = getModel(state.modelId);

      let result: HTMLCanvasElement;
      if (model.kind === 'comfy') {
        result = await generateViaComfy();
      } else {
        setStatus(t('loading_model', { name: model.name }));

        const loaded = await loadModel(model, (loadedBytes, total) => {
          if (total > 0) {
            const pct = Math.round((loadedBytes / total) * 100);
            setStatus(t('loading_model_pct', { name: model.name, pct }));
          } else {
            setStatus(t('loading_model_bytes', { name: model.name, bytes: formatBytes(loadedBytes) }));
          }
        });

        setStatus(t('generating'));
        await nextFrame();

        result = await runInpaint(model, loaded, state.scene!, state.mask!, state.knownRect!);
      }
      showResult(result, t('done_msg'));
    } catch (error) {
      setStatus(errorText(error), 'error');
    } finally {
      state.busy = false;
      refs!.generateBtn.disabled =
        !state.scene ||
        !state.layout ||
        state.layout.axis === 'none' ||
        state.layout.added === 0;
    }
  })();
}
