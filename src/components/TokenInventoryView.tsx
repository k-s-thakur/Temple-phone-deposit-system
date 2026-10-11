import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TokenItem } from '../types';
import {
  Database,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Hash,
  Layers,
  Sparkles
} from 'lucide-react';

export const TokenInventoryView: React.FC = () => {
  const [tokens, setTokens] = useState<(TokenItem & { is_in_use: boolean; is_available: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterState, setFilterState] = useState<'ALL' | 'AVAILABLE' | 'IN_USE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add token modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newTokenNo, setNewTokenNo] = useState('');
  const [newTokenNotes, setNewTokenNotes] = useState('');

  // Batch add modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchStart, setBatchStart] = useState('501');
  const [batchEnd, setBatchEnd] = useState('600');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTokens();
      setTokens(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tokens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const filteredTokens = tokens.filter((t) => {
    if (searchQuery && !t.token_no.includes(searchQuery)) return false;
    if (filterState === 'AVAILABLE') return t.is_available;
    if (filterState === 'IN_USE') return t.is_in_use;
    if (filterState === 'INACTIVE') return !t.active;
    return true;
  });

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenNo.trim()) return;

    setActionLoading(true);
    try {
      await api.addToken(newTokenNo.trim(), newTokenNotes.trim());
      setAddModalOpen(false);
      setNewTokenNo('');
      setNewTokenNotes('');
      await fetchTokens();
    } catch (err: any) {
      alert(err.message || 'Failed to add token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(batchStart, 10);
    const end = parseInt(batchEnd, 10);

    if (isNaN(start) || isNaN(end) || start > end) {
      alert('Please enter a valid range (start <= end).');
      return;
    }

    if (end - start > 100) {
      alert('Please batch add at most 100 tokens at a time.');
      return;
    }

    setActionLoading(true);
    try {
      await api.addTokenBatch(start, end);
      setBatchModalOpen(false);
      await fetchTokens();
    } catch (err: any) {
      alert(err.message || 'Batch addition failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleToken = async (tokenNo: string, currentActive: boolean) => {
    try {
      await api.toggleToken(tokenNo, !currentActive);
      await fetchTokens();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle token state.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Database className="w-5 h-5" />
            </span>
            Physical Token Inventory
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pre-printed physical tokens registry, availability states, and batch initialization
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTokens}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setBatchModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Batch Add Range</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Token</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search token number..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: `All (${tokens.length})` },
            { id: 'AVAILABLE', label: `Available (${tokens.filter((t) => t.is_available).length})` },
            { id: 'IN_USE', label: `In Use (${tokens.filter((t) => t.is_in_use).length})` },
            { id: 'INACTIVE', label: `Deactivated (${tokens.filter((t) => !t.active).length})` }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterState(item.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterState === item.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Token Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
          {filteredTokens.map((t) => (
            <div
              key={t.token_no}
              className={`p-3 rounded-xl border text-center transition-all relative group ${
                !t.active
                  ? 'bg-slate-100 border-slate-200 opacity-60'
                  : t.is_in_use
                  ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                  : 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-500'
              }`}
            >
              <div className="font-mono text-base font-extrabold text-slate-900">
                #{t.token_no}
              </div>

              <div className="mt-1 text-[10px] font-bold">
                {!t.active ? (
                  <span className="text-slate-500">Deactivated</span>
                ) : t.is_in_use ? (
                  <span className="text-amber-700">In Vault</span>
                ) : (
                  <span className="text-emerald-700">Available</span>
                )}
              </div>

              {/* Hover Toggle Action */}
              <button
                onClick={() => handleToggleToken(t.token_no, t.active)}
                className="mt-2 text-[10px] underline text-slate-500 hover:text-slate-800 hidden group-hover:block w-full cursor-pointer"
              >
                {t.active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>

        {filteredTokens.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            No tokens found in this category.
          </div>
        )}
      </div>

      {/* Add Single Token Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 animate-scale-up">
            <h4 className="font-bold text-base text-slate-900 mb-1">Add Token to Inventory</h4>
            <p className="text-xs text-slate-500 mb-4">
              Enter digits printed on physical token. Leading zeros will be auto-preserved (e.g. 042).
            </p>

            <form onSubmit={handleAddSingle} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Token Number (Digits)</label>
                <input
                  type="text"
                  required
                  value={newTokenNo}
                  onChange={(e) => setNewTokenNo(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Inventory Notes (Optional)</label>
                <input
                  type="text"
                  value={newTokenNotes}
                  onChange={(e) => setNewTokenNotes(e.target.value)}
                  placeholder="e.g. Metal brass token"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Add Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Add Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 animate-scale-up">
            <h4 className="font-bold text-base text-slate-900 mb-1">Batch Generate Tokens</h4>
            <p className="text-xs text-slate-500 mb-4">
              Add a sequence of physical tokens in one operation (e.g. 101 to 150).
            </p>

            <form onSubmit={handleBatchAdd} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Number</label>
                  <input
                    type="number"
                    required
                    value={batchStart}
                    onChange={(e) => setBatchStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Number</label>
                  <input
                    type="number"
                    required
                    value={batchEnd}
                    onChange={(e) => setBatchEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {actionLoading ? 'Generating...' : 'Generate Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
