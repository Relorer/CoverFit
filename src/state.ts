import type { ComfyInstance } from './lib/comfyui';
import type { EpubBook } from './lib/epub';
import type { KnownRect } from './lib/inpaint';
import { DEFAULT_DEVICE, CUSTOM_DEVICE, DEVICES, getDevice } from './lib/ratio';
import { DEFAULT_MODEL, outpaintModels, COMFY_MODEL_ID } from './lib/models';
import type { Layout } from './lib/ratio';

export type ViewMode = 'before' | 'after' | 'both';

export interface State {
  book: EpubBook | null;
  fileName: string;
  imageMediaType: string;
  bitmap: ImageBitmap | null;
  coverW: number;
  coverH: number;
  coverBytes: number;
  device: string;
  targetW: number;
  targetH: number;
  modelId: string;
  cropDegree: number;
  cropPosition: number;
  extendPosition: number;
  fillMode: 'model' | 'solid';
  fillColor: string;
  fillColorSecond: string;
  fillColorsLinked: boolean;
  viewMode: ViewMode;
  layout: Layout | null;
  scene: HTMLCanvasElement | null;
  mask: HTMLCanvasElement | null;
  knownRect: KnownRect | null;
  result: HTMLCanvasElement | null;
  busy: boolean;
  comfyInstance: ComfyInstance | null;
}

export const state: State = {
  book: null,
  fileName: '',
  imageMediaType: '',
  bitmap: null,
  coverW: 0,
  coverH: 0,
  coverBytes: 0,
  device: DEFAULT_DEVICE,
  targetW: getDevice(DEFAULT_DEVICE).width,
  targetH: getDevice(DEFAULT_DEVICE).height,
  modelId: DEFAULT_MODEL,
  cropDegree: 0,
  cropPosition: 0.5,
  extendPosition: 0.5,
  fillMode: 'model',
  fillColor: '#ffffff',
  fillColorSecond: '#ffffff',
  fillColorsLinked: true,
  viewMode: 'after',
  layout: null,
  scene: null,
  mask: null,
  knownRect: null,
  result: null,
  busy: false,
  comfyInstance: null,
};

interface Prefs {
  device?: string;
  targetW?: number;
  targetH?: number;
  model?: string;
  cropDegree?: number;
  cropPosition?: number;
  extendPosition?: number;
  fillMode?: 'model' | 'solid';
  fillColor?: string;
  fillColorSecond?: string;
  fillColorsLinked?: boolean;
  viewMode?: ViewMode;
  mode?: 'crop' | 'outpaint';
  position?: number;
}

const PREFS_KEY = 'coverfit.prefs';

export function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Prefs;
  } catch {
    return {};
  }
}

export function savePrefs(): void {
  try {
    const prefs: Prefs = {
      device: state.device,
      targetW: state.targetW,
      targetH: state.targetH,
      model: state.modelId,
      cropDegree: state.cropDegree,
      cropPosition: state.cropPosition,
      extendPosition: state.extendPosition,
      fillMode: state.fillMode,
      fillColor: state.fillColor,
      fillColorSecond: state.fillColorSecond,
      fillColorsLinked: state.fillColorsLinked,
      viewMode: state.viewMode,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
  }
}

export function applyPrefsToState(): void {
  const prefs = loadPrefs();
  if (prefs.device === CUSTOM_DEVICE || DEVICES.some((d) => d.id === prefs.device)) {
    state.device = prefs.device as string;
  }
  if (typeof prefs.targetW === 'number' && prefs.targetW > 0) state.targetW = prefs.targetW;
  if (typeof prefs.targetH === 'number' && prefs.targetH > 0) state.targetH = prefs.targetH;
  if (
    prefs.model &&
    (outpaintModels().some((m) => m.id === prefs.model) || prefs.model === COMFY_MODEL_ID)
  ) {
    state.modelId = prefs.model;
  }
  if (typeof prefs.cropDegree === 'number' && prefs.cropDegree >= 0 && prefs.cropDegree <= 1) {
    state.cropDegree = prefs.cropDegree;
  } else if (prefs.mode === 'crop') {
    state.cropDegree = 1;
  } else if (prefs.mode === 'outpaint') {
    state.cropDegree = 0;
  }
  if (typeof prefs.cropPosition === 'number' && prefs.cropPosition >= 0 && prefs.cropPosition <= 1) {
    state.cropPosition = prefs.cropPosition;
  }
  if (typeof prefs.extendPosition === 'number' && prefs.extendPosition >= 0 && prefs.extendPosition <= 1) {
    state.extendPosition = prefs.extendPosition;
  } else if (typeof prefs.position === 'number' && prefs.position >= 0 && prefs.position <= 1) {
    state.extendPosition = prefs.position;
    if (typeof prefs.cropPosition !== 'number') state.cropPosition = prefs.position;
  }
  if (prefs.viewMode === 'before' || prefs.viewMode === 'after' || prefs.viewMode === 'both')
    state.viewMode = prefs.viewMode;
  if (prefs.fillMode === 'model' || prefs.fillMode === 'solid') state.fillMode = prefs.fillMode;
  if (typeof prefs.fillColor === 'string' && /^#[0-9a-f]{6}$/i.test(prefs.fillColor)) state.fillColor = prefs.fillColor;
  if (typeof prefs.fillColorSecond === 'string' && /^#[0-9a-f]{6}$/i.test(prefs.fillColorSecond))
    state.fillColorSecond = prefs.fillColorSecond;
  if (typeof prefs.fillColorsLinked === 'boolean') state.fillColorsLinked = prefs.fillColorsLinked;
}
