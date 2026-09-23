import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Terminal, Code2 } from 'lucide-react';
import { TabItem } from '../types';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: TabItem;
}

export const CodeExportModal: React.FC<CodeExportModalProps> = ({
  isOpen,
  onClose,
  tab,
}) => {
  const [format, setFormat] = useState<'grpcurl' | 'curl' | 'ts' | 'go'>('grpcurl');
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const headersMap: Record<string, string> = {};
    tab.headers.filter(h => h.enabled && h.key).forEach(h => {
      headersMap[h.key] = h.value;
    });

    if (format === 'grpcurl') {
      const parts: string[] = ['grpcurl'];
      if (!tab.tls.useTls) {
        parts.push('-plaintext');
      } else if (tab.tls.insecureSkipVerify) {
        parts.push('-insecure');
      }

      Object.entries(headersMap).forEach(([k, v]) => {
        parts.push(`-H '${k}: ${v}'`);
      });

      const cleanPayload = tab.payloadJson ? tab.payloadJson.replace(/\n/g, '').replace(/\s+/g, ' ') : '{}';
      parts.push(`-d '${cleanPayload}'`);
      parts.push(tab.target || 'localhost:50051');
      parts.push(tab.method.fullName.replace(/^\//, ''));

      setCode(parts.join(' \\\n  '));
    } else if (format === 'curl') {
      const proto = tab.tls.useTls ? 'https' : 'http';
      const cleanTarget = tab.target ? tab.target.replace(/^https?:\/\//, '') : 'localhost:50051';
      const cleanMethod = tab.method.fullName.replace(/^\//, '');
      const url = `${proto}://${cleanTarget}/${cleanMethod}`;

      const parts: string[] = [
        `curl -X POST '${url}'`,
        `  -H 'Content-Type: application/json'`,
        `  -H 'Connect-Protocol-Version: 1'`,
      ];

      if (tab.tls.insecureSkipVerify) {
        parts.push(`  -k`);
      }

      Object.entries(headersMap).forEach(([k, v]) => {
        parts.push(`  -H '${k}: ${v}'`);
      });

      const cleanPayload = tab.payloadJson ? tab.payloadJson.replace(/\n/g, '').replace(/\s+/g, ' ') : '{}';
      parts.push(`  -d '${cleanPayload}'`);

      setCode(parts.join(' \\\n'));
    } else if (format === 'ts') {
      const cleanMethod = tab.method.fullName.replace(/^\//, '');
      setCode(`import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

const transport = createConnectTransport({
  baseUrl: "${tab.tls.useTls ? 'https' : 'http'}://${tab.target || 'localhost:50051'}",
});

// Invoking ${cleanMethod}
async function executeRpc() {
  const payload = ${tab.payloadJson || '{}'};
  const response = await fetch("${tab.tls.useTls ? 'https' : 'http'}://${tab.target || 'localhost:50051'}/${cleanMethod}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Connect-Protocol-Version": "1",
      ${Object.entries(headersMap).map(([k, v]) => `"${k}": "${v}"`).join(',\n      ')}
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  console.log("Response:", data);
}

executeRpc();`);
    } else if (format === 'go') {
      setCode(`package main

import (
	"context"
	"fmt"
	"log"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	conn, err := grpc.NewClient("${tab.target || 'localhost:50051'}", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	fmt.Println("Connected to target for method ${tab.method.fullName}")
}`);
    }
  }, [isOpen, format, tab]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl glass-dropdown border border-white/10 shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Export Code & CLI Commands</h3>
              <p className="text-[11px] text-slate-400 font-mono">{tab.method.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 my-4 border-b border-white/10 text-xs">
          <button
            onClick={() => setFormat('grpcurl')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              format === 'grpcurl' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            grpcurl
          </button>
          <button
            onClick={() => setFormat('curl')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              format === 'curl' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            curl (Connect)
          </button>
          <button
            onClick={() => setFormat('ts')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              format === 'ts' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            TypeScript
          </button>
          <button
            onClick={() => setFormat('go')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors ${
              format === 'go' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Go Client
          </button>
        </div>

        {/* Code Snippet */}
        <div className="relative rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-xs overflow-x-auto max-h-80">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-slate-200 text-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          <pre className="text-slate-200 pr-16 whitespace-pre-wrap">{code}</pre>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
