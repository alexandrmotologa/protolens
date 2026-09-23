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
      name: `New Env ${envs.length + 1}`,
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

  const handleCopyGenerator = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedVar(snippet);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e222b] border border-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#181b22]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Environments & Dynamic Variables</h2>
              <p className="text-xs text-gray-400">
                Interpolate dynamic keys into endpoints, payloads, and headers with {'{{VARIABLE}}'} syntax
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Environments Sidebar */}
          <div className="w-56 border-r border-gray-800 bg-[#16181f] p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Environments</span>
              <button
                onClick={handleAddEnv}
                className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                title="Add Environment"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 flex-1 overflow-y-auto">
              {envs.map((env) => (
                <div
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                    selectedEnvId === env.id
                      ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30'
                      : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                  }`}
                >
                  <span className="truncate">{env.name}</span>
                  {envs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEnv(env.id);
                      }}
                      className="opacity-0 hover:opacity-100 p-1 text-gray-500 hover:text-red-400 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Generator Cheatsheet */}
            <div className="mt-4 pt-3 border-t border-gray-800">
              <div className="flex items-center space-x-1.5 text-xs font-medium text-amber-400 mb-2 px-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Dynamic Generators</span>
              </div>
              <div className="space-y-1 text-[11px]">
                {[
                  { label: 'UUID / GUID', tag: '{{$guid}}' },
                  { label: 'Unix Timestamp', tag: '{{$timestamp}}' },
                  { label: 'ISO-8601 Date', tag: '{{$isoTimestamp}}' },
                  { label: 'Random Integer', tag: '{{$randomInt}}' },
                  { label: 'Random Email', tag: '{{$randomEmail}}' },
                ].map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => handleCopyGenerator(item.tag)}
                    className="flex items-center justify-between px-2 py-1 rounded bg-[#1e222b] hover:bg-gray-800 cursor-pointer text-gray-300 font-mono transition"
                    title="Click to copy syntax"
                  >
                    <span className="text-[10px] text-gray-400 font-sans">{item.label}</span>
                    <span className="text-emerald-400">{copiedVar === item.tag ? 'Copied!' : item.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Variables Table */}
          <div className="flex-1 p-6 flex flex-col overflow-hidden bg-[#1a1d24]">
            {currentEnv && (
              <>
                <div className="flex items-center space-x-3 mb-4">
                  <label className="text-xs text-gray-400 font-medium">Environment Name:</label>
                  <input
                    type="text"
                    value={currentEnv.name}
                    onChange={(e) => {
                      const updatedEnvs = envs.map((en) =>
                        en.id === currentEnv.id ? { ...en, name: e.target.value } : en
                      );
                      setEnvs(updatedEnvs);
                    }}
                    className="bg-[#12141a] border border-gray-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  {activeEnvId === currentEnv.id && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-[11px] uppercase tracking-wider">
                        <th className="pb-2 w-10">Use</th>
                        <th className="pb-2 w-1/3">Variable Key</th>
                        <th className="pb-2">Value</th>
                        <th className="pb-2 w-10 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {currentEnv.variables.map((v, idx) => (
                        <tr key={idx} className="group">
                          <td className="py-2">
                            <input
                              type="checkbox"
                              checked={v.enabled}
                              onChange={(e) => handleUpdateVar(idx, 'enabled', e.target.checked)}
                              className="rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              placeholder="KEY"
                              value={v.key}
                              onChange={(e) => handleUpdateVar(idx, 'key', e.target.value)}
                              className="w-full bg-[#12141a] border border-gray-700/80 rounded px-2.5 py-1.5 text-gray-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              placeholder="Value"
                              value={v.value}
                              onChange={(e) => handleUpdateVar(idx, 'value', e.target.value)}
                              className="w-full bg-[#12141a] border border-gray-700/80 rounded px-2.5 py-1.5 text-gray-200 font-mono text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => handleDeleteVar(idx)}
                              className="p-1 text-gray-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={handleAddVar}
                    className="mt-3 flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-[#181b22]">
          <div className="text-xs text-gray-400">
            Selected environment will automatically apply across all tabs
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-gray-700 text-xs font-medium text-gray-300 hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md transition flex items-center space-x-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save & Set Active</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
