
import type { ComfyInstance } from './comfyui';

export interface FluxFiles {
  diffusion: string | null;
  textEncoder: string | null;
  vae: string | null;
  clip: string | null;
}

export interface FluxScan {
  ready: boolean;
  files: FluxFiles;
  missing: Array<'diffusion' | 'textEncoder' | 'vae' | 'clip'>;
  nodesOk: boolean;
  managerOk: boolean;
  error?: string;
}

const RE_DIFFUSION = /flux[-. ]*1?[-. ]*fill[-. ]*dev/i;
const RE_TEXT = /t5xxl/i;
const RE_VAE = /(^|[\\/])ae\.safetensors$/i;
const RE_CLIP = /clip[-_ ]?l/i;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} (${url})`);
  return (await r.json()) as T;
}

async function listModels(base: string, folder: string): Promise<string[]> {
  try {
    const data = await fetchJson<unknown>(`${base}/models/${folder}`);
    if (Array.isArray(data)) return data.map(String);
    if (data && typeof data === 'object') {
      const out: string[] = [];
      for (const v of Object.values(data as Record<string, unknown>)) {
        if (Array.isArray(v)) {
          for (const it of v) {
            if (typeof it === 'string') out.push(it);
            else if (it && typeof it === 'object' && 'name' in it)
              out.push(String((it as { name: unknown }).name));
          }
        } else if (typeof v === 'string') out.push(v);
      }
      return out;
    }
  } catch {
  }
  return [];
}

function pick(list: string[], re: RegExp): string | null {
  const hit = list.find((n) => re.test(n));
  return hit ? hit.split(/[\\/]/).pop()! : null;
}

function pickT5(list: string[]): string | null {
  const hits = list.filter((n) => RE_TEXT.test(n));
  if (hits.length === 0) return null;
  const preference = [/fp16/i, /fp8.*scaled/i, /fp8/i];
  for (const re of preference) {
    const hit = hits.find((n) => re.test(n));
    if (hit) return hit.split(/[\\/]/).pop()!;
  }
  return hits[0]!.split(/[\\/]/).pop()!;
}

const REQUIRED_NODES = [
  'UNETLoader',
  'DualCLIPLoader',
  'VAELoader',
  'LoadImage',
  'ImageToMask',
  'CLIPTextEncode',
  'FluxGuidance',
  'InpaintModelConditioning',
  'DifferentialDiffusion',
  'ConditioningZeroOut',
  'KSampler',
  'VAEDecode',
  'SaveImage',
];

async function probeNodes(base: string): Promise<boolean> {
  try {
    const info = await fetchJson<Record<string, unknown>>(`${base}/object_info`);
    return REQUIRED_NODES.every((n) => n in info);
  } catch {
    return false;
  }
}

async function probeManager(base: string): Promise<boolean> {
  try {
    const r = await fetch(`${base}/manager/queue/status`);
    return r.ok;
  } catch {
    return false;
  }
}

export async function scanFlux(inst: ComfyInstance): Promise<FluxScan> {
  const base = inst.url.replace(/\/$/, '');
  const [diff, txt, vae] = await Promise.all([
    listModels(base, 'diffusion_models'),
    listModels(base, 'text_encoders'),
    listModels(base, 'vae'),
  ]);
  const files: FluxFiles = {
    diffusion: pick(diff, RE_DIFFUSION),
    textEncoder: pickT5(txt),
    vae: pick(vae, RE_VAE),
    clip: pick(txt, RE_CLIP),
  };
  const missing: FluxScan['missing'] = [];
  if (!files.diffusion) missing.push('diffusion');
  if (!files.textEncoder) missing.push('textEncoder');
  if (!files.vae) missing.push('vae');
  if (!files.clip) missing.push('clip');
  const [nodesOk, managerOk] = await Promise.all([probeNodes(base), probeManager(base)]);
  return { ready: missing.length === 0 && nodesOk, files, missing, nodesOk, managerOk };
}

export interface HfFile {
  repo: string;
  path: string;
  folder: 'diffusion_models' | 'text_encoders' | 'vae' | 'default';
  sizeGb: number;
  label: 'diffusion' | 'textEncoder' | 'vae' | 'clip';
  manager?: { save_path: string; base: string; type: 'clip' | 'diffusion_model' | 'vae' };
}

export const FLUX_HF_FILES: HfFile[] = [
  {
    repo: 'black-forest-labs/FLUX.1',
    path: 'diffusion_models/flux1-fill-dev-fp8.safetensors',
    folder: 'diffusion_models',
    sizeGb: 11.9,
    label: 'diffusion',
  },
  {
    repo: 'comfyanonymous/flux_text_encoders',
    path: 't5xxl_fp16.safetensors',
    folder: 'text_encoders',
    sizeGb: 9.8,
    label: 'textEncoder',
    manager: { save_path: 'text_encoders/t5', base: 't5', type: 'clip' },
  },
  {
    repo: 'black-forest-labs/FLUX.1',
    path: 'vae/ae.safetensors',
    folder: 'vae',
    sizeGb: 0.34,
    label: 'vae',
  },
  {
    repo: 'Comfy-Org/stable-diffusion-3.5-fp8',
    path: 'text_encoders/clip_l.safetensors',
    folder: 'default',
    sizeGb: 0.25,
    label: 'clip',
    manager: { save_path: 'default', base: 'clip', type: 'clip' },
  },
];

export const hfUrl = (f: HfFile) =>
  `https://huggingface.co/${f.repo}/resolve/main/${f.path}`;
