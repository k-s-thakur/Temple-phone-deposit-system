import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Deposit, TokenItem } from '../types';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Printer,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Hash,
  MapPin,
  User,
  Phone,
  FileText
} from 'lucide-react';

interface DepositViewProps {
  onSuccessDeposit?: () => void;
}

export const DepositView: React.FC<DepositViewProps> = ({ onSuccessDeposit }) => {
  const [tokenNo, setTokenNo] = useState('');
  const [phoneCount, setPhoneCount] = useState<number>(1);
  const [visitorName, setVisitorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [tokensList, setTokensList] = useState<(TokenItem & { is_in_use: boolean; is_available: boolean })[]>([]);
  const [tokenStatus, setTokenStatus] = useState<{
    status: 'idle' | 'available' | 'in_use' | 'not_found' | 'inactive';
    message: string;
  }>({ status: 'idle', message: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedDeposit, setCompletedDeposit] = useState<Deposit | null>(null);

  const tokenInputRef = useRef<HTMLInputElement>(null);

  // Load available tokens
  const loadTokens = async () => {
    try {
      const data = await api.getTokens();
      setTokensList(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  // Check token availability whenever tokenNo changes
  useEffect(() => {
    const trimmed = tokenNo.trim();
    if (!trimmed) {
      setTokenStatus({ status: 'idle', message: '' });
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setTokenStatus({ status: 'not_found', message: 'Token must contain numbers only' });
      return;
    }

    const norm = trimmed.padStart(3, '0');
    const found = tokensList.find((t) => t.token_no === norm);

    if (!found) {
      setTokenStatus({ status: 'not_found', message: `Token ${norm} not found in inventory` });
    } else if (!found.active) {
      setTokenStatus({ status: 'inactive', message: `Token ${norm} is marked inactive` });
    } else if (found.is_in_use) {
      setTokenStatus({ status: 'in_use', message: `Token ${norm} currently has an active deposit!` });
    } else {
      setTokenStatus({ status: 'available', message: `Token ${norm} is available for deposit` });
    }
  }, [tokenNo, tokensList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normToken = tokenNo.trim().padStart(3, '0');
    if (!/^\d+$/.test(normToken)) {
      setError('Please enter a valid numeric token number.');
      return;
    }

    if (phoneCount < 1) {
      setError('Phone count must be at least 1.');
      return;
    }

    const cleanMobile = mobileNumber.replace(/[\s\-\+]/g, '');
    if (!/^\d{10}$/.test(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!visitorName.trim() || visitorName.trim().length < 2) {
      setError('Please enter the visitor name.');
      return;
    }

    setLoading(true);
    const requestId = `req-dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    try {
      const res = await api.createDeposit({
        token_no: normToken,
        visitor_name: visitorName.trim(),
        mobile_number: cleanMobile,
        phone_count: phoneCount,
        storage_location: storageLocation.trim(),
        notes: notes.trim(),
        request_id: requestId
      });

      setCompletedDeposit(res);
      await loadTokens();
      if (onSuccessDeposit) onSuccessDeposit();
    } catch (err: any) {
      setError(err.message || 'Deposit creation failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNext = () => {
    setTokenNo('');
    setPhoneCount(1);
    setVisitorName('');
    setMobileNumber('');
    setStorageLocation('');
    setNotes('');
    setError(null);
    setCompletedDeposit(null);
    setTimeout(() => {
      tokenInputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </span>
            Deposit Visitor Mobile Phone
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Fast counter entry — allocate token and record phone count
          </p>
        </div>

        <button
          onClick={loadTokens}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Tokens</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Unable to process deposit: </span>
            {error}
          </div>
        </div>
      )}

      {/* Main Deposit Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Token Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-amber-600" />
                  Pre-Printed Token Number <span className="text-rose-500">*</span>
                </label>
                {tokenNo && (
                  <span className="text-xs font-mono text-slate-500">
                    Normalized: <strong className="text-slate-800">{tokenNo.trim().padStart(3, '0')}</strong>
                  </span>
                )}
              </div>

              <input
                ref={tokenInputRef}
                type="text"
                value={tokenNo}
                onChange={(e) => setTokenNo(e.target.value)}
                placeholder="e.g. 001, 042"
                required
                autoFocus
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:font-normal placeholder:text-slate-400"
              />

              {/* Token validation feedback */}
              {tokenStatus.message && (
                <div
                  className={`mt-2 text-xs flex items-center gap-1.5 font-medium ${
                    tokenStatus.status === 'available'
                      ? 'text-emerald-700'
                      : tokenStatus.status === 'in_use'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {tokenStatus.status === 'available' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  )}
                  {tokenStatus.message}
                </div>
              )}
            </div>

            {/* Total Phone Count */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                Number of Phones Deposited <span className="text-rose-500">*</span>
              </label>

              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPhoneCount((prev) => Math.max(1, prev - 1))}
                    className="p-3 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Decrease count"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-16 text-center text-xl font-bold font-mono text-slate-900">
                    {phoneCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhoneCount((prev) => prev + 1)}
                    className="p-3 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Increase count"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick Count Pills */}
                <div className="flex items-center space-x-1.5">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPhoneCount(num)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        phoneCount === num
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {num} {num === 1 ? 'phone' : 'phones'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                All phones under this token will be returned together (PRD: full return only).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Visitor Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                <User className="w-4 h-4 text-amber-600" />
                Visitor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Visitor Mobile */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Phone className="w-4 h-4 text-amber-600" />
                Visitor Mobile Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="10-digit mobile (e.g. 9876543210)"
                maxLength={10}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Storage Location */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                Storage Location (Rack / Tray / Slot)
              </label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                placeholder="e.g. Tray A-04 or Rack 2"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                Notes / Phone Description (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Blue pouch, 2 chargers"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="submit"
              disabled={loading || tokenStatus.status === 'in_use' || tokenStatus.status === 'not_found'}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Writing to Server...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Deposit Phones</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmed Deposit & Printable Receipt Modal */}
      {completedDeposit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-bold text-lg">Deposit Successful</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">
                {completedDeposit.deposit_id}
              </span>
            </div>

            {/* Printable Receipt Section */}
            <div id="printable-receipt" className="p-6 bg-white text-slate-900 font-sans">
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h3 className="font-extrabold text-xl tracking-tight uppercase">Sri Temple Mobile Vault</h3>
                <p className="text-xs text-slate-500">Visitor Safe Deposit Receipt</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {new Date(completedDeposit.deposited_at).toLocaleString()}
                </p>
              </div>

              {/* Big Token Highlight */}
              <div className="my-5 text-center bg-amber-50 border-2 border-amber-300 rounded-xl py-3 px-4">
                <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Assigned Token Number
                </div>
                <div className="text-5xl font-black font-mono text-amber-900 my-1 tracking-wider">
                  {completedDeposit.token_no}
                </div>
                <div className="text-xs font-bold text-amber-700">
                  {completedDeposit.phone_count} {completedDeposit.phone_count === 1 ? 'Mobile Phone' : 'Mobile Phones'}
                </div>
              </div>

              <div className="space-y-2 text-xs border-b border-dashed border-slate-300 pb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit ID:</span>
                  <span className="font-mono font-semibold">{completedDeposit.deposit_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Visitor Name:</span>
                  <span className="font-semibold">{completedDeposit.visitor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mobile Number:</span>
                  <span className="font-mono">{completedDeposit.mobile_number}</span>
                </div>
                {completedDeposit.storage_location && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Counter Tray:</span>
                    <span className="font-semibold text-amber-800">{completedDeposit.storage_location}</span>
                  </div>
                )}
                {completedDeposit.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notes:</span>
                    <span>{completedDeposit.notes}</span>
                  </div>
                )}
              </div>

              {/* Terms */}
              <div className="pt-3 text-[10px] text-slate-500 text-center leading-relaxed">
                <p className="font-semibold text-slate-700">Important Collection Rule:</p>
                <p>Present physical Token #{completedDeposit.token_no} at the exit counter.</p>
                <p>All {completedDeposit.phone_count} phones must be collected together in full.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNext}
                className="flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                <span>Deposit Next Visitor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
