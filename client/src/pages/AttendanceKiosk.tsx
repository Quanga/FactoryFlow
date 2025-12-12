import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import Webcam from 'react-webcam';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  LogIn, LogOut, CheckCircle2, XCircle, Loader2, ScanFace, 
  User, ArrowLeft, RefreshCw, Clock
} from 'lucide-react';
import { loadFaceModels, extractFaceDescriptorFromBase64, compareFaceDescriptors, isFaceMatch } from '@/lib/face-recognition';
import { userApi, attendanceApi } from '@/lib/api';

type SubMode = 'clock-in' | 'clock-out';
type KioskStatus = 'ready' | 'scanning' | 'recognized' | 'recording' | 'success' | 'error' | 'id-input';

interface RecognizedWorker {
  id: string;
  name: string;
  department: string;
}

export default function AttendanceKiosk() {
  const [, setLocation] = useLocation();
  const webcamRef = useRef<Webcam>(null);
  
  const subMode = (sessionStorage.getItem('attendanceSubMode') || 'clock-in') as SubMode;
  const [status, setStatus] = useState<KioskStatus>('ready');
  const [modelsReady, setModelsReady] = useState(false);
  const [recognizedWorker, setRecognizedWorker] = useState<RecognizedWorker | null>(null);
  const [error, setError] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [workerId, setWorkerId] = useState('');
  const [faceUsers, setFaceUsers] = useState<Array<{ user: any; descriptor: Float32Array }>>([]);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      await loadFaceModels();
      const res = await fetch('/api/users/face-descriptors');
      const users = await res.json();
      const usersWithDescriptors = users
        .filter((u: any) => u.faceDescriptor && u.role === 'worker')
        .map((u: any) => ({
          user: u,
          descriptor: new Float32Array(JSON.parse(u.faceDescriptor))
        }));
      setFaceUsers(usersWithDescriptors);
      setModelsReady(true);
      setStatus('scanning');
    };
    init();
  }, []);

  const recordAttendance = async (userId: string, method: 'face' | 'id') => {
    setStatus('recording');
    try {
      let photoUrl = null;
      if (webcamRef.current) {
        photoUrl = webcamRef.current.getScreenshot();
      }
      
      await attendanceApi.create({
        userId,
        type: subMode === 'clock-in' ? 'in' : 'out',
        photoUrl,
        method,
        context: 'attendance'
      });
      
      setStatus('success');
      setSuccessMessage(subMode === 'clock-in' ? 'Clocked In Successfully!' : 'Clocked Out Successfully!');
      
      setTimeout(() => {
        resetKiosk();
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to record attendance');
      setTimeout(() => {
        resetKiosk();
      }, 3000);
    }
  };

  const resetKiosk = () => {
    setStatus('scanning');
    setRecognizedWorker(null);
    setError('');
    setWorkerId('');
    setSuccessMessage('');
  };

  const detectAndMatchFace = useCallback(async () => {
    if (!modelsReady || detecting || status !== 'scanning' || !webcamRef.current) return;
    
    setDetecting(true);
    try {
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) return;

      const descriptor = await extractFaceDescriptorFromBase64(screenshot);
      if (descriptor && faceUsers.length > 0) {
        let bestMatch: { user: any; distance: number } | null = null;
        
        for (const { user, descriptor: storedDescriptor } of faceUsers) {
          const distance = compareFaceDescriptors(descriptor, storedDescriptor);
          if (distance !== Infinity && (!bestMatch || distance < bestMatch.distance)) {
            bestMatch = { user, distance };
          }
        }
        
        if (bestMatch && isFaceMatch(bestMatch.distance)) {
          setRecognizedWorker({
            id: bestMatch.user.id,
            name: `${bestMatch.user.firstName} ${bestMatch.user.surname}`,
            department: bestMatch.user.department
          });
          setStatus('recognized');
          
          setTimeout(() => {
            recordAttendance(bestMatch!.user.id, 'face');
          }, 1500);
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
    } finally {
      setDetecting(false);
    }
  }, [modelsReady, detecting, status, faceUsers]);

  useEffect(() => {
    if (status !== 'scanning' || !modelsReady) return;
    
    const interval = setInterval(detectAndMatchFace, 1500);
    return () => clearInterval(interval);
  }, [status, modelsReady, detectAndMatchFace]);

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId.trim()) return;
    
    try {
      const user = await userApi.getById(workerId.trim());
      if (!user) {
        setError('Worker not found');
        return;
      }
      if (user.role !== 'worker') {
        setError('Invalid worker ID');
        return;
      }
      
      setRecognizedWorker({
        id: user.id,
        name: `${user.firstName} ${user.surname}`,
        department: user.department || ''
      });
      recordAttendance(user.id, 'id');
    } catch (err: any) {
      setError(err.message || 'Worker not found');
    }
  };

  const isClockIn = subMode === 'clock-in';

  return (
    <div className={`min-h-screen flex flex-col ${isClockIn ? 'bg-green-900' : 'bg-red-900'}`}>
      <div className={`p-4 ${isClockIn ? 'bg-green-800' : 'bg-red-800'} flex items-center justify-between`}>
        <button 
          onClick={() => setLocation('/')}
          className="text-white/80 hover:text-white flex items-center gap-2"
          data-testid="button-exit"
        >
          <ArrowLeft className="w-5 h-5" />
          Exit
        </button>
        
        <div className="flex items-center gap-3 text-white">
          {isClockIn ? <LogIn className="w-8 h-8" /> : <LogOut className="w-8 h-8" />}
          <span className="font-oswald text-3xl font-bold tracking-wider">
            {isClockIn ? 'CLOCK IN' : 'CLOCK OUT'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-white/80">
          <Clock className="w-5 h-5" />
          <span className="font-mono text-lg" data-testid="text-time">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl bg-white/95 backdrop-blur shadow-2xl border-0">
          <CardContent className="p-8">
            {status === 'id-input' ? (
              <div className="space-y-6">
                <div className="text-center">
                  <User className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h2 className="font-oswald text-2xl font-bold text-slate-800">Enter Worker ID</h2>
                </div>
                
                <form onSubmit={handleIdSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Worker ID"
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="text-center text-2xl h-16"
                    autoFocus
                    data-testid="input-worker-id"
                  />
                  
                  {error && (
                    <p className="text-red-500 text-center" data-testid="text-error">{error}</p>
                  )}
                  
                  <div className="flex gap-4">
                    <Button 
                      type="button"
                      variant="outline"
                      className="flex-1 h-14"
                      onClick={() => {
                        setStatus('scanning');
                        setWorkerId('');
                        setError('');
                      }}
                      data-testid="button-use-face"
                    >
                      <ScanFace className="w-5 h-5 mr-2" />
                      Use Face
                    </Button>
                    <Button 
                      type="submit"
                      className={`flex-1 h-14 ${isClockIn ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      data-testid="button-submit-id"
                    >
                      {isClockIn ? 'Clock In' : 'Clock Out'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-56 h-56 rounded-full border-4 ${
                      status === 'recognized' || status === 'recording' ? (isClockIn ? 'border-green-500' : 'border-red-500') :
                      status === 'success' ? 'border-green-400' :
                      status === 'error' ? 'border-red-400' :
                      status === 'scanning' ? `${isClockIn ? 'border-green-400' : 'border-red-400'} animate-pulse` :
                      'border-white/50'
                    } transition-colors`} />
                  </div>

                  {status === 'success' && (
                    <div className="absolute inset-0 bg-green-500/90 flex flex-col items-center justify-center">
                      <CheckCircle2 className="w-24 h-24 text-white mb-4" />
                      <p className="text-white text-3xl font-bold">{successMessage}</p>
                      {recognizedWorker && (
                        <p className="text-white/90 text-xl mt-2">{recognizedWorker.name}</p>
                      )}
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center">
                      <XCircle className="w-24 h-24 text-white mb-4" />
                      <p className="text-white text-2xl font-bold">Error</p>
                      <p className="text-white/90 text-lg mt-2">{error}</p>
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-center justify-center gap-3 text-white text-xl">
                      {status === 'ready' && (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Initializing...</span>
                        </>
                      )}
                      {status === 'scanning' && (
                        <>
                          <ScanFace className="w-6 h-6 animate-pulse" />
                          <span>Look at the camera</span>
                        </>
                      )}
                      {status === 'recognized' && recognizedWorker && (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-400" />
                          <span>Welcome, {recognizedWorker.name}!</span>
                        </>
                      )}
                      {status === 'recording' && (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Recording...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline"
                    className="flex-1 h-14"
                    onClick={() => setStatus('id-input')}
                    disabled={status === 'recording' || status === 'success'}
                    data-testid="button-use-id"
                  >
                    <User className="w-5 h-5 mr-2" />
                    Use ID Instead
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 h-14"
                    onClick={resetKiosk}
                    disabled={status === 'recording'}
                    data-testid="button-reset"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={`p-4 ${isClockIn ? 'bg-green-800' : 'bg-red-800'} text-center`}>
        <p className="text-white/60 text-sm">
          AECE Checkpoint • {isClockIn ? 'Morning Entry' : 'Evening Departure'}
        </p>
      </div>
    </div>
  );
}
