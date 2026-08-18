import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, Shield, ChevronRight, LogOut, X } from 'lucide-react';
import { motion } from 'framer-motion';
import useAppStore from '../../store/useAppStore';
import { getSession, logout } from '../../auth/session';

const NAV_ITEMS = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/providers', label: 'Providers', icon: Users },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const hasAnalysis = useAppStore((s) => s.hasAnalysis);
  const session = getSession();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNavClick = () => onClose();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-60 shrink-0 h-screen flex flex-col bg-bg-surface border-r border-bg-border
          fixed top-0 left-0 z-50 transition-transform duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:sticky md:z-auto`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-bg-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-amber flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-bg-base" fill="currentColor" strokeWidth={0} />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary tracking-tight">FraudLens</div>
              <div className="text-[10px] text-text-muted uppercase tracking-wider">Healthcare Analytics</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-text-dim hover:text-text-primary p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-dim px-2 mb-2">
            Analytics
          </div>

          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-item group ${isActive ? 'active' : ''} ${
                  !hasAnalysis ? 'opacity-40 pointer-events-none' : ''
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-dim px-2 mb-2 mt-6">
            Data
          </div>

          <NavLink
            to="/upload"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item group ${isActive ? 'active' : ''}`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span className="flex-1">Upload Dataset</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        </nav>

        {/* Status indicator */}
        <div className="px-4 py-3 border-t border-bg-border">
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className={`flex items-center gap-2 text-xs ${
              hasAnalysis ? 'text-emerald-400' : 'text-text-dim'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${hasAnalysis ? 'bg-emerald-400' : 'bg-text-dim'}`} />
            {hasAnalysis ? 'Dataset loaded' : 'No dataset loaded'}
          </motion.div>
        </div>

        {/* User / logout */}
        {session && (
          <div className="px-3 py-3 border-t border-bg-border">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-accent-amber/20 border border-accent-amber/30
                              flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-accent-amber uppercase">
                  {session.name?.[0] ?? 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-secondary truncate">{session.name}</div>
                <div className="text-[10px] text-text-dim">{session.role}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-text-dim hover:text-risk-vhigh transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
