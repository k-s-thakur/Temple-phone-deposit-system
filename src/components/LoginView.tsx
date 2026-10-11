import React, { useState } from 'react';
import { api, getBackendConfig } from '../services/api';
import { AuthSession } from '../types';
import { Smartphone, Shield, KeyRound, User, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  onOpenSettings: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onOpenSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await api.login(username, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setLoading(true);
    setError(null);
    try {
      const session = await api.login(user, pass);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-slate-100 to-amber-50/40 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-3">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Temple Phone Vault</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deposit & Retrieval Counter Management
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="leading-snug">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or deposit_op"
                required
                autoFocus
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In to Counter</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5" />
              1-Click Demo Accounts
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', 'Admin@123')}
              className="w-full py-2 px-3 text-left bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer group"
            >
              <div>
                <span className="font-semibold text-slate-800 group-hover:text-amber-900">Chief Admin</span>
                <span className="text-slate-400 ml-2 font-mono">admin / Admin@123</span>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-medium">All Roles</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('deposit_op', 'Operator@123')}
              className="w-full py-2 px-3 text-left bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer group"
            >
              <div>
                <span className="font-semibold text-slate-800 group-hover:text-emerald-900">Deposit Operator</span>
                <span className="text-slate-400 ml-2 font-mono">deposit_op / Operator@123</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-medium">Deposit Counter</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('retrieval_op', 'Operator@123')}
              className="w-full py-2 px-3 text-left bg-slate-50 hover:bg-sky-50/70 border border-slate-200 hover:border-sky-300 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer group"
            >
              <div>
                <span className="font-semibold text-slate-800 group-hover:text-sky-900">Retrieval Operator</span>
                <span className="text-slate-400 ml-2 font-mono">retrieval_op / Operator@123</span>
              </div>
              <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.5 rounded font-medium">Return Counter</span>
            </button>
          </div>
        </div>

        {/* Backend Mode switch */}
        <div className="mt-6 text-center">
          {getBackendConfig().isEnvConfigured ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="inline-flex items-center text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                Backend: .env configured
              </span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs text-slate-500 hover:text-amber-700 underline font-medium cursor-pointer"
              >
                Settings
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-xs text-slate-500 hover:text-amber-700 underline font-medium cursor-pointer"
            >
              Configure Google Apps Script Backend URL
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
