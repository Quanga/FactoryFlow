import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authApi, settingsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import factoryBg from '@assets/generated_images/modern_clean_industrial_factory_interior_background.png';
import aeceLogo from '@assets/AECE_Logo_1765516911038.png';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authApi.loginAdmin(email, password);
      setUser(user);
      setLocation('/admin/dashboard');
    } catch (err) {
      setError('Invalid credentials. Try admin@factory.com / admin123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
         style={{ backgroundImage: `url(${factoryBg})` }}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <Card className="w-full max-w-md z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center pb-2">
          <img src={companyLogo} alt={companyName} className="h-14 mx-auto mb-4" />
          <CardTitle className="text-2xl font-heading tracking-wide text-gray-900">{companyName.toUpperCase()} ADMIN</CardTitle>
          <CardDescription className="text-gray-600">System Configuration & Management</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="email"
                  type="email" 
                  placeholder="admin@factory.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm font-medium text-center animate-pulse">{error}</p>}
            
            <Button type="submit" className="w-full h-12 btn-industrial text-lg mt-4 bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Authenticating...' : 'Access Dashboard'}
              {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              className="text-blue-600"
              onClick={() => {
                const email = prompt("Enter your email address to receive a password reset link:");
                if (email) {
                  import('@/lib/api').then(({ passwordResetApi }) => {
                    passwordResetApi.requestReset(email).then(() => {
                      alert("If an account exists with that email, a reset link has been sent.");
                    }).catch(() => {
                      alert("If an account exists with that email, a reset link has been sent.");
                    });
                  });
                }
              }}
              data-testid="button-forgot-password"
            >
              Forgot Password?
            </Button>
          </div>
          <div className="mt-2 text-center">
             <Button variant="link" className="text-slate-500" onClick={() => setLocation('/')}>
               Back to Worker Login
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
