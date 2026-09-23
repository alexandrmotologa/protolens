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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e222b] border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#181b22]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">gRPC Micro-Benchmarking & Load Tester</h2>
              <p className="text-xs text-gray-400">
                Measure throughput (RPS) and latency percentiles (p50/p90/p99) on live target
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-6 bg-[#16181f] border-b border-gray-800 flex flex-col space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                Target Endpoint
              </label>
              <div className="px-3 py-1.5 rounded-lg bg-[#12141a] border border-gray-800 text-xs font-mono text-gray-300 truncate">
                {target}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                RPC Method
              </label>
              <div className="px-3 py-1.5 rounded-lg bg-[#12141a] border border-gray-800 text-xs font-mono text-indigo-400 truncate">
                {method}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 font-medium">Concurrency (Workers)</span>
                <span className="text-amber-400 font-mono font-semibold">{concurrency}</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                disabled={loading}
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>1</span>
                <span>15</span>
                <span>30</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 font-medium">Duration (Seconds)</span>
                <span className="text-amber-400 font-mono font-semibold">{duration}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                disabled={loading}
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>1s</span>
                <span>15s</span>
                <span>30s</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleRun}
              disabled={loading}
              className={`px-5 py-2 rounded-lg font-medium text-xs flex items-center space-x-2 shadow-lg transition ${
                loading
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30'
              }`}
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Running Benchmark ({duration}s)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Launch Benchmark</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Report Output */}
        <div className="p-6 bg-[#1a1d24] flex-1 overflow-y-auto min-h-[300px]">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!report && !error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-xs">
              <Gauge className="w-10 h-10 stroke-[1.2] mb-3 opacity-30 text-amber-400" />
              <p>Configure concurrency and click Launch to test performance.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-amber-400 text-xs space-y-3">
              <Activity className="w-10 h-10 animate-spin text-amber-500" />
              <p className="font-mono">Flooding {concurrency} concurrent streams...</p>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-5">
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#14161d] border border-gray-800 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    Throughput
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {report.rps} <span className="text-xs font-normal text-gray-400">RPS</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14161d] border border-gray-800 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    Total Calls
                  </div>
                  <div className="text-2xl font-bold font-mono text-white">
                    {report.totalRequests.toLocaleString()}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14161d] border border-gray-800 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    Success Rate
                  </div>
                  <div className="text-2xl font-bold font-mono text-cyan-400">
                    {report.totalRequests > 0
                      ? ((report.successfulRequests / report.totalRequests) * 100).toFixed(1)
                      : 0}
                    %
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#14161d] border border-gray-800 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                    Avg Latency
                  </div>
                  <div className="text-2xl font-bold font-mono text-amber-400">
                    {report.latencyAvgMs} <span className="text-xs font-normal text-gray-400">ms</span>
                  </div>
                </div>
              </div>

              {/* Latency Percentiles Card */}
              <div className="p-4 rounded-xl bg-[#14161d] border border-gray-800">
                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-300 mb-3">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Latency Percentiles (ms)</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-[#1e222b] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-medium">Min</span>
                    <span className="font-mono text-emerald-400 font-bold">{report.latencyMinMs}</span>
                  </div>
                  <div className="p-2 rounded bg-[#1e222b] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-medium">p50 (Median)</span>
                    <span className="font-mono text-blue-400 font-bold">{report.latencyP50Ms}</span>
                  </div>
                  <div className="p-2 rounded bg-[#1e222b] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-medium">p90</span>
                    <span className="font-mono text-indigo-400 font-bold">{report.latencyP90Ms}</span>
                  </div>
                  <div className="p-2 rounded bg-[#1e222b] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-medium">p95</span>
                    <span className="font-mono text-purple-400 font-bold">{report.latencyP95Ms}</span>
                  </div>
                  <div className="p-2 rounded bg-[#1e222b] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-medium">p99</span>
                    <span className="font-mono text-pink-400 font-bold">{report.latencyP99Ms}</span>
                  </div>
                  <div className="p-2 rounded bg-[#1e222b] border border-gray-800/80">
                    <span className="text-[10px] text-gray-400 block font-medium">Max</span>
                    <span className="font-mono text-red-400 font-bold">{report.latencyMaxMs}</span>
                  </div>
                </div>
              </div>

              {/* Status Codes Breakdown */}
              <div className="p-4 rounded-xl bg-[#14161d] border border-gray-800">
                <div className="flex items-center space-x-2 text-xs font-semibold text-gray-300 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Status Codes Recorded</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.statusCodes).map(([code, count]) => (
                    <div
                      key={code}
                      className="px-3 py-1 rounded-lg bg-[#1e222b] border border-gray-800 flex items-center space-x-2 text-xs"
                    >
                      <span className="font-mono font-medium text-gray-300">{code}</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-800 font-mono text-[10px] text-emerald-400 font-semibold">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
