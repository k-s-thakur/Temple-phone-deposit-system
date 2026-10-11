import React, { useState, useEffect } from 'react';
import { api, getBackendConfig, saveBackendConfig, BackendMode } from '../services/api';
import { AuthSession } from '../types';
import {
  Smartphone,
  User,
  Lock,
  Unlock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Server,
  Database,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [backendConfig, setBackendConfig] = useState(getBackendConfig());
  const [showInstructions, setShowInstructions] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);

  useEffect(() => {
    setBackendConfig(getBackendConfig());
  }, []);

  const isLocked = Boolean(
    error && (
      error.toLowerCase().includes('lock') ||
      error.includes('लॉक') ||
      error.includes('failed login attempts')
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('कृपया यूज़रनेम और पासवर्ड दोनों दर्ज करें।');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const session = await api.login(username, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setError(err.message || 'लॉगिन असफल रहा। कृपया यूज़रनेम और पासवर्ड जांचें।');
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyUnlock = async () => {
    if (!username.trim() || !password) {
      setError('अनलॉक करने हेतु कृपया यूज़रनेम और पासवर्ड दर्ज करें।');
      return;
    }

    setUnlockLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const res = await api.emergencyUnlock(username.trim(), password);
      setSuccessNotice(res.message || 'खाता सफलतापूर्वक अनलॉक कर दिया गया है! अब आप लॉगिन कर सकते हैं।');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'अनलॉक प्रयास विफल रहा। कृपया सही पासवर्ड दर्ज करें या नीचे दिए गए अन्य तरीके अपनाएं।');
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleToggleBackendMode = () => {
    const nextMode: BackendMode = backendConfig.mode === 'apps_script' ? 'mock' : 'apps_script';
    const updated = { ...backendConfig, mode: nextMode };
    saveBackendConfig(updated);
    setBackendConfig(updated);
    setError(null);
    setSuccessNotice(
      nextMode === 'mock'
        ? 'लोकल / मॉक टेस्ट मोड चालू हो गया है! अब आप तुरंत लॉगिन कर सकते हैं।'
        : 'गूगल शीट्स मोड (Google Apps Script) चालू हो गया है।'
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-slate-100 to-amber-50/40 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8">
        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md mb-3">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">श्री मंदिर मोबाइल वॉल्ट</h1>
          <p className="text-sm text-slate-500 mt-1">
            मोबाइल जमा व वापसी काउंटर प्रबंधन
          </p>
        </div>

        {/* Success Notice */}
        {successNotice && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div className="leading-snug">{successNotice}</div>
          </div>
        )}

        {/* Regular or Lockout Error */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-rose-800 text-sm animate-fade-in">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="leading-snug font-medium">{error}</div>
            </div>

            {/* Lockout Resolution Options */}
            {isLocked && (
              <div className="pt-2 border-t border-rose-200/80 space-y-2 text-xs">
                <p className="font-semibold text-rose-900">
                  खाता अनलॉक करने के त्वरित विकल्प:
                </p>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  {/* Action 1: Attempt direct unlock */}
                  <button
                    type="button"
                    onClick={handleEmergencyUnlock}
                    disabled={unlockLoading}
                    className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-white hover:bg-rose-100/60 border border-rose-300 rounded-lg text-rose-800 font-semibold cursor-pointer transition-colors shadow-2xs"
                  >
                    <Unlock className="w-4 h-4 text-rose-600" />
                    <span>
                      {unlockLoading ? 'अनलॉक हो रहा है...' : 'दर्ज पासवर्ड से तुरंत अनलॉक करें'}
                    </span>
                  </button>

                  {/* Action 2: Switch to Mock Mode */}
                  {backendConfig.mode === 'apps_script' && (
                    <button
                      type="button"
                      onClick={handleToggleBackendMode}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      <Database className="w-4 h-4" />
                      <span>मॉक/लोकल मोड में स्विच करें (तत्काल लॉगिन)</span>
                    </button>
                  )}
                </div>

                {/* Action 3: Google Sheets manual unlock guide */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 text-[11px] underline cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Google Sheets से 1-क्लिक अनलॉक करने की विधि देखें</span>
                    {showInstructions ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showInstructions && (
                    <div className="mt-2 p-3 bg-white/90 rounded-lg border border-slate-200 text-slate-700 text-[11px] space-y-1.5 leading-relaxed font-sans">
                      <p className="font-bold text-slate-900">Google Sheet से अनलॉक करने के 2 तरीके:</p>
                      <div className="pl-1 space-y-1">
                        <div>
                          <strong>तरीका 1 (शीट में):</strong> अपनी Google Sheet खोलें ➔ <strong>'Users'</strong> शीट पर जाएं ➔ <strong>admin</strong> वाली पंक्ति में <strong>failed_login_count</strong> (कॉलम J) को <strong>0</strong> कर दें।
                        </div>
                        <div>
                          <strong>तरीका 2 (Apps Script में):</strong> Apps Script एडिटर खोलें ➔ ऊपर टूलबार में <strong>unlockAllUsers</strong> चुनें ➔ <strong>Run</strong> दबाएं।
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              यूज़रनेम (लॉगिन आईडी)
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="उदा. admin या deposit_op"
                required
                autoFocus
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              पासवर्ड
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
                <span>काउंटर में लॉगिन करें</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Backend mode indicator & quick switch */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            {backendConfig.mode === 'apps_script' ? (
              <Server className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Database className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="text-[11px]">
              {backendConfig.mode === 'apps_script'
                ? 'गूगल शीट्स कनेक्टेड'
                : 'मॉक टेस्ट मोड (लोकल)'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggleBackendMode}
            className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>
              {backendConfig.mode === 'apps_script'
                ? 'मॉक मोड में बदलें'
                : 'गूगल शीट्स में बदलें'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

