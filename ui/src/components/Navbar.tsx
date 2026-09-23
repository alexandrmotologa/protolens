import React, { useState } from 'react';
import { 
  Radio, 
  RefreshCw, 
  FileCode, 
  Server, 
  Code2, 
  Sparkles, 
  Lock, 
  Unlock, 
  Send,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { TLSConfig } from '../types';

interface NavbarProps {
  target: string;
  setTarget: (target: string) => void;
  protocol: 'grpc' | 'connect';
  setProtocol: (protocol: 'grpc' | 'connect') => void;
  tls: TLSConfig;
  setTLS: React.Dispatch<React.SetStateAction<TLSConfig>>;
  onReflect: () => void;
  reflecting: boolean;
  onOpenProtoModal: () => void;
  onOpenMockModal: () => void;
  onOpenExportModal: () => void;
  onOpenAIPresets: () => void;
  mockRunning: boolean;
  mockPort: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  target,
  setTarget,
  protocol,
  setProtocol,
  tls,
  setTLS,
  onReflect,
  reflecting,
  onOpenProtoModal,
  onOpenMockModal,
  onOpenExportModal,
  onOpenAIPresets,
  mockRunning,
  mockPort,
}) => {
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);

  return (
    <header className="h-14 border-b border-white/10 bg-[#0a0f1d] px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-sky-400 text-white shadow-lg shadow-cyan-500/20">
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">ProtoLens</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Studio
            </span>
          </div>
        </div>
      </div>

      {/* Target Host & Protocol Bar */}
      <div className="flex items-center gap-2 max-w-2xl w-full mx-4">
        {/* Protocol Selector */}
        <div className="relative">
          <button
            onClick={() => setShowProtocolDropdown(!showProtocolDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${protocol === 'grpc' ? 'bg-cyan-400' : 'bg-purple-400'}`} />
            <span>{protocol === 'grpc' ? 'gRPC (HTTP/2)' : 'Connect-RPC'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showProtocolDropdown && (
            <div className="absolute top-full left-0 mt-1 w-44 rounded-lg glass-dropdown p-1 z-50">
              <button
                onClick={() => { setProtocol('grpc'); setShowProtocolDropdown(false); }}
                className="w-full text-left px-3 py-2 rounded text-xs hover:bg-white/10 flex items-center justify-between text-slate-200"
              >
                <span>gRPC (Standard)</span>
                {protocol === 'grpc' && <span className="text-cyan-400">✓</span>}
              </button>
              <button
                onClick={() => { setProtocol('connect'); setShowProtocolDropdown(false); }}
                className="w-full text-left px-3 py-2 rounded text-xs hover:bg-white/10 flex items-center justify-between text-slate-200"
              >
                <span>Connect-RPC</span>
                {protocol === 'connect' && <span className="text-purple-400">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Target Host Input */}
        <div className="flex-1 flex items-center bg-black/40 border border-white/10 rounded-lg px-3 py-1 focus-within:border-cyan-500/60 transition-colors">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onReflect(); }}
            placeholder="Target host (e.g. localhost:50051 or api.staging.io:443)"
            className="w-full bg-transparent text-xs font-mono text-slate-100 placeholder-slate-500 outline-none"
          />

          {/* TLS Toggle */}
          <button
            onClick={() => setTLS(prev => ({ ...prev, useTls: !prev.useTls }))}
            title={tls.useTls ? "TLS Enabled (Click to toggle plaintext)" : "Plaintext (Click to enable TLS)"}
            className={`p-1 rounded text-xs transition-colors ml-1 ${
              tls.useTls ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            {tls.useTls ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Reflect Action Button */}
        <button
          onClick={onReflect}
          disabled={reflecting || !target}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium shadow-sm transition-all btn-hover"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reflecting ? 'animate-spin' : ''}`} />
          <span>Reflect</span>
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2">
        {/* Load Proto */}
        <button
          onClick={onOpenProtoModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
          title="Import local .proto file or directory"
        >
          <FileCode className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Proto</span>
        </button>

        {/* AI Presets */}
        <button
          onClick={onOpenAIPresets}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-amber-300 transition-colors"
          title="NVIDIA Triton / vLLM AI Inference Presets"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">AI Presets</span>
        </button>

        {/* Mock Server */}
        <button
          onClick={onOpenMockModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            mockRunning 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
          }`}
          title="Configure embedded dynamic mock server"
        >
          <Server className="w-3.5 h-3.5" />
          <span>Mock</span>
          {mockRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-indicator" />
          )}
        </button>

        {/* Export Code */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
          title="Export request to grpcurl, curl, TS, Go"
        >
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
