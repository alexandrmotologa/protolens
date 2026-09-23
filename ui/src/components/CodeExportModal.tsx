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
	"crypto/tls"
	"fmt"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Inject metadata headers
	md := metadata.Pairs(
		${Object.entries(headersMap).map(([k, v]) => `"${k}", "${v}"`).join(',\n\t\t')}
	)
	ctx = metadata.NewOutgoingContext(ctx, md)

	var creds credentials.TransportCredentials
	if ${tab.tls.useTls} {
		creds = credentials.NewTLS(&tls.Config{
			InsecureSkipVerify: ${tab.tls.insecureSkipVerify},
		})
	} else {
		creds = insecure.NewCredentials()
	}

	conn, err := grpc.NewClient("${tab.target || "localhost:50051"}", grpc.WithTransportCredentials(creds))
	if err != nil {
		log.Fatalf("failed to dial: %v", err)
	}
	defer conn.Close()

	fmt.Println("Connected to ${tab.target} via gRPC client!")
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
    <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl glass-modal border border-white/10 shadow-2xl p-6 text-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 bg-[#0b101f]/95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white tracking-tight">Export RPC Call Snippet</h3>
              <p className="text-xs text-slate-400 mt-0.5">Generate ready-to-run client invocations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-2 my-4 border-b border-white/10 text-xs">
          {[
            { id: 'grpcurl', label: 'grpcurl (CLI)' },
            { id: 'curl', label: 'curl (Connect HTTP)' },
            { id: 'ts', label: 'TypeScript' },
            { id: 'go', label: 'Go (grpc-go)' },
          ].map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setFormat(fmt.id as any)}
              className={`py-2.5 px-3.5 border-b-2 font-medium transition-all ${
                format === fmt.id ? 'border-indigo-400 text-indigo-300 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        {/* Code Block Container */}
        <div className="relative flex-1 bg-black/60 rounded-2xl border border-white/10 p-4 font-mono text-xs overflow-auto max-h-[50vh]">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-sans flex items-center space-x-1.5 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
          <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed pt-2">{code}</pre>
        </div>
      </div>
    </div>
  );
};
