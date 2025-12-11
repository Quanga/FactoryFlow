import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelsLoading = false;

export async function loadFaceModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelsLoading) {
    while (modelsLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return modelsLoaded;
  }

  modelsLoading = true;
  try {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face recognition models loaded');
    return true;
  } catch (error) {
    console.error('Failed to load face models:', error);
    return false;
  } finally {
    modelsLoading = false;
  }
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export async function detectFace(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>> | undefined> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  const detection = await faceapi
    .detectSingleFace(input)
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
}

export async function extractFaceDescriptor(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<Float32Array | null> {
  const detection = await detectFace(input);
  if (!detection) {
    return null;
  }
  return detection.descriptor;
}

export async function extractFaceDescriptorFromBase64(base64Image: string): Promise<Float32Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const descriptor = await extractFaceDescriptor(img);
      resolve(descriptor);
    };
    img.onerror = () => resolve(null);
    img.src = base64Image;
  });
}

export function compareFaceDescriptors(descriptor1: Float32Array | number[], descriptor2: Float32Array | number[]): number {
  const arr1 = descriptor1 instanceof Float32Array ? Array.from(descriptor1) : descriptor1;
  const arr2 = descriptor2 instanceof Float32Array ? Array.from(descriptor2) : descriptor2;
  
  if (arr1.length !== arr2.length || arr1.length !== 128) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function isFaceMatch(distance: number, threshold: number = 0.6): boolean {
  return distance < threshold;
}

export function descriptorToJson(descriptor: Float32Array): string {
  return JSON.stringify(Array.from(descriptor));
}

export function jsonToDescriptor(json: string): number[] | null {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr) && arr.length === 128) {
      return arr;
    }
    return null;
  } catch {
    return null;
  }
}
