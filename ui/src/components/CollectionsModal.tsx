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
          alert('Failed to parse collection JSON');
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e222b] border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#181b22]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Collections & Request Library</h2>
              <p className="text-xs text-gray-400">
                Organize, share, and export your gRPC and Connect request suites with your team
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium flex items-center space-x-1.5 transition">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Collections List */}
          <div className="w-60 border-r border-gray-800 bg-[#16181f] p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Folders</span>
              <button
                onClick={handleCreateCollection}
                className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                title="Create Collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto">
              {cols.map((col) => (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                    activeCol?.id === col.id
                      ? 'bg-teal-500/15 text-teal-300 font-medium border border-teal-500/30'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono opacity-60">({col.requests.length})</span>
                    {cols.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(col.id);
                        }}
                        className="opacity-0 hover:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requests Panel */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-[#1a1d24]">
            {activeCol && (
              <>
                {/* Save Current Tab Bar */}
                {currentTab && (
                  <div className="mb-5 p-3 rounded-lg bg-[#14161d] border border-gray-800 flex items-center space-x-3">
                    <span className="text-xs text-gray-400 whitespace-nowrap">Save Active Tab:</span>
                    <input
                      type="text"
                      placeholder="Request name..."
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="flex-1 bg-[#101217] border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={handleSaveCurrentTab}
                      className="px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center space-x-1 shadow transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save into {activeCol.name}</span>
                    </button>
                  </div>
                )}

                {/* List of Saved Requests */}
                <div className="flex-1 overflow-y-auto space-y-2">
                  {activeCol.requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-xs">
                      <Folder className="w-10 h-10 stroke-[1.2] mb-3 opacity-30 text-teal-400" />
                      <p>This collection is empty. Save requests from your tabs to build a suite.</p>
                    </div>
                  ) : (
                    activeCol.requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-lg bg-[#14161d] border border-gray-800 hover:border-gray-700 flex items-center justify-between transition group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-gray-200">{req.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-800 text-teal-400">
                              {req.protocol}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 truncate max-w-lg">
                            {req.methodFullName}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">Target: {req.target}</div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              onLoadRequest(req);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 text-xs font-medium flex items-center space-x-1 border border-teal-500/30 transition"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Load into Tab</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
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
