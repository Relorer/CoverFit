import './style.css';
import { applyPrefsToState, state, savePrefs, type ViewMode } from './state';
import { getLang, setLang, t, type Lang } from './i18n';
import { initDom, app, refs } from './ui/dom';
import { loupeInit } from './ui/loupe';
import { initDropdowns, renderDropdowns, renderDeviceDropdown, renderModelDropdown, updateDropdownAria } from './ui/dropdown';
import {
  fitViewer,
  setStatus,
  setViewMode,
  updateModelHint,
  updateRangeFill,
  updateSectionsUi,
  updateViewUi,
  updateColorUi,
} from './ui/panels';
import { initSlider } from './ui/slider';
import { openFile } from './features/file';
import { recompute, scheduleRender } from './features/preview';
import { generate } from './features/generate';
import { download } from './features/download';
import { initComfyStatus, renderComfyStatus } from './features/comfy';
import {
  CUSTOM_DEVICE,
  getDevice,
} from './lib/ratio';

function onLangSelect(value: string): void {
  setLang(value as Lang);
  applyLanguage();
}

function onCustomTarget(input: HTMLInputElement): void {
  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value < 1) return;
  if (input === refs!.targetWInput) state.targetW = value;
  else state.targetH = value;
  state.device = CUSTOM_DEVICE;
  renderDeviceDropdown();
  savePrefs();
  scheduleRender(true);
}

function selectDevice(value: string): void {
  state.device = value;
  if (value !== CUSTOM_DEVICE) {
    const device = getDevice(value);
    state.targetW = device.width;
    state.targetH = device.height;
    refs!.targetWInput.value = String(device.width);
    refs!.targetHInput.value = String(device.height);
  }
  savePrefs();
  renderDeviceDropdown();
  scheduleRender(true);
}

function selectModel(value: string): void {
  state.modelId = value;
  savePrefs();
  updateModelHint();
  renderModelDropdown();
}

function onRange(input: HTMLInputElement): void {
  const value = Number(input.value) / 100;
  if (!Number.isFinite(value)) return;
  if (input === refs!.cropDegreeInput) state.cropDegree = value;
  else if (input === refs!.cropPositionInput) state.cropPosition = value;
  else state.extendPosition = value;
  updateRangeFill(input);
  savePrefs();
  scheduleRender(true);
}

function resetPosition(): void {
  state.extendPosition = 0.5;
  refs!.positionInput.value = '50';
  updateRangeFill(refs!.positionInput);
  savePrefs();
  scheduleRender(true);
}

function resetCropPosition(): void {
  state.cropPosition = 0.5;
  refs!.cropPositionInput.value = '50';
  updateRangeFill(refs!.cropPositionInput);
  savePrefs();
  scheduleRender(true);
}

function applyLanguage(): void {
  const lang = getLang();
  document.documentElement.lang = lang;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t('meta_description'));

  document.documentElement.style.setProperty('--drag-text', `'${t('drag_drop_hint')}'`);

  refs!.addBookBtn.title = t('new_book');
  refs!.addBookBtn.setAttribute('aria-label', t('new_book'));
  document.querySelector('.dropzone-title')!.textContent = t('dropzone_title');
  document.querySelector('.dropzone-sub')!.textContent = t('dropzone_sub');
  refs!.beforeCanvas.setAttribute('aria-label', t('before'));
  refs!.afterCanvas.setAttribute('aria-label', t('after'));
  refs!.loupeCanvas.setAttribute('aria-label', t('loupe_label'));
  refs!.slider.setAttribute('aria-label', `${t('before')} / ${t('after')}`);
  updateDropdownAria();
  refs!.positionReset.title = t('reset_center');
  refs!.positionReset.setAttribute('aria-label', t('reset_center'));
  refs!.cropPositionReset.title = t('reset_center');
  refs!.cropPositionReset.setAttribute('aria-label', t('reset_center'));
  refs!.cropDegreeLabel.textContent = t('crop_degree_label');
  refs!.downloadBtn.textContent =
    state.result
      ? state.book
        ? t('download_epub_btn')
        : t('download_image_btn')
      : t('download_btn');
  refs!.fillLinkBtn.title = t('fill_linked');
  refs!.fillLinkBtn.setAttribute('aria-label', t('fill_linked'));

  refs!.fillSwitch.querySelectorAll<HTMLButtonElement>('[data-fill="model"]')[0]!.textContent =
    t('fill_model');
  refs!.fillSwitch.querySelectorAll<HTMLButtonElement>('[data-fill="solid"]')[0]!.textContent =
    t('fill_color');

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n!);
  });
  refs!.generateBtn.textContent = t('generate_btn');

  const viewTexts: Record<string, string> = {
    before: t('before'),
    after: t('after'),
    both: t('compare_both'),
  };
  refs!.viewSeg.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((btn) => {
    btn.textContent = viewTexts[btn.dataset.view!];
  });

  updateModelHint();
  updateSectionsUi();
  renderComfyStatus();
  if (state.bitmap && state.layout) recompute();
  renderDropdowns();
}

