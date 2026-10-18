
export interface ComfyInstance {
  url: string;
  verified: boolean;
  info?: string;
}

const DEFAULT_PORT = 8188;

export const AUTO_PORTS = [8188, 8000, 8080, 8189];

const PROBE_TIMEOUT_MS = 1500;

const STORAGE_KEY = 'coverfit.comfyui';
const LAST_KEY = 'coverfit.comfyui.last';

type ProbeVerdict =
  | { verdict: 'verified'; info: string }
  | { verdict: 'reachable' }
  | { verdict: 'down' };

interface SystemStats {
  system?: { comfyui_version?: string };
  devices?: Array<{ name?: string }>;
}
export function loadComfyUrl(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? saved : null;
  } catch {
    return null;
  }
}

export function saveComfyUrl(url: string | null): void {
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}
export function loadLastUrl(): string | null {
  try {
    return localStorage.getItem(LAST_KEY) || null;
  } catch {
    return null;
  }
}

export function saveLastUrl(url: string | null): void {
  try {
    if (url) localStorage.setItem(LAST_KEY, url);
    else localStorage.removeItem(LAST_KEY);
  } catch {
  }
}
export function normalizeComfyUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `http://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!url.hostname) return null;

  if (!url.port && url.protocol === 'http:') url.port = String(DEFAULT_PORT);

  const host = url.hostname.replace(/^\[|\]$/g, '');
  const isIpv6 = host.includes(':');
  const isName =
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(host);
  if (!isIpv6 && !isName) return null;

  return url.href.replace(/\/$/, '');
}
export function autoHosts(): string[] {
  const hosts: string[] = ['localhost', '127.0.0.1'];
  const own = window.location.hostname;
  if (own && isLocalHost(own) && !hosts.includes(own)) hosts.unshift(own);
  return hosts;
}

function isLocalHost(host: string): boolean {
  return (
    /^(localhost|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|0\.0\.0\.0|::1|\[::1\])$/i.test(host) ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    /\.(local|localhost|home|lan|intranet)$/i.test(host)
  );
}

function candidateBases(): string[] {
  const bases: string[] = [];
  for (const host of autoHosts()) {
    for (const port of AUTO_PORTS) {
      const base = `http://${host}:${port}`;
      if (!bases.includes(base)) bases.push(base);
    }
  }
  return bases;
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function describeStats(stats: SystemStats | null): string {
  const version = stats?.system?.comfyui_version
    ? `ComfyUI ${stats.system.comfyui_version}`
    : '';
  const device = (stats?.devices?.[0]?.name ?? '')
    .replace(/^[a-z]+:\d+\s+/i, '')
    .replace(/\s*:\s*\S+$/, '');
  return [version, device].filter(Boolean).join(' · ');
}

async function probeBase(base: string): Promise<ProbeVerdict> {
  try {
    const res = await fetch(`${base}/system_stats`, {
      cache: 'no-store',
      signal: timeoutSignal(PROBE_TIMEOUT_MS),
    });
    if (res.ok) {
      const stats = (await res.json().catch(() => null)) as SystemStats | null;
      if (stats && typeof stats === 'object' && 'system' in stats) {
        return { verdict: 'verified', info: describeStats(stats) };
      }
      return { verdict: 'reachable' };
    }
  } catch {
  }

  try {
    await fetch(`${base}/`, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: timeoutSignal(PROBE_TIMEOUT_MS),
    });
    return { verdict: 'reachable' };
  } catch {
    return { verdict: 'down' };
  }
}
export async function discoverComfy(manualUrl: string | null): Promise<ComfyInstance | null> {
  const manual = manualUrl ? normalizeComfyUrl(manualUrl) : null;
  if (manual) {
    const probe = await probeBase(manual);
    return probe.verdict === 'down' ? null : toInstance(manual, probe);
  }

  const remembered = loadLastUrl();
  if (remembered) {
    const probe = await probeBase(remembered);
    if (probe.verdict !== 'down') return toInstance(remembered, probe);
  }

  const results = await Promise.all(
    candidateBases().map(async (base) => ({ base, probe: await probeBase(base) })),
  );
  const up = results.filter((r): r is { base: string; probe: UpProbe } => r.probe.verdict !== 'down');
  const hit = up.find((r) => r.probe.verdict === 'verified') ?? up[0];
  if (!hit) return null;

  const instance = toInstance(hit.base, hit.probe);
  saveLastUrl(instance.url);
  return instance;
}

type UpProbe = Extract<ProbeVerdict, { verdict: 'verified' | 'reachable' }>;

function toInstance(base: string, probe: UpProbe): ComfyInstance {
  return probe.verdict === 'verified'
    ? { url: base, verified: true, info: probe.info }
    : { url: base, verified: false };
}
