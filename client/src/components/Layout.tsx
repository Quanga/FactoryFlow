import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  CalendarPlus, 
  Clock, 
  LogOut, 
  Menu,
  UserCircle
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from '@/lib/mockData';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [location] = useLocation();
  const { user, logout } = useStore();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leave-request', label: 'Request Leave', icon: CalendarPlus },
    { href: '/attendance', label: 'Attendance', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 shadow-md z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded flex items-center justify-center font-heading font-bold text-xl">
            F
          </div>
          <span className="font-heading text-xl tracking-wider hidden md:block">FACTORY FLOW</span>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden md:flex items-center gap-3 text-sm">
              <div className="text-right">
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-sidebar-foreground/60">{user.id}</div>
              </div>
              <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-primary">
                <img src={user.photoUrl} alt="User" className="h-full w-full object-cover" />
              </div>
            </div>
          )}
          
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-sidebar text-sidebar-foreground border-r-sidebar-border">
              <div className="flex flex-col h-full py-6">
                <div className="font-heading text-2xl mb-8 px-4 text-primary">FACTORY FLOW</div>
                <nav className="space-y-2 flex-1">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <a className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                        location === item.href 
                          ? 'bg-primary text-primary-foreground font-medium' 
                          : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}>
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </a>
                    </Link>
                  ))}
                </nav>
                
                <div className="mt-auto pt-6 border-t border-sidebar-border space-y-4">
                  <div className="flex items-center gap-3 px-4">
                     <div className="h-10 w-10 rounded-full overflow-hidden border border-sidebar-border">
                        <img src={user?.photoUrl} alt="User" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{user?.name}</div>
                        <div className="text-xs text-sidebar-foreground/50">ID: {user?.id}</div>
                      </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 px-4"
                    onClick={() => window.location.href = '/'}
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border shadow-sm z-40">
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 ${
                  location === item.href 
                    ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:border-destructive"
              onClick={() => window.location.href = '/'}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-8">
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