export function fluxAutoMissing(files: FluxFiles): HfFile[] {
  return FLUX_HF_FILES.filter((f) => {
    if (!f.manager) return false;
    if (f.label === 'diffusion') return !files.diffusion;
    if (f.label === 'textEncoder') return !files.textEncoder;
    if (f.label === 'vae') return !files.vae;
    return !files.clip;
  });
}

function managerEntry(f: HfFile): Record<string, unknown> {
  const filename = f.path.split('/').pop()!;
  return {
    ui_id: `coverfit-${f.label}`,
    name: filename,
    filename,
    url: hfUrl(f),
    save_path: f.manager!.save_path,
    base: f.manager!.base,
    type: f.manager!.type,
  };
}

interface QueueStatus {
  total_count?: number;
  done_count?: number;
  in_progress_count?: number;
  is_processing?: boolean;
}

async function managerQueue(base: string, entry: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${base}/manager/queue/install_model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`ComfyUI-Manager отклонил загрузку (${r.status}). ${t.slice(0, 200)}`);
  }
}

async function managerStart(base: string): Promise<void> {
  const r = await fetch(`${base}/manager/queue/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: Date.now() }),
  });
  if (!r.ok && r.status !== 400) throw new Error(`queue/start: ${r.status}`);
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

async function managerWait(base: string): Promise<void> {
  const t0 = Date.now();
  for (;;) {
    const st = await fetchJson<QueueStatus>(`${base}/manager/queue/status`);
    const idle =
      st.is_processing === false ||
      (st.is_processing === undefined && st.in_progress_count === 0 && st.total_count === 0);
    if (idle) return;
    if (Date.now() - t0 > 30 * 60 * 1000)
      throw new Error('Превышено время загрузки модели (30 мин).');
    await sleep(1500);
  }
}

async function verifyFile(base: string, f: HfFile): Promise<boolean> {
  const folder = f.folder === 'default' ? 'text_encoders' : f.folder;
  const filename = f.path.split('/').pop()!;
  const list = await listModels(base, folder);
  return list.some((n) => n.endsWith(filename));
}
export async function downloadFlux(
  inst: ComfyInstance,
  files: FluxFiles,
  hooks: {
    onLog: (s: string) => void;
    onProgress: (label: string, p: number, file: HfFile | null) => void;
  },
): Promise<void> {
  const base = inst.url.replace(/\/$/, '');
  const { onLog, onProgress } = hooks;

  const todo = fluxAutoMissing(files);
  if (todo.length === 0) {
    onLog('Все доступные через ComfyUI-Manager файлы уже на месте.');
    return;
  }

  for (const f of todo) {
    const fileName = f.path.split('/').pop()!;
    onLog(`Загрузка ${fileName} (~${f.sizeGb} ГБ)…`);
    onProgress(f.label, 0, f);
    await managerQueue(base, managerEntry(f));
    await managerStart(base);
    await managerWait(base);
    if (!await verifyFile(base, f)) {
      throw new Error(
        `ComfyUI-Manager завершился, но ${fileName} не найден в ComfyUI. ` +
        `Скачайте файл вручную (ссылка в списке ниже) и положите его в папку ${
          f.folder === 'default' ? 'text_encoders' : f.folder
        }/.`,
      );
    }
    onProgress(f.label, 1, f);
    onLog(`${fileName} — готово.`);
  }
  onLog('Готово. Остаточные файлы (если есть) скачиваются вручную — ссылки в списке ниже.');
}

type Json = Record<string, unknown>;

const GUIDANCE = 30;
const STEPS = 20;

export const OUTPAINT_PROMPT =
  'Extend the scene beyond the flat-colored border: a seamless continuation of the picture with matching colors, lighting, perspective and texture, as if the artwork naturally kept going. Real, detailed content; no frames, no borders, no text, no watermarks.';

export interface FluxRunOptions {
  files: FluxFiles;
  width: number;
  height: number;
  seed?: number;
}

function buildWorkflow(opts: FluxRunOptions & { prompt: string }, imageName: string, maskName: string): Json {
  const { files, prompt } = opts;
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  return {
    1: {
      class_type: 'UNETLoader',
      inputs: { unet_name: files.diffusion, weight_dtype: 'default' },
    },
    2: {
      class_type: 'DualCLIPLoader',
      inputs: {
        clip_name1: files.clip,
        clip_name2: files.textEncoder,
        type: 'flux',
        device: 'default',
      },
    },
    3: { class_type: 'VAELoader', inputs: { vae_name: files.vae } },
    4: { class_type: 'LoadImage', inputs: { image: imageName } },
    5: { class_type: 'LoadImage', inputs: { image: maskName } },
    6: {
      class_type: 'ImageToMask',
      inputs: { image: ['5', 0], channel: 'red' },
    },
    7: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['2', 0] } },
    8: { class_type: 'FluxGuidance', inputs: { guidance: GUIDANCE, conditioning: ['7', 0] } },
    9: { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['7', 0] } },
    10: {
      class_type: 'InpaintModelConditioning',
      inputs: {
        noise_mask: false,
        positive: ['8', 0],
        negative: ['9', 0],
        vae: ['3', 0],
        pixels: ['4', 0],
        mask: ['6', 0],
      },
    },
    11: { class_type: 'DifferentialDiffusion', inputs: { strength: 1, model: ['1', 0] } },
    12: {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: STEPS,
        cfg: 1,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['11', 0],
        positive: ['10', 0],
        negative: ['10', 1],
        latent_image: ['10', 2],
      },
    },
    13: { class_type: 'VAEDecode', inputs: { samples: ['12', 0], vae: ['3', 0] } },
    14: { class_type: 'SaveImage', inputs: { filename_prefix: 'coverfit', images: ['13', 0] } },
  } as Json;
}
export async function runFlux(
  inst: ComfyInstance,
  opts: FluxRunOptions & {
    prompt: string;
    blob: Blob;
    maskBlob: Blob;
    onProgress?: (p: number) => void;
  },
): Promise<{ url: string; revoke: () => void }> {
  const base = inst.url.replace(/\/$/, '');
  const { blob, maskBlob } = opts;

  const upload = async (data: Blob, name: string): Promise<string> => {
    const fd = new FormData();
    fd.append('image', data, name);
    fd.append('overwrite', 'true');
    const up = await fetch(`${base}/upload/image`, { method: 'POST', body: fd });
    if (!up.ok) throw new Error(`Загрузка изображения в ComfyUI: ${up.status}`);
    const upJson = (await up.json()) as { name?: string };
    return upJson.name ?? name;
  };

  const stamp = `${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
  const uploaded = await upload(blob, `coverfit_in_${stamp}.png`);
  const uploadedMask = await upload(maskBlob, `coverfit_mask_${stamp}.png`);

  const describeQueueError = (status: number, body: string): Error => {
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string };
        node_errors?: Record<string, { errors?: Array<Record<string, unknown>> }>;
      };
      const parts: string[] = [];
      for (const [nodeId, nodeErr] of Object.entries(parsed.node_errors ?? {})) {
        for (const err of nodeErr.errors ?? []) {
          const info = (err.extra_info ?? {}) as {
            input_name?: string;
            linked_node?: unknown;
            exception_message?: string;
            received_value?: unknown;
          };
          const where = info.input_name ? ` (${info.input_name}` +
            (info.linked_node ? ` ← ${JSON.stringify(info.linked_node)}` : '') + ')' : '';
          const detail = info.exception_message ?? String(err.details ?? err.message ?? '');
          parts.push(`узел ${nodeId}${where}: ${detail}`);
        }
      }
      if (parts.length === 0 && parsed.error?.message) parts.push(parsed.error.message);
      if (parts.length > 0) return new Error(`${status}: ${parts.join('; ')}`);
    } catch {
    }
    return new Error(`${status}: ${body.slice(0, 400)}`);
  };

  const queue = async (wf: Json): Promise<string> => {
    const r = await fetch(`${base}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: wf }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      throw describeQueueError(r.status, text);
    }
    const j = (await r.json()) as { prompt_id?: string };
    if (!j.prompt_id) throw new Error('ComfyUI не вернул prompt_id');
    return j.prompt_id;
  };

  const promptId = await queue(buildWorkflow(opts, uploaded, uploadedMask));

  const t0 = Date.now();
  for (;;) {
    const r = await fetch(`${base}/history/${promptId}`);
    if (r.ok) {
      const hist = (await r.json()) as Record<string, unknown>;
      const entry = hist[promptId] as
        | { status?: { status_str?: string; messages?: unknown[][] }; outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string; type: string }> }> }
        | undefined;
      if (entry) {
        if (entry.status?.status_str === 'error') {
          throw new Error('ComfyUI: ошибка выполнения workflow (см. консоль сервера).');
        }
        const outs = entry.outputs ?? {};
        for (const node of Object.values(outs)) {
          const img = node?.images?.[0];
          if (img) {
            const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder ?? '', type: img.type ?? 'output' });
            const gr = await fetch(`${base}/view?${q}`);
            if (gr.ok) {
              const blobOut = await gr.blob();
              const url = URL.createObjectURL(blobOut);
              opts.onProgress?.(1);
              return { url, revoke: () => URL.revokeObjectURL(url) };
            }
          }
        }
      }
    }
    if (Date.now() - t0 > 5 * 60 * 1000) throw new Error('Тайм-аут генерации (5 мин).');
    opts.onProgress?.(Math.min(0.97, (Date.now() - t0) / 60000));
    await sleep(700);
  }
}
