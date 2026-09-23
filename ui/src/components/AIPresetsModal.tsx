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
  repeated string inputs = 2;
}

message EmbedResponse {
  repeated EmbeddingObject data = 1;
}

message EmbeddingObject {
  int32 index = 1;
  repeated float embedding = 2;
}
`;

export const AIPresetsModal: React.FC<AIPresetsModalProps> = ({
  isOpen,
  onClose,
  onLoadPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI & LLM Inference Presets</h3>
              <p className="text-[11px] text-slate-400">Pre-loaded gRPC schemas for model inference engines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Cards */}
        <div className="py-4 space-y-3">
          {/* Triton Inference Server */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mt-0.5">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">NVIDIA Triton Inference Server</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  KServe v2 gRPC standard: <code>ModelInfer</code>, <code>ModelStreamInfer</code>, and <code>ServerLive</code> health probes.
                </p>
                <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-500">
                  <span>Default host: localhost:8001</span>
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
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Load</span>
            </button>
          </div>

          {/* vLLM / Ollama */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-200">vLLM & TensorRT-LLM Engine</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  High-throughput token generation with server streaming <code>Generate</code> and vector <code>Embeddings</code>.
                </p>
                <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-slate-500">
                  <span>Default host: localhost:50051</span>
                  <span>•</span>
                  <span>Streaming RPC</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onLoadPreset(VLLM_PROTO, 'localhost:50051');
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Load</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
