import { Link, useNavigate } from 'react-router-dom';
import { Shield, ClipboardList, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const OfficialNavbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Fall back to legacy sessionStorage keys for backward compat
  const officerId = user?.id || sessionStorage.getItem('officer_id') || 'LM-042';
  const officerName = user?.name
    ? `${user.name} (Inspector)`
    : sessionStorage.getItem('officer_name') || 'Ananya Rao';

  const handleLogout = () => {
    logout(); // clears AuthContext + sessionStorage
    navigate('/official/login');
  };

  return (
    <header className="bg-[#0f2942] text-white border-b border-slate-700 sticky top-0 z-30 shadow-md">
      {/* Top Banner */}
      <div className="bg-[#091b2c] text-slate-300 text-[11px] px-4 py-1 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>RESTRICTED ACCESS &bull; LEGAL METROLOGY ENFORCEMENT PORTAL</span>
          </div>
          <div className="text-slate-400">
            Zone-4 Enforcement Division
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/official/inspector" className="flex items-center gap-3 group">
              <div className="p-2 bg-white/10 text-white rounded border border-white/20">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-white tracking-wide">LABEL LENS</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    INSPECTOR DESK
                  </span>
                </div>
                <span className="text-[11px] text-slate-300">Field Inspection &amp; Enforcement Management</span>
              </div>
            </Link>
          </div>

          {/* Navigation & Officer Session Details */}
          <div className="flex items-center gap-4">
            <Link
              to="/official/inspector"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Complaints Queue</span>
            </Link>

            {/* Officer Identification */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-700 text-xs">
              <div className="w-7 h-7 rounded bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 font-semibold">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-white leading-tight">{officerName}</span>
                <span className="text-[10px] text-slate-400 font-mono">ID: {officerId}</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white/10 hover:bg-red-950/40 text-slate-200 hover:text-red-200 border border-white/15 hover:border-red-400/40 transition-colors"
              title="End Official Session"
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

export default OfficialNavbar;
