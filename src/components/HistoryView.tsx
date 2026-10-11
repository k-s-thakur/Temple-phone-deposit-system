import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Deposit, Role } from '../types';
import {
  History,
  Search,
  Filter,
  Download,
  Edit,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Hash,
  User,
  Phone,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';

interface HistoryViewProps {
  userRole: Role;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ userRole }) => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DEPOSITED' | 'RETURNED'>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Selected item modal
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

  // Correction Modal (Admin only, PRD Section 3.1 & 14)
  const [correctionTarget, setCorrectionTarget] = useState<Deposit | null>(null);
  const [correctReason, setCorrectReason] = useState('');
  const [correctStatus, setCorrectStatus] = useState<Deposit['status']>('DEPOSITED');
  const [correctLocation, setCorrectLocation] = useState('');
  const [correctNotes, setCorrectNotes] = useState('');
  const [correctLoading, setCorrectLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTransactions({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        date: dateFilter || undefined,
        search: searchQuery || undefined
      });
      setDeposits(data);
    } catch (err: any) {
      setError(err.message || 'लेन-देन इतिहास लोड करने में विफल।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const exportCsv = () => {
    if (deposits.length === 0) return;

    const headers = [
      'Deposit ID',
      'Token No',
      'Visitor Name',
      'Mobile Number',
      'Phone Count',
      'Storage Location',
      'Status',
      'Deposited At',
      'Deposit Operator',
      'Returned At',
      'Retrieval Operator',
      'Notes'
    ];

    const rows = deposits.map((d) => [
      `"${d.deposit_id}"`,
      `"${d.token_no}"`,
      `"${d.visitor_name.replace(/"/g, '""')}"`,
      `"${d.mobile_number}"`,
      d.phone_count,
      `"${(d.storage_location || '').replace(/"/g, '""')}"`,
      `"${d.status}"`,
      `"${d.deposited_at}"`,
      `"${d.deposit_by}"`,
      `"${d.returned_at || ''}"`,
      `"${d.returned_by || ''}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `temple_deposits_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenCorrection = (dep: Deposit) => {
    setCorrectionTarget(dep);
    setCorrectStatus(dep.status);
    setCorrectLocation(dep.storage_location || '');
    setCorrectNotes(dep.notes || '');
    setCorrectReason('');
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget) return;

    if (!correctReason.trim() || correctReason.trim().length < 5) {
      alert('रिकॉर्ड सुधारने के लिए कारण का विस्तृत विवरण अनिवार्य है (न्यूनतम 5 अक्षर)।');
      return;
    }

    setCorrectLoading(true);
    try {
      await api.correctDeposit({
        deposit_id: correctionTarget.deposit_id,
        reason: correctReason.trim(),
        status: correctStatus,
        storage_location: correctLocation.trim(),
        notes: correctNotes.trim()
      });

      setCorrectionTarget(null);
      await fetchHistory();
    } catch (err: any) {
      alert(err.message || 'संशोधन असफल रहा।');
    } finally {
      setCorrectLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <History className="w-5 h-5" />
            </span>
            लेन-देन इतिहास व खोज
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            फोन जमा और वापसी के पिछले रिकॉर्ड खोजें, फ़िल्टर करें और एक्सपोर्ट करें
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchHistory}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>रीफ्रेश करें</span>
          </button>

          <button
            onClick={exportCsv}
            disabled={deposits.length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV एक्सपोर्ट करें</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="टोकन, दर्शनार्थी, मोबाइल, आईडी खोजें..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
            >
              <option value="ALL">सभी स्थितियां (जमा व वापस)</option>
              <option value="DEPOSITED">वॉल्ट में वर्तमान में जमा (DEPOSITED)</option>
              <option value="RETURNED">दर्शनार्थी को वापस सुपुर्द (RETURNED)</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              फ़िल्टर लागू करें
            </button>
            {(searchQuery || statusFilter !== 'ALL' || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDateFilter('');
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-xl font-medium cursor-pointer"
              >
                रीसेट करें
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Transaction Records Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3">टोकन</th>
                <th className="px-5 py-3">डिपॉजिट आईडी</th>
                <th className="px-5 py-3">दर्शनार्थी</th>
                <th className="px-5 py-3 text-center">फोन संख्या</th>
                <th className="px-5 py-3">स्थान / ट्रे</th>
                <th className="px-5 py-3">स्थिति</th>
                <th className="px-5 py-3">समय व ऑपरेटर</th>
                <th className="px-5 py-3 text-right">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deposits.length > 0 ? (
                deposits.map((dep) => (
                  <tr key={dep.deposit_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Token */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-extrabold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-xs">
                        #{dep.token_no}
                      </span>
                    </td>

                    {/* Deposit ID */}
                    <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                      {dep.deposit_id}
                    </td>

                    {/* Visitor */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{dep.visitor_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{dep.mobile_number}</div>
                    </td>

                    {/* Phone Count */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 font-bold font-mono text-slate-800 rounded-full">
                        {dep.phone_count}
                      </span>
                    </td>

                    {/* Storage Location */}
                    <td className="px-5 py-3.5 text-slate-600">
                      {dep.storage_location ? (
                        <span className="font-medium text-slate-800">{dep.storage_location}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {dep.status === 'DEPOSITED' ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                          वॉल्ट में जमा
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          वापस सुपुर्द
                        </span>
                      )}
                    </td>

                    {/* Timestamps */}
                    <td className="px-5 py-3.5 text-[11px] text-slate-500">
                      <div>जमा: {new Date(dep.deposited_at).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })} ({dep.deposit_by})</div>
                      {dep.returned_at && (
                        <div className="text-emerald-700">
                          वापसी: {new Date(dep.returned_at).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })} ({dep.returned_by})
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedDeposit(dep)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="पूर्ण विवरण देखें"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {userRole === 'ADMIN' && (
                        <button
                          onClick={() => handleOpenCorrection(dep)}
                          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="व्यवस्थापक संशोधन (Correction)"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    खोज के अनुसार कोई लेन-देन रिकॉर्ड नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details View Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">लेन-देन पूर्ण विवरण</span>
              <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded">
                {selectedDeposit.deposit_id}
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-amber-50 p-4 rounded-xl border border-amber-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800">आवंटित टोकन</span>
                  <div className="text-3xl font-black font-mono text-amber-950">#{selectedDeposit.token_no}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-amber-800">फोन संख्या</span>
                  <div className="text-2xl font-black font-mono text-slate-900">
                    {selectedDeposit.phone_count} फोन
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-b border-slate-100 pb-3">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">दर्शनार्थी का नाम:</span>
                  <span className="font-bold text-slate-900">{selectedDeposit.visitor_name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">मोबाइल नंबर:</span>
                  <span className="font-mono font-medium">{selectedDeposit.mobile_number}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">स्टोरेज ट्रे/रैक स्थान:</span>
                  <span className="font-semibold text-amber-900">{selectedDeposit.storage_location || 'निर्दिष्ट नहीं'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">वर्तमान स्थिति:</span>
                  <span className="font-bold">{selectedDeposit.status === 'DEPOSITED' ? 'वॉल्ट में जमा' : 'वापस सुपुर्द'}</span>
                </div>
                {selectedDeposit.notes && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">जमा नोट / विवरण:</span>
                    <span className="italic">{selectedDeposit.notes}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-slate-500 text-[11px]">
                <div>जमा समय: {new Date(selectedDeposit.deposited_at).toLocaleString('hi-IN')} (ऑपरेटर: {selectedDeposit.deposit_by})</div>
                {selectedDeposit.returned_at && (
                  <div className="text-emerald-700">
                    वापसी समय: {new Date(selectedDeposit.returned_at).toLocaleString('hi-IN')} (ऑपरेटर: {selectedDeposit.returned_by})
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDeposit(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Controlled Correction Modal (PRD Section 3.1 & 14) */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-scale-up">
            <div className="flex items-center space-x-2 text-amber-800 mb-4 pb-2 border-b border-slate-100">
              <Edit className="w-5 h-5" />
              <h4 className="font-bold text-base text-slate-900">व्यवस्थापक नियंत्रित रिकॉर्ड संशोधन</h4>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              डिपॉजिट <strong>{correctionTarget.deposit_id}</strong> (टोकन #{correctionTarget.token_no}) का संशोधन किया जा रहा है। यह कार्रवाई अपरिवर्तनीय ऑडिट ट्रेल बनाती है।
            </p>

            <form onSubmit={handleSaveCorrection} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">स्थिति (Status)</label>
                <select
                  value={correctStatus}
                  onChange={(e) => setCorrectStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="DEPOSITED">DEPOSITED (वॉल्ट में सक्रिय जमा)</option>
                  <option value="RETURNED">RETURNED (वापस - टोकन रिलीज करें)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">स्टोरेज स्थान / ट्रे</label>
                <input
                  type="text"
                  value={correctLocation}
                  onChange={(e) => setCorrectLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="उदा. ट्रे B-04"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">विवरण / नोट</label>
                <input
                  type="text"
                  value={correctNotes}
                  onChange={(e) => setCorrectNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="उदा. पहचान सत्यापन के बाद समाधान किया गया"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  संशोधन का अनिवार्य कारण <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                  placeholder="रिकॉर्ड में बदलाव का कारण विस्तार से लिखें (न्यूनतम 5 अक्षर)..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={correctLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {correctLoading ? 'सहेजा जा रहा है...' : 'संशोधन लागू व ऑडिट करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
