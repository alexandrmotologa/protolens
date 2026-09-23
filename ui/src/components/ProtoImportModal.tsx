import React, { useState } from 'react';
import { X, FileCode, Upload, FileText } from 'lucide-react';

interface ProtoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportContent: (content: string, filename: string) => void;
  onImportPaths: (files: string[], importPaths: string[]) => void;
}

export const ProtoImportModal: React.FC<ProtoImportModalProps> = ({
  isOpen,
  onClose,
  onImportContent,
  onImportPaths,
}) => {
  const [tab, setTab] = useState<'paste' | 'path'>('paste');
  const [rawProto, setRawProto] = useState('');
  const [filename, setFilename] = useState('service.proto');
  const [filePath, setFilePath] = useState('');

  if (!isOpen) return null;

  const handleParseContent = () => {
    if (!rawProto.trim()) return;
    onImportContent(rawProto, filename || 'service.proto');
    onClose();
  };

  const handleParsePath = () => {
    if (!filePath.trim()) return;
    onImportPaths([filePath], []);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Import Protobuf Definitions</h3>
              <p className="text-[11px] text-slate-400">Load local schemas without server reflection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 my-4 border-b border-white/10 text-xs">
          <button
            onClick={() => setTab('paste')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              tab === 'paste' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste .proto Text</span>
          </button>
          <button
            onClick={() => setTab('path')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              tab === 'path' ? 'border-sky-400 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Local File Path</span>
          </button>
        </div>

        {/* Body */}
        {tab === 'paste' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Virtual Filename</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Protobuf Source Definition</label>
              <textarea
                rows={10}
                value={rawProto}
                onChange={(e) => setRawProto(e.target.value)}
                placeholder={'syntax = "proto3";\n\nservice Greeter {\n  rpc SayHello (HelloRequest) returns (HelloReply);\n}'}
                className="w-full p-3 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Absolute or Relative File Path</label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="e.g. ./proto/service.proto or C:/projects/api/order.proto"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              ProtoLens resolves imports and standard Google types (<code>timestamp.proto</code>, <code>empty.proto</code>) automatically.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-white/10 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={tab === 'paste' ? handleParseContent : handleParsePath}
            disabled={tab === 'paste' ? !rawProto.trim() : !filePath.trim()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-sky-500/20"
          >
            Parse & Load Schema
          </button>
        </div>
      </div>
    </div>
  );
};
