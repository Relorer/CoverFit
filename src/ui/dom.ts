import { t } from '../i18n';

const CARET_SVG = `<svg class="dropdown-caret" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export const app = document.querySelector<HTMLDivElement>('#app')!;

export const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

interface Refs {
  viewerFrame: HTMLDivElement;
  dropzone: HTMLDivElement;
  fileInput: HTMLInputElement;
  viewer: HTMLDivElement;
  beforeCanvas: HTMLCanvasElement;
  afterCanvas: HTMLCanvasElement;
  slider: HTMLDivElement;
  handle: HTMLDivElement;
  viewTools: HTMLDivElement;
  viewSeg: HTMLDivElement;
  caption: HTMLDivElement;
  targetWInput: HTMLInputElement;
  targetHInput: HTMLInputElement;
  modelHint: HTMLDivElement;
  cropSection: HTMLDivElement;
  cropDegreeInput: HTMLInputElement;
  cropDegreeLabel: HTMLSpanElement;
  cropDegreeHint: HTMLSpanElement;
  cropPositionInput: HTMLInputElement;
  cropPositionTitle: HTMLHeadingElement;
  cropPositionReset: HTMLButtonElement;
  cropPositionLabel: HTMLSpanElement;
  cropPositionHint: HTMLSpanElement;
  marginsSection: HTMLDivElement;
  positionInput: HTMLInputElement;
  positionTitle: HTMLHeadingElement;
  positionLabel: HTMLSpanElement;
  ratioHint: HTMLDivElement;
  positionHint: HTMLSpanElement;
  positionReset: HTMLButtonElement;
  fillSwitch: HTMLDivElement;
  modelPicker: HTMLDivElement;
  colorPicker: HTMLDivElement;
  fillColorFirst: HTMLInputElement;
  fillColorSecond: HTMLInputElement;
  fillLinkBtn: HTMLButtonElement;
  generateBtn: HTMLButtonElement;
  downloadBtn: HTMLButtonElement;
  addBookBtn: HTMLButtonElement;
  statusEl: HTMLDivElement;
  statusMsgEl: HTMLSpanElement;
  comfyChip: HTMLDivElement;
  comfyChipText: HTMLSpanElement;
  settingsBtn: HTMLButtonElement;
  settingsBackdrop: HTMLDivElement;
  settingsPop: HTMLDivElement;
  settingsCloseBtn: HTMLButtonElement;
  settingsTitle: HTMLHeadingElement;
  langLabel: HTMLLabelElement;
  comfyUrlLabel: HTMLLabelElement;
  comfyUrlInput: HTMLInputElement;
  comfySaveBtn: HTMLButtonElement;
  comfyRescanBtn: HTMLButtonElement;
  comfyDownload: HTMLDivElement;
  comfyDownloadText: HTMLDivElement;
  comfyDownloadLink: HTMLAnchorElement;
  fluxGroup: HTMLDivElement;
  fluxStatusEl: HTMLDivElement;
  fluxDownloadBtn: HTMLButtonElement;
  fluxRecheckBtn: HTMLButtonElement;
  fluxProgress: HTMLDivElement;
  fluxBarFill: HTMLDivElement;
  fluxProgressText: HTMLDivElement;
  fluxManual: HTMLDivElement;
  fluxManualList: HTMLUListElement;
  fluxManualNote: HTMLDivElement;
  bookOnly: HTMLElement[];
}

export let refs: Refs | null = null;

export function template(): string {
  return `
  <header class="topbar">
    <div class="brand"><span class="brand-mark"></span><span class="brand-name">CoverFit</span></div>
    <div class="topbar-spacer"></div>
    <div class="comfy-chip" id="comfy-chip" data-state="searching">
      <span class="comfy-dot" aria-hidden="true"></span>
      <span class="comfy-text"></span>
    </div>
    <button class="icon-btn settings-btn" id="settings-btn" type="button" title="${t('settings_title')}" aria-label="${t('settings_title')}" aria-haspopup="dialog" aria-expanded="false">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
  </header>
  <div class="workspace">
    <section class="stage">
      <div class="dropzone" id="dropzone">
        <input type="file" id="file-input" accept=".epub,application/epub+zip,image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif" hidden />
        <div class="dropzone-inner">
          <div class="dropzone-title">${t('dropzone_title')}</div>
          <div class="dropzone-sub">${t('dropzone_sub')}</div>
        </div>
      </div>
      <div class="viewer" id="viewer" hidden>
        <div class="viewer-frame" id="viewer-frame">
          <div class="ba" id="ba">
            <canvas class="ba-img before" id="img-before" role="img" aria-label="${t('before')}"></canvas>
            <canvas class="ba-img after" id="img-after" role="img" aria-label="${t('after')}" hidden></canvas>
            <div class="ba-handle" id="ba-handle" hidden><span></span></div>
          </div>
          <button class="add-book" id="add-book-btn" type="button" title="${t('new_book')}" aria-label="${t('new_book')}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="viewer-caption">
          <div class="viewer-tools visually-hidden" id="view-tools">
            <div class="segmented" id="view-seg">
              <button class="seg-btn" type="button" data-view="before">${t('before')}</button>
              <button class="seg-btn" type="button" data-view="after">${t('after')}</button>
              <button class="seg-btn" type="button" data-view="both">${t('compare_both')}</button>
            </div>
          </div>
          <span class="cap-text" id="viewer-caption"></span>
        </div>
      </div>
    </section>
    <aside class="panel">
      <div class="panel-section">
        <h2 id="device-title" data-i18n="device_title">${t('device_title')}</h2>
        <div class="dropdown" id="device-dd">
          <button class="dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="device-title">
            <span class="dropdown-value"></span>
            ${CARET_SVG}
          </button>
          <ul class="dropdown-menu" role="listbox" aria-labelledby="device-title" hidden></ul>
        </div>
        <div class="res-row">
          <input type="number" class="field res-input" id="target-w" min="1" max="10000" step="1" />
          <span class="res-x">×</span>
          <input type="number" class="field res-input" id="target-h" min="1" max="10000" step="1" />
        </div>
        <div class="hint" id="ratio-hint"></div>
      </div>
      <div class="panel-section" id="crop-section" data-book-only hidden>
        <h2 data-i18n="crop_title">${t('crop_title')}</h2>
        <input type="range" class="range" id="crop-degree" min="0" max="100" value="0" />
        <div class="row-between"><span class="hint" id="crop-degree-label">${t('crop_degree_label')}</span><span class="hint" id="crop-degree-hint">—</span></div>
        <div class="section-head">
          <h3 id="crop-position-title" data-i18n="position_title_crop">${t('position_title_crop')}</h3>
          <button class="icon-btn" id="crop-position-reset" type="button" title="${t('reset_center')}" aria-label="${t('reset_center')}">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 3h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3.5 13h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <input type="range" class="range" id="crop-position" min="0" max="100" value="50" />
        <div class="row-between"><span class="hint" id="crop-position-label">—</span><span class="hint" id="crop-position-hint">—</span></div>
      </div>
      <div class="panel-section" id="margins-section" data-book-only hidden>
        <h2 data-i18n="margins_title">${t('margins_title')}</h2>
        <div class="section-head">
          <h3 id="position-title" data-i18n="position_title">${t('position_title')}</h3>
          <button class="icon-btn" id="position-reset" type="button" title="${t('reset_center')}" aria-label="${t('reset_center')}">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 3h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3.5 13h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <input type="range" class="range" id="position" min="0" max="100" value="50" />
        <div class="row-between"><span class="hint" id="position-label">—</span><span class="hint" id="position-hint">—</span></div>
        <div class="segmented" id="fill-switch">
          <button class="seg-btn" type="button" data-fill="model">${t('fill_model')}</button>
          <button class="seg-btn" type="button" data-fill="solid">${t('fill_color')}</button>
        </div>
        <div id="model-picker">
          <div class="dropdown" id="model-dd">
            <button class="dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false">
              <span class="dropdown-value"></span>
              ${CARET_SVG}
            </button>
            <ul class="dropdown-menu" role="listbox" hidden></ul>
          </div>
          <div class="hint" id="model-hint"></div>
        </div>
        <div id="color-picker">
          <input type="color" class="swatch" id="fill-color-first" value="#ffffff" />
          <button class="link-btn" id="fill-link" type="button" aria-pressed="true" title="${t('fill_linked')}" aria-label="${t('fill_linked')}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3.6" y="7" width="8.8" height="6.2" rx="1.6" stroke="currentColor" stroke-width="1.4"/>
              <path d="M5.6 7V5.3a2.4 2.4 0 0 1 4.8 0V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
          <input type="color" class="swatch" id="fill-color-second" value="#ffffff" />
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn primary" id="generate-btn" disabled>${t('generate_btn')}</button>
        <button class="btn" id="download-btn" disabled>${t('download_btn')}</button>
      </div>
      <div class="status" id="status">
        <span class="status-msg" id="status-msg"></span>
      </div>
    </aside>
  </div>
  <div class="modal-backdrop" id="settings-backdrop" hidden>
    <div class="modal settings-modal" id="settings-pop" role="dialog" aria-modal="true" aria-label="${t('settings_title')}" tabindex="-1" hidden>
      <div class="modal-head">
        <h2 id="settings-title">${t('settings_title')}</h2>
        <button class="icon-btn" id="settings-close" type="button" title="${t('close')}" aria-label="${t('close')}">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="settings-group">
          <span class="comfy-label" id="lang-label">${t('lang_switch_title')}</span>
          <div class="dropdown" id="lang-dd">
            <button class="dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="lang-label lang-value">
              <span class="dropdown-value" id="lang-value"></span>
              ${CARET_SVG}
            </button>
            <ul class="dropdown-menu" role="listbox" aria-labelledby="lang-label" hidden></ul>
          </div>
        </div>
        <div class="settings-group">
          <h3 class="settings-subtitle">ComfyUI</h3>
          <label class="comfy-label" for="comfy-url" id="comfy-url-label"></label>
          <input type="text" class="field" id="comfy-url" spellcheck="false" autocomplete="off" />
          <div class="comfy-actions">
            <button class="btn small primary" id="comfy-save" type="button"></button>
            <button class="btn small" id="comfy-rescan" type="button"></button>
          </div>
          <div class="comfy-download" id="comfy-download" hidden>
            <div class="hint" id="comfy-download-text"></div>
            <a class="comfy-download-link" id="comfy-download-link" href="https://www.comfy.org/download" target="_blank" rel="noopener noreferrer"></a>
          </div>
        </div>
        <div class="settings-group" id="flux-group" hidden>
          <h3 class="settings-subtitle" data-i18n="comfy_flux_title">${t('comfy_flux_title')}</h3>
          <div class="flux-status" id="flux-status" data-kind="warn"></div>
          <div class="flux-progress" id="flux-progress" hidden>
            <div class="flux-bar"><div class="flux-bar-fill" id="flux-bar-fill"></div></div>
            <div class="hint" id="flux-progress-text"></div>
          </div>
          <div class="comfy-actions" id="flux-actions">
            <button class="btn small primary" id="flux-download" type="button" hidden></button>
            <button class="btn small" id="flux-recheck" type="button"></button>
          </div>
          <div class="flux-manual" id="flux-manual" hidden>
            <div class="hint" id="flux-manual-title" data-i18n="comfy_flux_manual_title">${t('comfy_flux_manual_title')}</div>
            <ul class="flux-manual-list" id="flux-manual-list"></ul>
            <div class="hint" id="flux-manual-note" data-i18n="comfy_flux_manual_note" hidden>${t('comfy_flux_manual_note')}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export function initDom(): void {
  app.innerHTML = template();
  refs = {
    viewerFrame: el('viewer-frame'),
    dropzone: el('dropzone'),
    fileInput: el('file-input'),
    viewer: el('viewer'),
    beforeCanvas: el('img-before'),
    afterCanvas: el('img-after'),
    slider: el('ba'),
    handle: el('ba-handle'),
    viewTools: el('view-tools'),
    viewSeg: el('view-seg'),
    caption: el('viewer-caption'),
    targetWInput: el('target-w'),
    targetHInput: el('target-h'),
    modelHint: el('model-hint'),
    cropSection: el('crop-section'),
    cropDegreeInput: el('crop-degree'),
    cropDegreeLabel: el('crop-degree-label'),
    cropDegreeHint: el('crop-degree-hint'),
    cropPositionInput: el('crop-position'),
    cropPositionTitle: el('crop-position-title'),
    cropPositionReset: el('crop-position-reset'),
    cropPositionLabel: el('crop-position-label'),
    cropPositionHint: el('crop-position-hint'),
    marginsSection: el('margins-section'),
    positionInput: el('position'),
    positionTitle: el('position-title'),
    positionLabel: el('position-label'),
    ratioHint: el('ratio-hint'),
    positionHint: el('position-hint'),
    positionReset: el('position-reset'),
    fillSwitch: el('fill-switch'),
    modelPicker: el('model-picker'),
    colorPicker: el('color-picker'),
    fillColorFirst: el('fill-color-first'),
    fillColorSecond: el('fill-color-second'),
    fillLinkBtn: el('fill-link'),
    generateBtn: el('generate-btn'),
    downloadBtn: el('download-btn'),
    addBookBtn: el('add-book-btn'),
    statusEl: el('status'),
    statusMsgEl: el('status-msg'),
    comfyChip: el('comfy-chip'),
    comfyChipText: el('comfy-chip').querySelector<HTMLSpanElement>('.comfy-text')!,
    settingsBtn: el('settings-btn'),
    settingsBackdrop: el('settings-backdrop'),
    settingsPop: el('settings-pop'),
    settingsCloseBtn: el('settings-close'),
    settingsTitle: el('settings-title'),
    langLabel: el('lang-label'),
    comfyUrlLabel: el('comfy-url-label'),
    comfyUrlInput: el('comfy-url'),
    comfySaveBtn: el('comfy-save'),
    comfyRescanBtn: el('comfy-rescan'),
    comfyDownload: el('comfy-download'),
    comfyDownloadText: el('comfy-download-text'),
    comfyDownloadLink: el('comfy-download-link'),
    fluxGroup: el('flux-group'),
    fluxStatusEl: el('flux-status'),
    fluxDownloadBtn: el('flux-download'),
    fluxRecheckBtn: el('flux-recheck'),
    fluxProgress: el('flux-progress'),
    fluxBarFill: el('flux-bar-fill'),
    fluxProgressText: el('flux-progress-text'),
    fluxManual: el('flux-manual'),
    fluxManualList: el('flux-manual-list'),
    fluxManualNote: el('flux-manual-note'),
    bookOnly: Array.from(document.querySelectorAll<HTMLElement>('[data-book-only]')),
  };
}
