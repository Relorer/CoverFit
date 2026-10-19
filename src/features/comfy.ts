import { t } from '../i18n';
import { refs } from '../ui/dom';
import { state, savePrefs } from '../state';
import {
  AUTO_PORTS,
  autoHosts,
  discoverComfy,
  loadComfyUrl,
  normalizeComfyUrl,
  saveComfyUrl,
} from '../lib/comfyui';
import {
  scanFlux,
  downloadFlux,
  FLUX_HF_FILES,
  hfUrl,
  type FluxScan,
} from '../lib/comfygen';
import {
  DEFAULT_MODEL,
  COMFY_MODEL_ID,
  setComfyModelAvailable,
} from '../lib/models';
import {
  renderModelDropdown,
  closeAllDropdowns,
  anyDropdownOpen,
} from '../ui/dropdown';
import {
  setStatus,
} from '../ui/panels';
import { loupeHide } from '../ui/loupe';

const COMFY_RESCAN_MS = 30_000;
const COMFY_MIN_RESCAN_MS = 10_000;

let comfyScanDone = false;
let comfyScanQueued = false;
let comfyScanning = false;
let comfyLastScanAt = 0;

let fluxScan: FluxScan | null = null;
let fluxScanning = false;
let fluxScannedUrl = '';
let fluxDownloading = false;
let settingsOpener: HTMLElement | null = null;

const fluxAutoMissing = (files: FluxScan['files']) =>
  FLUX_HF_FILES.filter((f) => {
    if (!f.manager) return false;
    if (f.label === 'diffusion') return !files.diffusion;
    if (f.label === 'textEncoder') return !files.textEncoder;
    if (f.label === 'vae') return !files.vae;
    return !files.clip;
  });

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function renderFluxSettings(): void {
  // Блок с моделями показываем только при подтверждённом подключении к ComfyUI.
  // Если подключиться не удалось (offline или unverified), блок не отображается.
  const verified = comfyState() === 'online';
  refs!.fluxGroup.hidden = !verified;
  // Кнопка скачивания моделей показывается только когда ComfyUI найден и подтверждён.
  refs!.fluxDownloadBtn.hidden = true;
  if (!verified) return;

  const scan = fluxScan;
  let statusKey = 'comfy_flux_checking';
  if (!fluxScanning && scan) {
    if (scan.error) statusKey = scan.error;
    else if (scan.ready) statusKey = 'comfy_flux_ready';
    else if (scan.missing.length === 0 && !scan.nodesOk) statusKey = 'comfy_flux_nodes';
    else if (!scan.managerOk) statusKey = 'comfy_flux_manager';
    else statusKey = 'comfy_flux_missing';
  }
  refs!.fluxStatusEl.textContent =
    statusKey === 'comfy_flux_checking' && fluxScanning
      ? t('comfy_flux_checking')
      : scan?.error && statusKey === scan.error
        ? `${t('comfy_flux_cors')} (${scan.error})`
        : t(statusKey);
  refs!.fluxStatusEl.dataset.kind = scan?.ready ? 'ok' : 'warn';

  const files = scan?.files ?? { diffusion: null, textEncoder: null, vae: null, clip: null };
  const missingFiles = FLUX_HF_FILES.filter((f) => {
    if (f.label === 'diffusion') return !files.diffusion;
    if (f.label === 'textEncoder') return !files.textEncoder;
    if (f.label === 'vae') return !files.vae;
    return !files.clip;
  });
  const size = fluxAutoMissing(files).reduce((sum, f) => sum + f.sizeGb, 0).toFixed(1);

  refs!.fluxDownloadBtn.hidden =
    fluxDownloading ||
    fluxAutoMissing(files).length === 0 ||
    !scan?.managerOk;
  refs!.fluxDownloadBtn.textContent = t('comfy_flux_dl', { size });
  refs!.fluxRecheckBtn.textContent = t('comfy_flux_recheck');
  refs!.fluxProgress.hidden = !fluxDownloading;
  if (!fluxDownloading) {
    refs!.fluxBarFill.style.width = '0%';
    refs!.fluxBarFill.classList.remove('indeterminate');
  }

  refs!.fluxManual.hidden = missingFiles.length === 0;
  refs!.fluxManualList.innerHTML = '';
  for (const f of missingFiles) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = hfUrl(f);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `${f.folder === 'default' ? 'text_encoders' : f.folder}/${f.path.split('/').pop()}`;
    li.append(a);
    refs!.fluxManualList.append(li);
  }
  refs!.fluxManualNote.hidden = !missingFiles.some((f) => !f.manager);
}

