import React, { useState, useEffect } from 'react';
import { getBackendConfig, saveBackendConfig, BackendMode, api } from '../services/api';
import {
  Settings,
  X,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged
}) => {
  const [mode, setMode] = useState<BackendMode>('mock');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [isEnvConfigured, setIsEnvConfigured] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getBackendConfig();
      setMode(config.mode);
      setAppsScriptUrl(config.appsScriptUrl || '');
      setIsEnvConfigured(Boolean(config.isEnvConfigured));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!appsScriptUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter a Google Apps Script Web App URL first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testConnection(appsScriptUrl.trim());
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveBackendConfig({
      mode,
      appsScriptUrl: appsScriptUrl.trim()
    });
    onConfigChanged();
    onClose();
  };

  const handleResetMockData = () => {
    if (confirm('Are you sure you want to reset the mock database? All local test deposits will be restored to default demo values.')) {
      localStorage.removeItem('temple_phone_deposits');
      localStorage.removeItem('temple_phone_tokens');
      localStorage.removeItem('temple_phone_users');
      localStorage.removeItem('temple_phone_audit_logs');
      alert('Mock database reset to initial seeds!');
      onConfigChanged();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">System Backend Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Operating Backend Engine
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  mode === 'mock'
                    ? 'border-amber-500 bg-amber-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span>Mock Engine (Local)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Runs offline in browser storage with pre-seeded tokens 001-100 and demo accounts. Zero setup required.
                  </p>
                </div>
                <input
                  type="radio"
                  name="backend_mode"
                  checked={mode === 'mock'}
                  onChange={() => setMode('mock')}
                  className="mt-3 text-amber-600 self-start"
                />
              </label>

              <label
                className={`p-4 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all ${
                  mode === 'apps_script'
                    ? 'border-sky-500 bg-sky-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
                    <Server className="w-4 h-4 text-sky-600" />
                    <span>Google Apps Script</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Connects directly to your deployed Apps Script Web App backed by Google Sheets.
                  </p>
                </div>
                <input
                  type="radio"
                  name="backend_mode"
                  checked={mode === 'apps_script'}
                  onChange={() => setMode('apps_script')}
                  className="mt-3 text-sky-600 self-start"
                />
              </label>
            </div>
          </div>

          {/* Apps Script URL input */}
          {mode === 'apps_script' && (
            <div className="space-y-3 p-4 bg-sky-50/50 rounded-xl border border-sky-200 animate-fade-in">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800">
                  Google Apps Script Web App Deployment URL
                </label>
                {isEnvConfigured && (
                  <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                    Auto-configured via .env
                  </span>
                )}
              </div>
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {isEnvConfigured && (
                <p className="text-[11px] text-emerald-700">
                  URL is automatically loaded from <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">VITE_APPS_SCRIPT_URL</code>. You can test connection below.
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {testing ? 'Testing connection...' : 'Test Connection'}
                </button>

                <span className="text-[11px] text-slate-500">
                  See <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">google-apps-script/README.md</code> for setup
                </span>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg flex items-center space-x-2 ${
                    testResult.success
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span className="font-semibold">{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Reset Mock data option */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetMockData}
              className="text-rose-600 hover:text-rose-800 flex items-center space-x-1.5 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Local Test Database</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
