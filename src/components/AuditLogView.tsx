import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(200);
      setLogs(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        log.audit_id.toLowerCase().includes(q) ||
        log.user_id.toLowerCase().includes(q) ||
        log.entity_id.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DEPOSIT':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">DEPOSIT (जमा)</span>;
      case 'RETURN':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 font-bold px-2 py-0.5 rounded text-[10px]">RETURN (वापसी)</span>;
      case 'CORRECTION':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">CORRECTION (संशोधन)</span>;
      case 'LOGIN':
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 font-bold px-2 py-0.5 rounded text-[10px]">LOGIN (लॉगिन)</span>;
      case 'FAILED_LOGIN':
        return <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded text-[10px]">FAILED LOGIN (विफल)</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">{action}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            सिस्टम सुरक्षा ऑडिट लॉग्स
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            लॉगिन, डिपॉजिट, वापसी, संशोधन और उपयोगकर्ता परिवर्तनों का अपरिवर्तनीय इतिहास
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>लॉग्स रीफ्रेश करें</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ऑडिट आईडी, ऑपरेटर, विवरण खोजें..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500">कार्रवाई:</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
          >
            <option value="ALL">सभी रिकॉर्ड की गई कार्रवाइयां</option>
            <option value="DEPOSIT">DEPOSIT (फोन जमा)</option>
            <option value="RETURN">RETURN (फोन वापसी)</option>
            <option value="CORRECTION">CORRECTION (संशोधन)</option>
            <option value="LOGIN">LOGIN (लॉगिन)</option>
            <option value="FAILED_LOGIN">FAILED_LOGIN (विफल लॉगिन)</option>
            <option value="USER_CREATE">USER_CREATE (खाता निर्माण)</option>
            <option value="USER_UPDATE">USER_UPDATE (खाता अपडेट)</option>
            <option value="TOKEN_CREATE">TOKEN_CREATE (टोकन निर्माण)</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-5 py-3">दिनांक व समय</th>
                <th className="px-5 py-3">ऑडिट आईडी</th>
                <th className="px-5 py-3">कार्रवाई</th>
                <th className="px-5 py-3">ऑपरेटर (यूज़र)</th>
                <th className="px-5 py-3">इकाई आईडी</th>
                <th className="px-5 py-3">परिणाम</th>
                <th className="px-5 py-3">ऑडिट विवरण</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('hi-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                    {log.audit_id}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    @{log.user_id}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-700">
                    {log.entity_id || '—'}
                  </td>
                  <td className="px-5 py-3">
                    {log.result === 'SUCCESS' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        सफल (SUCCESS)
                      </span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                        <XCircle className="w-3 h-3" />
                        विफल (FAILURE)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