export function applyFluxAvailability(): void {
  setComfyModelAvailable(!!fluxScan?.ready);
  if (!fluxScan?.ready && state.modelId === COMFY_MODEL_ID) {
    state.modelId = DEFAULT_MODEL;
    savePrefs();
  }
}

export async function runFluxRescan(force = false): Promise<void> {
  if (!state.comfyInstance || !state.comfyInstance.verified) {
    fluxScan = null;
    fluxScannedUrl = '';
    applyFluxAvailability();
    renderFluxSettings();
    renderModelDropdown();
    return;
  }
  if (fluxScanning) return;
  if (!force && fluxScan && fluxScannedUrl === state.comfyInstance.url) return;
  fluxScanning = true;
  fluxScannedUrl = state.comfyInstance.url;
  renderFluxSettings();
  try {
    fluxScan = await scanFlux(state.comfyInstance);
  } catch {
    fluxScan = {
      ready: false,
      files: { diffusion: null, textEncoder: null, vae: null, clip: null },
      missing: ['diffusion', 'textEncoder', 'vae', 'clip'],
      nodesOk: false,
      managerOk: false,
      error: t('comfy_flux_missing'),
    };
  } finally {
    fluxScanning = false;
  }
  applyFluxAvailability();
  renderFluxSettings();
  renderModelDropdown();
}

export function ensureFlux(): FluxScan {
  return (
    fluxScan ??
    {
      ready: false,
      files: { diffusion: null, textEncoder: null, vae: null, clip: null },
      missing: ['diffusion', 'textEncoder', 'vae', 'clip'],
      nodesOk: false,
      managerOk: false,
      error: t('comfy_flux_missing'),
    }
  );
}

export async function ensureFluxReady(): Promise<FluxScan> {
  const scan = await scanFlux(state.comfyInstance!);
  fluxScan = scan;
  applyFluxAvailability();
  renderFluxSettings();
  return scan;
}

export function openSettings(opener: HTMLElement): void {
  if (!refs!.settingsBackdrop.hidden) return;
  settingsOpener = opener;
  refs!.settingsBackdrop.hidden = false;
  refs!.settingsPop.hidden = false;
  refs!.settingsBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('modal-open');
  loupeHide();
  syncComfyUrlField();
  void runFluxRescan(true);
  refs!.settingsPop.focus();
}

export function closeSettings(): void {
  if (refs!.settingsBackdrop.hidden) return;
  refs!.settingsBackdrop.hidden = true;
  refs!.settingsPop.hidden = false;
  refs!.settingsBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('modal-open');
  closeAllDropdowns();
  (settingsOpener ?? refs!.settingsBtn).focus();
  settingsOpener = null;
}

async function runComfyScan(): Promise<void> {
  if (comfyScanning) {
    comfyScanQueued = true;
    return;
  }
  comfyScanning = true;
  comfyLastScanAt = Date.now();
  renderComfyStatus();
  try {
    state.comfyInstance = await discoverComfy(loadComfyUrl());
  } catch {
    state.comfyInstance = null;
  } finally {
    comfyScanning = false;
    comfyScanDone = true;
    renderComfyStatus();
    syncComfyUrlField();
    void runFluxRescan();
    if (comfyScanQueued) {
      comfyScanQueued = false;
      void runComfyScan();
    }
  }
}

function comfyState(): 'searching' | 'online' | 'unverified' | 'offline' {
  if (comfyScanning || !comfyScanDone) return 'searching';
  if (!state.comfyInstance) return 'offline';
  return state.comfyInstance.verified ? 'online' : 'unverified';
}

