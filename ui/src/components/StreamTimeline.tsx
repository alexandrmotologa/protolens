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
  AlertTriangle 
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
    <div className="flex-1 flex flex-col h-full bg-[#080c18] overflow-hidden">
      {/* Stream Controls Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-[#0b1020]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${isStreamActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-xs font-semibold text-slate-200">
              {isStreamActive ? 'Active Stream' : 'Stream Closed'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
            Events: {events.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
              title="Export recorded stream timeline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          )}

          {isStreamActive && (
            <>
              {method.clientStreaming && (
                <button
                  onClick={onHalfClose}
                  className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                  title="Half-close: Stop sending and wait for server to complete"
                >
                  Half-Close (Done)
                </button>
              )}

              <button
                onClick={onCancelStream}
                className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors"
              >
                Cancel Stream
              </button>
            </>
          )}
        </div>
      </div>

      {/* Timeline Event Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <p>No stream events recorded yet.</p>
            <p className="text-[11px] mt-1">Start the stream to send or receive real-time messages.</p>
          </div>
        ) : (
          events.map((ev, idx) => {
            if (ev.event === 'started') {
              return (
                <div key={idx} className="flex items-center justify-center my-2 text-[11px] font-mono text-cyan-400/80">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    Stream initiated at {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            }

            if (ev.event === 'closed') {
              return (
                <div key={idx} className="flex flex-col items-center justify-center my-3 text-[11px] font-mono">
                  <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${
                    ev.statusCode === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {ev.statusCode === 0 ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Stream Terminated: {ev.statusMessage || 'OK'} ({ev.totalDurationMs?.toFixed(1)}ms)</span>
                  </div>
                  {ev.error && <p className="text-rose-400 mt-1">{ev.error}</p>}
                </div>
              );
            }

            if (ev.event === 'error') {
              return (
                <div key={idx} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
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
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1 px-1">
                  <span className="flex items-center gap-1">
                    {isSent ? (
                      <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                    )}
                    <span className={isSent ? 'text-cyan-400' : 'text-emerald-400 font-semibold'}>
                      {isSent ? 'Client Push' : 'Server Message'} #{ev.sequence}
                    </span>
                  </span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                  {ev.latencyMs !== undefined && (
                    <span className="text-slate-400">+{ev.latencyMs.toFixed(1)}ms</span>
                  )}
                  {ev.bytes && <span>{ev.bytes} B</span>}
                </div>

                {/* Message Payload Box */}
                <div
                  className={`max-w-xl rounded-xl p-3 text-xs font-mono overflow-x-auto shadow-md border ${
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
        <div className="p-3 border-t border-white/10 bg-[#0a0f20]">
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              disabled={!isStreamActive}
              placeholder="JSON chunk payload to send into the stream..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-purple-500/50 resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!isStreamActive || !inputPayload.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all btn-hover shrink-0"
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
