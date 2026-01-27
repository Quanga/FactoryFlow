import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
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
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
