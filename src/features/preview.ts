import { t } from '../i18n';
import { refs } from '../ui/dom';
import { state } from '../state';
import {
  computeLayout,
  getDevice,
  CUSTOM_DEVICE,
} from '../lib/ratio';
import {
  buildMask,
  drawScene,
  drawSourcePreview,
  presentCanvas,
} from '../lib/image';
import {
  applyViewMode,
  fitViewer,
  setStatus,
  updateCaption,
  updateSectionsUi,
} from '../ui/panels';
import { setComparePos } from '../ui/slider';

let renderFrame = 0;
let renderFull = false;

export function scheduleRender(full: boolean): void {
  if (full) renderFull = true;
  if (renderFrame) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = 0;
    const full = renderFull;
    renderFull = false;
    if (full) recompute();
    else refreshPreview();
  });
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export function resetBook(): void {
  state.bitmap?.close();
  state.book = null;
  state.fileName = '';
  state.imageMediaType = '';
  state.bitmap = null;
  state.coverW = 0;
  state.coverH = 0;
  state.coverBytes = 0;
  state.layout = null;
  state.scene = null;
  state.mask = null;
  state.knownRect = null;
  state.result = null;
  state.busy = false;

  refs!.fileInput.value = '';
  refs!.beforeCanvas.width = 0;
  refs!.beforeCanvas.height = 0;
  refs!.afterCanvas.width = 0;
  refs!.afterCanvas.height = 0;
  refs!.afterCanvas.hidden = true;
  refs!.handle.hidden = true;
  setComparePos(0.5);

  refs!.viewer.hidden = true;
  refs!.dropzone.hidden = false;
  for (const section of refs!.bookOnly) section.hidden = true;
  refs!.generateBtn.disabled = true;
  refs!.downloadBtn.disabled = true;
  refs!.downloadBtn.textContent = t('download_btn');
  refs!.caption.textContent = '';
  refs!.ratioHint.textContent = '';
  applyViewMode();
  setStatus('—');
}

export function recompute(): void {
  if (!state.bitmap) return;
  const device =
    state.device === CUSTOM_DEVICE
      ? { id: CUSTOM_DEVICE, name: 'custom_resolution', width: state.targetW, height: state.targetH }
      : getDevice(state.device);
  const layout = computeLayout(
    state.coverW,
    state.coverH,
    device,
    state.cropDegree,
    state.cropPosition,
    state.extendPosition,
  );
  const cropping = layout.cropped > 0;
  const extending = layout.added > 0;

  state.layout = layout;
  state.mask = extending ? buildMask(layout) : null;
  state.knownRect = extending
    ? { x: layout.left, y: layout.top, w: layout.drawW, h: layout.drawH }
    : { x: 0, y: 0, w: layout.width, h: layout.height };

  const scene = refreshPreview();

  if (scene) {
    presentCanvas(
      refs!.beforeCanvas,
      cropping || extending ? drawSourcePreview(state.bitmap, layout) : scene,
    );
  }
  refs!.slider.style.aspectRatio = `${layout.width} / ${layout.height}`;
  fitViewer();

  const along = layout.axis === 'width' ? t('along_height') : t('along_width');
  if (layout.axis === 'none') {
    refs!.ratioHint.textContent = t('ratio_same');
  } else if (extending) {
    refs!.ratioHint.textContent = t('target_combined', {
      w: device.width,
      h: device.height,
      along,
      crop: layout.cropped,
      added: layout.added,
    });
  } else {
    refs!.ratioHint.textContent = t('target_crop', {
      w: device.width,
      h: device.height,
      along,
      px: layout.cropped,
    });
  }

  if (layout.axis !== 'none') setComparePos(0.5);

  updateSectionsUi();
  updateCaption();
}

export function refreshPreview(): HTMLCanvasElement | null {
  const layout = state.layout;
  if (!state.bitmap || !layout) return null;

  const extending = layout.added > 0;
  const solidFill = state.fillMode === 'solid' && extending;
  const scene = solidFill
    ? drawScene(state.bitmap, layout, {
        first: state.fillColor,
        second: state.fillColorSecond,
      })
    : drawScene(state.bitmap, layout);
  state.scene = scene;

  if (layout.axis === 'none') {
    state.result = null;
    refs!.afterCanvas.hidden = true;
    refs!.handle.hidden = true;
    refs!.downloadBtn.disabled = true;
    applyViewMode();
    return scene;
  }

  presentCanvas(refs!.afterCanvas, scene);
  refs!.afterCanvas.hidden = false;
  refs!.handle.hidden = false;
  const deterministic = !extending || solidFill;
  state.result = deterministic ? scene : null;
  refs!.downloadBtn.disabled = !deterministic;
  applyViewMode();
  if (deterministic) setStatus('—');
  return scene;
}
