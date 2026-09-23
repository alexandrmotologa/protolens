import React from 'react';
import { X, Plus } from 'lucide-react';
import { TabItem } from '../types';

interface RequestTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string, e: React.MouseEvent) => void;
  onNewTab: () => void;
}

export const RequestTabs: React.FC<RequestTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="h-11 border-b border-white/10 bg-[#070b16] flex items-center px-3 gap-1.5 overflow-x-auto select-none shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const kindColor = 
          tab.method.kind === 'unary' ? 'bg-cyan-400 shadow-cyan-500/50' :
          tab.method.kind === 'server_stream' ? 'bg-emerald-400 shadow-emerald-500/50' :
          tab.method.kind === 'client_stream' ? 'bg-amber-400 shadow-amber-500/50' : 'bg-purple-400 shadow-purple-500/50';

        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group h-8 px-3.5 rounded-lg flex items-center gap-2.5 cursor-pointer text-xs transition-all max-w-[220px] shrink-0 border ${
              isActive
                ? 'bg-[#0f172a] border-cyan-500/40 text-cyan-200 font-medium shadow-sm ring-1 ring-cyan-500/20'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${kindColor}`} />
            <span className="truncate font-mono text-[11px] font-medium tracking-tight">{tab.title}</span>

            {tabs.length > 1 && (
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-md p-1 text-slate-400 hover:text-white transition-all ml-0.5"
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all ml-1 shrink-0"
        title="Open new workbench tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

