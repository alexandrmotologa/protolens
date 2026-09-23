import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { ServiceSidebar } from './components/ServiceSidebar';
import { RequestTabs } from './components/RequestTabs';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { StreamTimeline } from './components/StreamTimeline';
import { MockDialog } from './components/MockDialog';
import { CodeExportModal } from './components/CodeExportModal';
import { AIPresetsModal } from './components/AIPresetsModal';
import { ProtoImportModal } from './components/ProtoImportModal';
import { 
  ServiceInfo, 
  MethodInfo, 
  TabItem, 
  TLSConfig, 
  MockConfig, 
  StreamEvent 
} from './types';

const SAMPLE_ORDERS_PROTO = `syntax = "proto3";

package test.orders.v1;

message Item {
  string id = 1;
  string name = 2;
  double price = 3;
  int32 quantity = 4;
}

message CreateOrderRequest {
  string customer_id = 1;
  repeated Item items = 2;
  map<string, string> metadata = 3;
}

message OrderResponse {
  string order_id = 1;
  string status = 2;
  double total_amount = 3;
}

message WatchOrdersRequest {
  string customer_id = 1;
}

message OrderUpdateEvent {
  string order_id = 1;
  string new_status = 2;
  string timestamp = 3;
}

message ChatStreamRequest {
  string message = 1;
  string user = 2;
}

message ChatStreamResponse {
  string reply = 1;
  int64 timestamp = 2;
}

service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (OrderResponse);
  rpc WatchOrders(WatchOrdersRequest) returns (stream OrderUpdateEvent);
  rpc UploadBatch(stream Item) returns (OrderResponse);
  rpc ChatStream(stream ChatStreamRequest) returns (stream ChatStreamResponse);
}
`;

