import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AuthorityNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/official/login');
  };

  return (
    <header className="bg-[#1a3a5c] text-white border-b border-slate-700 sticky top-0 z-30 shadow-md">
      {/* Top Banner */}
      <div className="bg-[#0d2035] text-slate-300 text-[11px] px-4 py-1 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sky-400" />
            <span>RESTRICTED ACCESS &bull; LEGAL METROLOGY AUTHORITY PORTAL</span>
          </div>
          <div className="text-slate-400">National HQ — Supervisory Division</div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded border border-white/20">
              <Building2 className="h-5 w-5 text-sky-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-wide">LABEL LENS</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 border border-sky-400/30">
                  AUTHORITY DESK
                </span>
              </div>
              <span className="text-[11px] text-slate-300">Supervisory & Administrative Management</span>
            </div>
          </div>

          {/* Officer info + Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-700 text-xs">
              <div className="w-7 h-7 rounded bg-white/10 border border-white/20 flex items-center justify-center">
                <User className="w-4 h-4 text-sky-300" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white leading-tight">{user?.name} (Authority)</span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {user?.id}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white/10 hover:bg-red-950/40 text-slate-200 hover:text-red-200 border border-white/15 hover:border-red-400/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const AuthorityLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <AuthorityNavbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-3 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            Legal Metrology Authority Console &bull; Confidential &bull; For Authorised Use Only
          </div>
          <div className="text-[11px] text-slate-400">
            Supervisory Framework &bull; SIH26034
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AuthorityLayout;
