import React from 'react';
import { X, Plus, Terminal } from 'lucide-react';
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
    <div className="h-10 border-b border-white/10 bg-[#070b16] flex items-center px-2 gap-1 overflow-x-auto select-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const kindColor = 
          tab.method.kind === 'unary' ? 'bg-cyan-400' :
          tab.method.kind === 'server_stream' ? 'bg-emerald-400' :
          tab.method.kind === 'client_stream' ? 'bg-amber-400' : 'bg-purple-400';

        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group h-8 px-3 rounded-t-lg flex items-center gap-2 cursor-pointer border-t border-x text-xs transition-all max-w-[200px] shrink-0 ${
              isActive
                ? 'bg-[#0d1322] border-white/15 text-white font-medium shadow-sm'
                : 'bg-transparent border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${kindColor}`} />
            <span className="truncate font-mono text-[11px]">{tab.title}</span>

            {tabs.length > 1 && (
              <button
                onClick={(e) => onCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 text-slate-400 hover:text-white transition-opacity ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewTab}
        className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors ml-1"
        title="Open new tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
