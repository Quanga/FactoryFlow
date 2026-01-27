import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, CheckCircle, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Circle, RefreshCw, X } from 'lucide-react';
import { loadFaceModels, extractFaceDescriptorFromBase64, descriptorToJson } from '@/lib/face-recognition';

interface CapturedPhoto {
  angle: string;
  image: string;
  descriptor: string | null;
}

interface MultiAngleFaceCaptureProps {
  onComplete: (photos: CapturedPhoto[], primaryPhoto: string, primaryDescriptor: string) => void;
  onCancel: () => void;
}

const CAPTURE_ANGLES = [
  { id: 'center', label: 'Look straight at the camera', icon: Circle, instruction: 'Keep your head straight and look directly at the camera' },
  { id: 'left', label: 'Turn slightly left', icon: ArrowLeft, instruction: 'Turn your head slightly to the left while keeping your face visible' },
  { id: 'right', label: 'Turn slightly right', icon: ArrowRight, instruction: 'Turn your head slightly to the right while keeping your face visible' },
  { id: 'up', label: 'Tilt head up slightly', icon: ArrowUp, instruction: 'Tilt your head up slightly as if looking at something above the camera' },
  { id: 'down', label: 'Tilt head down slightly', icon: ArrowDown, instruction: 'Tilt your head down slightly as if looking at something below the camera' },
];

const MultiAngleFaceCapture: React.FC<MultiAngleFaceCaptureProps> = ({ onComplete, onCancel }) => {
  const webcamRef = useRef<Webcam>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFaceModels().then(loaded => setModelsLoaded(loaded));
  }, []);

  const currentAngle = CAPTURE_ANGLES[currentStep];
  const progress = (capturedPhotos.length / CAPTURE_ANGLES.length) * 100;

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCurrentImage(imageSrc);
    }
  }, []);

  const retake = () => {
    setCurrentImage(null);
    setError(null);
  };

  const confirmCapture = async () => {
    if (!currentImage) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      const descriptor = await extractFaceDescriptorFromBase64(currentImage);
      
      if (!descriptor) {
        setError('No face detected. Please ensure your face is clearly visible and try again.');
        setProcessing(false);
        return;
      }

      const newPhoto: CapturedPhoto = {
        angle: currentAngle.id,
        image: currentImage,
        descriptor: descriptorToJson(descriptor),
      };

      const updatedPhotos = [...capturedPhotos, newPhoto];
      setCapturedPhotos(updatedPhotos);
      setCurrentImage(null);

      if (currentStep < CAPTURE_ANGLES.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        const centerPhoto = updatedPhotos.find(p => p.angle === 'center');
        if (centerPhoto && centerPhoto.descriptor) {
          onComplete(updatedPhotos, centerPhoto.image, centerPhoto.descriptor);
        }
      }
    } catch (err) {
      setError('Error processing face. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const skipAngle = () => {
    if (currentStep < CAPTURE_ANGLES.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentImage(null);
    } else if (capturedPhotos.length > 0) {
      const centerPhoto = capturedPhotos.find(p => p.angle === 'center') || capturedPhotos[0];
      if (centerPhoto && centerPhoto.descriptor) {
        onComplete(capturedPhotos, centerPhoto.image, centerPhoto.descriptor);
      }
    }
  };

  const Icon = currentAngle.icon;

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-900">Face Registration</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="w-full">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Step {currentStep + 1} of {CAPTURE_ANGLES.length}</span>
          <span>{capturedPhotos.length} photos captured</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
        <div className="flex items-center gap-2 text-blue-800">
          <Icon className="h-5 w-5" />
          <span className="font-medium">{currentAngle.label}</span>
        </div>
        <p className="text-sm text-blue-600 mt-1">{currentAngle.instruction}</p>
      </div>

      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/50 shadow-inner">
        {currentImage ? (
          <img src={currentImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full h-full object-cover"
              videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-dashed border-white/60 rounded-full" />
            </div>
          </>
        )}
        
        {processing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
              <span>Processing face...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 w-full text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 w-full">
        {!currentImage ? (
          <>
            <Button 
              onClick={capture} 
              className="flex-1 h-12"
              disabled={!modelsLoaded}
            >
              <Camera className="mr-2 h-5 w-5" />
              Capture
            </Button>
            {currentStep > 0 && (
              <Button 
                onClick={skipAngle} 
                variant="outline"
                className="h-12"
              >
                Skip
              </Button>
            )}
          </>
        ) : (
          <>
            <Button 
              onClick={retake} 
              variant="outline" 
              className="flex-1 h-12"
              disabled={processing}
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Retake
            </Button>
            <Button 
              onClick={confirmCapture} 
              className="flex-1 h-12 bg-green-600 hover:bg-green-700"
              disabled={processing}
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Confirm
            </Button>
          </>
        )}
      </div>

      {capturedPhotos.length > 0 && (
        <div className="w-full">
          <p className="text-sm text-gray-600 mb-2">Captured angles:</p>
          <div className="flex gap-2 flex-wrap">
            {capturedPhotos.map((photo, idx) => (
              <div key={idx} className="relative">
                <img 
                  src={photo.image} 
                  alt={photo.angle} 
                  className="w-12 h-12 rounded-md object-cover border-2 border-green-500"
                />
                <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500 bg-white rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiAngleFaceCapture;
