import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, ScanFace, ArrowRight } from 'lucide-react';
import WebcamCapture from '@/components/WebcamCapture';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api';
import factoryBg from '@assets/generated_images/modern_clean_industrial_factory_interior_background.png';

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'id' | 'face'>('id');

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Try to login to validate ID exists
      const user = await authApi.loginWorker(id);
      setStep('face');
    } catch (err) {
      setError('Invalid ID Number. Try "46", "102", or "105".');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCapture = async (imageSrc: string) => {
    setLoading(true);
    // Simulate face verification delay
    setTimeout(async () => {
      try {
        const user = await authApi.loginWorker(id);
        setUser(user);
        setLocation('/dashboard');
      } catch (err) {
        setError('Login failed');
        setStep('id');
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
         style={{ backgroundImage: `url(${factoryBg})` }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <Card className="w-full max-w-md z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-lg rotate-3 transition-transform hover:rotate-0">
            <span className="text-3xl font-heading font-bold text-white">F</span>
          </div>
          <CardTitle className="text-3xl font-heading tracking-wide text-slate-900">FACTORY FLOW</CardTitle>
          <CardDescription className="text-slate-600 text-base">Worker Portal Access</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="id" value={step} className="w-full">
            <TabsContent value="id" className="space-y-4 mt-0">
              <form onSubmit={handleIdSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 uppercase tracking-wider">Employee ID</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                    <Input 
                      type="text" 
                      placeholder="Enter your ID (e.g., 46)" 
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                      className="pl-10 h-12 text-lg bg-slate-50 border-slate-200 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                {error && <p className="text-red-500 text-sm font-medium text-center animate-pulse">{error}</p>}
                
                <Button type="submit" className="w-full h-12 btn-industrial text-lg mt-2" disabled={loading}>
                  {loading ? 'Verifying...' : 'Next'} {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="face" className="mt-0 space-y-4">
               <div className="text-center mb-4">
                  <p className="text-slate-600 font-medium">Verify your identity</p>
               </div>
               <WebcamCapture onCapture={handleFaceCapture} label="Scan Face to Login" />
               
               <Button 
                variant="ghost" 
                onClick={() => setStep('id')}
                className="w-full mt-2 text-slate-500"
              >
                Back to ID Entry
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <div className="bg-slate-50 p-4 rounded-b-xl text-center text-xs text-slate-400 border-t border-slate-100">
          System v2.4.1 • Secure Connection
        </div>
      </Card>
    </div>
  );
}
