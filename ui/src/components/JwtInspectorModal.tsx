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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e222b] border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#181b22]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">JWT Inspector & Claims Decoder</h2>
              <p className="text-xs text-gray-400">
                Inspect authorization tokens, expiration timestamps, scopes, and subject identity
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

        {/* Input Bar */}
        <div className="p-5 bg-[#16181f] border-b border-gray-800">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block mb-1.5">
            Raw JWT Token (Bearer or ey...)
          </label>
          <div className="relative">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.trim().replace(/^Bearer\s+/i, ''))}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full bg-[#12141a] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 bg-[#1a1d24] flex-1 overflow-y-auto space-y-4">
          {!hasValidStructure || !payloadJson ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 text-xs">
              <AlertCircle className="w-8 h-8 stroke-[1.2] mb-2 opacity-40 text-amber-400" />
              <span>Please enter a valid 3-segment JWT token</span>
            </div>
          ) : (
            <>
              {/* Token Expiration Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  isExpired
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">
                    {exp ? (isExpired ? 'Token Expired' : 'Token Valid') : 'No Expiration (exp claim missing)'}
                  </span>
                  {secondsRemaining !== null && (
                    <span className="font-mono ml-2">({formatCountdown(secondsRemaining)})</span>
                  )}
                </div>
                {exp && (
                  <span className="font-mono text-[11px] text-gray-400">
                    exp: {new Date(exp * 1000).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Decoded Sections */}
              <div className="grid grid-cols-2 gap-4">
                {/* Header */}
                <div className="bg-[#14161d] border border-gray-800 rounded-xl p-4">
                  <div className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Header (Algorithm & Type)</span>
                  </div>
                  <pre className="text-xs font-mono text-gray-300 bg-[#101217] p-3 rounded-lg overflow-x-auto border border-gray-800/80">
                    {JSON.stringify(headerJson, null, 2)}
                  </pre>
                </div>

                {/* Subject & Issuer Card */}
                <div className="bg-[#14161d] border border-gray-800 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">
                    Key Claims
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-gray-800/60 pb-1">
                      <span className="text-gray-400">Subject (sub)</span>
                      <span className="font-mono text-gray-200">{payloadJson.sub || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800/60 pb-1">
                      <span className="text-gray-400">Issuer (iss)</span>
                      <span className="font-mono text-gray-200">{payloadJson.iss || '—'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800/60 pb-1">
                      <span className="text-gray-400">Audience (aud)</span>
                      <span className="font-mono text-gray-200">{payloadJson.aud || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Issued At (iat)</span>
                      <span className="font-mono text-gray-200">
                        {payloadJson.iat ? new Date(payloadJson.iat * 1000).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Payload */}
              <div className="bg-[#14161d] border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                    Full Payload Claims
                  </span>
                  <button
                    onClick={handleCopyPayload}
                    className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied JSON' : 'Copy Claims'}</span>
                  </button>
                </div>
                <pre className="text-xs font-mono text-emerald-300/90 bg-[#101217] p-3 rounded-lg overflow-x-auto border border-gray-800/80 max-h-56">
                  {JSON.stringify(payloadJson, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
