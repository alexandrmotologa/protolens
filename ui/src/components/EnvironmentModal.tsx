import React, { useState } from 'react';
import { X, Plus, Trash2, Globe, Sparkles, Check, Copy } from 'lucide-react';
import { Environment, EnvironmentVariable } from '../types';

interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  activeEnvId: string;
  onSaveEnvironments: (envs: Environment[], activeId: string) => void;
}

export function interpolateText(text: string, env?: Environment): string {
  if (!text) return '';
  let res = text;

  // Replace user-defined environment variables
  if (env) {
    for (const v of env.variables) {
      if (v.enabled && v.key.trim() !== '') {
        const regex = new RegExp(`\\{\\{${v.key.trim()}\\}\\}`, 'g');
        res = res.replace(regex, v.value);
      }
    }
  }

  // Replace built-in dynamic variables
  res = res.replace(/\{\{\$guid\}\}/gi, () => crypto.randomUUID());
  res = res.replace(/\{\{\$uuid\}\}/gi, () => crypto.randomUUID());
  res = res.replace(/\{\{\$timestamp\}\}/gi, () => Math.floor(Date.now() / 1000).toString());
  res = res.replace(/\{\{\$timestampMs\}\}/gi, () => Date.now().toString());
  res = res.replace(/\{\{\$isoTimestamp\}\}/gi, () => new Date().toISOString());
  res = res.replace(/\{\{\$randomInt\}\}/gi, () => Math.floor(Math.random() * 1000 + 1).toString());
  res = res.replace(/\{\{\$randomEmail\}\}/gi, () => `user_${Math.floor(Math.random() * 9000 + 1000)}@example.com`);

  return res;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  environments,
  activeEnvId,
  onSaveEnvironments,
}) => {
  const [envs, setEnvs] = useState<Environment[]>(environments);
  const [selectedEnvId, setSelectedEnvId] = useState<string>(activeEnvId || (environments[0]?.id ?? 'default'));
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentEnv = envs.find((e) => e.id === selectedEnvId) || envs[0];

  const handleAddEnv = () => {
    const newId = `env_${Date.now()}`;
    const newEnv: Environment = {
      id: newId,
      name: `Environment ${envs.length + 1}`,
      variables: [
        { key: 'HOST', value: 'localhost:50051', enabled: true },
        { key: 'TOKEN', value: 'Bearer eyJhbGciOi...', enabled: true },
      ],
    };
    const updated = [...envs, newEnv];
    setEnvs(updated);
    setSelectedEnvId(newId);
  };

  const handleDeleteEnv = (id: string) => {
    if (envs.length <= 1) return;
    const updated = envs.filter((e) => e.id !== id);
    setEnvs(updated);
    if (selectedEnvId === id) {
      setSelectedEnvId(updated[0].id);
    }
  };

  const handleUpdateVar = (index: number, field: keyof EnvironmentVariable, value: any) => {
    if (!currentEnv) return;
    const updatedVars = [...currentEnv.variables];
    updatedVars[index] = { ...updatedVars[index], [field]: value };
    const updatedEnvs = envs.map((e) => (e.id === currentEnv.id ? { ...e, variables: updatedVars } : e));
    setEnvs(updatedEnvs);
  };

  const handleAddVar = () => {
    if (!currentEnv) return;
    const updatedVars = [...currentEnv.variables, { key: '', value: '', enabled: true }];
    const updatedEnvs = envs.map((e) => (e.id === currentEnv.id ? { ...e, variables: updatedVars } : e));
    setEnvs(updatedEnvs);
  };

  const handleDeleteVar = (index: number) => {
    if (!currentEnv) return;
    const updatedVars = currentEnv.variables.filter((_, i) => i !== index);
    const updatedEnvs = envs.map((e) => (e.id === currentEnv.id ? { ...e, variables: updatedVars } : e));
    setEnvs(updatedEnvs);
  };

  const handleSaveAndApply = () => {
    onSaveEnvironments(envs, selectedEnvId);
    onClose();
  };

  const copyCheatsheetVar = (syntax: string) => {
    navigator.clipboard.writeText(syntax);
    setCopiedVar(syntax);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
      <div className="bg-[#0b101f]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0d1428]">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Environments & Dynamic Variables</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Interpolate dynamic keys into endpoints, payloads, and headers with {'{{VARIABLE}}'} syntax
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Environments Sidebar */}
          <div className="w-64 border-r border-white/10 bg-[#080d1a] p-4 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Environments</span>
              <button
                onClick={handleAddEnv}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                title="Add Environment"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {envs.map((env) => (
                <div
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    selectedEnvId === env.id
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/35 shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{env.name}</span>
                  {envs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEnv(env.id);
                      }}
                      className="opacity-0 hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Generator Cheatsheet */}
            <div className="mt-4 pt-3.5 border-t border-white/10">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400 mb-2.5 px-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dynamic Generators</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                {[
                  { label: 'UUID v4', code: '{{$uuid}}' },
                  { label: 'Timestamp (s)', code: '{{$timestamp}}' },
                  { label: 'ISO8601 Date', code: '{{$isoTimestamp}}' },
                  { label: 'Random Int', code: '{{$randomInt}}' },
                  { label: 'Random Email', code: '{{$randomEmail}}' },
                ].map((gen) => (
                  <div
                    key={gen.code}
                    onClick={() => copyCheatsheetVar(gen.code)}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-slate-400 hover:text-slate-200 transition"
                  >
                    <span>{gen.label}</span>
                    <span className="text-cyan-400 text-[10px] flex items-center space-x-1">
                      {copiedVar === gen.code ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>{gen.code}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Variables Table */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-[#070b16]">
            {currentEnv && (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                  <div>
                    <input
                      type="text"
                      value={currentEnv.name}
                      onChange={(e) => {
                        const updated = envs.map((en) => (en.id === currentEnv.id ? { ...en, name: e.target.value } : en));
                        setEnvs(updated);
                      }}
                      className="bg-transparent text-base font-bold text-white border-b border-white/20 focus:border-cyan-400 outline-none pb-0.5"
                    />
                    <p className="text-xs text-slate-400 mt-1">Configure static variables for this environment</p>
                  </div>
                  <button
                    onClick={handleAddVar}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium flex items-center space-x-1.5 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {currentEnv.variables.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                      No variables defined for this environment. Click &ldquo;Add Variable&rdquo; to begin.
                    </div>
                  ) : (
                    currentEnv.variables.map((v, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-1 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition">
                        <input
                          type="checkbox"
                          checked={v.enabled}
                          onChange={(e) => handleUpdateVar(idx, 'enabled', e.target.checked)}
                          className="w-4 h-4 rounded bg-black/50 border-white/20 text-cyan-500 ml-2 cursor-pointer"
                        />
                        <input
                          type="text"
                          placeholder="VARIABLE_KEY"
                          value={v.key}
                          onChange={(e) => handleUpdateVar(idx, 'key', e.target.value)}
                          className="w-48 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. localhost:50051)"
                          value={v.value}
                          onChange={(e) => handleUpdateVar(idx, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50"
                        />
                        <button
                          onClick={() => handleDeleteVar(idx)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition mr-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0d1428] flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Active: <span className="text-emerald-400 font-semibold">{currentEnv?.name}</span>
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all btn-hover"
            >
              Save & Apply Environment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
