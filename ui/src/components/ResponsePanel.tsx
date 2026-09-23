import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check, 
  Inbox, 
  Layers,
  Database,
  Layers2
} from 'lucide-react';
import { InvocationResponse } from '../types';

interface ResponsePanelProps {
  response: InvocationResponse | null;
  loading: boolean;
  onSaveAsMockRule?: (responseJson: string) => void;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  loading,
  onSaveAsMockRule,
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'trailers'>('body');
  const [copied, setCopied] = useState(false);
  const [savedMock, setSavedMock] = useState(false);

  const handleCopy = () => {
    if (response?.responseJson) {
      navigator.clipboard.writeText(response.responseJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveMock = () => {
    if (response?.responseJson && onSaveAsMockRule) {
      onSaveAsMockRule(response.responseJson);
      setSavedMock(true);
      setTimeout(() => setSavedMock(false), 2000);
    }
  };

  if (!response && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#080d1a] text-center p-8 select-none">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <Inbox className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1.5">Response Awaiting Invocation</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          Hit &ldquo;Execute RPC&rdquo; or press Enter in the host bar to send the request payload and inspect the returned gRPC response message.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#080d1a] text-center p-8 select-none">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-4 shadow-lg shadow-cyan-500/10" />
        <p className="text-sm font-semibold text-slate-200 mb-1">Awaiting Server Response...</p>
        <p className="text-xs text-slate-400">Executing round-trip gRPC HTTP/2 stream invocation</p>
      </div>
    );
  }

  const isSuccess = response?.success;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080d1a] overflow-hidden">
      {/* Response Metrics Header */}
      <div className="px-4 lg:px-6 py-3 bg-[#0a1022] border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono ${
              isSuccess
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/15'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/15'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>
              {response?.statusCode} {response?.statusMessage}
            </span>
          </div>

          {/* Latency Badge */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{response?.durationMs.toFixed(1)} ms</span>
          </div>

          {/* Size Badge */}
          {response?.responseJson && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10 shadow-sm">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>{new Blob([response.responseJson]).size} B</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {response?.responseJson && onSaveAsMockRule && (
            <button
              onClick={handleSaveMock}
              className="h-8 flex items-center gap-2 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all shadow-sm"
              title="Snapshot this response into mock server rules"
            >
              {savedMock ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rule Saved!</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Save as Mock</span>
                </>
              )}
            </button>
          )}

          {response?.responseJson && (
            <button
              onClick={handleCopy}
              className="h-8 flex items-center gap-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition-all shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs: Response Body vs Headers vs Trailers */}
      <div className="flex items-center gap-2 px-4 lg:px-6 bg-[#070b16] border-b border-white/10 text-xs shrink-0">
        <button
          onClick={() => setActiveTab('body')}
          className={`py-3 px-4 font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'body'
              ? 'border-cyan-400 text-cyan-300 bg-white/[0.02]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
          }`}
        >
          <span>Response Body</span>
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`py-3 px-4 font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'headers'
              ? 'border-cyan-400 text-cyan-300 bg-white/[0.02]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
          }`}
        >
          <span>Initial Metadata</span>
          {response?.headers && Object.keys(response.headers).length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/30 font-semibold">
              {Object.keys(response.headers).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('trailers')}
          className={`py-3 px-4 font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'trailers'
              ? 'border-cyan-400 text-cyan-300 bg-white/[0.02]'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
          }`}
        >
          <span>Trailing Metadata</span>
          {response?.trailers && Object.keys(response.trailers).length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30 font-semibold">
              {Object.keys(response.trailers).length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'body' && (
          <Editor
            height="100%"
            language="json"
            theme="vs-dark"
            value={response?.responseJson || (response?.error ? JSON.stringify({ error: response.error }, null, 2) : '{}')}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 14, bottom: 14 },
              lineHeight: 22,
            }}
          />
        )}

        {activeTab === 'headers' && (
          <div className="p-6 overflow-y-auto h-full space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">Server Initial Metadata (Headers)</h4>
              <p className="text-[11px] text-slate-400">
                Metadata key-values sent before response payload frames.
              </p>
            </div>

            {response?.headers && Object.keys(response.headers).length > 0 ? (
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20 shadow-sm">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-slate-400 text-[11px]">
                      <th className="py-3 px-4 font-semibold">Header Key</th>
                      <th className="py-3 px-4 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {Object.entries(response.headers).map(([key, val]) => (
                      <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-cyan-300">{key}</td>
                        <td className="py-3 px-4 break-all text-slate-300">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                No initial metadata headers returned by the server.
              </div>
            )}
          </div>
        )}

        {activeTab === 'trailers' && (
          <div className="p-6 overflow-y-auto h-full space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-200 mb-1">Trailing Metadata (Trailers)</h4>
              <p className="text-[11px] text-slate-400">
                Metadata sent alongside gRPC status code at call termination.
              </p>
            </div>

            {response?.trailers && Object.keys(response.trailers).length > 0 ? (
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20 shadow-sm">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-slate-400 text-[11px]">
                      <th className="py-3 px-4 font-semibold">Trailer Key</th>
                      <th className="py-3 px-4 font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-200">
                    {Object.entries(response.trailers).map(([key, val]) => (
                      <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-purple-300">{key}</td>
                        <td className="py-3 px-4 break-all text-slate-300">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                No trailing metadata returned by the server.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
