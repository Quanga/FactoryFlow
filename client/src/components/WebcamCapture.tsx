import React, { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw } from 'lucide-react';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  label?: string;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, label = "Capture Photo" }) => {
  const webcamRef = useRef<Webcam>(null);
  const [image, setImage] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImage(imageSrc);
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  const retake = () => {
    setImage(null);
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-sm mx-auto">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/50 shadow-inner">
        {image ? (
          <img src={image} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-full object-cover"
            videoConstraints={{ facingMode: "user" }}
          />
        )}
        
        {/* Corner accents for industrial look */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary/80" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary/80" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary/80" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary/80" />
      </div>

      <div className="flex gap-4 w-full">
        {!image ? (
          <Button 
            onClick={capture} 
            className="flex-1 btn-industrial h-12 text-lg bg-primary hover:bg-primary/90"
          >
            <Camera className="mr-2 h-5 w-5" />
            {label}
          </Button>
        ) : (
          <Button 
            onClick={retake} 
            variant="outline" 
            className="flex-1 btn-industrial h-12 text-lg border-primary text-primary hover:bg-primary/10"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Retake
          </Button>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;
