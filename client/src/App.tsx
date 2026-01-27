import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { settingsApi } from "@/lib/api";
import NotFound from "@/pages/not-found";
import ModeSelect from "@/pages/ModeSelect";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import LeaveRequest from "@/pages/LeaveRequest";
import Attendance from "@/pages/Attendance";
import AttendanceKiosk from "@/pages/AttendanceKiosk";
import AttendanceTileMode from "@/pages/AttendanceTileMode";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import MaintainerDashboard from "@/pages/MaintainerDashboard";
import ResetPassword from "@/pages/ResetPassword";
import EmployeeProfile from "@/pages/EmployeeProfile";
import OrgChart from "@/pages/OrgChart";
import Grievances from "@/pages/Grievances";
import LeaveCalendar from "@/pages/LeaveCalendar";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: primaryColorSetting } = useQuery({
    queryKey: ['settings', 'primary_color'],
    queryFn: () => settingsApi.get('primary_color'),
  });
  
  const { data: accentColorSetting } = useQuery({
    queryKey: ['settings', 'accent_color'],
    queryFn: () => settingsApi.get('accent_color'),
  });
  
  useEffect(() => {
    const root = document.documentElement;
    if (primaryColorSetting?.value) {
      root.style.setProperty('--primary', hexToHsl(primaryColorSetting.value));
    }
    if (accentColorSetting?.value) {
      root.style.setProperty('--accent', hexToHsl(accentColorSetting.value));
    }
  }, [primaryColorSetting, accentColorSetting]);
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ModeSelect} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/maintainer/dashboard" component={MaintainerDashboard} />
      <Route path="/admin/org-chart" component={OrgChart} />
      <Route path="/admin/leave-calendar" component={LeaveCalendar} />
      <Route path="/leave-request" component={LeaveRequest} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/attendance-kiosk" component={AttendanceKiosk} />
      <Route path="/attendance-tiles" component={AttendanceTileMode} />
      <Route path="/attendance-tile" component={AttendanceTileMode} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/profile" component={EmployeeProfile} />
      <Route path="/grievances" component={Grievances} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrandingProvider>
    </QueryClientProvider>
  );
}

export default App;
