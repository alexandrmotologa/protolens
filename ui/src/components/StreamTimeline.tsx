import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Download, 
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import { StreamEvent, MethodInfo } from '../types';

interface StreamTimelineProps {
  method: MethodInfo;
  events: StreamEvent[];
  isStreamActive: boolean;
  onSendMessage: (payloadJson: string) => void;
  onHalfClose: () => void;
  onCancelStream: () => void;
}

export const StreamTimeline: React.FC<StreamTimelineProps> = ({
  method,
  events,
  isStreamActive,
  onSendMessage,
  onHalfClose,
  onCancelStream,
}) => {
  const [inputPayload, setInputPayload] = useState(method.inputTemplate || '{}');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const handleSend = () => {
    if (!inputPayload.trim() || !isStreamActive) return;
    onSendMessage(inputPayload);
  };

  const handleCopyPayload = (json: string, idx: number) => {
    navigator.clipboard.writeText(json);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream_${method.name}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080d1a] overflow-hidden">
      {/* Stream Controls Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#0b1020] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <Radio className={`w-4 h-4 ${isStreamActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold text-slate-200">
              {isStreamActive ? 'Active Stream' : 'Stream Closed'}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
            Events: <span className="text-cyan-300 font-semibold">{events.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium transition-all"
              title="Export recorded stream timeline"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export</span>
            </button>
          )}

          {isStreamActive && (
            <>
              {method.clientStreaming && (
                <button
                  onClick={onHalfClose}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all shadow-sm"
                  title="Half-close: Stop sending and wait for server to complete"
                >
                  Half-Close (Done)
                </button>
              )}

              <button
                onClick={onCancelStream}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all shadow-sm"
              >
                Cancel Stream
              </button>
            </>
          )}
        </div>
      </div>

      {/* Timeline Event Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs select-none">
            <Radio className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No Stream Events Recorded Yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Click &ldquo;Start Stream&rdquo; in the request panel to initiate the bidirectional gRPC streaming session.
            </p>
          </div>
        ) : (
          events.map((ev, idx) => {
            if (ev.event === 'started') {
              return (
                <div key={idx} className="flex items-center justify-center my-3 text-xs font-mono text-cyan-300">
                  <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 shadow-sm">
                    Stream initiated at {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            }

            if (ev.event === 'closed') {
              return (
                <div key={idx} className="flex flex-col items-center justify-center my-4 text-xs font-mono">
                  <div className={`px-4 py-2 rounded-full border flex items-center gap-2 shadow-sm ${
                    ev.statusCode === 0
                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                  }`}>
                    {ev.statusCode === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>Stream Terminated: {ev.statusMessage || 'OK'} ({ev.totalDurationMs?.toFixed(1)}ms)</span>
                  </div>
                  {ev.error && <p className="text-rose-400 mt-1 text-xs">{ev.error}</p>}
                </div>
              );
            }

            if (ev.event === 'error') {
              return (
                <div key={idx} className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-mono flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{ev.error}</span>
                </div>
              );
            }

            const isSent = ev.event === 'sent';

            return (
              <div
                key={idx}
                className={`flex flex-col stream-bubble ${isSent ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble Header */}
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mb-1 px-1">
                  <span className="flex items-center gap-1 font-medium">
                    {isSent ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className={isSent ? 'text-cyan-300' : 'text-emerald-300 font-semibold'}>
                      {isSent ? 'Client Push' : 'Server Message'} #{ev.sequence}
                    </span>
                  </span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  {ev.latencyMs !== undefined && (
                    <span className="text-slate-400">+{ev.latencyMs.toFixed(1)}ms</span>
                  )}
                  {ev.bytes && <span>({ev.bytes} B)</span>}
                  
                  <button
                    onClick={() => handleCopyPayload(ev.payloadJson || '', idx)}
                    className="p-1 hover:text-white transition-colors"
                    title="Copy payload"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Message Payload Box */}
                <div
                  className={`max-w-2xl rounded-2xl p-4 text-xs font-mono overflow-x-auto shadow-lg border ${
                    isSent
                      ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-100 rounded-tr-sm'
                      : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100 rounded-tl-sm'
                  }`}
                >
                  <pre className="whitespace-pre-wrap">{ev.payloadJson}</pre>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Composer for Client Streaming / Bidirectional */}
      {method.clientStreaming && (
        <div className="p-4 border-t border-white/10 bg-[#0a0f20] shrink-0">
          <div className="flex items-start gap-3">
            <textarea
              rows={3}
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              placeholder="JSON chunk payload to push into stream..."
              disabled={!isStreamActive}
              className="flex-1 p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!isStreamActive || !inputPayload.trim()}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 flex items-center gap-2 shrink-0 transition-all btn-hover mt-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Push Chunk</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
