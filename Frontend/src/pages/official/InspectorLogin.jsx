import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { validateCredentials, ROLES, REGISTERED_INSPECTORS } from '../../context/auth';

const InspectorLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const trimmedId = employeeId.trim();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      setError('Please enter both Employee ID and Password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const officer = validateCredentials(trimmedId, trimmedPass, ROLES.INSPECTOR);
      if (officer) {
        login(officer);
        navigate('/official/inspector');
      } else {
        setError('Invalid Employee ID or Password. Please verify your credentials.');
        setIsLoading(false);
      }
    }, 250);
  };

  const handleFillDemo = (officerId = 'LM-042') => {
    const target = REGISTERED_INSPECTORS.find(ins => ins.id === officerId) || REGISTERED_INSPECTORS[0];
    setEmployeeId(target.id);
    setPassword('Inspector@123');
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      {/* Top Navigation */}
      <div className="w-full max-w-sm mb-4">
        <Link 
          to="/" 
          className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-[#0f2942] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Return to Citizen Portal</span>
        </Link>
      </div>

      {/* Official Form Container */}
      <div className="w-full max-w-sm bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-[#0f2942] p-5 text-center text-white border-b border-slate-800">
          <div className="mx-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-2.5">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Inspector Workspace
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Authorized personnel access
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee ID */}
          <div>
            <label htmlFor="inspector-employee-id" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1">
              Employee ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="inspector-employee-id"
                type="text"
                required
                autoComplete="username"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g. LM-042"
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded font-mono uppercase focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Password (never exposed as text) */}
          <div>
            <label htmlFor="inspector-password" className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="inspector-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded font-mono focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Quick Prototype Auto-Fill with genuine registered officers */}
          <div className="pt-1 flex flex-col gap-1 text-[11px] text-slate-500">
            <div className="flex items-center justify-between">
              <span>Prototype testing:</span>
              <button
                type="button"
                onClick={() => handleFillDemo('LM-042')}
                className="text-[#0f2942] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-slate-400" />
                <span>Fill Demo Credentials</span>
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#0f2942] hover:bg-[#183e63] text-sm font-semibold shadow-xs"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </div>

          {/* Restrained Security Notice */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
            Authorized personnel only.
          </div>
        </form>
      </div>

      {/* Prototype credential hint */}
      <div className="mt-5 w-full max-w-sm p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
        <div className="font-bold mb-1">Prototype Credentials (for demonstration only):</div>
        <div>Employee ID: <span className="font-mono">LM-042</span></div>
        <div>Password: <span className="font-mono">inspector123</span></div>
      </div>
    </div>
  );
};

export default InspectorLogin;
