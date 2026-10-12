import { apiFetch } from '../config/api';
import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff, ArrowRight, UserCheck, Lock } from 'lucide-react';

interface AuthViewProps {
  onLogin: (data: { role: 'manager' | 'engineer' | 'driver', username: string, workerData?: any, adminToken?: string }) => void;
  onCancel?: () => void;
}

export function AuthView({ onLogin, onCancel }: AuthViewProps) {
  const [loginMode, setLoginMode] = useState<'staff' | 'admin'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const switchToAdmin = () => {
    setLoginMode('admin');
    setUsername('admin');
    setPassword('');
    setError('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const switchToStaff = () => {
    setLoginMode('staff');
    setUsername('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });
      const data = await res.json();
      if (data.success) {
        onLogin({ role: data.role, username: data.username, workerData: data.workerData, adminToken: data.adminToken });
      } else {
        if (loginMode === 'admin') {
          setError(data.error || 'Invalid administrator credentials.');
        } else {
          setError(data.error || 'Invalid credentials. Please check your username and password.');
        }
      }
    } catch (err) {
      setError('Network connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        
        <div className={`px-6 py-5 text-white text-center relative transition-colors duration-300 ${
          loginMode === 'admin' ? 'bg-slate-900' : 'bg-[#107c41]'
        }`}>
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 mb-2 border border-white/20 shadow-xs">
            {loginMode === 'admin' ? (
              <Lock className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldCheck className="w-6 h-6 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">worksynch</h1>
          <p className="text-xs text-emerald-100 mt-1 font-medium flex items-center justify-center gap-1.5">
            {loginMode === 'admin' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Administrator Master Portal</span>
              </>
            ) : (
              <span>Staff & Dispatcher Portal Login</span>
            )}
          </p>
        </div>

        
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            id="tab-login-staff"
            onClick={switchToStaff}
            className={`py-2.5 text-center flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              loginMode === 'staff'
                ? 'bg-white text-[#107c41] border-b-2 border-[#107c41] font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Staff & Worker</span>
          </button>
          <button
            type="button"
            id="tab-login-admin"
            onClick={switchToAdmin}
            className={`py-2.5 text-center flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              loginMode === 'admin'
                ? 'bg-white text-slate-900 border-b-2 border-slate-900 font-bold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Administrator</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded text-xs text-center font-medium border bg-rose-50 text-rose-700 border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {loginMode === 'admin' ? 'Admin Username' : 'Username, Worker ID, or Email'}
              </label>
              <div className="relative">
                <input
                  id="auth-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={loginMode === 'admin' ? 'e.g. admin' : 'e.g. 08904, martinsabiola@gmail.com, or admin'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#107c41] focus:border-transparent transition-all"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {loginMode === 'admin'
                  ? 'Sign in using your administrator master credentials.'
                  : 'Workers can log in with their assigned Worker ID, Username, Email, or Full Name.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {loginMode === 'admin' ? 'Admin Password' : 'Password'}
                </label>
                {showPassword ? (
                  <button
                    type="button"
                    onClick={() => setShowPassword(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Hide
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPassword(true)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Show
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={loginMode === 'admin' ? 'Enter admin password' : 'Enter account password'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#107c41] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 text-white ${
                loginMode === 'admin'
                  ? 'bg-slate-900 hover:bg-black'
                  : 'bg-[#107c41] hover:bg-[#0b5c30]'
              }`}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{loginMode === 'admin' ? 'Sign In as Administrator' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 rounded-lg font-bold transition-colors border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm mt-2 cursor-pointer"
            >
              Continue to Demo Preview (no login)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

