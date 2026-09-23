import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Play, 
  Sparkles, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Info, 
  Radio, 
  Check, 
  Clock,
  Key,
  Copy
} from 'lucide-react';
import { TabItem, HeaderEntry } from '../types';

interface RequestPanelProps {
  tab: TabItem;
  onUpdateTab: (updates: Partial<TabItem>) => void;
  onExecute: () => void;
  onInspectJwt?: (token: string) => void;
}

export const RequestPanel: React.FC<RequestPanelProps> = ({
  tab,
  onUpdateTab,
  onExecute,
  onInspectJwt,
}) => {
  const [subTab, setSubTab] = useState<'body' | 'metadata' | 'tls' | 'schema'>('body');
  const [copiedMethod, setCopiedMethod] = useState(false);

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(tab.payloadJson);
      onUpdateTab({ payloadJson: JSON.stringify(parsed, null, 2) });
    } catch {
      // Ignore formatting errors if invalid JSON
    }
  };

  const handleResetTemplate = () => {
    if (tab.method.inputTemplate) {
      onUpdateTab({ payloadJson: tab.method.inputTemplate });
    }
  };

  const handleCopyMethodName = () => {
    navigator.clipboard.writeText(tab.method.fullName);
    setCopiedMethod(true);
    setTimeout(() => setCopiedMethod(false), 1500);
  };

  const handleAddHeader = () => {
    const newHeader: HeaderEntry = {
      id: Math.random().toString(36).substring(7),
      key: '',
      value: '',
      enabled: true,
    };
    onUpdateTab({ headers: [...tab.headers, newHeader] });
  };

  const handleUpdateHeader = (id: string, updates: Partial<HeaderEntry>) => {
    onUpdateTab({
      headers: tab.headers.map(h => (h.id === id ? { ...h, ...updates } : h)),
    });
  };

  const handleDeleteHeader = (id: string) => {
    onUpdateTab({
      headers: tab.headers.filter(h => h.id !== id),
    });
  };

  const isStreaming = tab.method.kind !== 'unary';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090e1c] overflow-hidden border-r border-white/10">
      {/* Method Info & Action Bar */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0c1224] shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold tracking-wide">
            {tab.protocol.toUpperCase()}
          </span>
          <span className="text-xs font-mono text-slate-200 truncate font-medium">
            {tab.method.fullName}
          </span>
          <button
            onClick={handleCopyMethodName}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title="Copy method full name"
          >
            {copiedMethod ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Send / Start Stream Button */}
        <button
          onClick={onExecute}
          disabled={tab.loading}
          className={`h-9 flex items-center gap-2 px-5 rounded-xl text-xs font-semibold text-white shadow-md transition-all btn-hover shrink-0 ${
            isStreaming
              ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25'
              : 'bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/25'
          }`}
        >
          {isStreaming ? (
            <>
              <Radio className={`w-3.5 h-3.5 ${tab.loading ? 'animate-pulse text-purple-200' : ''}`} />
              <span>{tab.isStreamActive ? 'Connected' : 'Start Stream'}</span>
            </>
          ) : (
            <>
              <Play className={`w-3.5 h-3.5 fill-current ${tab.loading ? 'animate-spin' : ''}`} />
              <span>{tab.loading ? 'Invoking RPC...' : 'Execute RPC'}</span>
            </>
          )}
        </button>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center justify-between px-4 lg:px-6 border-b border-white/10 bg-[#070b16] text-xs shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSubTab('body')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-all ${
              subTab === 'body'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Payload
          </button>
          <button
            onClick={() => setSubTab('metadata')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-all flex items-center gap-2 ${
              subTab === 'metadata'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Headers & Metadata</span>
            {tab.headers.filter(h => h.enabled && h.key).length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/30 font-semibold">
                {tab.headers.filter(h => h.enabled && h.key).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('tls')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-all ${
              subTab === 'tls'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Connection & TLS
          </button>
          <button
            onClick={() => setSubTab('schema')}
            className={`py-3 px-3.5 border-b-2 font-medium transition-all ${
              subTab === 'schema'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Schema Definition
          </button>
        </div>

        {subTab === 'body' && (
          <div className="flex items-center gap-2 shrink-0 py-1.5">
            <button
              onClick={handleFormatJson}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 text-xs font-medium border border-white/5"
              title="Format JSON payload"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Format</span>
            </button>
            <button
              onClick={handleResetTemplate}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-300 transition-all flex items-center gap-1.5 text-xs font-medium border border-white/5"
              title="Reset payload to schema template"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {subTab === 'body' && (
          <Editor
            height="100%"
            language="json"
            theme="vs-dark"
            value={tab.payloadJson}
            onChange={(val) => onUpdateTab({ payloadJson: val || '' })}
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              formatOnPaste: true,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              lineHeight: 20,
            }}
          />
        )}

        {subTab === 'metadata' && (
          <div className="p-5 overflow-y-auto h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Custom gRPC Metadata Headers</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Headers are forwarded with the RPC context. Suffix binary metadata keys with <code>-bin</code>.
                </p>
              </div>
              <button
                onClick={handleAddHeader}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Header</span>
              </button>
            </div>

            <div className="space-y-2">
              {tab.headers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                  No custom headers configured. Click &ldquo;Add Header&rdquo; to send authorization tokens or tracing context.
                </div>
              ) : (
                tab.headers.map((h) => (
                  <div key={h.id} className="flex items-center gap-2.5 p-1 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => handleUpdateHeader(h.id, { enabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-black/50 border-white/20 text-cyan-500 focus:ring-0 ml-2 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Header key (e.g. authorization)"
                      value={h.key}
                      onChange={(e) => handleUpdateHeader(h.id, { key: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Bearer {{TOKEN}})"
                      value={h.value}
                      onChange={(e) => handleUpdateHeader(h.id, { value: e.target.value })}
                      className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
                    />
                    {onInspectJwt && (h.value.includes('Bearer ey') || (h.value.startsWith('ey') && h.value.includes('.'))) && (
                      <button
                        type="button"
                        onClick={() => onInspectJwt(h.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[10px] font-mono border border-violet-500/30 flex items-center space-x-1 shrink-0 transition"
                        title="Inspect JWT token claims"
                      >
                        <Key className="w-3 h-3" />
                        <span>Inspect JWT</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteHeader(h.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors mr-1"
                      title="Delete header"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {subTab === 'tls' && (
          <div className="p-6 overflow-y-auto h-full max-w-xl space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 mb-1">Transport Security & TLS</h4>
              <p className="text-xs text-slate-400">
                Configure HTTP/2 encryption, server certificates, and request deadlines.
              </p>
            </div>

            <div className="space-y-4 bg-white/[0.02] p-5 rounded-2xl border border-white/10 shadow-sm">
              <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer select-none">
                <div>
                  <div className="font-medium">Enable TLS (HTTPS / HTTP/2 over TLS)</div>
                  <div className="text-[11px] text-slate-400">Required for cloud endpoints like gRPC on Google Cloud or AWS ALB</div>
                </div>
                <input
                  type="checkbox"
                  checked={tab.tls.useTls}
                  onChange={(e) => onUpdateTab({ tls: { ...tab.tls, useTls: e.target.checked } })}
                  className="w-4 h-4 rounded bg-black/50 border-white/20 text-cyan-500 cursor-pointer"
                />
              </label>

              {tab.tls.useTls && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer select-none">
                    <div>
                      <div className="font-medium">Insecure Skip Verify</div>
                      <div className="text-[11px] text-slate-400">Accept self-signed or invalid TLS certificates</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={tab.tls.insecureSkipVerify}
                      onChange={(e) => onUpdateTab({ tls: { ...tab.tls, insecureSkipVerify: e.target.checked } })}
                      className="w-4 h-4 rounded bg-black/50 border-white/20 text-cyan-500 cursor-pointer"
                    />
                  </label>

                  <div>
                    <label className="block text-xs text-slate-300 font-medium mb-1.5">Server Name Override (SNI)</label>
                    <input
                      type="text"
                      placeholder="e.g. api.internal.local"
                      value={tab.tls.serverNameOverride || ''}
                      onChange={(e) => onUpdateTab({ tls: { ...tab.tls, serverNameOverride: e.target.value } })}
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/60"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10">
                <label className="block text-xs text-slate-300 font-medium mb-1.5">RPC Timeout Deadline (ms)</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={tab.timeoutMs}
                      onChange={(e) => onUpdateTab({ timeoutMs: parseInt(e.target.value, 10) || 0 })}
                      className="w-36 px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/60"
                    />
                  </div>
                  <span className="text-xs text-slate-400">0 = Infinite (no deadline)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'schema' && (
          <div className="p-6 overflow-y-auto h-full space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 mb-1">
                Input Schema: <span className="font-mono text-cyan-400">{tab.method.input.fullName}</span>
              </h4>
              <p className="text-xs text-slate-400">
                Protobuf fields, wire types, and cardinality for this RPC method.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 font-mono text-[11px]">
                    <th className="py-2.5 px-4">Tag</th>
                    <th className="py-2.5 px-4">Field Name</th>
                    <th className="py-2.5 px-4">Wire Type</th>
                    <th className="py-2.5 px-4">Cardinality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                  {tab.method.input.fields.map((field) => (
                    <tr key={field.number} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-4 text-slate-500">#{field.number}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-200">{field.name}</td>
                      <td className="py-2.5 px-4 text-cyan-400">{field.type}</td>
                      <td className="py-2.5 px-4">
                        {field.isRepeated ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px]">repeated</span>
                        ) : field.isMap ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px]">map</span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">optional</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
