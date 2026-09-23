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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <div className="bg-[#0b101f]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1428]">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Protobuf Schema Diff & Breaking Changes</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Detect field tag alterations, removals, and signature incompatibilities before deployment
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

        {/* Inputs */}
        <div className="p-6 bg-[#090e1c] border-b border-white/10 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <label className="text-xs text-slate-300 font-medium">Base Schema:</label>
              <button
                type="button"
                onClick={() => setUseCurrentAsBase(!useCurrentAsBase)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  useCurrentAsBase
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {useCurrentAsBase ? 'Using Currently Loaded Workspace' : 'Custom Base Proto'}
              </button>
            </div>
            <button
              onClick={handleRunDiff}
              disabled={loading || !targetProto.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg transition-all btn-hover ${
                loading || !targetProto.trim()
                  ? 'bg-pink-600/40 text-pink-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white shadow-pink-500/20'
              }`}
            >
              <Play className={`w-3.5 h-3.5 fill-current ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing Schema...' : 'Compute Schema Diff'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!useCurrentAsBase && (
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Base Protobuf Definition
                </label>
                <textarea
                  rows={6}
                  value={baseProto}
                  onChange={(e) => setBaseProto(e.target.value)}
                  placeholder={'syntax = "proto3";\nservice Greeter {\n  rpc SayHello (Req) returns (Res);\n}'}
                  className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/60 resize-none"
                />
              </div>
            )}
            <div className={useCurrentAsBase ? 'col-span-2' : ''}>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Target Protobuf Definition (New Version to Compare)
              </label>
              <textarea
                rows={useCurrentAsBase ? 5 : 6}
                value={targetProto}
                onChange={(e) => setTargetProto(e.target.value)}
                placeholder={'syntax = "proto3";\nservice Greeter {\n  rpc SayHello (Req) returns (Res);\n  rpc NewRpc (Req) returns (Res);\n}'}
                className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-pink-500/60 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Diff Report Output */}
        <div className="p-6 overflow-y-auto max-h-[50vh] flex-1 bg-[#070b16]">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {report && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  {report.hasBreakingChanges ? (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {report.hasBreakingChanges
                        ? 'Breaking Changes Detected'
                        : 'Backward-Compatible Evolution'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {report.hasBreakingChanges
                        ? 'Clients using older schema versions may fail to serialize or communicate'
                        : 'No wire-incompatible schema changes detected'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                    {report.totalBreaking} Breaking
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    {report.totalAdditions + report.totalModified} Safe
                  </span>
                </div>
              </div>

              {/* Changes List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Detailed Change Log ({report.diffs.length})
                </h4>

                {report.diffs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                    No structural differences detected between the two protobuf schemas.
                  </div>
                ) : (
                  report.diffs.map((d, idx) => {
                    const isBreaking = d.type === 'BREAKING';

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                          isBreaking
                            ? 'bg-rose-950/20 border-rose-500/30 text-rose-100'
                            : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {isBreaking ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          ) : (
                            <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold">{d.location}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                                  isBreaking
                                    ? 'bg-rose-500/30 text-rose-300'
                                    : d.type === 'ADDITION'
                                    ? 'bg-emerald-500/30 text-emerald-300'
                                    : 'bg-amber-500/30 text-amber-300'
                                }`}
                              >
                                {d.category} • {d.type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{d.description}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
                            isBreaking
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isBreaking ? 'BREAKING' : 'SAFE'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}


          {!report && !loading && !error && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
              <Layers className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Compare Schemas</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Paste the target protobuf definition above to run automated breaking change detection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
