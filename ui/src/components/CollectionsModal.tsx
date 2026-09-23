import React, { useState } from 'react';
import { X, FolderHeart, Download, Upload, Plus, Trash2, ArrowUpRight, Save, Folder } from 'lucide-react';
import { Collection, SavedRequest, TabItem } from '../types';

interface CollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSaveCollections: (collections: Collection[]) => void;
  currentTab?: TabItem;
  onLoadRequest: (req: SavedRequest) => void;
}

export const CollectionsModal: React.FC<CollectionsModalProps> = ({
  isOpen,
  onClose,
  collections,
  onSaveCollections,
  currentTab,
  onLoadRequest,
}) => {
  const [cols, setCols] = useState<Collection[]>(collections);
  const [selectedColId, setSelectedColId] = useState<string>(collections[0]?.id || 'default');
  const [saveName, setSaveName] = useState(currentTab ? `${currentTab.title} Request` : '');

  if (!isOpen) return null;

  const activeCol = cols.find((c) => c.id === selectedColId) || cols[0];

  const handleCreateCollection = () => {
    const newId = `col_${Date.now()}`;
    const newCol: Collection = {
      id: newId,
      name: `Collection ${cols.length + 1}`,
      requests: [],
    };
    const updated = [...cols, newCol];
    setCols(updated);
    setSelectedColId(newId);
    onSaveCollections(updated);
  };

  const handleDeleteCollection = (id: string) => {
    if (cols.length <= 1) return;
    const updated = cols.filter((c) => c.id !== id);
    setCols(updated);
    setSelectedColId(updated[0].id);
    onSaveCollections(updated);
  };

  const handleSaveCurrentTab = () => {
    if (!currentTab || !activeCol) return;

    const newReq: SavedRequest = {
      id: `req_${Date.now()}`,
      name: saveName.trim() || `${currentTab.title} Saved`,
      methodName: currentTab.method.name,
      methodFullName: currentTab.method.fullName,
      target: currentTab.target,
      protocol: currentTab.protocol,
      payloadJson: currentTab.payloadJson,
      headers: currentTab.headers,
      tls: currentTab.tls,
      savedAt: new Date().toISOString(),
    };

    const updatedCols = cols.map((c) =>
      c.id === activeCol.id ? { ...c, requests: [...c.requests, newReq] } : c
    );

    setCols(updatedCols);
    onSaveCollections(updatedCols);
    setSaveName('');
  };

  const handleDeleteRequest = (reqId: string) => {
    if (!activeCol) return;
    const updatedRequests = activeCol.requests.filter((r) => r.id !== reqId);
    const updatedCols = cols.map((c) =>
      c.id === activeCol.id ? { ...c, requests: updatedRequests } : c
    );
    setCols(updatedCols);
    onSaveCollections(updatedCols);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cols, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'protolens-collections.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            setCols(parsed);
            onSaveCollections(parsed);
          }
        } catch (err) {
          alert('Invalid collections JSON format');
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <div className="bg-[#0b101f]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1428]">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Collections & Request Library</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Organize, share, and export your gRPC and Connect request suites with your team
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2.5">
            <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 font-medium flex items-center space-x-1.5 transition">
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              onClick={handleExportJSON}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition-all btn-hover"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Collections List */}
          <div className="w-64 border-r border-white/10 bg-[#080d1a] p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Suites</span>
              <button
                onClick={handleCreateCollection}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                title="Create Collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {cols.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    selectedColId === col.id
                      ? 'bg-teal-500/15 text-teal-300 font-semibold border border-teal-500/35 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Folder className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="truncate">{col.name}</span>
                  </div>
                  {cols.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(col.id);
                      }}
                      className="opacity-0 hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Requests in Collection */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-[#070b16]">
            {activeCol && (
              <>
                {/* Save Current Request to this Collection */}
                {currentTab && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 mb-5 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1.5">
                        Save Current Tab into &ldquo;{activeCol.name}&rdquo;
                      </label>
                      <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Request bookmark name..."
                        className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-teal-500/60"
                      />
                    </div>
                    <button
                      onClick={handleSaveCurrentTab}
                      className="h-9 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition-all btn-hover shrink-0 mt-4"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Tab</span>
                    </button>
                  </div>
                )}

                {/* Request List */}
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Saved Requests ({activeCol.requests.length})
                  </div>

                  {activeCol.requests.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                      No saved requests in this collection yet. Use the form above to bookmark tabs.
                    </div>
                  ) : (
                    activeCol.requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              req.protocol === 'grpc' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {req.protocol}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-slate-200 truncate">{req.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">{req.methodFullName}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => {
                              onLoadRequest(req);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center space-x-1 transition"
                          >
                            <span>Load</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
