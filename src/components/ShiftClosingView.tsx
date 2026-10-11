import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats, TokenItem } from '../types';
import {
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Layers,
  FileCheck2,
  Calendar
} from 'lucide-react';

export const ShiftClosingView: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Shift reconciliation inputs
  const [physicalPhonesCounted, setPhysicalPhonesCounted] = useState<string>('');
  const [physicalTokensInTray, setPhysicalTokensInTray] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [closingConfirmed, setClosingConfirmed] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        api.getDashboardStats(),
        api.getTokens()
      ]);
      setStats(sData);
      setTokens(tData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const systemPendingPhones = stats?.currentPendingPhones ?? 0;
  const systemActiveTokens = stats?.activeTokensCount ?? 0;
  const totalInventoryTokens = tokens.filter((t) => t.active).length;
  const systemAvailableTokens = totalInventoryTokens - systemActiveTokens;

  const physicalPhones = physicalPhonesCounted !== '' ? parseInt(physicalPhonesCounted, 10) : null;
  const phoneDiscrepancy = physicalPhones !== null ? physicalPhones - systemPendingPhones : null;

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorName.trim()) {
      alert('शिफ्ट क्लोजिंग पर हस्ताक्षर करने के लिए सुपरवाइज़र का नाम अनिवार्य है।');
      return;
    }
    setClosingConfirmed(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            शिफ्ट क्लोजिंग व भौतिक स्टॉक मिलान
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            स्टोरेज ट्रे में रखे वास्तविक फोन का डिजिटल रिकॉर्ड से मिलान करें
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>लाइव गिनती रीफ्रेश करें</span>
        </button>
      </div>

      {/* Main Reconciliation Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* System Digital Expectation */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <div className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                सिस्टम डिजिटल रिकॉर्ड
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs text-slate-600 font-medium">वॉल्ट में लंबित फोन:</span>
                  <span className="text-2xl font-black font-mono text-slate-900">{systemPendingPhones}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs text-slate-600 font-medium">उपयोग में सक्रिय टोकन:</span>
                  <span className="text-xl font-black font-mono text-slate-900">{systemActiveTokens}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">ट्रे में उपलब्ध खाली टोकन:</span>
                  <span className="text-xl font-black font-mono text-slate-900">{systemAvailableTokens}</span>
                </div>
              </div>
            </div>

            {/* Physical Count Form */}
            <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200">
              <div className="text-xs uppercase font-extrabold text-amber-800 tracking-wider">
                काउंटर पर भौतिक गिनती
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    वॉल्ट ट्रे में गिने गए वास्तविक फोन <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={physicalPhonesCounted}
                    onChange={(e) => setPhysicalPhonesCounted(e.target.value)}
                    placeholder="वास्तविक फोन गिनकर संख्या दर्ज करें..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    बॉक्स में अप्रयुक्त खाली टोकन (वैकल्पिक)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={physicalTokensInTray}
                    onChange={(e) => setPhysicalTokensInTray(e.target.value)}
                    placeholder="उपलब्ध टोकन दर्ज करें..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Discrepancy Status Badge */}
          {phoneDiscrepancy !== null && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                phoneDiscrepancy === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                {phoneDiscrepancy === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                )}
                <div>
                  <div className="text-sm font-bold">
                    {phoneDiscrepancy === 0
                      ? 'शून्य अंतर — भौतिक फोन और डिजिटल रिकॉर्ड का 100% सटीक मिलान!'
                      : `विसंगति / अंतर पाया गया: ${Math.abs(phoneDiscrepancy)} ${
                          phoneDiscrepancy > 0 ? 'अधिक फोन (Surplus)' : 'कम फोन (Missing)'
                        }`}
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">
                    भौतिक रूप से गिने फोन: {physicalPhones} | सिस्टम में अपेक्षित: {systemPendingPhones}
                  </div>
                </div>
              </div>

              <div className="text-xl font-mono font-black">
                {phoneDiscrepancy === 0 ? '±0' : (phoneDiscrepancy > 0 ? `+${phoneDiscrepancy}` : `${phoneDiscrepancy}`)}
              </div>
            </div>
          )}

          {/* Supervisor Sign-Off Form */}
          <form onSubmit={handleConfirmClose} className="space-y-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  सुपरवाइज़र / शिफ्ट प्रभारी का नाम <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="उदा. आनंद शर्मा (प्रबंधक)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  शिफ्ट नोट / हैंडओवर टिप्पणी
                </label>
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="उदा. शाम की शिफ्ट बिना किसी समस्या के पूर्ण हुई"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="submit"
                disabled={physicalPhones === null}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>हस्ताक्षर करें और शिफ्ट रिपोर्ट बनाएं</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Completed Shift Closing Printable Report Modal */}
      {closingConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">शिफ्ट क्लोजिंग सारांश रिपोर्ट</span>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">
                {new Date().toLocaleDateString('hi-IN')}
              </span>
            </div>

            <div id="printable-receipt" className="p-6 text-xs text-slate-900 space-y-4">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h3 className="font-extrabold text-lg uppercase">श्री मंदिर मोबाइल वॉल्ट</h3>
                <p className="text-[11px] text-slate-500">आधिकारिक शिफ्ट क्लोजिंग व वॉल्ट मिलान रिपोर्ट</p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  समय: {new Date().toLocaleString('hi-IN')}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-600">आज कुल जमा (डिपॉजिट):</span>
                  <span className="font-bold">{stats?.depositsToday ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">आज कुल वापसी (रिटर्न):</span>
                  <span className="font-bold">{stats?.returnsToday ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">सिस्टम में अपेक्षित लंबित फोन:</span>
                  <span className="font-bold font-mono">{systemPendingPhones}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">भौतिक रूप से गिने गए वास्तविक फोन:</span>
                  <span className="font-bold font-mono">{physicalPhones}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">अंतिम अंतर (विसंगति):</span>
                  <span className={`font-mono font-black ${phoneDiscrepancy === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {phoneDiscrepancy === 0 ? '0 (सटीक मिलान - कोई अंतर नहीं)' : `${phoneDiscrepancy} फोन`}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">सुपरवाइज़र हस्ताक्षर:</span>
                  <span className="font-bold text-slate-900">{supervisorName}</span>
                </div>
                {shiftNotes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">टिप्पणी:</span>
                    <span className="italic">{shiftNotes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>शिफ्ट शीट प्रिंट करें</span>
              </button>

              <button
                type="button"
                onClick={() => setClosingConfirmed(false)}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                पूर्ण हुआ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
