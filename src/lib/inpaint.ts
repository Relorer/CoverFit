import * as ort from 'onnxruntime-web/webgpu';
import type { LoadedModel, ModelDef } from './models';
import {
  canvasFromImageData,
  compositeGenerated,
  createCanvas,
  ctx2d,
  FIELD_COLOR,
  imageDataFromCanvas,
  resizeCanvas,
} from './image';

export interface KnownRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LAMA_RES = 512;

export async function runInpaint(
  model: ModelDef,
  loaded: LoadedModel,
  scene: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  knownRect: KnownRect,
): Promise<HTMLCanvasElement> {
  if (model.kind === 'migan') {
    return runMigan(loaded.session, scene, mask);
  }
  return runLama(loaded.session, scene, mask, knownRect);
}

async function runMigan(
  session: ort.InferenceSession,
  scene: HTMLCanvasElement,
  mask: HTMLCanvasElement,
): Promise<HTMLCanvasElement> {
  const width = scene.width;
  const height = scene.height;
  const pixels = width * height;

  const sceneData = imageDataFromCanvas(scene).data;
  const maskData = imageDataFromCanvas(mask).data;

  const image = new Uint8Array(3 * pixels);
  const maskPlane = new Uint8Array(pixels);
  for (let i = 0, p = 0; i < pixels; i++, p += 4) {
    image[i] = sceneData[p];
    image[pixels + i] = sceneData[p + 1];
    image[2 * pixels + i] = sceneData[p + 2];
    maskPlane[i] = maskData[p];
  }

  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = new ort.Tensor('uint8', image, [1, 3, height, width]);
  feeds[session.inputNames[1]] = new ort.Tensor('uint8', maskPlane, [1, 1, height, width]);

  const outputs = await session.run(feeds);
  const out = outputs[session.outputNames[0]].data as Uint8Array;

  const rgba = new Uint8ClampedArray(pixels * 4);
  for (let i = 0, p = 0; i < pixels; i++, p += 4) {
    rgba[p] = out[i];
    rgba[p + 1] = out[pixels + i];
    rgba[p + 2] = out[2 * pixels + i];
    rgba[p + 3] = 255;
  }
  return canvasFromImageData(new ImageData(rgba, width, height));
}

async function runLama(
  session: ort.InferenceSession,
  scene: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  knownRect: KnownRect,
): Promise<HTMLCanvasElement> {
  const width = scene.width;
  const height = scene.height;
  const square = Math.max(width, height);

  const squareScene = createCanvas(square, square);
  const sctx = ctx2d(squareScene);
  sctx.fillStyle = FIELD_COLOR;
  sctx.fillRect(0, 0, square, square);
  sctx.drawImage(scene, 0, 0);

  const squareMask = createCanvas(square, square);
  const mctx = ctx2d(squareMask);
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, square, square);
  mctx.drawImage(mask, 0, 0);

  const scaledScene = resizeCanvas(squareScene, LAMA_RES, LAMA_RES, false);
  const scaledMask = resizeCanvas(squareMask, LAMA_RES, LAMA_RES, true);

  const sceneData = imageDataFromCanvas(scaledScene).data;
  const maskData = imageDataFromCanvas(scaledMask);
  const pixels = LAMA_RES * LAMA_RES;

  const image = new Float32Array(3 * pixels);
  for (let i = 0, p = 0; i < pixels; i++, p += 4) {
    image[i] = sceneData[p] / 255;
    image[pixels + i] = sceneData[p + 1] / 255;
    image[2 * pixels + i] = sceneData[p + 2] / 255;
  }
  const maskPlane = new Float32Array(pixels);
  for (let i = 0, p = 0; i < pixels; i++, p += 4) {
    maskPlane[i] = maskData.data[p] < 128 ? 1 : 0;
  }

  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = new ort.Tensor('float32', image, [
    1,
    3,
    LAMA_RES,
    LAMA_RES,
  ]);
  feeds[session.inputNames[1]] = new ort.Tensor('float32', maskPlane, [
    1,
    1,
    LAMA_RES,
    LAMA_RES,
  ]);

  const outputs = await session.run(feeds);
  const out = outputs[session.outputNames[0]].data as Float32Array;

  const rgba = new Uint8ClampedArray(pixels * 4);
  for (let i = 0, p = 0; i < pixels; i++, p += 4) {
    rgba[p] = out[i];
    rgba[p + 1] = out[pixels + i];
    rgba[p + 2] = out[2 * pixels + i];
    rgba[p + 3] = 255;
  }

  const generatedSquare = resizeCanvas(canvasFromImageData(new ImageData(rgba, LAMA_RES, LAMA_RES)), square, square, false);

  const cropped = createCanvas(width, height);
  ctx2d(cropped).drawImage(generatedSquare, 0, 0, width, height, 0, 0, width, height);

  return compositeGenerated(scene, cropped, knownRect);
}