function init(): void {
  initDom();
  applyPrefsToState();

  refs!.cropDegreeInput.value = String(Math.round(state.cropDegree * 100));
  refs!.cropPositionInput.value = String(Math.round(state.cropPosition * 100));
  refs!.positionInput.value = String(Math.round(state.extendPosition * 100));
  refs!.targetWInput.value = String(state.targetW);
  refs!.targetHInput.value = String(state.targetH);
  updateRangeFill(refs!.cropDegreeInput);
  updateRangeFill(refs!.cropPositionInput);
  updateRangeFill(refs!.positionInput);
  updateSectionsUi();

  updateModelHint();

  refs!.dropzone.addEventListener('click', () => refs!.fileInput.click());
  refs!.slider.addEventListener('click', () => {
    if (!refs!.handle.hidden) return;
    refs!.fileInput.click();
  });
  refs!.fileInput.addEventListener('change', () => {
    const file = refs!.fileInput.files?.[0];
    if (file) void openFile(file);
  });
  window.addEventListener('dragenter', (e) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      app.classList.add('dragging');
    }
  });
  window.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
  });
  window.addEventListener('dragleave', (e) => {
    const related = e.relatedTarget as Node | null;
    if (!related || !app.contains(related)) app.classList.remove('dragging');
  });
  window.addEventListener('drop', (e) => {
    app.classList.remove('dragging');
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    e.preventDefault();
    if (state.busy) {
      setStatus(t('wait_for_generation'));
      return;
    }
    void openFile(file);
  });

  refs!.targetWInput.addEventListener('input', () => onCustomTarget(refs!.targetWInput));
  refs!.targetHInput.addEventListener('input', () => onCustomTarget(refs!.targetHInput));
  refs!.cropDegreeInput.addEventListener('input', () => onRange(refs!.cropDegreeInput));
  refs!.cropPositionInput.addEventListener('input', () => onRange(refs!.cropPositionInput));
  refs!.positionInput.addEventListener('input', () => onRange(refs!.positionInput));
  refs!.cropPositionReset.addEventListener('click', resetCropPosition);
  refs!.positionReset.addEventListener('click', resetPosition);

  refs!.fillSwitch.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-fill]');
    if (!btn) return;
    const mode = btn.dataset.fill as 'model' | 'solid';
    if (mode === state.fillMode) return;
    state.fillMode = mode;
    savePrefs();
    updateSectionsUi();
    scheduleRender(true);
  });
  refs!.fillColorFirst.addEventListener('input', () => {
    state.fillColor = refs!.fillColorFirst.value;
    if (state.fillColorsLinked) state.fillColorSecond = state.fillColor;
    updateColorUi();
    savePrefs();
    scheduleRender(false);
  });
  refs!.fillColorSecond.addEventListener('input', () => {
    state.fillColorSecond = refs!.fillColorSecond.value;
    if (state.fillColorsLinked) state.fillColor = state.fillColorSecond;
    updateColorUi();
    savePrefs();
    scheduleRender(false);
  });
  refs!.fillLinkBtn.addEventListener('click', () => {
    state.fillColorsLinked = !state.fillColorsLinked;
    if (state.fillColorsLinked) state.fillColorSecond = state.fillColor;
    updateColorUi();
    savePrefs();
    scheduleRender(false);
  });
  refs!.viewSeg.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-view]');
    if (!btn) return;
    setViewMode(btn.dataset.view as ViewMode);
  });

  refs!.generateBtn.addEventListener('click', () => void generate());
  refs!.downloadBtn.addEventListener('click', () => void download());
  refs!.addBookBtn.addEventListener('click', () => {
    refs!.fileInput.value = '';
    refs!.fileInput.click();
  });

  initSlider();

  const resizeObserver = new ResizeObserver(() => fitViewer());
  resizeObserver.observe(refs!.viewerFrame);
  setStatus('—');
  initComfyStatus();

  loupeInit();
  initDropdowns(onLangSelect, selectDevice, selectModel);
  applyLanguage();
  updateViewUi();
}

init();
