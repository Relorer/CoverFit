import { t } from '../i18n';

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${t('bytes_unit')}`;
  const units = [t('kb_unit'), t('mb_unit'), t('gb_unit')];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t('decode_error')));
    img.src = src;
  });
}
