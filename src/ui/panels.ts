import { t } from '../i18n';
import { state } from '../state';
import { refs } from './dom';
import { savePrefs } from '../state';
import { presentCanvas } from '../lib/image';
import { getModel } from '../lib/models';

export type ViewMode = import('../state').ViewMode;

export function updateRangeFill(input: HTMLInputElement): void {
  input.style.setProperty('--val', `${input.value}%`);
}

export function setSlider(pos: number): void {
  const clamped = Math.min(1, Math.max(0, pos));
  refs!.slider.style.setProperty('--pos', `${clamped * 100}%`);
}

export function moveSlider(event: PointerEvent): void {
  const rect = refs!.slider.getBoundingClientRect();
  if (rect.width === 0) return;
  setSlider((event.clientX - rect.left) / rect.width);
}

export function fitViewer(): void {
  if (!state.layout) return;
  const frameW = refs!.viewerFrame.clientWidth;
  const frameH = refs!.viewerFrame.clientHeight;
  if (frameW === 0 || frameH === 0) return;
  const scale = Math.min(frameW / state.layout.width, frameH / state.layout.height);
  refs!.slider.style.width = `${Math.floor(state.layout.width * scale)}px`;
  refs!.slider.style.height = `${Math.floor(state.layout.height * scale)}px`;
}

export function updateCaption(): void {
  if (!state.layout || !state.bitmap) return;
  refs!.caption.textContent = `${state.bitmap.width}×${state.bitmap.height}  →  ${state.layout.width}×${state.layout.height}`;
}

export function updateModelHint(): void {
  const model = getModel(state.modelId);
  refs!.modelHint.textContent = `${t(model.note)} · ${t('license_label')} ${model.license}`;
}

export function updateSectionsUi(): void {
  const layout = state.layout;
  const axis = layout?.axis ?? 'none';
  const active = axis !== 'none';
  const cropping = active && layout!.cropped > 0;
  const extending = active && layout!.added > 0;

  refs!.cropDegreeInput.value = String(Math.round(state.cropDegree * 100));
  refs!.cropPositionInput.value = String(Math.round(state.cropPosition * 100));
  refs!.positionInput.value = String(Math.round(state.extendPosition * 100));
  updateRangeFill(refs!.cropDegreeInput);
  updateRangeFill(refs!.cropPositionInput);
  updateRangeFill(refs!.positionInput);

  refs!.cropSection.hidden = !active;
  refs!.cropDegreeInput.disabled = !active;
  refs!.cropDegreeHint.textContent = active ? `${layout!.cropped} px` : '—';
  refs!.cropPositionTitle.textContent = t('position_title_crop');
  refs!.cropPositionLabel.textContent =
    axis === 'width' ? t('crop_left_right') : t('crop_top_bottom');
  let cropFirst = 0;
  let cropSecond = 0;
  if (cropping) {
    const srcLong = axis === 'width' ? state.coverW : state.coverH;
    const keep = axis === 'width' ? layout!.srcRect.w : layout!.srcRect.h;
    cropFirst = axis === 'width' ? layout!.srcRect.x : layout!.srcRect.y;
    cropSecond = srcLong - keep - cropFirst;
  }
  refs!.cropPositionHint.textContent = cropping ? `${cropFirst} / ${cropSecond} px` : '—';
  refs!.cropPositionInput.disabled = !cropping;
  refs!.cropPositionReset.disabled = !cropping;

  refs!.marginsSection.hidden = !extending;
  refs!.positionTitle.textContent = t('position_title');
  refs!.positionLabel.textContent =
    axis === 'width' ? t('margins_top_bottom') : t('margins_left_right');
  let extFirst = 0;
  let extSecond = 0;
  if (extending) {
    extFirst = axis === 'width' ? layout!.top : layout!.left;
    extSecond =
      axis === 'width'
        ? layout!.height - layout!.drawH - layout!.top
        : layout!.width - layout!.drawW - layout!.left;
  }
  refs!.positionHint.textContent = extending ? `${extFirst} / ${extSecond} px` : '—';
  refs!.positionInput.disabled = !extending;
  refs!.positionReset.disabled = !extending;

  refs!.fillSwitch.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach((btn) => {
    const on = btn.dataset.fill === state.fillMode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  refs!.modelPicker.hidden = state.fillMode === 'solid';
  refs!.colorPicker.hidden = state.fillMode === 'model';
  updateColorUi();

  const solidFill = state.fillMode === 'solid' && extending;
  refs!.generateBtn.hidden = !extending || solidFill;
  refs!.generateBtn.disabled = !extending || solidFill || state.busy;
  refs!.generateBtn.textContent = t('generate_btn');
}

export function updateColorUi(): void {
  refs!.fillColorFirst.value = state.fillColor;
  refs!.fillColorSecond.value = state.fillColorSecond;
  refs!.fillLinkBtn.classList.toggle('active', state.fillColorsLinked);
  refs!.fillLinkBtn.setAttribute('aria-pressed', String(state.fillColorsLinked));
}

export function applyViewMode(): void {
  const hasResult = !refs!.afterCanvas.hidden;
  refs!.viewTools.classList.toggle('visually-hidden', !hasResult);
  const eff: ViewMode = state.viewMode === 'after' && !hasResult ? 'before' : state.viewMode;
  refs!.slider.className = `ba view-${eff}`;
}

export function updateViewUi(): void {
  refs!.viewSeg.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    const on = btn.dataset.view === state.viewMode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
  applyViewMode();
}

export function setViewMode(mode: ViewMode): void {
  state.viewMode = mode;
  savePrefs();
  updateViewUi();
}

export function showResult(canvas: HTMLCanvasElement, message = t('done_msg')): void {
  state.result = canvas;
  presentCanvas(refs!.afterCanvas, canvas);
  refs!.afterCanvas.hidden = false;
  refs!.handle.hidden = false;
  setSlider(0.5);
  applyViewMode();
  refs!.downloadBtn.disabled = false;
  setStatus(message);
  fitViewer();
}

export function setStatus(message: string, kind: 'info' | 'error' = 'info'): void {
  refs!.statusMsgEl.textContent = message;
  refs!.statusEl.dataset.kind = kind;
}
