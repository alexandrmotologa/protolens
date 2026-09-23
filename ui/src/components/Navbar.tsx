import React, { useState, useRef, useEffect } from 'react';
import { 
  Radio, 
  RefreshCw, 
  FileCode, 
  Server, 
  Code2, 
  Sparkles, 
  Lock, 
  Unlock, 
  ChevronDown,
  Globe,
  Clock,
  Zap,
  GitCompare,
  FolderHeart,
  Key,
  Menu,
  X,
  SlidersHorizontal,
  ChevronRight
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
  activeEnvName?: string;
  onOpenEnvModal: () => void;
  onOpenHistory: () => void;
  onOpenBenchmark: () => void;
  onOpenDiff: () => void;
  onOpenCollections: () => void;
  onOpenJwtInspector: () => void;
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
  activeEnvName,
  onOpenEnvModal,
  onOpenHistory,
  onOpenBenchmark,
  onOpenDiff,
  onOpenCollections,
  onOpenJwtInspector,
}) => {
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const protocolMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setShowToolsMenu(false);
      }
      if (protocolMenuRef.current && !protocolMenuRef.current.contains(e.target as Node)) {
        setShowProtocolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-white/10 bg-[#080d1a] px-4 lg:px-6 flex items-center justify-between select-none relative z-40">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3.5 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-400 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/20">
          <Radio className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white font-sans">ProtoLens</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold tracking-wide">
              STUDIO
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden xl:block tracking-normal">
            gRPC, Connect & Mock Workbench
          </span>
        </div>
      </div>

      {/* Target Host & Protocol Bar */}
      <div className="flex-1 min-w-[200px] max-w-lg mx-2 lg:mx-6 hidden lg:flex items-center gap-2">
        <div className="flex-1 h-10 flex items-center bg-black/50 border border-white/10 rounded-xl px-2.5 focus-within:border-cyan-500/60 focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all shadow-inner">
          {/* Protocol Selector Pill */}
          <div className="relative" ref={protocolMenuRef}>
            <button
              onClick={() => setShowProtocolDropdown(!showProtocolDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition-colors"
              title="Select wire protocol"
            >
              <span className={`w-2 h-2 rounded-full ${protocol === 'grpc' ? 'bg-cyan-400' : 'bg-purple-400'}`} />
              <span className="font-mono text-[11px] font-semibold">{protocol === 'grpc' ? 'gRPC' : 'Connect'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showProtocolDropdown && (
              <div className="absolute top-full left-0 mt-2 w-48 rounded-xl glass-dropdown p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => { setProtocol('grpc'); setShowProtocolDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    protocol === 'grpc' ? 'bg-cyan-500/15 text-cyan-300 font-medium' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>gRPC (Standard)</span>
                  </div>
                  {protocol === 'grpc' && <span className="text-cyan-400 font-bold">✓</span>}
                </button>
                <button
                  onClick={() => { setProtocol('connect'); setShowProtocolDropdown(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    protocol === 'connect' ? 'bg-purple-500/15 text-purple-300 font-medium' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Connect-RPC</span>
                  </div>
                  {protocol === 'connect' && <span className="text-purple-400 font-bold">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Host Input */}
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onReflect(); }}
            placeholder="Host endpoint (e.g. localhost:50051 or {{HOST}})"
            className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 outline-none"
          />

          {/* TLS Toggle */}
          <button
            onClick={() => setTLS(prev => ({ ...prev, useTls: !prev.useTls }))}
            title={tls.useTls ? "TLS Enabled (Click to toggle plaintext)" : "Plaintext (Click to enable TLS)"}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              tls.useTls 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tls.useTls ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
            <span className="text-[10px] hidden lg:inline font-semibold">{tls.useTls ? 'TLS' : 'Insecure'}</span>
          </button>
        </div>

        {/* Primary Reflect Button */}
        <button
          onClick={onReflect}
          disabled={reflecting || !target}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 flex items-center gap-2 shrink-0 transition-all btn-hover"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reflecting ? 'animate-spin' : ''}`} />
          <span>Reflect</span>
        </button>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2">
        {/* Environment Pill */}
        <button
          onClick={onOpenEnvModal}
          className="h-10 flex items-center gap-2 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs font-medium text-emerald-300 transition-all shadow-sm"
          title="Switch or configure Environments & Dynamic Variables"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="max-w-[110px] truncate font-medium">{activeEnvName || 'Local Dev'}</span>
        </button>

        {/* Collections */}
        <button
          onClick={onOpenCollections}
          className="h-10 hidden xl:flex items-center gap-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-teal-300 transition-all"
          title="Collections & Request Suites"
        >
          <FolderHeart className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span>Collections</span>
        </button>

        {/* History */}
        <button
          onClick={onOpenHistory}
          className="h-10 hidden xl:flex items-center gap-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-indigo-300 transition-all"
          title="Call History & 1-Click Replay"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>History</span>
        </button>

        {/* Mock Server Button */}
        <button
          onClick={onOpenMockModal}
          className={`h-10 flex items-center gap-2 px-3.5 rounded-xl border text-xs font-medium transition-all ${
            mockRunning 
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20' 
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
          }`}
          title="Configure embedded dynamic mock server"
        >
          <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Mock</span>
          {mockRunning ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30 font-semibold">
              :{mockPort}
            </span>
          ) : (
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 font-mono">Off</span>
          )}
        </button>

        {/* Tools & Analyzers Dropdown (Clean Responsive Hub) */}
        <div className="relative" ref={toolsMenuRef}>
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className={`h-10 flex items-center gap-2 px-3.5 rounded-xl border text-xs font-medium transition-all ${
              showToolsMenu
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
            }`}
            title="Tools, Analyzers & Presets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden sm:inline">Tools</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showToolsMenu && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl glass-dropdown p-2 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-white/10">
              <div className="p-1 space-y-1">
                <button
                  onClick={() => { onOpenBenchmark(); setShowToolsMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center justify-between text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-100">Micro-Benchmark</div>
                      <div className="text-[10px] text-slate-400">RPS & Latency Percentiles</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </button>

                <button
                  onClick={() => { onOpenDiff(); setShowToolsMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center justify-between text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      <GitCompare className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-100">Schema Diff</div>
                      <div className="text-[10px] text-slate-400">Breaking Change Detector</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </button>

                <button
                  onClick={() => { onOpenJwtInspector(); setShowToolsMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center justify-between text-slate-200 group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Key className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-100">JWT Inspector</div>
                      <div className="text-[10px] text-slate-400">Decode & Live Countdown</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                </button>
              </div>

              <div className="p-1 pt-1.5 space-y-1">
                <button
                  onClick={() => { onOpenProtoModal(); setShowToolsMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center gap-2.5 text-slate-200 transition-colors"
                >
                  <FileCode className="w-4 h-4 text-sky-400" />
                  <span>Import .proto File</span>
                </button>

                <button
                  onClick={() => { onOpenAIPresets(); setShowToolsMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center gap-2.5 text-slate-200 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>AI Inference Presets (Triton / vLLM)</span>
                </button>

                <button
                  onClick={() => { onOpenExportModal(); setShowToolsMenu(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center gap-2.5 text-slate-200 transition-colors"
                >
                  <Code2 className="w-4 h-4 text-indigo-400" />
                  <span>Export Code (grpcurl, TS, Go)</span>
                </button>

                <button
                  onClick={() => { onOpenCollections(); setShowToolsMenu(false); }}
                  className="xl:hidden w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center gap-2.5 text-slate-200 transition-colors"
                >
                  <FolderHeart className="w-4 h-4 text-teal-400" />
                  <span>Collections</span>
                </button>

                <button
                  onClick={() => { onOpenHistory(); setShowToolsMenu(false); }}
                  className="xl:hidden w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/10 flex items-center gap-2.5 text-slate-200 transition-colors"
                >
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>History</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Target Pill for Tablet/Mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden flex items-center gap-2 h-10 px-3 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-xs font-mono text-slate-300 transition-all shadow-inner"
          title="Click to configure host endpoint & wire protocol"
        >
          <span className={`w-2 h-2 rounded-full ${protocol === 'grpc' ? 'bg-cyan-400' : 'bg-purple-400'}`} />
          <span className="max-w-[120px] truncate">{target}</span>
        </button>

        {/* Mobile Menu Toggle for small screens */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-[#0c1222] border-b border-white/10 p-4 lg:hidden shadow-2xl flex flex-col gap-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 flex items-center bg-black/50 border border-white/10 rounded-xl px-2.5 h-10">
              <span className={`w-2 h-2 rounded-full mr-2 ${protocol === 'grpc' ? 'bg-cyan-400' : 'bg-purple-400'}`} />
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Host endpoint (e.g. localhost:50051)"
                className="flex-1 bg-transparent py-2 text-xs font-mono text-slate-100 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProtocol(protocol === 'grpc' ? 'connect' : 'grpc')}
                className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-200"
              >
                {protocol.toUpperCase()}
              </button>
              <button
                onClick={() => setTLS(prev => ({ ...prev, useTls: !prev.useTls }))}
                className={`h-10 px-3 rounded-xl border text-xs font-mono flex items-center gap-1.5 ${
                  tls.useTls 
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                    : 'text-slate-400 border-white/10 bg-white/5'
                }`}
              >
                {tls.useTls ? 'TLS' : 'Insecure'}
              </button>
              <button
                onClick={() => { onReflect(); setMobileMenuOpen(false); }}
                className="h-10 flex-1 sm:flex-initial px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20"
              >
                Reflect
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <button
              onClick={() => { onOpenCollections(); setMobileMenuOpen(false); }}
              className="h-10 px-3 rounded-xl bg-white/5 text-xs text-slate-200 flex items-center gap-2"
            >
              <FolderHeart className="w-4 h-4 text-teal-400" />
              <span>Collections</span>
            </button>
            <button
              onClick={() => { onOpenHistory(); setMobileMenuOpen(false); }}
              className="h-10 px-3 rounded-xl bg-white/5 text-xs text-slate-200 flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>History</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

