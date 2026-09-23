import React from 'react';
import { X, Sparkles, Cpu, Layers, Play } from 'lucide-react';

interface AIPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPreset: (protoContent: string, targetEndpoint: string) => void;
}

const TRITON_PROTO = `syntax = "proto3";
package inference;

service GRPCInferenceService {
  rpc ServerLive(ServerLiveRequest) returns (ServerLiveResponse);
  rpc ServerReady(ServerReadyRequest) returns (ServerReadyResponse);
  rpc ModelInfer(ModelInferRequest) returns (ModelInferResponse);
  rpc ModelStreamInfer(stream ModelInferRequest) returns (stream ModelStreamInferResponse);
}

message ServerLiveRequest {}
message ServerLiveResponse {
  bool live = 1;
}

message ServerReadyRequest {}
message ServerReadyResponse {
  bool ready = 1;
}

message ModelInferRequest {
  string model_name = 1;
  string model_version = 2;
  string id = 3;
  map<string, string> parameters = 4;
  repeated InferInputTensor inputs = 5;
  repeated InferRequestedOutputTensor outputs = 6;
  repeated bytes raw_input_contents = 7;
}

message InferInputTensor {
  string name = 1;
  string datatype = 2;
  repeated int64 shape = 3;
  map<string, string> parameters = 4;
}

message InferRequestedOutputTensor {
  string name = 1;
  map<string, string> parameters = 2;
}

message ModelInferResponse {
  string model_name = 1;
  string model_version = 2;
  string id = 3;
  map<string, string> parameters = 4;
  repeated InferOutputTensor outputs = 5;
  repeated bytes raw_output_contents = 6;
}

message InferOutputTensor {
  string name = 1;
  string datatype = 2;
  repeated int64 shape = 3;
  map<string, string> parameters = 4;
}

message ModelStreamInferResponse {
  string error_message = 1;
  ModelInferResponse infer_response = 2;
}
`;

const VLLM_PROTO = `syntax = "proto3";
package vllm.engine.v1;

service LLMService {
  rpc Generate(GenerateRequest) returns (stream GenerateResponse);
  rpc Embeddings(EmbedRequest) returns (EmbedResponse);
}

message GenerateRequest {
  string model = 1;
  string prompt = 2;
  int32 max_tokens = 3;
  float temperature = 4;
  float top_p = 5;
  bool stream = 6;
}

message GenerateResponse {
  string request_id = 1;
  string text_chunk = 2;
  int32 prompt_tokens = 3;
  int32 completion_tokens = 4;
  bool finished = 5;
}

message EmbedRequest {
  string model = 1;
  repeated string texts = 2;
}

message EmbedResponse {
  repeated Embedding embeddings = 1;
}

message Embedding {
  repeated float values = 1;
}
`;

export const AIPresetsModal: React.FC<AIPresetsModalProps> = ({
  isOpen,
  onClose,
  onLoadPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl glass-modal border border-white/10 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 bg-[#0b101f]/95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white tracking-tight">AI & LLM Inference Presets</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pre-loaded gRPC schemas for model inference engines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards */}
        <div className="py-5 space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Triton Inference Server */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mt-0.5">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">NVIDIA Triton Inference Server</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  KServe v2 gRPC standard: <code>ModelInfer</code>, <code>ModelStreamInfer</code>, and <code>ServerLive</code> health probes.
                </p>
                <div className="flex items-center gap-2.5 mt-2.5 font-mono text-[11px] text-slate-500">
                  <span className="text-slate-400">Default host: localhost:8001</span>
                  <span>•</span>
                  <span>4 RPC Methods</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onLoadPreset(TRITON_PROTO, 'localhost:8001');
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shrink-0 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 btn-hover"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load Preset</span>
            </button>
          </div>

          {/* vLLM Inference Engine */}
          <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 mt-0.5">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">vLLM High-Throughput Engine</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Token-streaming gRPC interface for open-source LLMs (Llama 3, Mistral, Qwen) with <code>Generate</code> and <code>Embeddings</code> RPCs.
                </p>
                <div className="flex items-center gap-2.5 mt-2.5 font-mono text-[11px] text-slate-500">
                  <span className="text-slate-400">Default host: localhost:8000</span>
                  <span>•</span>
                  <span>2 RPC Methods</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onLoadPreset(VLLM_PROTO, 'localhost:8000');
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white text-xs font-semibold shrink-0 transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 btn-hover"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load Preset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
