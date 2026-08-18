import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Shield } from 'lucide-react';
import Sidebar from './Sidebar';
import { getSession, logout } from '../../auth/session';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isUploadPage = location.pathname === '/upload';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const session = getSession();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (isUploadPage) {
    return (
      <div className="min-h-screen bg-bg-base">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between
                        px-4 py-3 bg-bg-surface border-b border-bg-border">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-text-secondary hover:text-text-primary p-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent-amber flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-bg-base" fill="currentColor" strokeWidth={0} />
            </div>
            <span className="text-sm font-bold text-text-primary tracking-tight">FraudLens</span>
          </div>

          {session ? (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-text-dim hover:text-risk-vhigh transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>

        <main className="flex-1 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
