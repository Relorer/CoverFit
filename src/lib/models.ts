import * as ort from 'onnxruntime-web/webgpu';
import type { InferenceSession } from 'onnxruntime-web';

import { t } from '../i18n';
import { fetchCached } from './fetchcache';

export type ModelKind = 'migan' | 'lama' | 'comfy';

export interface ModelDef {
  id: string;
  name: string;
  note: string;
  kind: ModelKind;
  url?: string;
  bytes?: number;
  license: string;
}

export const MODELS: ModelDef[] = [
  {
    id: 'migan',
    name: 'MI-GAN',
    note: 'model_migan_note',
    kind: 'migan',
    url: 'https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx',
    bytes: 28_079_181,
    license: 'MIT',
  },
  {
    id: 'lama',
    name: 'LaMa',
    note: 'model_lama_note',
    kind: 'lama',
    url: 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx',
    bytes: 208_044_816,
    license: 'Apache-2.0',
  },
];

export const DEFAULT_MODEL = 'migan';

export const COMFY_MODEL_ID = 'flux-fill';

const COMFY_MODEL: ModelDef = {
  id: COMFY_MODEL_ID,
  name: 'FLUX.1 Fill (dev)',
  note: 'model_flux_note',
  kind: 'comfy',
  license: 'FLUX.1 License',
};

let comfyModelAvailable = false;

export function setComfyModelAvailable(available: boolean): void {
  comfyModelAvailable = available;
}

export function outpaintModels(): ModelDef[] {
  return comfyModelAvailable ? [...MODELS, COMFY_MODEL] : MODELS;
}

export function getModel(id: string): ModelDef {
  if (id === COMFY_MODEL_ID) return COMFY_MODEL;
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;

ort.env.wasm.wasmPaths =
  typeof document !== 'undefined' ? new URL('ort/', document.baseURI).href : 'ort/';
ort.env.wasm.numThreads = 1;
ort.env.logLevel = 'error';

export interface LoadedModel {
  backend: 'webgpu' | 'wasm';
  session: InferenceSession;
}

const cache = new Map<string, Promise<LoadedModel>>();

export function loadModel(
  model: ModelDef,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LoadedModel> {
  let entry = cache.get(model.id);
  if (!entry) {
    entry = createSession(model, onProgress).catch((error) => {
      cache.delete(model.id);
      throw new Error(describeModelError(error));
    });
    cache.set(model.id, entry);
  }
  return entry;
}

function describeModelError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/bad_alloc|out of memory|out of gpu memory|failed to allocate|array buffer allocation failed|allocation size/i.test(message)) {
    return t('error_no_memory');
  }
  if (/gpu adapter|requestAdapter|webgpu is not supported|failed to get gpu/i.test(message)) {
    return t('error_webgpu_access');
  }
  if (/initWasm|previous call to/i.test(message)) {
    return t('error_wasm_init');
  }
  if (/no available backend/i.test(message)) {
    return t('error_no_backend');
  }
  return message || t('error_model_init');
}

async function createSession(
  model: ModelDef,
  onProgress?: (loaded: number, total: number) => void,
): Promise<LoadedModel> {
  const data = await fetchCached(model.url!, onProgress, model.bytes);
  const providers: Array<'webgpu' | 'wasm'> = hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];

  let lastError: unknown;
  for (const backend of providers) {
    try {
      const session = await ort.InferenceSession.create(data, {
        executionProviders: [backend],
        graphOptimizationLevel: 'all',
      });
      return { session, backend };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(t('error_model_init'));
}
