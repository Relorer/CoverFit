import { t } from '../i18n';
import { state } from '../state';
import { buildEpub } from '../lib/epub';
import { canvasToBlob } from '../lib/image';
import { errorText } from '../lib/utils';
import {
  setStatus,
} from '../ui/panels';

function downloadBlob(blob: Blob, filename: string, message: string): void {
  setStatus(message);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(t('file_downloaded'));
}

export function download(): void {
  if (!state.result || !state.layout) return;

  if (!state.book) {
    const outputMediaType = [
      'image/png',
      'image/jpeg',
      'image/webp',
    ].includes(state.imageMediaType)
      ? state.imageMediaType
      : 'image/jpeg';
    const ext =
      outputMediaType === 'image/png'
        ? 'png'
        : outputMediaType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const baseName = state.fileName.replace(/\.[a-z0-9]+$/i, '') || 'image';

    canvasToBlob(state.result, outputMediaType, 0.95).then(
      (blob) => downloadBlob(blob, `${baseName} · coverfit.${ext}`, t('assembling_image')),
      (error) => setStatus(errorText(error), 'error'),
    );
    return;
  }

  const outputMediaType = state.book.cover.mediaType === 'image/png' ? 'image/png' : 'image/jpeg';
  const baseName = state.fileName.replace(/\.epub$/i, '') || 'book';

  canvasToBlob(state.result, outputMediaType, 0.95)
    .then((coverBlob) => buildEpub(state.book!, coverBlob, outputMediaType))
    .then((epubBlob) => {
      downloadBlob(epubBlob, `${baseName} · coverfit.epub`, t('assembling_epub'));
    })
    .catch((error) => setStatus(errorText(error), 'error'));
}
