import { t } from '../i18n';
import { refs } from '../ui/dom';
import { state } from '../state';
import { loadEpub, readCover, type EpubBook } from '../lib/epub';
import { errorText, loadImage } from '../lib/utils';
import { resetBook, recompute } from './preview';
import {
  setStatus,
} from '../ui/panels';

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT_RE.test(file.name);
}

function mediaTypeForImageFile(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().match(IMAGE_EXT_RE)?.[1];
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
}

async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function openFile(file: File): void {
  const image = isImageFile(file);
  setStatus(image ? t('reading_image') : t('reading_epub'));
  (async () => {
    try {
      let bitmap: ImageBitmap;
      let bytes: number;
      let book: EpubBook | null = null;
      let mediaType = '';
      if (image) {
        bitmap = await bitmapFromBlob(file);
        bytes = file.size;
        mediaType = mediaTypeForImageFile(file);
      } else {
        book = await loadEpub(file);
        const cover = await readCover(book);
        bitmap = await bitmapFromBlob(cover);
        bytes = cover.size;
      }

      resetBook();
      state.book = book;
      state.imageMediaType = mediaType;
      state.fileName = file.name;
      state.bitmap = bitmap;
      state.coverW = bitmap.width;
      state.coverH = bitmap.height;
      state.coverBytes = bytes;

      refs!.dropzone.hidden = true;
      refs!.viewer.hidden = false;
      for (const section of refs!.bookOnly) section.hidden = false;
      refs!.generateBtn.disabled = false;
      refs!.downloadBtn.disabled = true;
      refs!.downloadBtn.textContent = image ? t('download_image_btn') : t('download_epub_btn');

      recompute();
      setStatus('—');
    } catch (error) {
      setStatus(errorText(error), 'error');
    }
  })();
}
