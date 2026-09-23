import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Copy, 
  Check, 
  Inbox, 
  Layers 
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
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0f1d] text-center p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500 mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-xs font-semibold text-slate-300 mb-1">Response Awaiting Invocation</h3>
        <p className="text-[11px] text-slate-500 max-w-xs">
          Hit &ldquo;Execute RPC&rdquo; to send the request payload and inspect the returned gRPC message.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#0a0f1d] text-center p-6 select-none">
        <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4" />
        <p className="text-xs font-medium text-slate-300 mb-1">Awaiting Server Response...</p>
        <p className="text-[11px] text-slate-500">Executing round-trip gRPC call</p>
      </div>
    );
  }

  const isSuccess = response?.success;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0f1d] overflow-hidden">
      {/* Response Metrics Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0c1222]">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
              isSuccess
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>
              {response?.statusCode} {response?.statusMessage}
            </span>
          </div>

          {/* Latency Badge */}
          <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{response?.durationMs.toFixed(1)} ms</span>
          </div>

          {/* Size Badge */}
          {response?.responseJson && (
            <div className="flex items-center gap-1 text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <span>{new Blob([response.responseJson]).size} B</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {response?.responseJson && onSaveAsMockRule && (
            <button
              onClick={handleSaveMock}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs transition-colors"
              title="Snapshot this response into mock server rules"
            >
              {savedMock ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Rule Saved</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Save as Mock Rule</span>
                </>
              )}
            </button>
          )}

          {response?.responseJson && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 border-b border-white/10 bg-[#090d18] text-xs">
        <button
          onClick={() => setActiveTab('body')}
          className={`py-2 px-3 border-b-2 font-medium transition-colors ${
            activeTab === 'body'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Response Body
        </button>

        {response?.headers && Object.keys(response.headers).length > 0 && (
          <button
            onClick={() => setActiveTab('headers')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'headers'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Headers</span>
            <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-mono">
              {Object.keys(response.headers).length}
            </span>
          </button>
        )}

        {response?.trailers && Object.keys(response.trailers).length > 0 && (
          <button
            onClick={() => setActiveTab('trailers')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'trailers'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Trailers</span>
            <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 text-[10px] flex items-center justify-center font-mono">
              {Object.keys(response.trailers).length}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'body' && (
          <>
            {response?.error ? (
              <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 font-mono">
                <strong>Error:</strong> {response.error}
              </div>
            ) : null}

            <Editor
              height="100%"
              language="json"
              theme="vs-dark"
              value={response?.responseJson || '{}'}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </>
        )}

        {activeTab === 'headers' && response?.headers && (
          <div className="p-4 overflow-y-auto h-full">
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Header Key</th>
                    <th className="p-2.5">Value(s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {Object.entries(response.headers).map(([k, vals]) => (
                    <tr key={k} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 text-cyan-300 font-semibold">{k}</td>
                      <td className="p-2.5 text-slate-200">{vals.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'trailers' && response?.trailers && (
          <div className="p-4 overflow-y-auto h-full">
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="p-2.5">Trailer Key</th>
                    <th className="p-2.5">Value(s)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {Object.entries(response.trailers).map(([k, vals]) => (
                    <tr key={k} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 text-purple-300 font-semibold">{k}</td>
                      <td className="p-2.5 text-slate-200">{vals.join(', ')}</td>
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
