import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Home, Scan, ClipboardList, User, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, role, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const isCitizen = isAuthenticated && role === 'CITIZEN';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Government Advisory Banner */}
      <div className="bg-[#0f2942] text-slate-100 text-xs px-4 py-1.5 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-medium tracking-wide text-[11px] sm:text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>Government of India &bull; Ministry of Consumer Affairs, Food &amp; Public Distribution</span>
          </div>
          <div className="hidden sm:block text-[11px] text-slate-300 font-mono">
            Legal Metrology (Packaged Commodities) Rules, 2011
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0f2942] text-white rounded-md">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base text-[#0f2942] tracking-tight leading-tight">LABEL LENS</span>
              <span className="text-[10px] text-slate-500 font-medium">Citizen Verification Portal</span>
            </div>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/"
              className={`inline-flex items-center px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                location.pathname === '/' 
                  ? 'bg-slate-100 text-[#0f2942]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Home className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {isCitizen ? (
              <>
                <Link
                  to="/scan"
                  className={`inline-flex items-center px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                    location.pathname.startsWith('/scan') 
                      ? 'bg-slate-100 text-[#0f2942]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Scan Product</span>
                </Link>

                <Link
                  to="/citizen/complaints"
                  className={`inline-flex items-center px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                    location.pathname.startsWith('/citizen/complaints') 
                      ? 'bg-slate-100 text-[#0f2942]' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">My Complaints</span>
                </Link>

                <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                <Link
                  to="/citizen"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                >
                  <User className="w-3.5 h-3.5 text-[#0f2942]" />
                  <span className="hidden sm:inline">{user?.name?.split(' ')[0] || 'Citizen'}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors border border-red-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/citizen/login"
                  className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold bg-[#0f2942] text-white hover:bg-[#183e63] transition-colors shadow-xs"
                >
                  <User className="w-3.5 h-3.5 mr-1" />
                  <span>Citizen Login</span>
                </Link>

                <Link
                  to="/official/login"
                  className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 mr-1 text-[#0f2942]" />
                  <span>Official Login</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;