import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Box, 
  Zap, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';
import { ServiceInfo, MethodInfo, RPCKind } from '../types';

interface ServiceSidebarProps {
  services: ServiceInfo[];
  selectedMethod: MethodInfo | null;
  onSelectMethod: (method: MethodInfo) => void;
  onLoadSample: () => void;
  onOpenProtoModal: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ServiceSidebar: React.FC<ServiceSidebarProps> = ({
  services,
  selectedMethod,
  onSelectMethod,
  onLoadSample,
  onOpenProtoModal,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState('');
  const [collapsedServices, setCollapsedServices] = useState<Record<string, boolean>>({});

  const toggleCollapse = (fullName: string) => {
    setCollapsedServices(prev => ({
      ...prev,
      [fullName]: !prev[fullName],
    }));
  };

  const filteredServices = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();

    return services
      .map(svc => {
        const matchesSvc = svc.name.toLowerCase().includes(q) || svc.fullName.toLowerCase().includes(q);
        const filteredMethods = svc.methods.filter(
          m => m.name.toLowerCase().includes(q) || m.fullName.toLowerCase().includes(q)
        );

        if (matchesSvc) return svc;
        if (filteredMethods.length > 0) {
          return { ...svc, methods: filteredMethods };
        }
        return null;
      })
      .filter((s): s is ServiceInfo => s !== null);
  }, [services, search]);

  const totalMethods = useMemo(() => {
    return services.reduce((acc, s) => acc + s.methods.length, 0);
  }, [services]);

  const getKindBadge = (kind: RPCKind) => {
    switch (kind) {
      case 'unary':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold tracking-wide">
            UNARY
          </span>
        );
      case 'server_stream':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold tracking-wide">
            SERVER
          </span>
        );
      case 'client_stream':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold tracking-wide">
            CLIENT
          </span>
        );
      case 'bidirectional':
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold tracking-wide">
            BIDI
          </span>
        );
    }
  };

  if (collapsed) {
    return (
      <aside className="w-12 h-full border-r border-white/10 bg-[#070b16] flex flex-col items-center py-4 gap-4 select-none shrink-0 transition-all">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Expand service explorer"
        >
          <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
        </button>
        <div className="w-7 h-px bg-white/10" />
        <div className="writing-vertical-lr text-[11px] font-mono text-slate-400 tracking-wider uppercase font-semibold">
          Services ({services.length})
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 h-full border-r border-white/10 bg-[#070b16] flex flex-col select-none shrink-0 transition-all">
      {/* Sidebar Header & Search */}
      <div className="p-3.5 border-b border-white/10 bg-[#090e1c] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200 tracking-tight">Services & RPCs</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-medium">
              {services.length} svc • {totalMethods} rpc
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RPC methods & packages..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 p-0.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredServices.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500 mb-3.5 border border-white/10">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-200 mb-1">No Services Available</p>
            <p className="text-[11px] text-slate-400 mb-5 leading-relaxed">
              Enter a target host in the top bar to reflect, or load a sample schema to test immediately.
            </p>
            <div className="space-y-2">
              <button
                onClick={onLoadSample}
                className="w-full py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all shadow-sm"
              >
                Load Sample Order Schema
              </button>
              <button
                onClick={onOpenProtoModal}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-all flex items-center justify-center gap-2"
              >
                <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Import .proto File</span>
              </button>
            </div>
          </div>
        ) : (
          filteredServices.map((svc) => {
            const isCollapsed = collapsedServices[svc.fullName];

            return (
              <div 
                key={svc.fullName} 
                className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-sm transition-all"
              >
                {/* Service Header */}
                <button
                  onClick={() => toggleCollapse(svc.fullName)}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Box className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="truncate">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                      {svc.methods.length}
                    </span>
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </button>

                {/* Methods List */}
                {!isCollapsed && (
                  <div className="p-1.5 space-y-1 border-t border-white/5 bg-black/20">
                    {svc.methods.map((method) => {
                      const isSelected = selectedMethod?.fullName === method.fullName;

                      return (
                        <div
                          key={method.fullName}
                          onClick={() => onSelectMethod(method)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 text-white font-medium border border-cyan-500/30 shadow-sm'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              method.kind === 'unary' ? 'bg-cyan-400' :
                              method.kind === 'server_stream' ? 'bg-emerald-400' :
                              method.kind === 'client_stream' ? 'bg-amber-400' : 'bg-purple-400'
                            }`} />
                            <span className="truncate text-xs font-medium">{method.name}</span>
                          </div>
                          <div className="shrink-0">
                            {getKindBadge(method.kind)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

