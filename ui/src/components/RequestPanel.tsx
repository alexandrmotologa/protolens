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
  Key
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
    <div className="flex-1 flex flex-col h-full bg-[#0b101d] overflow-hidden border-r border-white/10">
      {/* Method Info & Action Bar */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0d1324]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
            {tab.protocol.toUpperCase()}
          </span>
          <span className="text-xs font-mono text-slate-400 truncate">
            {tab.method.fullName}
          </span>
        </div>

        {/* Send / Start Stream Button */}
        <button
          onClick={onExecute}
          disabled={tab.loading}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all btn-hover ${
            isStreaming
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'
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
              <span>{tab.loading ? 'Invoking...' : 'Execute RPC'}</span>
            </>
          )}
        </button>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center justify-between px-3 border-b border-white/10 bg-[#090d18] text-xs">
        <div className="flex gap-1">
          <button
            onClick={() => setSubTab('body')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              subTab === 'body'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Payload
          </button>
          <button
            onClick={() => setSubTab('metadata')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              subTab === 'metadata'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Headers</span>
            {tab.headers.filter(h => h.enabled && h.key).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-mono">
                {tab.headers.filter(h => h.enabled && h.key).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSubTab('tls')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              subTab === 'tls'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Connection & TLS
          </button>
          <button
            onClick={() => setSubTab('schema')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              subTab === 'schema'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Schema
          </button>
        </div>

        {subTab === 'body' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormatJson}
              className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              title="Format JSON payload"
            >
              <Sparkles className="w-3 h-3" />
              <span>Beautify</span>
            </button>
            <button
              onClick={handleResetTemplate}
              className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              title="Reset payload to schema template"
            >
              <RotateCcw className="w-3 h-3" />
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
              fontFamily: "'JetBrains Mono', monospace",
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              formatOnPaste: true,
              automaticLayout: true,
              padding: { top: 8, bottom: 8 },
            }}
          />
        )}

        {subTab === 'metadata' && (
          <div className="p-4 overflow-y-auto h-full space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-200">Custom gRPC Metadata</h4>
                <p className="text-[11px] text-slate-500">
                  Headers are forwarded with the RPC context. Suffix with <code>-bin</code> for binary values.
                </p>
              </div>
              <button
                onClick={handleAddHeader}
                className="px-2.5 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-xs flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Header</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {tab.headers.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-white/10 rounded-lg">
                  No custom headers configured. Click &ldquo;Add Header&rdquo; to send authorization or tracing headers.
                </div>
              ) : (
                tab.headers.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => handleUpdateHeader(h.id, { enabled: e.target.checked })}
                      className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                    />
                    <input
                      type="text"
                      placeholder="Header key (e.g. authorization)"
                      value={h.key}
                      onChange={(e) => handleUpdateHeader(h.id, { key: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. Bearer token_xyz)"
                      value={h.value}
                      onChange={(e) => handleUpdateHeader(h.id, { value: e.target.value })}
                      className="flex-1 px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
                    />
                    {onInspectJwt && (h.value.includes('Bearer ey') || (h.value.startsWith('ey') && h.value.includes('.'))) && (
                      <button
                        type="button"
                        onClick={() => onInspectJwt(h.value)}
                        className="px-2 py-1 rounded bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[10px] font-mono border border-violet-500/30 flex items-center space-x-1 shrink-0 transition"
                        title="Inspect JWT token claims"
                      >
                        <Key className="w-3 h-3" />
                        <span>Inspect JWT</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteHeader(h.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
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
          <div className="p-4 overflow-y-auto h-full max-w-lg space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">TLS / Security Options</h4>
              <p className="text-[11px] text-slate-500">
                Configure transport encryption and mutual TLS certificate authentication.
              </p>
            </div>

            <div className="space-y-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Enable TLS (HTTPS / HTTP/2 over TLS)</span>
                <input
                  type="checkbox"
                  checked={tab.tls.useTls}
                  onChange={(e) => onUpdateTab({ tls: { ...tab.tls, useTls: e.target.checked } })}
                  className="rounded bg-black/40 border-white/20 text-cyan-500"
                />
              </label>

              {tab.tls.useTls && (
                <>
                  <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                    <span>Insecure Skip Verify (Self-Signed Certs)</span>
                    <input
                      type="checkbox"
                      checked={tab.tls.insecureSkipVerify}
                      onChange={(e) => onUpdateTab({ tls: { ...tab.tls, insecureSkipVerify: e.target.checked } })}
                      className="rounded bg-black/40 border-white/20 text-cyan-500"
                    />
                  </label>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Server Name Override (SNI)</label>
                    <input
                      type="text"
                      placeholder="e.g. api.domain.local"
                      value={tab.tls.serverNameOverride || ''}
                      onChange={(e) => onUpdateTab({ tls: { ...tab.tls, serverNameOverride: e.target.value } })}
                      className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Call Timeout (ms)</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="number"
                    value={tab.timeoutMs}
                    onChange={(e) => onUpdateTab({ timeoutMs: parseInt(e.target.value, 10) || 0 })}
                    className="w-32 px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
                  />
                  <span className="text-xs text-slate-500">0 = no timeout</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'schema' && (
          <div className="p-4 overflow-y-auto h-full space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">
                Input Schema: <span className="font-mono text-cyan-400">{tab.method.input.fullName}</span>
              </h4>
              <div className="mt-2 border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Field Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">JSON Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {tab.method.input.fields.map((f) => (
                      <tr key={f.number} className="hover:bg-white/[0.02]">
                        <td className="p-2 text-slate-500">{f.number}</td>
                        <td className="p-2 text-slate-200 font-semibold">{f.name}</td>
                        <td className="p-2 text-cyan-300">
                          {f.isRepeated && 'repeated '}
                          {f.isMap ? `map<${f.mapKeyType}, ${f.mapValType}>` : (f.messageType || f.type)}
                        </td>
                        <td className="p-2 text-slate-400">{f.jsonName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">
                Output Schema: <span className="font-mono text-emerald-400">{tab.method.output.fullName}</span>
              </h4>
              <div className="mt-2 border border-white/10 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Field Name</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">JSON Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {tab.method.output.fields.map((f) => (
                      <tr key={f.number} className="hover:bg-white/[0.02]">
                        <td className="p-2 text-slate-500">{f.number}</td>
                        <td className="p-2 text-slate-200 font-semibold">{f.name}</td>
                        <td className="p-2 text-emerald-300">
                          {f.isRepeated && 'repeated '}
                          {f.isMap ? `map<${f.mapKeyType}, ${f.mapValType}>` : (f.messageType || f.type)}
                        </td>
                        <td className="p-2 text-slate-400">{f.jsonName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