export const App: React.FC = () => {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [target, setTarget] = useState('localhost:50051');
  const [protocol, setProtocol] = useState<'grpc' | 'connect'>('grpc');
  const [tls, setTLS] = useState<TLSConfig>({ useTls: false, insecureSkipVerify: false });
  const [reflecting, setReflecting] = useState(false);

  // Tabs
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Mock server state
  const [mockRunning, setMockRunning] = useState(false);
  const [mockPort, setMockPort] = useState(50055);

  // Modals
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [aiPresetsOpen, setAIPresetsOpen] = useState(false);
  const [protoModalOpen, setProtoModalOpen] = useState(false);

  // Active WebSocket connections for streams keyed by tabId
  const activeSockets = useRef<Record<string, WebSocket>>({});

  // Fetch initial schema and mock status on mount
  useEffect(() => {
    fetch('/api/schema')
      .then(res => res.json())
      .then(data => {
        if (data?.services && data.services.length > 0) {
          setServices(data.services);
          if (data.endpoint) setTarget(data.endpoint);
          openInitialTab(data.services[0].methods[0], data.endpoint || 'localhost:50051');
        } else {
          // If no services yet, load sample automatically
          handleLoadSample();
        }
      })
      .catch(() => {
        handleLoadSample();
      });

    fetch('/api/mock/status')
      .then(res => res.json())
      .then(data => {
        if (data?.running) {
          setMockRunning(true);
          setMockPort(data.port);
        }
      })
      .catch(() => {});
  }, []);

  const openInitialTab = (method: MethodInfo, initialTarget: string) => {
    const newTab: TabItem = {
      id: Math.random().toString(36).substring(7),
      title: method.name,
      method,
      target: initialTarget,
      protocol: 'grpc',
      payloadJson: method.inputTemplate || '{}',
      headers: [
        { id: '1', key: 'authorization', value: 'Bearer demo_token', enabled: false },
      ],
      tls: { useTls: false, insecureSkipVerify: false },
      timeoutMs: 5000,
      response: null,
      loading: false,
      streamEvents: [],
      isStreamActive: false,
    };
    setTabs([newTab]);
    setActiveTabId(newTab.id);
  };

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const handleUpdateTab = (updates: Partial<TabItem>) => {
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, ...updates } : t)));
  };

  const handleSelectMethod = (method: MethodInfo) => {
    const existing = tabs.find(t => t.method.fullName === method.fullName);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const newTab: TabItem = {
      id: Math.random().toString(36).substring(7),
      title: method.name,
      method,
      target,
      protocol,
      payloadJson: method.inputTemplate || '{}',
      headers: [
        { id: '1', key: 'authorization', value: 'Bearer token', enabled: false },
      ],
      tls: { ...tls },
      timeoutMs: 5000,
      response: null,
      loading: false,
      streamEvents: [],
      isStreamActive: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSockets.current[id]) {
      activeSockets.current[id].close();
      delete activeSockets.current[id];
    }
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id && remaining.length > 0) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleNewTab = () => {
    if (services.length === 0 || !services[0].methods[0]) return;
    openInitialTab(services[0].methods[0], target);
  };

  // Reflection Action
  const handleReflect = async () => {
    if (!target) return;
    setReflecting(true);

    try {
      const res = await fetch('/api/schema/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, tls }),
      });
      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
        if (data.services.length > 0 && data.services[0].methods.length > 0) {
          handleSelectMethod(data.services[0].methods[0]);
        }
      } else {
        alert(`Reflection failed: ${data || res.statusText}`);
      }
    } catch (err: any) {
      alert(`Reflection network error: ${err.message}`);
    } finally {
      setReflecting(false);
    }
  };

  // Sample Load
  const handleLoadSample = async () => {
    try {
      const res = await fetch('/api/schema/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: SAMPLE_ORDERS_PROTO,
          filename: 'orders.proto',
        }),
      });
      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
        if (data.services.length > 0 && data.services[0].methods.length > 0) {
          openInitialTab(data.services[0].methods[0], target);
        }
      }
    } catch {
      // Ignore
    }
  };

  // Proto Import
  const handleImportContent = async (content: string, filename: string) => {
    try {
      const res = await fetch('/api/schema/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename }),
      });
      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
        if (data.services.length > 0 && data.services[0].methods.length > 0) {
          handleSelectMethod(data.services[0].methods[0]);
        }
      }
    } catch (err: any) {
      alert(`Failed to parse proto: ${err.message}`);
    }
  };

  const handleImportPaths = async (files: string[], importPaths: string[]) => {
    try {
      const res = await fetch('/api/schema/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, importPaths }),
      });
      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
        if (data.services.length > 0 && data.services[0].methods.length > 0) {
          handleSelectMethod(data.services[0].methods[0]);
        }
      }
    } catch (err: any) {
      alert(`Failed to load proto files: ${err.message}`);
    }
  };

  // Invocation Execution
  const handleExecute = async () => {
    if (!activeTab) return;

    if (activeTab.method.kind !== 'unary') {
      handleStartStream();
      return;
    }

    handleUpdateTab({ loading: true });

    const headersMap: Record<string, string> = {};
    activeTab.headers.filter(h => h.enabled && h.key).forEach(h => {
      headersMap[h.key] = h.value;
    });

    try {
      const res = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: activeTab.target || target,
          method: activeTab.method.fullName,
          payloadJson: activeTab.payloadJson,
          headers: headersMap,
          tls: activeTab.tls,
          timeoutMs: activeTab.timeoutMs,
          protocol: activeTab.protocol,
        }),
      });

      const data = await res.json();
      handleUpdateTab({
        loading: false,
        response: data,
      });
    } catch (err: any) {
      handleUpdateTab({
        loading: false,
        response: {
          success: false,
          statusCode: 14,
          statusMessage: 'UNAVAILABLE',
          responseJson: '{}',
          durationMs: 0,
          error: err.message,
        },
      });
    }
  };

  // Streaming WebSocket Handling
  const handleStartStream = () => {
    if (!activeTab) return;

    if (activeSockets.current[activeTab.id]) {
      activeSockets.current[activeTab.id].close();
    }

    handleUpdateTab({ streamEvents: [], isStreamActive: true });

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/api/stream`;
    const ws = new WebSocket(wsUrl);

    activeSockets.current[activeTab.id] = ws;

    const headersMap: Record<string, string> = {};
    activeTab.headers.filter(h => h.enabled && h.key).forEach(h => {
      headersMap[h.key] = h.value;
    });

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'start',
        target: activeTab.target || target,
        method: activeTab.method.fullName,
        payloadJson: activeTab.payloadJson,
        headers: headersMap,
        tls: activeTab.tls,
        timeoutMs: activeTab.timeoutMs,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const ev: StreamEvent = JSON.parse(event.data);
        handleUpdateTab({
          streamEvents: [...(activeTab.streamEvents || []), ev],
          isStreamActive: ev.event !== 'closed',
        });
      } catch {
        // Ignore
      }
    };

    ws.onclose = () => {
      handleUpdateTab({ isStreamActive: false });
    };

    ws.onerror = (err) => {
      handleUpdateTab({
        isStreamActive: false,
        streamEvents: [
          ...(activeTab.streamEvents || []),
          {
            event: 'error',
            timestamp: new Date().toISOString(),
            error: 'WebSocket connection failed',
          },
        ],
      });
    };
  };

  const handlePushStreamChunk = (payloadJson: string) => {
    if (!activeTab || !activeSockets.current[activeTab.id]) return;
    activeSockets.current[activeTab.id].send(JSON.stringify({
      action: 'send',
      payloadJson,
    }));
  };

  const handleHalfCloseStream = () => {
    if (!activeTab || !activeSockets.current[activeTab.id]) return;
    activeSockets.current[activeTab.id].send(JSON.stringify({
      action: 'half_close',
    }));
  };

  const handleCancelStream = () => {
    if (!activeTab || !activeSockets.current[activeTab.id]) return;
    activeSockets.current[activeTab.id].send(JSON.stringify({
      action: 'cancel',
    }));
    activeSockets.current[activeTab.id].close();
    handleUpdateTab({ isStreamActive: false });
  };

  // Mock Server Handlers
  const handleStartMock = async (config: MockConfig) => {
    try {
      const res = await fetch('/api/mock/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (res.ok && data.running) {
        setMockRunning(true);
        setMockPort(data.port);
        setTarget(`localhost:${data.port}`);
      } else {
        alert('Failed to start mock server');
      }
    } catch (err: any) {
      alert(`Mock error: ${err.message}`);
    }
  };

  const handleStopMock = async () => {
    try {
      const res = await fetch('/api/mock/stop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMockRunning(false);
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <Navbar
        target={target}
        setTarget={setTarget}
        protocol={protocol}
        setProtocol={setProtocol}
        tls={tls}
        setTLS={setTLS}
        onReflect={handleReflect}
        reflecting={reflecting}
        onOpenProtoModal={() => setProtoModalOpen(true)}
        onOpenMockModal={() => setMockModalOpen(true)}
        onOpenExportModal={() => setExportModalOpen(true)}
        onOpenAIPresets={() => setAIPresetsOpen(true)}
        mockRunning={mockRunning}
        mockPort={mockPort}
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Service Explorer Sidebar */}
        <ServiceSidebar
          services={services}
          selectedMethod={activeTab?.method || null}
          onSelectMethod={handleSelectMethod}
          onLoadSample={handleLoadSample}
          onOpenProtoModal={() => setProtoModalOpen(true)}
        />

        {/* Workbench Center & Right */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0f1d]">
          {/* Tabs Bar */}
          <RequestTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
          />

          {/* Workbench Split Panels */}
          {activeTab ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Request Configuration & Monaco Editor */}
              <RequestPanel
                tab={activeTab}
                onUpdateTab={handleUpdateTab}
                onExecute={handleExecute}
              />

              {/* Right Panel: Response or Stream Timeline */}
              {activeTab.method.kind === 'unary' ? (
                <ResponsePanel
                  response={activeTab.response}
                  loading={activeTab.loading}
                />
              ) : (
                <StreamTimeline
                  method={activeTab.method}
                  events={activeTab.streamEvents || []}
                  isStreamActive={activeTab.isStreamActive}
                  onSendMessage={handlePushStreamChunk}
                  onHalfClose={handleHalfCloseStream}
                  onCancelStream={handleCancelStream}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select an RPC method from the left sidebar to begin testing.
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <MockDialog
        isOpen={mockModalOpen}
        onClose={() => setMockModalOpen(false)}
        mockRunning={mockRunning}
        mockPort={mockPort}
        onStartMock={handleStartMock}
        onStopMock={handleStopMock}
      />

      {activeTab && (
        <CodeExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          tab={activeTab}
        />
      )}

      <AIPresetsModal
        isOpen={aiPresetsOpen}
        onClose={() => setAIPresetsOpen(false)}
        onLoadPreset={(protoContent, targetEndpoint) => {
          setTarget(targetEndpoint);
          handleImportContent(protoContent, 'ai_inference.proto');
        }}
      />

      <ProtoImportModal
        isOpen={protoModalOpen}
        onClose={() => setProtoModalOpen(false)}
        onImportContent={handleImportContent}
        onImportPaths={handleImportPaths}
      />
    </div>
  );
};
