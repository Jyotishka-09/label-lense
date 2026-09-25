import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LogOut, ScanLine, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * CompanyLayout
 * -------------
 * Clean, professional company self-assessment portal layout.
 * Designed for brands and manufacturers to self-check packaging declarations.
 */
const CompanyLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/official/login');
  };

  const isDashboardActive = location.pathname === '/official/company' || location.pathname === '/official/company/';
  const isScanActive = location.pathname.startsWith('/official/company/scan') || location.pathname.startsWith('/official/company/preview');

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col font-sans text-slate-800">
      {/* ── Compact Professional Header ── */}
      <header className="bg-[#102a43] text-white border-b border-[#0b1d30] sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between h-14 items-center gap-4">
            {/* LEFT: Branding */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-1.5 bg-white/10 rounded-md text-slate-200">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wide text-white leading-tight">
                  LABEL LENS
                </span>
                <span className="text-[11px] text-slate-300 font-normal leading-tight">
                  Company Self-Assessment
                </span>
              </div>
            </div>

            {/* CENTER / NAVIGATION */}
            <nav className="hidden sm:flex items-center gap-2">
              <Link
                to="/official/company"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isDashboardActive
                    ? 'bg-white/15 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Company Dashboard</span>
              </Link>

              <Link
                to="/official/company/scan"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  isScanActive
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Scan Product</span>
              </Link>
            </nav>

            {/* RIGHT: Company Info & Sign Out */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right text-xs">
                <span className="font-semibold text-white truncate max-w-[200px] leading-tight">
                  {user?.name || 'Company Account'}
                </span>
                {user?.id && (
                  <span className="text-[10px] text-slate-400 font-mono leading-tight">
                    {user.id}
                  </span>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-600 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      {/* ── Compact Minimal Footer ── */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            &copy; {new Date().getFullYear()} Label Lens &bull; Company Self-Assessment Portal
          </span>
          <span className="text-[11px] text-slate-400">
            For internal verification only &bull; Not an official government record
          </span>
        </div>
      </footer>
    </div>
  );
};

export default CompanyLayout;

