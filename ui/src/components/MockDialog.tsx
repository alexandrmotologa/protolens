import React, { useState } from 'react';
import { X, Server, Play, Square, Clock, Zap, Plus, Trash2, Sliders, ShieldAlert } from 'lucide-react';
import { MockConfig, MockRule } from '../types';

interface MockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mockRunning: boolean;
  mockPort: number;
  initialRules?: MockRule[];
  onStartMock: (config: MockConfig) => void;
  onStopMock: () => void;
  onUpdateRules?: (rules: MockRule[]) => void;
}

export const MockDialog: React.FC<MockDialogProps> = ({
  isOpen,
  onClose,
  mockRunning,
  mockPort,
  initialRules = [],
  onStartMock,
  onStopMock,
  onUpdateRules,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'rules'>('settings');
  const [port, setPort] = useState(mockPort || 50055);
  const [latencyMs, setLatencyMs] = useState(0);
  const [errorCode, setErrorCode] = useState(0);
  const [rules, setRules] = useState<MockRule[]>(initialRules);

  if (!isOpen) return null;

  const handleStart = () => {
    onStartMock({
      port,
      latencyMs,
      errorCode,
      responseOverrides: {},
      rules,
    });
  };

  const handleAddRule = () => {
    const newRule: MockRule = {
      id: `rule_${Date.now()}`,
      method: '',
      conditionField: 'id',
      conditionOp: 'equals',
      conditionVal: 'test-123',
      responseJson: '{\n  "message": "Custom conditional mock response"\n}',
      statusCode: 0,
      latencyMs: 0,
    };
    const updated = [...rules, newRule];
    setRules(updated);
    if (onUpdateRules) onUpdateRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    if (onUpdateRules) onUpdateRules(updated);
  };

  const handleUpdateRule = (index: number, field: keyof MockRule, val: any) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: val };
    setRules(updated);
    if (onUpdateRules) onUpdateRules(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Dynamic gRPC Mock Server & Smart Rules</h3>
              <p className="text-[11px] text-slate-400">Host schema-compliant and conditional mock RPCs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 pt-3 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Server Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeTab === 'rules'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Smart Rules ({rules.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4 text-xs flex-1 overflow-y-auto">
          {activeTab === 'settings' && (
            <>
              {/* Status */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  mockRunning
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      mockRunning ? 'bg-emerald-400 live-indicator' : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-medium">
                    {mockRunning ? `Listening on localhost:${mockPort}` : 'Mock Server Stopped'}
                  </span>
                </div>
                {mockRunning && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Reflection Active
                  </span>
                )}
              </div>

              {/* Port Input */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Local Port</label>
                <input
                  type="number"
                  value={port}
                  disabled={mockRunning}
                  onChange={(e) => setPort(parseInt(e.target.value, 10) || 50055)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500/50 disabled:opacity-50"
                />
              </div>

              {/* Latency Simulation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Global Simulated Latency</span>
                  </label>
                  <span className="font-mono text-amber-300">{latencyMs} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={latencyMs}
                  onChange={(e) => setLatencyMs(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0ms (Immediate)</span>
                  <span>500ms</span>
                  <span>1500ms (High Delay)</span>
                </div>
              </div>

              {/* Fault / Error Code Injection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>Global Fault / Error Code Injection</span>
                </label>
                <select
                  value={errorCode}
                  onChange={(e) => setErrorCode(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-rose-500/50"
                >
                  <option value="0">0 - OK (Normal Successful Response)</option>
                  <option value="1">1 - CANCELLED</option>
                  <option value="3">3 - INVALID_ARGUMENT</option>
                  <option value="4">4 - DEADLINE_EXCEEDED</option>
                  <option value="5">5 - NOT_FOUND</option>
                  <option value="7">7 - PERMISSION_DENIED</option>
                  <option value="14">14 - UNAVAILABLE (Service Down)</option>
                  <option value="16">16 - UNAUTHENTICATED</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Return custom responses or status codes when incoming request fields match specific criteria
                </p>
                <button
                  onClick={handleAddRule}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <p>No smart rules defined. Click "Add Rule" or "Save as Mock Rule" from response panel.</p>
                </div>
              ) : (
                rules.map((rule, idx) => (
                  <div key={rule.id} className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <span className="text-[11px] text-gray-400 font-medium">Method:</span>
                        <input
                          type="text"
                          placeholder="/package.Service/Method (or leave empty for all)"
                          value={rule.method}
                          onChange={(e) => handleUpdateRule(idx, 'method', e.target.value)}
                          className="flex-1 bg-[#12141a] border border-gray-800 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-gray-500 hover:text-red-400 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-0.5">Field Name</span>
                        <input
                          type="text"
                          placeholder="e.g. customer_id"
                          value={rule.conditionField}
                          onChange={(e) => handleUpdateRule(idx, 'conditionField', e.target.value)}
                          className="w-full bg-[#12141a] border border-gray-800 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-0.5">Operator</span>
                        <select
                          value={rule.conditionOp}
                          onChange={(e) => handleUpdateRule(idx, 'conditionOp', e.target.value)}
                          className="w-full bg-[#12141a] border border-gray-800 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                        >
                          <option value="equals">equals</option>
                          <option value="contains">contains</option>
                          <option value="exists">exists</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-0.5">Value</span>
                        <input
                          type="text"
                          placeholder="Expected value"
                          value={rule.conditionVal}
                          onChange={(e) => handleUpdateRule(idx, 'conditionVal', e.target.value)}
                          className="w-full bg-[#12141a] border border-gray-800 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">Custom Response JSON</span>
                      <textarea
                        rows={3}
                        value={rule.responseJson}
                        onChange={(e) => handleUpdateRule(idx, 'responseJson', e.target.value)}
                        className="w-full bg-[#12141a] border border-gray-800 rounded p-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Close
          </button>

          {mockRunning ? (
            <button
              onClick={onStopMock}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-rose-500/20"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Mock Server</span>
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Mock Server</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
