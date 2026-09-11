import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, ArrowLeft, KeyRound, Building2 } from 'lucide-react';
import { validateCredentials, ROLES } from '../../context/auth';
import { useAuth } from '../../context/AuthContext';

const OfficialLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const fromPath = location.state?.from?.pathname || '';
  const requestedRole =
    location.state?.role ||
    (fromPath.includes('authority') ? ROLES.AUTHORITY : ROLES.INSPECTOR);

  // Role selector: 'INSPECTOR' | 'AUTHORITY'
  const [selectedRole, setSelectedRole] = useState(requestedRole);

  const [email, setEmail] = useState(
    requestedRole === ROLES.AUTHORITY ? 'authority@labellens.gov.in' : 'inspector@labellens.gov.in'
  );
  const [password, setPassword] = useState(
    requestedRole === ROLES.AUTHORITY ? 'Authority@123' : 'Inspector@123'
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setError('');
    if (role === ROLES.INSPECTOR) {
      setEmail('inspector@labellens.gov.in');
      setPassword('Inspector@123');
    } else {
      setEmail('authority@labellens.gov.in');
      setPassword('Authority@123');
    }
  };

  const handleFillDemo = () => {
    setError('');
    if (selectedRole === ROLES.INSPECTOR) {
      setEmail('inspector@labellens.gov.in');
      setPassword('Inspector@123');
    } else {
      setEmail('authority@labellens.gov.in');
      setPassword('Authority@123');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your official email and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      // First attempt with active selected role
      let user = validateCredentials(email, password, selectedRole);

      // If not matched, gracefully check the other official role
      if (!user) {
        const otherRole = selectedRole === ROLES.INSPECTOR ? ROLES.AUTHORITY : ROLES.INSPECTOR;
        const otherUser = validateCredentials(email, password, otherRole);
        if (otherUser) {
          user = otherUser;
          setSelectedRole(otherRole);
        }
      }

      if (user) {
        login(user);
        const defaultDest = user.role === ROLES.INSPECTOR ? '/official/inspector' : '/official/authority';
        const targetDest = (fromPath && fromPath.startsWith(user.role === ROLES.INSPECTOR ? '/official/inspector' : '/official/authority'))
          ? fromPath
          : defaultDest;
        navigate(targetDest, { replace: true });
      } else {
        setError('Invalid official credentials. Please verify your email/ID and password.');
        setIsLoading(false);
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Back to Home Link */}
      <div className="w-full max-w-sm mb-4">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-[#0f2942] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Return to Home</span>
        </Link>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-[#0f2942] p-6 text-center text-white">
          <div className="mx-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-2.5">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Official Login
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Legal Metrology Department &bull; Enforcement Directorate
          </p>
        </div>

        {/* Role Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
            Select Your Role
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleRoleChange(ROLES.INSPECTOR)}
              className={`py-2 px-3 rounded text-xs font-bold transition-all ${
                selectedRole === ROLES.INSPECTOR
                  ? 'bg-[#0f2942] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Inspector
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange(ROLES.AUTHORITY)}
              className={`py-2 px-3 rounded text-xs font-bold transition-all ${
                selectedRole === ROLES.AUTHORITY
                  ? 'bg-[#0f2942] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Authority
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="official-email"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1"
            >
              Official Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="official-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@labellens.gov.in"
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="official-password"
              className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="official-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Prototype demo fill */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Prototype testing:</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[#0f2942] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <KeyRound className="w-3 h-3 text-slate-400" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-[#0f2942] hover:bg-[#183e63] text-white text-xs font-bold rounded shadow-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : `Sign In as ${selectedRole === ROLES.INSPECTOR ? 'Inspector' : 'Authority'}`}
          </button>

          {/* Footer citizen link */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Citizen consumer?{' '}
            <Link to="/citizen/login" className="text-[#0f2942] hover:underline font-semibold">
              Go to Citizen Portal &rarr;
            </Link>
          </div>
        </form>
      </div>

      {/* Prototype credential hint box */}
      <div className="mt-5 w-full max-w-sm p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
        <div className="font-bold mb-1">Prototype Credentials (for demonstration only):</div>
        <div>Inspector: <span className="font-mono">inspector@labellens.gov.in</span> / <span className="font-mono">Inspector@123</span></div>
        <div>Authority: <span className="font-mono">authority@labellens.gov.in</span> / <span className="font-mono">Authority@123</span></div>
      </div>
    </div>
  );
};

export default OfficialLogin;
