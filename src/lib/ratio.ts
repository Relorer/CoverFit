export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const DEVICES: DevicePreset[] = [
  { id: 'paperwhite', name: 'device_paperwhite', width: 1236, height: 1648 },
  { id: 'paperwhite-6', name: 'device_paperwhite_6', width: 1072, height: 1448 },
  { id: 'oasis', name: 'device_oasis', width: 1264, height: 1680 },
  { id: 'scribe', name: 'device_scribe', width: 1860, height: 2480 },
  { id: 'kobo-libra', name: 'device_kobo_libra', width: 1264, height: 1680 },
  { id: 'kobo-clara', name: 'device_kobo_clara', width: 1072, height: 1448 },
  { id: 'generic-3-4', name: 'device_generic_34', width: 1500, height: 2000 },
  { id: 'generic-2-3', name: 'device_generic_23', width: 1200, height: 1800 },
];

export type Axis = 'none' | 'width' | 'height';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  width: number;
  height: number;
  left: number;
  top: number;
  drawW: number;
  drawH: number;
  axis: Axis;
  added: number;
  cropped: number;
  srcRect: Rect;
}

export const DEFAULT_DEVICE = 'paperwhite';

export const CUSTOM_DEVICE = 'custom';

export function getDevice(id: string): DevicePreset {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0];
}
export function computeLayout(
  imgW: number,
  imgH: number,
  device: DevicePreset,
  cropDegree = 0,
  cropPosition = 0.5,
  extendPosition = 0.5,
): Layout {
  const targetRatio = device.width / device.height;
  const imgRatio = imgW / imgH;
  const full: Rect = { x: 0, y: 0, w: imgW, h: imgH };

  const same = (): Layout => ({
    width: imgW,
    height: imgH,
    left: 0,
    top: 0,
    drawW: imgW,
    drawH: imgH,
    axis: 'none',
    added: 0,
    cropped: 0,
    srcRect: full,
  });

  if (Math.abs(imgRatio - targetRatio) < 1e-4) return same();

  const degree = clamp(cropDegree, 0, 1);
  const cropPos = clamp(cropPosition, 0, 1);
  const extPos = clamp(extendPosition, 0, 1);

  if (imgRatio > targetRatio) {
    const targetW = Math.round(imgH * targetRatio);
    if (targetW >= imgW) return same();

    if (degree === 1) {
      return {
        width: targetW,
        height: imgH,
        left: 0,
        top: 0,
        drawW: targetW,
        drawH: imgH,
        axis: 'width',
        added: 0,
        cropped: imgW - targetW,
        srcRect: { x: Math.round((imgW - targetW) * cropPos), y: 0, w: targetW, h: imgH },
      };
    }

    const excessW = imgW - targetW;
    const croppedW = Math.round(excessW * degree);
    const keepW = imgW - croppedW;
    const newH = Math.round(keepW / targetRatio);
    const added = Math.max(0, newH - imgH);

    const top = Math.round(added * extPos);
    return {
      width: keepW,
      height: newH,
      left: 0,
      top,
      drawW: keepW,
      drawH: imgH,
      axis: 'width',
      added,
      cropped: croppedW,
      srcRect: { x: Math.round(croppedW * cropPos), y: 0, w: keepW, h: imgH },
    };
  }

  const targetH = Math.round(imgW / targetRatio);
  if (targetH >= imgH) return same();

  if (degree === 1) {
    return {
      width: imgW,
      height: targetH,
      left: 0,
      top: 0,
      drawW: imgW,
      drawH: targetH,
      axis: 'height',
      added: 0,
      cropped: imgH - targetH,
      srcRect: { x: 0, y: Math.round((imgH - targetH) * cropPos), w: imgW, h: targetH },
    };
  }

  const excessH = imgH - targetH;
  const croppedH = Math.round(excessH * degree);
  const keepH = imgH - croppedH;
  const newW = Math.round(keepH * targetRatio);
  const added = Math.max(0, newW - imgW);

  const left = Math.round(added * extPos);
  return {
    width: newW,
    height: keepH,
    left,
    top: 0,
    drawW: imgW,
    drawH: keepH,
    axis: 'height',
    added,
    cropped: croppedH,
    srcRect: { x: 0, y: Math.round(croppedH * cropPos), w: imgW, h: keepH },
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
