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
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl glass-modal border border-white/10 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 bg-[#0b101f]/95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white tracking-tight">Import Protobuf Definitions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Parse local .proto schemas with AST resolution</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2 my-4 border-b border-white/10 text-xs">
          <button
            onClick={() => setTab('paste')}
            className={`py-2.5 px-3.5 border-b-2 font-medium transition-all flex items-center gap-2 ${
              tab === 'paste' ? 'border-sky-400 text-sky-300 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste .proto Text</span>
          </button>
          <button
            onClick={() => setTab('path')}
            className={`py-2.5 px-3.5 border-b-2 font-medium transition-all flex items-center gap-2 ${
              tab === 'path' ? 'border-sky-400 text-sky-300 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Local File Path</span>
          </button>
        </div>

        {/* Body */}
        {tab === 'paste' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Virtual Filename</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Protobuf Source Definition</label>
              <textarea
                rows={9}
                value={rawProto}
                onChange={(e) => setRawProto(e.target.value)}
                placeholder={'syntax = "proto3";\n\nservice Greeter {\n  rpc SayHello (HelloRequest) returns (HelloReply);\n}'}
                className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/60 resize-none"
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleParseContent}
                disabled={!rawProto.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all btn-hover"
              >
                Compile & Load Schema
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Absolute or Relative File Path</label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="e.g. /home/user/workspace/orders.proto or ./proto/api.proto"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/60"
              />
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleParsePath}
                disabled={!filePath.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all btn-hover"
              >
                Load from Disk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
