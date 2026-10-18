import { t } from '../i18n';

const CACHE_NAME = 'coverfit-models';

async function readStream(
  body: ReadableStream<Uint8Array>,
  size: number,
  onProgress?: (loaded: number) => void,
): Promise<Uint8Array> {
  const reader = body.getReader();
  if (size > 0) {
    const result = new Uint8Array(size);
    let offset = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      result.set(value, offset);
      offset += value.length;
      onProgress?.(offset);
    }
    return offset === size ? result : result.subarray(0, offset);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    onProgress?.(total);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function getCached(url: string, expectedBytes?: number): Promise<Uint8Array | null> {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached?.body) {
      const stored = Number(cached.headers.get('content-length') || 0);
      const size = expectedBytes ?? stored;
      const data = await readStream(cached.body, size);
      if (expectedBytes == null || data.length === expectedBytes) {
        return data;
      }
      await cache.delete(url);
    }
  } catch {
  }
  return null;
}

async function putCached(url: string, data: Uint8Array): Promise<void> {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(data as BodyInit, { status: 200 }));
  } catch {
  }
}

export async function fetchCached(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
  expectedBytes?: number,
): Promise<Uint8Array> {
  const cached = await getCached(url, expectedBytes);
  if (cached) {
    onProgress?.(cached.length, cached.length);
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(t('error_model_download', { status: response.status }));
  }

  const total = Number(response.headers.get('content-length') || 0) || expectedBytes || 0;

  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    await putCached(url, buffer);
    onProgress?.(buffer.length, total || buffer.length);
    return buffer;
  }

  const result = await readStream(response.body, total, (loaded) =>
    onProgress?.(loaded, total),
  );
  onProgress?.(result.length, total || result.length);
  await putCached(url, result);
  return result;
}
