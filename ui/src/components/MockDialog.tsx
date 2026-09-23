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
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl glass-modal border border-white/10 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 bg-[#0b101f]/95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white tracking-tight">Dynamic gRPC Mock Server & Smart Rules</h3>
              <p className="text-xs text-slate-400 mt-0.5">Host schema-compliant and conditional mock RPCs with reflection</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 pt-3 border-b border-white/10 pb-3">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === 'settings'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Server Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition ${
              activeTab === 'rules'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span>Conditional Rules</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-semibold">
              {rules.length}
            </span>
          </button>
        </div>

        {/* Body Content */}
        <div className="py-4 space-y-4 flex-1 overflow-y-auto pr-1">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Listen Port (TCP)
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10))}
                  disabled={mockRunning}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/60 disabled:opacity-50"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Clients connect to <code>localhost:{port}</code> via gRPC or Connect-RPC.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Global Latency Simulation (ms)
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={latencyMs}
                    onChange={(e) => setLatencyMs(parseInt(e.target.value, 10) || 0)}
                    disabled={mockRunning}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/60 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Default gRPC Error Code (0 = OK, 1 = Cancelled, 5 = NotFound, 16 = Unauthenticated)
                </label>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    value={errorCode}
                    onChange={(e) => setErrorCode(parseInt(e.target.value, 10) || 0)}
                    disabled={mockRunning}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/60 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs text-slate-300 font-medium">Smart Conditional Rules</span>
                <button
                  onClick={handleAddRule}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                  No conditional mock rules configured. When no rules match, the mock server synthesizes default schema-compliant responses.
                </div>
              ) : (
                rules.map((rule, idx) => (
                  <div key={rule.id} className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 font-mono">Rule #{idx + 1}</span>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Target Method (empty = all)</label>
                        <input
                          type="text"
                          placeholder="e.g. /test.orders.v1.OrderService/CreateOrder"
                          value={rule.method}
                          onChange={(e) => handleUpdateRule(idx, 'method', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Condition Match</label>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            placeholder="Field"
                            value={rule.conditionField}
                            onChange={(e) => handleUpdateRule(idx, 'conditionField', e.target.value)}
                            className="w-1/3 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none"
                          />
                          <select
                            value={rule.conditionOp}
                            onChange={(e) => handleUpdateRule(idx, 'conditionOp', e.target.value)}
                            className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none"
                          >
                            <option value="equals">=</option>
                            <option value="contains">contains</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Val"
                            value={rule.conditionVal}
                            onChange={(e) => handleUpdateRule(idx, 'conditionVal', e.target.value)}
                            className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Mock Response JSON</label>
                      <textarea
                        rows={3}
                        value={rule.responseJson}
                        onChange={(e) => handleUpdateRule(idx, 'responseJson', e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500/50 resize-none"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${mockRunning ? 'bg-emerald-400 live-indicator' : 'bg-slate-600'}`} />
            <span className="text-xs font-mono text-slate-300">
              {mockRunning ? `Running on :${port}` : 'Server Offline'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Close
            </button>

            {mockRunning ? (
              <button
                onClick={onStopMock}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-xs font-semibold shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all btn-hover"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Mock Server</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all btn-hover"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Mock Server</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
