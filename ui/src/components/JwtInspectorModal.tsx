import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Clock, Copy, Check, AlertCircle, Key } from 'lucide-react';

interface JwtInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string;
}

export const JwtInspectorModal: React.FC<JwtInspectorModalProps> = ({
  isOpen,
  onClose,
  initialToken = '',
}) => {
  const [token, setToken] = useState(initialToken);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialToken) {
      // Strip 'Bearer ' if present
      const clean = initialToken.trim().replace(/^Bearer\s+/i, '');
      setToken(clean);
    }
  }, [initialToken, isOpen]);

  if (!isOpen) return null;

  const parsePart = (str: string) => {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const parts = token.trim().split('.');
  const hasValidStructure = parts.length === 3;
  const headerJson = hasValidStructure ? parsePart(parts[0]) : null;
  const payloadJson = hasValidStructure ? parsePart(parts[1]) : null;

  const exp = payloadJson?.exp;
  const now = Math.floor(Date.now() / 1000);
  const isExpired = exp ? exp < now : false;
  const secondsRemaining = exp ? exp - now : null;

  const formatCountdown = (secs: number) => {
    if (secs < 0) {
      const absSecs = Math.abs(secs);
      const m = Math.floor(absSecs / 60);
      const s = absSecs % 60;
      return `Expired ${m > 0 ? `${m}m ` : ''}${s}s ago`;
    }
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleCopyPayload = () => {
    if (payloadJson) {
      navigator.clipboard.writeText(JSON.stringify(payloadJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <div className="bg-[#0b101f]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1428]">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">JWT Inspector & Claims Decoder</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect authorization tokens, expiration timestamps, scopes, and subject identity
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

        {/* Input Bar */}
        <div className="p-6 bg-[#090e1c] border-b border-white/10">
          <label className="text-xs text-slate-300 font-medium block mb-2">
            JWT Token (Encoded Base64URL Header.Payload.Signature)
          </label>
          <textarea
            rows={3}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... token here"
            className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 resize-none break-all"
          />
        </div>

        {/* Decoded Content Area */}
        <div className="p-6 overflow-y-auto max-h-[50vh] flex-1 bg-[#070b16] space-y-5">
          {!token.trim() ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
              <Key className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">No Token Provided</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Paste an encoded JWT string or click &ldquo;Inspect JWT&rdquo; next to any header in the request panel.
              </p>
            </div>
          ) : !hasValidStructure ? (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Invalid JWT format. A valid token consists of three parts separated by dots (header.payload.signature).</span>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Expiration Status Card */}
              {exp && (
                <div
                  className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    isExpired
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className={`w-5 h-5 ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`} />
                    <div>
                      <div className="text-xs font-semibold">
                        {isExpired ? 'Token Has Expired' : 'Token is Currently Valid'}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        Expires: {new Date(exp * 1000).toLocaleString()} ({formatCountdown(secondsRemaining || 0)})
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg ${
                      isExpired ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    {isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </span>
                </div>
              )}

              {/* Grid: Header and Payload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Header Card */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Header (Algorithm & Type)
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">part 1</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-cyan-300 overflow-x-auto">
                    {JSON.stringify(headerJson, null, 2)}
                  </pre>
                </div>

                {/* Payload Card */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Decoded Payload Claims
                    </span>
                    <button
                      onClick={handleCopyPayload}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-white flex items-center space-x-1 transition"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-violet-300 overflow-x-auto max-h-56">
                    {JSON.stringify(payloadJson, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
