import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import Webcam from 'react-webcam';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, ScanFace, ArrowRight, ShieldCheck, Mail, Lock, Camera, Loader2, CheckCircle2, AlertCircle, Sun, Move, Users, ZoomIn, ZoomOut } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { useAuth } from '@/lib/auth-context';
import { authApi, faceApi, settingsApi, type FaceDescriptorUser } from '@/lib/api';
import { loadFaceModels, detectFaceWithFeedback, compareFaceDescriptors, isFaceMatch, jsonToDescriptor, type FaceDetectionStatus } from '@/lib/face-recognition';
import { useQuery } from '@tanstack/react-query';
import aeceLogo from '@assets/AECE_Logo_1765516911038.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  
  const { data: companyNameSetting } = useQuery({
    queryKey: ['settings', 'company_name'],
    queryFn: () => settingsApi.get('company_name'),
  });
  
  const { data: companyLogoSetting } = useQuery({
    queryKey: ['settings', 'company_logo'],
    queryFn: () => settingsApi.get('company_logo'),
  });
  
  const companyName = companyNameSetting?.value || 'AECE Checkpoint';
  const companyLogo = companyLogoSetting?.value || aeceLogo;
  
  const [loginMode, setLoginMode] = useState<'worker' | 'admin'>('worker');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showIdInput, setShowIdInput] = useState(false);
  
  const [modelsReady, setModelsReady] = useState(false);
  const [faceUsers, setFaceUsers] = useState<FaceDescriptorUser[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [recognizedUser, setRecognizedUser] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<'loading' | 'scanning' | 'recognized' | 'not_found'>('loading');
  const [faceMessage, setFaceMessage] = useState<string>('');
  const [detectionStatus, setDetectionStatus] = useState<FaceDetectionStatus | null>(null);

  useEffect(() => {
    if (loginMode === 'worker') {
      initFaceRecognition(true);
    }
  }, [loginMode]);

  const initFaceRecognition = async (includeAdmins: boolean) => {
    setFaceStatus('loading');
    try {
      const [loaded, users] = await Promise.all([
        loadFaceModels(),
        faceApi.getAllFaceDescriptors(includeAdmins),
      ]);
      setModelsReady(loaded);
      setFaceUsers(users);
      if (loaded) {
        setFaceStatus('scanning');
      }
    } catch (err) {
      console.error('Failed to initialize face recognition:', err);
      setShowIdInput(true);
    }
  };

  const detectAndMatchFace = useCallback(async () => {
    if (!modelsReady || !webcamRef.current || detecting || faceUsers.length === 0) return;
    
    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return;

    setDetecting(true);
    
    try {
      const result = await detectFaceWithFeedback(video);
      setDetectionStatus(result.status);
      setFaceMessage(result.message);
      
      if (result.status !== 'face_detected' || !result.descriptor) {
        setDetecting(false);
        return;
      }
      
      // Collect all matches with their distances
      const allMatches: { user: FaceDescriptorUser; distance: number }[] = [];
      
      for (const user of faceUsers) {
        const storedDescriptor = jsonToDescriptor(user.faceDescriptor);
        if (storedDescriptor) {
          const distance = compareFaceDescriptors(result.descriptor, storedDescriptor);
          console.log(`Face match check: ${user.firstName} ${user.surname} - distance: ${distance.toFixed(3)}`);
          allMatches.push({ user, distance });
        }
      }
      
      // Sort by distance (best match first)
      allMatches.sort((a, b) => a.distance - b.distance);
      
      const bestMatch = allMatches[0] || null;
      const secondBestMatch = allMatches[1] || null;
      
      // Face matching configuration
      const MATCH_THRESHOLD = 0.7; // Distance threshold for valid match
      const MIN_GAP = 0.1; // Gap required between best and second-best for workers
      
      // Prioritize managers - if there's a manager within threshold, prefer them
      // This helps when face descriptors are similar between users
      const managerMatches = allMatches.filter(m => m.user.role === 'manager' && m.distance < MATCH_THRESHOLD);
      
      // If a manager is within threshold, use them (admins get priority)
      let finalMatch = bestMatch;
      if (managerMatches.length > 0 && bestMatch?.user.role === 'worker') {
        // Switch to manager if their match is reasonably close (within 0.2 of best worker match)
        if (managerMatches[0].distance - bestMatch.distance < 0.2) {
          finalMatch = managerMatches[0];
          console.log(`Prioritizing manager ${finalMatch.user.firstName} over worker ${bestMatch.user.firstName}`);
        }
      }
      
      const secondMatch = allMatches.find(m => m !== finalMatch) || null;
      
      // For managers: just check threshold (no gap required - they have password backup)
      // For workers: require gap to prevent misidentification
      const isManager = finalMatch?.user.role === 'manager';
      const hasClearMatch = finalMatch && 
        finalMatch.distance < MATCH_THRESHOLD &&
        (isManager || !secondMatch || (secondMatch.distance - finalMatch.distance) >= MIN_GAP);
      
      if (finalMatch && secondMatch) {
        console.log(`Best: ${finalMatch.user.firstName} (${finalMatch.distance.toFixed(3)}) | Second: ${secondMatch.user.firstName} (${secondMatch.distance.toFixed(3)}) | Gap: ${(secondMatch.distance - finalMatch.distance).toFixed(3)} | IsManager: ${isManager}`);
      }
      
      if (hasClearMatch) {
        // Use finalMatch instead of bestMatch
        const bestMatch = finalMatch;
        setFaceStatus('recognized');
        setFaceMessage(`Welcome, ${bestMatch.user.firstName}!`);
        setRecognizedUser(`${bestMatch.user.firstName} ${bestMatch.user.surname}`);
        setModelsReady(false);
        
        if (bestMatch.user.role === 'manager') {
          setTimeout(async () => {
            try {
              const user = await authApi.loginByFace(bestMatch.user.id);
              setUser(user);
              // Route based on adminRole
              if (user.adminRole === 'maintainer') {
                setLocation('/maintainer/dashboard');
              } else {
                setLocation('/admin/dashboard');
              }
            } catch (err) {
              setError('Face login failed');
              setFaceStatus('scanning');
              setFaceMessage('Look at the camera to login');
              setRecognizedUser(null);
              setModelsReady(true);
            }
          }, 1000);
          return;
        }
        
        setTimeout(async () => {
          try {
            const user = await authApi.loginWorker(bestMatch.user.id);
            setUser(user);
            setLocation('/dashboard');
          } catch (err) {
            setError('Login failed');
            setFaceStatus('scanning');
            setFaceMessage('Look at the camera to login');
            setRecognizedUser(null);
            setModelsReady(true);
          }
        }, 1000);
        return;
      } else if (bestMatch) {
        // Convert distance to similarity percentage (0.0 = 100%, 0.5 = ~58%, 1.2 = 0%)
        const maxDistance = 1.2;
        const similarity = Math.max(0, Math.min(100, ((maxDistance - bestMatch.distance) / maxDistance) * 100));
        
        // Check why it didn't match
        if (bestMatch.distance >= MATCH_THRESHOLD) {
          console.log(`No match: distance ${bestMatch.distance.toFixed(3)} exceeds threshold ${MATCH_THRESHOLD}`);
          setFaceMessage(`Scanning... (${similarity.toFixed(0)}% - needs ${Math.ceil((1 - MATCH_THRESHOLD/maxDistance) * 100)}%)`);
        } else if (secondBestMatch && (secondBestMatch.distance - bestMatch.distance) < MIN_GAP) {
          console.log(`Ambiguous match: gap ${(secondBestMatch.distance - bestMatch.distance).toFixed(3)} too small`);
          setFaceMessage(`Multiple possible matches - move closer`);
        } else {
          setFaceMessage(`Matching... (${similarity.toFixed(0)}% match)`);
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
      setFaceMessage('Detection error - please try again');
    } finally {
      setDetecting(false);
    }
  }, [modelsReady, detecting, faceUsers, setUser, setLocation]);

  useEffect(() => {
    const isWorkerScanning = loginMode === 'worker' && modelsReady && faceStatus === 'scanning';
    
    if (!isWorkerScanning) return;
    
    const interval = setInterval(detectAndMatchFace, 1500);
    return () => clearInterval(interval);
  }, [loginMode, modelsReady, faceStatus, detectAndMatchFace]);

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authApi.loginWorker(id);
      setUser(user);
      setLocation('/dashboard');
    } catch (err) {
      setError('Invalid Employee ID or National ID. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authApi.loginAdmin(email, password);
      setUser(user);
      // Route based on adminRole
      if (user.adminRole === 'maintainer') {
        setLocation('/maintainer/dashboard');
      } else {
        setLocation('/admin/dashboard');
      }
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const toggleLoginMode = () => {
    setLoginMode(loginMode === 'worker' ? 'admin' : 'worker');
    setError('');
    setShowIdInput(false);
    setFaceStatus('loading');
    setRecognizedUser(null);
    setModelsReady(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-100 relative">

      <Card className="w-full max-w-md z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-2">
          <img src={companyLogo} alt={companyName} className="h-14 mx-auto mb-4" />
          <CardTitle className="text-3xl font-heading tracking-wide text-gray-900">{companyName.toUpperCase()}</CardTitle>
          <CardDescription className="text-gray-600 text-base">
            {loginMode === 'admin' ? 'Admin Portal Access' : 'Worker Portal Access'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loginMode === 'worker' ? (
            <div className="space-y-4">
              {!showIdInput ? (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: 'user', width: 640, height: 480 }}
                      className="w-full h-full object-cover"
                    />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-48 h-48 rounded-full border-4 ${
                        faceStatus === 'recognized' ? 'border-green-500' : 
                        faceStatus === 'scanning' && detectionStatus === 'face_detected' ? 'border-green-500 animate-pulse' :
                        faceStatus === 'scanning' && detectionStatus && detectionStatus !== 'face_detected' ? 'border-amber-500' :
                        faceStatus === 'scanning' ? 'border-primary animate-pulse' : 
                        'border-white/50'
                      } transition-colors`} />
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center justify-center gap-2 text-white" data-testid="face-feedback">
                        {faceStatus === 'loading' && (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Loading face recognition...</span>
                          </>
                        )}
                        {faceStatus === 'scanning' && (
                          <>
                            {detectionStatus === 'no_face' && <AlertCircle className="h-5 w-5 text-amber-400" />}
                            {detectionStatus === 'poor_lighting' && <Sun className="h-5 w-5 text-amber-400" />}
                            {detectionStatus === 'face_too_small' && <ZoomIn className="h-5 w-5 text-amber-400" />}
                            {detectionStatus === 'face_too_large' && <ZoomOut className="h-5 w-5 text-amber-400" />}
                            {detectionStatus === 'face_not_centered' && <Move className="h-5 w-5 text-amber-400" />}
                            {detectionStatus === 'multiple_faces' && <Users className="h-5 w-5 text-amber-400" />}
                            {detectionStatus === 'face_detected' && <ScanFace className="h-5 w-5 animate-pulse text-green-400" />}
                            {!detectionStatus && <ScanFace className="h-5 w-5 animate-pulse" />}
                            <span className={detectionStatus && detectionStatus !== 'face_detected' ? 'text-amber-300' : ''}>
                              {faceMessage || 'Look at the camera to login'}
                            </span>
                          </>
                        )}
                        {faceStatus === 'recognized' && (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            <span>{faceMessage || `Welcome, ${recognizedUser}!`}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {faceUsers.length === 0 && modelsReady && (
                    <p className="text-sm text-amber-600 text-center">
                      No registered faces found. Please use ID login.
                    </p>
                  )}

                  <div className="text-center">
                    <button
                      onClick={() => setShowIdInput(true)}
                      className="text-sm text-slate-500 hover:text-primary underline"
                      data-testid="button-use-id"
                    >
                      Use Employee ID or National ID instead
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleIdSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 uppercase tracking-wider">Employee ID or National ID</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      <Input 
                        type="text" 
                        placeholder="Enter your Employee ID or National ID" 
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        className="pl-10 h-12 text-lg bg-white text-gray-900 border-slate-200 focus:ring-primary focus:border-primary"
                        data-testid="input-worker-id"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">You can use either your company employee ID or your national ID number</p>
                  </div>
                  
                  {error && <p className="text-red-500 text-sm font-medium text-center animate-pulse" data-testid="text-error">{error}</p>}
                  
                  <Button type="submit" className="w-full h-12 btn-industrial text-lg mt-2" disabled={loading} data-testid="button-login">
                    {loading ? 'Signing In...' : 'Sign In'} {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowIdInput(false);
                        setFaceStatus('scanning');
                      }}
                      className="text-sm text-slate-500 hover:text-primary underline"
                      data-testid="button-use-face"
                    >
                      Use Face Recognition instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <Input 
                    type="email" 
                    placeholder="admin@factory.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 text-lg bg-white text-gray-900 border-slate-200 focus:ring-primary focus:border-primary"
                    data-testid="input-admin-email"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 text-lg bg-white text-gray-900 border-slate-200 focus:ring-primary focus:border-primary"
                    data-testid="input-admin-password"
                  />
                </div>
              </div>
              
              {error && <p className="text-red-500 text-sm font-medium text-center animate-pulse" data-testid="text-error">{error}</p>}
              
              <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white text-lg mt-2" disabled={loading} data-testid="button-admin-login">
                {loading ? 'Signing In...' : 'Sign In'} {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>
          )}
        </CardContent>
        <div className="bg-slate-50 p-4 rounded-b-xl text-center border-t border-slate-100 space-y-2">
          <div className="text-xs text-slate-400">System v2.4.1 • Secure Connection</div>
          <button 
            onClick={toggleLoginMode}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            data-testid="button-toggle-login-mode"
          >
            {loginMode === 'worker' ? 'Admin Login' : 'Worker Login'}
          </button>
        </div>
      </Card>
    </div>
  );
}