function comfyAddr(): string {
  return state.comfyInstance ? state.comfyInstance.url.replace(/^https?:\/\//, '') : '';
}

function syncComfyUrlField(): void {
  if (refs!.comfyUrlInput.dataset.dirty === 'true') return;
  refs!.comfyUrlInput.value = state.comfyInstance ? comfyAddr() : (loadComfyUrl() ?? '');
}

export function renderComfyStatus(): void {
  const stateName = comfyState();
  refs!.comfyChip.dataset.state = stateName;
  const text =
    stateName === 'searching'
      ? t('comfy_searching')
      : stateName === 'offline'
        ? t('comfy_not_found')
        : t(stateName === 'online' ? 'comfy_online' : 'comfy_online_unverified', {
          addr: comfyAddr(),
        });
  refs!.comfyChipText.textContent = text;
  refs!.comfyChip.title = comfyTitle();
  updateComfyPopTexts();
}

function comfyTitle(): string {
  const parts: string[] = [];
  const stateName = comfyState();
  if (stateName === 'searching') {
    parts.push(t('comfy_searching'));
  } else if (stateName === 'offline') {
    parts.push(t('comfy_title_offline', { hosts: autoHosts().join(', '), ports: AUTO_PORTS.join(', ') }));
  } else {
    parts.push(
      stateName === 'online'
        ? t('comfy_title_online', { addr: comfyAddr(), info: state.comfyInstance?.info ?? '' })
        : t('comfy_title_unverified', { addr: comfyAddr() }),
    );
  }
  if (window.location.protocol === 'https:') parts.push(t('comfy_https_hint'));
  return parts.join(' ');
}

function updateComfyPopTexts(): void {
  refs!.settingsBtn.title = t('settings_title');
  refs!.settingsBtn.setAttribute('aria-label', t('settings_title'));
  refs!.settingsTitle.textContent = t('settings_title');
  refs!.settingsPop.setAttribute('aria-label', t('settings_title'));
  refs!.settingsCloseBtn.title = t('close');
  refs!.settingsCloseBtn.setAttribute('aria-label', t('close'));
  refs!.langLabel.textContent = t('lang_switch_title');
  refs!.comfyUrlLabel.textContent = t('comfy_url_label');
  refs!.comfyUrlInput.placeholder = t('comfy_url_placeholder');
  refs!.comfySaveBtn.textContent = t('comfy_save');
  refs!.comfyRescanBtn.textContent = t('comfy_search_again');

  const offline = comfyState() === 'offline';
  refs!.comfyDownload.hidden = !offline;
  if (offline) {
    refs!.comfyDownloadText.textContent =
      window.location.protocol === 'https:'
        ? `${t('comfy_download_text')} ${t('comfy_https_hint')}`
        : t('comfy_download_text');
    refs!.comfyDownloadLink.textContent = t('comfy_download_link');
  }
  renderFluxSettings();
}

async function startFluxDownload(): Promise<void> {
  if (!state.comfyInstance?.verified || fluxDownloading) return;
  fluxDownloading = true;
  renderFluxSettings();
  try {
    await downloadFlux(state.comfyInstance, ensureFlux().files, {
      onLog: (message) => {
        refs!.fluxProgressText.textContent = message;
      },
      onProgress: (label, p) => {
        const file = FLUX_HF_FILES.find((f) => f.label === label);
        const step = file ? file.path.split('/').pop()! : label;
        if (p >= 1) {
          refs!.fluxBarFill.classList.remove('indeterminate');
          refs!.fluxBarFill.style.width = '100%';
        } else {
          refs!.fluxBarFill.classList.add('indeterminate');
          refs!.fluxProgressText.textContent = t('comfy_flux_dl_step', { step });
        }
      },
    });
  } catch (error) {
    refs!.fluxProgressText.textContent = errorText(error);
    setStatus(errorText(error), 'error');
  } finally {
    fluxDownloading = false;
    await runFluxRescan(true);
  }
}

export function initComfyStatus(): void {
  syncComfyUrlField();

  refs!.settingsBtn.addEventListener('click', () => openSettings(refs!.settingsBtn));
  refs!.comfyChip.addEventListener('click', () => openSettings(refs!.settingsBtn));
  refs!.settingsCloseBtn.addEventListener('click', closeSettings);
  refs!.settingsBackdrop.addEventListener('pointerdown', (event) => {
    if (event.target === refs!.settingsBackdrop) closeSettings();
  });
  refs!.comfySaveBtn.addEventListener('click', () => {
    const normalized = normalizeComfyUrl(refs!.comfyUrlInput.value);
    saveComfyUrl(normalized);
    if (normalized) refs!.comfyUrlInput.value = normalized;
    closeSettings();
    void runComfyScan();
  });
  refs!.comfyRescanBtn.addEventListener('click', () => {
    refs!.comfyUrlInput.value = '';
    refs!.comfyUrlInput.dataset.dirty = '';
    saveComfyUrl(null);
    closeSettings();
    void runComfyScan();
  });
  refs!.fluxDownloadBtn.addEventListener('click', () => void startFluxDownload());
  refs!.fluxRecheckBtn.addEventListener('click', () => void runFluxRescan(true));
  refs!.comfyUrlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') refs!.comfySaveBtn.click();
  });
  refs!.comfyUrlInput.addEventListener('input', () => {
    refs!.comfyUrlInput.dataset.dirty = 'true';
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && anyDropdownOpen()) return;
    if (event.key === 'Escape') closeSettings();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || Date.now() - comfyLastScanAt < COMFY_MIN_RESCAN_MS) return;
    void runComfyScan();
  });
  window.setInterval(() => {
    if (!document.hidden) void runComfyScan();
  }, COMFY_RESCAN_MS);

  void runComfyScan();
}
