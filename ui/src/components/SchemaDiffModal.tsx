import React, { useState } from 'react';
import { X, GitCompare, AlertTriangle, PlusCircle, CheckCircle, FileCode, Play, Layers } from 'lucide-react';
import { SchemaDiffReport } from '../types';

interface SchemaDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaDiffModal: React.FC<SchemaDiffModalProps> = ({ isOpen, onClose }) => {
  const [targetProto, setTargetProto] = useState('');
  const [baseProto, setBaseProto] = useState('');
  const [useCurrentAsBase, setUseCurrentAsBase] = useState(true);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SchemaDiffReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunDiff = async () => {
    try {
      setLoading(true);
      setError(null);
      setReport(null);

      const res = await fetch('/api/schema/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseProto: useCurrentAsBase ? '' : baseProto,
          targetProto,
          baseFilename: 'base.proto',
          targetFilename: 'target.proto',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Schema comparison failed');
      }

      const data: SchemaDiffReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Diff computation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e222b] border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#181b22]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Protobuf Schema Diff & Breaking Changes</h2>
              <p className="text-xs text-gray-400">
                Detect field tag alterations, removals, and signature incompatibilities before deployment
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

        {/* Inputs */}
        <div className="p-6 bg-[#16181f] border-b border-gray-800 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label className="text-xs text-gray-400 font-medium">Base Schema:</label>
              <button
                type="button"
                onClick={() => setUseCurrentAsBase(!useCurrentAsBase)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  useCurrentAsBase
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {useCurrentAsBase ? 'Using Currently Loaded Workspace' : 'Custom Base Proto'}
              </button>
            </div>
            <button
              onClick={handleRunDiff}
              disabled={loading || !targetProto.trim()}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow transition ${
                loading || !targetProto.trim()
                  ? 'bg-pink-600/40 text-pink-200 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-500 text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Analyzing Schema...' : 'Run Diff Analysis'}</span>
            </button>
          </div>

          <div className={`grid ${useCurrentAsBase ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            {!useCurrentAsBase && (
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                  Base Proto Definition (.proto)
                </label>
                <textarea
                  value={baseProto}
                  onChange={(e) => setBaseProto(e.target.value)}
                  placeholder={`syntax = "proto3";\npackage service.v1;\n...`}
                  rows={6}
                  className="w-full bg-[#12141a] border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1">
                Target / Modified Proto Definition (.proto)
              </label>
              <textarea
                value={targetProto}
                onChange={(e) => setTargetProto(e.target.value)}
                placeholder={`syntax = "proto3";\npackage service.v1;\n\n// Paste new or modified proto content here to check compatibility...`}
                rows={6}
                className="w-full bg-[#12141a] border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="p-6 bg-[#1a1d24] flex-1 overflow-y-auto min-h-[280px]">
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!report && !error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-xs">
              <FileCode className="w-10 h-10 stroke-[1.2] mb-3 opacity-30 text-pink-400" />
              <p>Paste the modified protobuf definition above and run diff to check compatibility.</p>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    report.hasBreakingChanges
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold block">
                      Breaking Changes
                    </span>
                    <span className="text-2xl font-bold font-mono">{report.totalBreaking}</span>
                  </div>
                  {report.hasBreakingChanges ? (
                    <AlertTriangle className="w-7 h-7 shrink-0 text-red-400" />
                  ) : (
                    <CheckCircle className="w-7 h-7 shrink-0 text-emerald-400" />
                  )}
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold block">
                      Backward-Safe Additions
                    </span>
                    <span className="text-2xl font-bold font-mono">{report.totalAdditions}</span>
                  </div>
                  <PlusCircle className="w-7 h-7 shrink-0 text-emerald-400" />
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-semibold block">
                      Total Alterations
                    </span>
                    <span className="text-2xl font-bold font-mono">{report.diffs.length}</span>
                  </div>
                  <Layers className="w-7 h-7 shrink-0 text-blue-400" />
                </div>
              </div>

              {/* Differences List */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Detailed Differences ({report.diffs.length})
                </h3>

                {report.diffs.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#14161d] border border-gray-800 text-xs text-emerald-400 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Both schemas are identical. No breaking or additive differences detected.</span>
                  </div>
                ) : (
                  report.diffs.map((diff, index) => {
                    const isBreaking = diff.type === 'BREAKING';

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border text-xs flex items-start justify-between space-x-3 transition ${
                          isBreaking
                            ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                            : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isBreaking
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {diff.type}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                              {diff.category}
                            </span>
                            <span className="font-mono text-gray-300 font-semibold">{diff.location}</span>
                          </div>
                          <p className="text-gray-300 font-sans text-xs">{diff.description}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
