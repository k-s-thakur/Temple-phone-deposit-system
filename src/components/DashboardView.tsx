import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Users,
  ShieldCheck,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            Counter Operations Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time live metrics, vault inventory, and counter throughput
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* 4 Main Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Current Pending Phones in Vault */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Pending in Vault
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-black font-mono text-slate-900">
              {stats?.currentPendingPhones ?? 0}
            </span>
            <span className="text-sm font-semibold text-slate-500">Phones</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-amber-700">{stats?.activeTokensCount ?? 0} Active Tokens</span>
            <span>currently deposited</span>
          </div>
        </div>

        {/* Active Tokens */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Tokens in Use
            </span>
            <span className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-black font-mono text-slate-900">
              {stats?.activeTokensCount ?? 0}
            </span>
            <span className="text-sm font-semibold text-slate-500">Tokens</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Assigned to temple visitors
          </div>
        </div>

        {/* Today's Deposits */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Today's Deposits
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-black font-mono text-slate-900">
              {stats?.depositsToday ?? 0}
            </span>
            <span className="text-sm font-semibold text-slate-500">Transactions</span>
          </div>
          <div className="mt-2 text-xs text-emerald-700 font-medium">
            Recorded since shift start
          </div>
        </div>

        {/* Today's Returns */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              Today's Returns
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-4xl font-black font-mono text-slate-900">
              {stats?.returnsToday ?? 0}
            </span>
            <span className="text-sm font-semibold text-slate-500">Returned</span>
          </div>
          <div className="mt-2 text-xs text-indigo-700 font-medium">
            Tokens released to inventory
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Fast Deposit Counter</h3>
            <p className="text-xs text-amber-100 mt-1 max-w-sm">
              Rapid intake form for allocating pre-printed tokens and printing deposit receipts.
            </p>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('deposit')}
                className="mt-4 px-4 py-2 bg-white text-amber-800 font-bold text-xs rounded-xl hover:bg-amber-50 transition-colors shadow-xs cursor-pointer"
              >
                Open Deposit Window
              </button>
            )}
          </div>
          <ArrowDownLeft className="w-16 h-16 text-white/20 hidden sm:block" />
        </div>

        <div className="bg-gradient-to-br from-sky-600 to-indigo-600 rounded-2xl p-6 text-white shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Full Return Counter</h3>
            <p className="text-xs text-sky-100 mt-1 max-w-sm">
              Token lookup window for verifying phone count and releasing tokens back to active inventory.
            </p>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('retrieval')}
                className="mt-4 px-4 py-2 bg-white text-sky-800 font-bold text-xs rounded-xl hover:bg-sky-50 transition-colors shadow-xs cursor-pointer"
              >
                Open Retrieval Window
              </button>
            )}
          </div>
          <ArrowUpRight className="w-16 h-16 text-white/20 hidden sm:block" />
        </div>
      </div>

      {/* Staff Activity Breakdown Table (PRD Section 13) */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-900 text-sm">Operator-Wise Counter Throughput</h3>
          </div>
          <span className="text-xs text-slate-500">Live Shift Breakdown</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3">Staff Operator</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3 text-center">Deposits Done</th>
                <th className="px-6 py-3 text-center">Phones Taken In</th>
                <th className="px-6 py-3 text-center">Returns Done</th>
                <th className="px-6 py-3 text-center">Phones Returned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.operatorStats && stats.operatorStats.length > 0 ? (
                stats.operatorStats.map((op) => (
                  <tr key={op.operatorId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      <div>{op.displayName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{op.operatorId}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                        {op.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-900">
                      {op.depositsCount}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-emerald-700">
                      {op.phonesDeposited}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-slate-900">
                      {op.returnsCount}
                    </td>
                    <td className="px-6 py-3.5 text-center font-bold text-sky-700">
                      {op.phonesReturned}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No operator records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
