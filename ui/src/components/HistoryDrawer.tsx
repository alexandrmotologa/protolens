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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="bg-[#181b22] border-l border-gray-800 w-full max-w-md h-full flex flex-col shadow-2xl text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-[#16181f]">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Call History & Replay</h2>
              <p className="text-[11px] text-gray-400">All executed unary gRPC & Connect invocations</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={fetchHistory}
              className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition"
              title="Refresh History"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearHistory}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded hover:bg-gray-800 transition"
              title="Clear All History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 border-b border-gray-800/80 bg-[#1a1d26] space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Filter by method or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#12141a] border border-gray-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              All ({history.length})
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              OK ({history.filter((h) => h.statusCode === 0).length})
            </button>
            <button
              onClick={() => setStatusFilter('error')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                statusFilter === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Errors ({history.filter((h) => h.statusCode !== 0).length})
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40 p-2 space-y-1">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 text-xs">
              <Clock className="w-8 h-8 stroke-[1.2] mb-2 opacity-40" />
              <span>No calls found in history</span>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isOk = item.statusCode === 0;
              const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#1a1d25]/60 hover:bg-[#1e222d] border border-gray-800/60 transition group flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {isOk ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-gray-200 truncate" title={item.method}>
                        {item.method.split('/').pop() || item.method}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                        {item.protocol}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-gray-400">{item.durationMs.toFixed(1)}ms</span>
                  </div>

                  <div className="text-[11px] text-gray-400 font-mono truncate" title={item.method}>
                    {item.method}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span className="truncate max-w-[180px]">{item.target}</span>
                    <span>{formattedTime}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-gray-800/50 flex items-center justify-end space-x-1.5 opacity-90 group-hover:opacity-100">
                    <button
                      onClick={() => onLoadInTab(item)}
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-medium flex items-center space-x-1 transition"
                      title="Load into current workbench tab"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      <span>Load in Tab</span>
                    </button>
                    <button
                      onClick={() => onReplay(item)}
                      className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium flex items-center space-x-1 shadow transition"
                      title="Replay invocation immediately"
                    >
                      <Play className="w-3 h-3 fill-current" />
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
