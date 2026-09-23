import React, { useState } from 'react';
import { X, Play, Zap, Gauge, CheckCircle2, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import { BenchmarkRequest, BenchmarkReport, TLSConfig } from '../types';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: string;
  method: string;
  payloadJson: string;
  tls: TLSConfig;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  onClose,
  target,
  method,
  payloadJson,
  tls,
}) => {
  const [concurrency, setConcurrency] = useState(5);
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async () => {
    try {
      setLoading(true);
      setError(null);
      setReport(null);

      const req: BenchmarkRequest = {
        target,
        method,
        payloadJson,
        tls,
        concurrency,
        durationSeconds: duration,
      };

      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Benchmark request failed');
      }

      const data: BenchmarkReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Benchmark failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <div className="bg-[#0b101f]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1428]">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">gRPC Micro-Benchmarking & Load Tester</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Measure throughput (RPS) and latency percentiles (p50/p90/p99) on live target
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-6 bg-[#090e1c] border-b border-white/10 flex flex-col space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                Target Endpoint
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 truncate">
                {target}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                RPC Method
              </label>
              <div className="px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-cyan-300 truncate">
                {method}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-300 font-medium">Concurrency (Workers)</span>
                <span className="text-amber-400 font-mono font-bold">{concurrency}</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-amber-500"
                disabled={loading}
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
                <span>1 worker</span>
                <span>15</span>
                <span>30 workers</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-300 font-medium">Duration (Seconds)</span>
                <span className="text-amber-400 font-mono font-bold">{duration}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-amber-500"
                disabled={loading}
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
                <span>1 sec</span>
                <span>15</span>
                <span>30 sec</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleRun}
              disabled={loading || !target || !method}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all btn-hover ${
                loading || !target || !method
                  ? 'bg-amber-600/40 text-amber-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white shadow-amber-500/20'
              }`}
            >
              <Play className={`w-4 h-4 fill-current ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Benchmarking in Progress...' : 'Start Benchmark'}</span>
            </button>
          </div>
        </div>

        {/* Results / Error Area */}
        <div className="p-6 overflow-y-auto max-h-[50vh] flex-1 bg-[#070b16]">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-3 border-amber-500/20 border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-300">
                Pounding {target} with {concurrency} concurrent workers for {duration} seconds...
              </p>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-[11px] text-slate-400 mb-1">Total Requests</div>
                  <div className="text-xl font-bold font-mono text-white">{report.totalRequests.toLocaleString()}</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-[11px] text-slate-400 mb-1">Throughput (RPS)</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">{report.rps.toFixed(1)}</div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-[11px] text-slate-400 mb-1">Success Rate</div>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    {((report.successfulRequests / Math.max(1, report.totalRequests)) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="text-[11px] text-slate-400 mb-1">Avg Latency</div>
                  <div className="text-xl font-bold font-mono text-amber-400">{report.latencyAvgMs.toFixed(2)} ms</div>
                </div>
              </div>

              {/* Latency Percentiles */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Latency Percentiles
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Min: {report.latencyMinMs.toFixed(2)}ms | Max: {report.latencyMaxMs.toFixed(2)}ms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">p50 (Median)</span>
                    <span className="text-sm font-mono font-semibold text-slate-100">{report.latencyP50Ms.toFixed(2)} ms</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">p90</span>
                    <span className="text-sm font-mono font-semibold text-yellow-300">{report.latencyP90Ms.toFixed(2)} ms</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">p95</span>
                    <span className="text-sm font-mono font-semibold text-amber-300">{report.latencyP95Ms.toFixed(2)} ms</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">p99</span>
                    <span className="text-sm font-mono font-semibold text-orange-400">{report.latencyP99Ms.toFixed(2)} ms</span>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">Failed Requests</span>
                    <span className={`text-sm font-mono font-semibold ${report.failedRequests > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {report.failedRequests}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {!report && !loading && !error && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
              <Gauge className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Ready to Benchmark</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Configure concurrency workers and duration, then hit &ldquo;Start Benchmark&rdquo; to execute load test against the active target RPC.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
