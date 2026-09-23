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
  FolderOpen
} from 'lucide-react';
import { ServiceInfo, MethodInfo, RPCKind } from '../types';

interface ServiceSidebarProps {
  services: ServiceInfo[];
  selectedMethod: MethodInfo | null;
  onSelectMethod: (method: MethodInfo) => void;
  onLoadSample: () => void;
  onOpenProtoModal: () => void;
}

export const ServiceSidebar: React.FC<ServiceSidebarProps> = ({
  services,
  selectedMethod,
  onSelectMethod,
  onLoadSample,
  onOpenProtoModal,
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

  const getKindBadge = (kind: RPCKind) => {
    switch (kind) {
      case 'unary':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            UNARY
          </span>
        );
      case 'server_stream':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            SERVER
          </span>
        );
      case 'client_stream':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            CLIENT
          </span>
        );
      case 'bidirectional':
        return (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
            BIDI
          </span>
        );
    }
  };

  return (
    <aside className="w-72 h-full border-r border-white/10 bg-[#080c16] flex flex-col select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-white/10">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter services & RPCs..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Services List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredServices.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-10 h-10 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-500 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-300 mb-1">No Services Loaded</p>
            <p className="text-[11px] text-slate-500 mb-4">
              Enter a target host to reflect or import local proto files.
            </p>
            <div className="space-y-2">
              <button
                onClick={onLoadSample}
                className="w-full py-1.5 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-xs font-medium transition-colors"
              >
                Load Sample Order Schema
              </button>
              <button
                onClick={onOpenProtoModal}
                className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Import .proto File</span>
              </button>
            </div>
          </div>
        ) : (
          filteredServices.map((svc) => {
            const isCollapsed = collapsedServices[svc.fullName];

            return (
              <div key={svc.fullName} className="rounded-lg overflow-hidden border border-white/5 bg-white/[0.02]">
                {/* Service Header */}
                <button
                  onClick={() => toggleCollapse(svc.fullName)}
                  className="w-full px-2.5 py-2 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">{svc.name}</div>
                      {svc.package && (
                        <div className="text-[10px] text-slate-500 font-mono truncate">{svc.package}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                    {svc.methods.length}
                  </span>
                </button>

                {/* Methods List */}
                {!isCollapsed && (
                  <div className="pl-4 pr-1 py-1 space-y-0.5 border-t border-white/5 bg-black/20">
                    {svc.methods.map((method) => {
                      const isSelected = selectedMethod?.fullName === method.fullName;

                      return (
                        <button
                          key={method.fullName}
                          onClick={() => onSelectMethod(method)}
                          className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-mono truncate">{method.name}</span>
                          </div>
                          {getKindBadge(method.kind)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/10 bg-[#060912] flex items-center justify-between text-[11px] text-slate-500">
        <span>Services: {services.length}</span>
        <span>
          RPCs: {services.reduce((acc, s) => acc + s.methods.length, 0)}
        </span>
      </div>
    </aside>
  );
};
