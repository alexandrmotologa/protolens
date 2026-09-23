import React, { useState, useEffect } from 'react';
import { X, Search, RotateCcw, Trash2, Clock, CheckCircle2, AlertCircle, ArrowUpRight, Play } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onReplay: (item: HistoryItem) => void;
  onLoadInTab: (item: HistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onReplay,
  onLoadInTab,
}) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const handleClearHistory = async () => {
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      if (res.ok) {
        setHistory([]);
      }
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  };

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.method.toLowerCase().includes(search.toLowerCase()) ||
      item.target.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'success') return item.statusCode === 0;
    if (statusFilter === 'error') return item.statusCode !== 0;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b101f]/98 border-l border-white/10 w-full max-w-md h-full flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1428] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Call History & Replay</h2>
              <p className="text-xs text-slate-400 mt-0.5">All executed unary gRPC & Connect invocations</p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={fetchHistory}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
              title="Refresh History"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition"
              title="Clear All History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-[#090e1c] border-b border-white/10 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by RPC method or host..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/60"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              All ({history.length})
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'success'
                  ? 'bg-emerald-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Success ({history.filter((i) => i.statusCode === 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('error')}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === 'error'
                  ? 'bg-rose-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Errors ({history.filter((i) => i.statusCode !== 0).length})
            </button>
          </div>
        </div>

        {/* History Items Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#070b16]">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-300">No Invocations Recorded</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                Executed calls will be automatically logged here for 1-click replaying and reloading.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isSuccess = item.statusCode === 0;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 space-y-2.5 transition-all"
                >
                  {/* Top Line: Status & Time */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center space-x-2">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className={isSuccess ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {item.statusCode === 0 ? 'OK' : `ERR ${item.statusCode}`}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{item.durationMs.toFixed(1)}ms</span>
                    </div>

                    <span className="text-slate-500 text-[10px]">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Method & Target */}
                  <div>
                    <div className="text-xs font-semibold text-slate-200 truncate">{item.method}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{item.target}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => onLoadInTab(item)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center space-x-1 transition"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Load in Tab</span>
                    </button>
                    <button
                      onClick={() => onReplay(item)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center space-x-1 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Replay</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
