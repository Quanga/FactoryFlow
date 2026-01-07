import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelsLoading = false;

const DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({ 
  minConfidence: 0.3,
  maxResults: 10
});

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
    const tf = faceapi.tf;
    await tf.setBackend('webgl');
    await tf.ready();
    
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('Face recognition models loaded successfully');
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
    .detectSingleFace(input, DETECTION_OPTIONS)
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
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const descriptor = await extractFaceDescriptor(canvas);
        resolve(descriptor);
      } catch (err) {
        console.error('Face extraction error:', err);
        resolve(null);
      }
    };
    img.onerror = (err) => {
      console.error('Image load error:', err);
      resolve(null);
    };
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

export type FaceDetectionStatus = 
  | 'no_face'
  | 'face_detected'
  | 'poor_lighting'
  | 'face_too_small'
  | 'face_too_large'
  | 'face_not_centered'
  | 'multiple_faces'
  | 'matched'
  | 'not_matched';

export interface FaceDetectionResult {
  status: FaceDetectionStatus;
  message: string;
  descriptor: Float32Array | null;
  confidence?: number;
}

export async function detectFaceWithFeedback(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    const detections = await faceapi
      .detectAllFaces(input, DETECTION_OPTIONS)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return {
        status: 'no_face',
        message: 'No face detected - position your face in the frame',
        descriptor: null
      };
    }

    if (detections.length > 1) {
      return {
        status: 'multiple_faces',
        message: 'Multiple faces detected - only one person at a time',
        descriptor: null
      };
    }

    const detection = detections[0];
    const box = detection.detection.box;
    
    const inputWidth = 'videoWidth' in input ? input.videoWidth : input.width;
    const inputHeight = 'videoHeight' in input ? input.videoHeight : input.height;
    
    const faceWidth = box.width;
    const faceHeight = box.height;
    const faceCenterX = box.x + faceWidth / 2;
    const faceCenterY = box.y + faceHeight / 2;
    
    const minFaceSize = Math.min(inputWidth, inputHeight) * 0.08;
    const maxFaceSize = Math.min(inputWidth, inputHeight) * 0.95;
    
    if (faceWidth < minFaceSize || faceHeight < minFaceSize) {
      return {
        status: 'face_too_small',
        message: 'Move closer to the camera',
        descriptor: null
      };
    }
    
    if (faceWidth > maxFaceSize || faceHeight > maxFaceSize) {
      return {
        status: 'face_too_large',
        message: 'Move back from the camera',
        descriptor: null
      };
    }
    
    const centerThreshold = 0.40;
    const normalizedCenterX = faceCenterX / inputWidth;
    const normalizedCenterY = faceCenterY / inputHeight;
    
    if (
      normalizedCenterX < (0.5 - centerThreshold) ||
      normalizedCenterX > (0.5 + centerThreshold) ||
      normalizedCenterY < (0.5 - centerThreshold) ||
      normalizedCenterY > (0.5 + centerThreshold)
    ) {
      return {
        status: 'face_not_centered',
        message: 'Center your face in the frame',
        descriptor: null
      };
    }
    
    const score = detection.detection.score;
    if (score < 0.3) {
      return {
        status: 'poor_lighting',
        message: 'Poor lighting - try moving to a brighter area',
        descriptor: null,
        confidence: score
      };
    }

    return {
      status: 'face_detected',
      message: 'Face detected - scanning...',
      descriptor: detection.descriptor,
      confidence: score
    };
  } catch (error) {
    console.error('Face detection error:', error);
    return {
      status: 'no_face',
      message: 'Detection error - please try again',
      descriptor: null
    };
  }
}
