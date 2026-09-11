import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, AlertCircle, ArrowLeft, KeyRound, User } from 'lucide-react';
import { validateCredentials, ROLES } from '../../context/auth';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';

const CitizenLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect destination after login (default: /citizen)
  const from = location.state?.from?.pathname || '/citizen';

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user = validateCredentials(email, password, ROLES.CITIZEN);
      if (user) {
        login(user);
        navigate(from, { replace: true });
      } else {
        setError('Invalid email or password. Please check your credentials and try again.');
        setIsLoading(false);
      }
    }, 350);
  };

  const handleFillDemo = () => {
    setEmail('citizen@labellens.com');
    setPassword('Citizen@123');
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">

      {/* Back link */}
      <div className="w-full max-w-sm mb-4">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-medium text-slate-600 hover:text-[#0f2942] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Return to Home</span>
        </Link>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">

        {/* Header */}
        <div className="bg-[#0f2942] p-5 text-center text-white border-b border-slate-800">
          <div className="mx-auto w-11 h-11 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-3">
            <User className="w-5 h-5 text-sky-300" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Citizen Login
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Department of Consumer Affairs &bull; Public Service Portal
          </p>
        </div>

        {/* Government badge strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#0f2942]" />
          <span className="text-[11px] text-slate-600 font-medium tracking-wide uppercase">
            Label Lens &bull; Citizen Verification Portal
          </span>
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
              htmlFor="citizen-email"
              className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="citizen-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="citizen-password"
              className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="citizen-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-[#0f2942] focus:border-[#0f2942] outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Demo fill */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Prototype testing:</span>
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[#0f2942] hover:underline font-semibold flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3 text-slate-400" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>

          {/* Submit */}
          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full py-2.5 text-sm font-semibold"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </div>

          {/* Footer notice */}
          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 flex flex-col gap-1.5">
            <span>By signing in you agree to the terms of the citizen portal.</span>
            <div>
              Department official?{' '}
              <Link to="/official/login" className="text-[#0f2942] hover:underline font-semibold">
                Official Login &rarr;
              </Link>
            </div>
          </div>
        </form>
      </div>

      {/* Prototype credential hint */}
      <div className="mt-5 w-full max-w-sm p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
        <div className="font-bold mb-1">Prototype Credentials (for demonstration only):</div>
        <div>Email: <span className="font-mono">citizen@labellens.com</span></div>
        <div>Password: <span className="font-mono">Citizen@123</span></div>
      </div>
    </div>
  );
};

export default CitizenLogin;
