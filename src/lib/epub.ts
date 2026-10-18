import JSZip from 'jszip';
import { t } from '../i18n';

export interface CoverInfo {
  id: string;
  href: string;
  path: string;
  mediaType: string;
}

export interface EpubBook {
  zip: JSZip;
  opfPath: string;
  opfDir: string;
  opfText: string;
  cover: CoverInfo;
}

function resolveZipPath(baseDir: string, href: string): string {
  const parts = baseDir ? baseDir.split('/').filter(Boolean) : [];
  for (const segment of href.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.join('/');
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error(t('error_xml_parse'));
  }
  return doc;
}
export async function loadEpub(file: File): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(file);

  const container = zip.file('META-INF/container.xml');
  if (!container) throw new Error(t('error_not_epub'));
  const containerDoc = parseXml(await container.async('string'));
  const opfPath = containerDoc.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  if (!opfPath) throw new Error(t('error_no_opf_path'));

  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error(t('error_opf_not_found', { path: opfPath }));
  const opfText = await opfFile.async('string');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  const opfDoc = parseXml(opfText);
  const items = Array.from(opfDoc.getElementsByTagName('item'));

  const metaCoverId = Array.from(opfDoc.getElementsByTagName('meta'))
    .find((m) => m.getAttribute('name') === 'cover')
    ?.getAttribute('content');

  const byId = (id: string | null | undefined) =>
    id ? items.find((i) => i.getAttribute('id') === id) : undefined;

  const isImage = (el?: Element) => /^image\//.test(el?.getAttribute('media-type') ?? '');

  const coverItem =
    byId(metaCoverId) ??
    items.find((i) =>
      (i.getAttribute('properties') ?? '').split(/\s+/).includes('cover-image'),
    ) ??
    items.find((i) => /cover/i.test(i.getAttribute('id') ?? '') && isImage(i)) ??
    items.find((i) => /cover/i.test(i.getAttribute('href') ?? '') && isImage(i));

  if (!coverItem || !isImage(coverItem)) {
    throw new Error(t('error_no_cover'));
  }

  const href = coverItem.getAttribute('href') ?? '';
  const path = resolveZipPath(opfDir, decodeURIComponent(href));
  if (!zip.file(path)) throw new Error(t('error_cover_not_found', { path }));

  return {
    zip,
    opfPath,
    opfDir,
    opfText,
    cover: {
      id: coverItem.getAttribute('id') ?? '',
      href,
      path,
      mediaType: coverItem.getAttribute('media-type') ?? 'image/jpeg',
    },
  };
}

export async function readCover(book: EpubBook): Promise<Blob> {
  return book.zip.file(book.cover.path)!.async('blob');
}
export async function buildEpub(
  book: EpubBook,
  newCover: Blob,
  outputMediaType: 'image/png' | 'image/jpeg',
): Promise<Blob> {
  const zip = book.zip;
  const oldPath = book.cover.path;
  const oldExt = (oldPath.split('.').pop() ?? '').toLowerCase();
  const newExt = outputMediaType === 'image/png' ? 'png' : oldExt === 'jpeg' ? 'jpeg' : 'jpg';

  if (newExt === oldExt) {
    zip.file(oldPath, newCover);
  } else {
    const newHref = book.cover.href.replace(/\.[^/.]+$/, `.${newExt}`);
    const newPath = oldPath.replace(/\.[^/.]+$/, `.${newExt}`);
    zip.remove(oldPath);
    zip.file(newPath, newCover);
    zip.file(book.opfPath, updateOpfCover(book.opfText, book.cover.id, newHref, outputMediaType));
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/epub+zip',
  });
}

function updateOpfCover(
  opfText: string,
  itemId: string,
  newHref: string,
  newMediaType: string,
): string {
  if (!itemId) return opfText;
  const doc = parseXml(opfText);
  const item = Array.from(doc.getElementsByTagName('item')).find(
    (i) => i.getAttribute('id') === itemId,
  );
  if (item) {
    item.setAttribute('href', newHref);
    item.setAttribute('media-type', newMediaType);
  }
  return new XMLSerializer().serializeToString(doc);
}
