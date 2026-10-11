import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Deposit } from '../types';
import {
  Smartphone,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  User,
  Phone,
  Clock,
  MapPin,
  RefreshCw,
  Hash,
  Sparkles
} from 'lucide-react';

interface RetrievalViewProps {
  onSuccessReturn?: () => void;
}

export const RetrievalView: React.FC<RetrievalViewProps> = ({ onSuccessReturn }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [activeDeposit, setActiveDeposit] = useState<Deposit | null>(null);
  const [loading, setLoading] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<Deposit | null>(null);

  // Escalation state (PRD Section 5.3: Lost token or count mismatch)
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateSubmitted, setEscalateSubmitted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lookupToken = async (targetToken: string) => {
    const trimmed = targetToken.trim();
    if (!trimmed) {
      setError('Please enter a token number to search.');
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setError('Token number must contain digits only.');
      return;
    }

    const norm = trimmed.padStart(3, '0');
    setLoading(true);
    setError(null);
    setActiveDeposit(null);
    setSuccessResult(null);

    try {
      const dep = await api.getActiveDepositByToken(norm);
      setActiveDeposit(dep);
    } catch (err: any) {
      setError(err.message || `No active deposit found for Token ${norm}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await lookupToken(tokenInput);
  };

  const handleConfirmReturn = async () => {
    if (!activeDeposit) return;

    setReturnSubmitting(true);
    setError(null);
    const requestId = `req-ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      const res = await api.completeReturn(activeDeposit.token_no, requestId);
      setSuccessResult(res);
      setActiveDeposit(null);
      if (onSuccessReturn) onSuccessReturn();
    } catch (err: any) {
      setError(err.message || 'Return operation failed.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setTokenInput('');
    setActiveDeposit(null);
    setSuccessResult(null);
    setError(null);
    setEscalateModalOpen(false);
    setEscalateReason('');
    setEscalateSubmitted(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;

    try {
      // In PRD Section 5.3: Escalations stop ordinary return and record an audit event for Admin
      await api.correctDeposit({
        deposit_id: activeDeposit?.deposit_id || `TOKEN-${tokenInput}`,
        reason: `[COUNTER ESCALATION] ${escalateReason}`,
        notes: `Escalated: ${escalateReason}`
      });
      setEscalateSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit escalation.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </span>
            Retrieve & Return Mobile Phones
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Enter physical token number to locate active deposit and verify handover
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Lookup/Return Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* Token Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Hash className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              ref={inputRef}
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter Pre-Printed Token No (e.g. 001, 042)"
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Find Active Deposit</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Active Deposit Verification Card */}
      {activeDeposit && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-sky-400 overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="bg-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                Token #{activeDeposit.token_no}
              </span>
              <span className="text-sm font-semibold">Active Deposit Record</span>
            </div>
            <span className="text-xs font-mono bg-black/20 px-2 py-0.5 rounded">
              {activeDeposit.deposit_id}
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* BIG HIGHLIGHT: Number of Phones to hand over */}
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 text-center">
              <div className="text-xs uppercase font-extrabold tracking-wider text-sky-800">
                Counter Handover Verification
              </div>
              <div className="my-2 flex items-center justify-center space-x-3">
                <span className="text-5xl font-black font-mono text-sky-950">
                  {activeDeposit.phone_count}
                </span>
                <span className="text-xl font-bold text-sky-800">
                  {activeDeposit.phone_count === 1 ? 'Mobile Phone' : 'Mobile Phones'}
                </span>
              </div>
              <div className="inline-flex items-center space-x-1.5 bg-sky-100 text-sky-900 px-3 py-1 rounded-full text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-sky-700" />
                <span>Full return required — partial return is prohibited by system policy</span>
              </div>
            </div>

            {/* Visitor & Storage Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Visitor Information
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">{activeDeposit.visitor_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm font-mono text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{activeDeposit.mobile_number}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Storage & Intake Audit
                </div>
                {activeDeposit.storage_location ? (
                  <div className="flex items-center space-x-2 text-sm text-slate-800 font-semibold">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <span>Location: {activeDeposit.storage_location}</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No specific storage tray recorded</div>
                )}
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Deposited: {new Date(activeDeposit.deposited_at).toLocaleTimeString()} ({activeDeposit.deposit_by})</span>
                </div>
                {activeDeposit.notes && (
                  <div className="text-xs text-slate-600 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                    <strong>Notes:</strong> {activeDeposit.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Actions: Return Confirm or Escalate */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEscalateModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Lost Token / Mismatch Escalation</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={returnSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                {returnSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Confirming Return...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirm Handover of All {activeDeposit.phone_count} Phones</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Success View */}
      {successResult && (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-400 p-8 text-center animate-scale-up">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Phones Returned Successfully!</h3>
          <p className="text-sm text-slate-600 mt-1">
            Token <strong>#{successResult.token_no}</strong> has been marked returned and released back to active inventory.
          </p>

          <div className="my-6 inline-block bg-slate-50 border border-slate-200 rounded-xl p-4 text-left max-w-sm w-full text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Deposit ID:</span>
              <span className="font-mono font-semibold">{successResult.deposit_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Returned Phones:</span>
              <span className="font-bold text-emerald-700">{successResult.phone_count} Phones</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Visitor:</span>
              <span className="font-semibold">{successResult.visitor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Return Timestamp:</span>
              <span>{new Date(successResult.returned_at || Date.now()).toLocaleTimeString()}</span>
            </div>
          </div>

          <div>
            <button
              onClick={handleResetForNext}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all inline-flex items-center space-x-2 text-sm cursor-pointer"
            >
              <span>Process Next Return</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Escalation Modal (PRD Section 5.3) */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-scale-up">
            <div className="flex items-center space-x-3 text-amber-800 mb-4">
              <div className="p-2 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Escalate Issue to Admin</h4>
                <p className="text-xs text-slate-500">PRD 5.3: Disputed identity, count mismatch, or lost token</p>
              </div>
            </div>

            {escalateSubmitted ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">Escalation Recorded in Audit Logs</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ordinary return has been halted. Chief Admin has been alerted to review the discrepancy.
                </p>
                <button
                  onClick={handleResetForNext}
                  className="mt-4 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close & Continue
                </button>
              </div>
            ) : (
              <form onSubmit={handleEscalateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Select Exception Type
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium"
                    onChange={(e) => setEscalateReason(e.target.value)}
                  >
                    <option value="">-- Choose Exception --</option>
                    <option value="Physical Token Lost by Visitor">Physical Token Lost by Visitor</option>
                    <option value="Disputed Phone Count Mismatch">Disputed Phone Count Mismatch</option>
                    <option value="Disputed Visitor Identity">Disputed Visitor Identity</option>
                    <option value="Damaged or Misplaced Phone">Damaged or Misplaced Phone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Details / Reason Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={escalateReason}
                    onChange={(e) => setEscalateReason(e.target.value)}
                    placeholder="Describe the discrepancy in detail for the Admin..."
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEscalateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Submit Escalation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
