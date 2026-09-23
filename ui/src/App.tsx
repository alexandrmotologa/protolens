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
import { EnvironmentModal, interpolateText } from './components/EnvironmentModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { BenchmarkModal } from './components/BenchmarkModal';
import { SchemaDiffModal } from './components/SchemaDiffModal';
import { JwtInspectorModal } from './components/JwtInspectorModal';
import { CollectionsModal } from './components/CollectionsModal';
import { 
  ServiceInfo, 
  MethodInfo, 
  TabItem, 
  TLSConfig, 
  MockConfig, 
  MockRule,
  StreamEvent,
  Environment,
  HistoryItem,
  Collection,
  SavedRequest,
  HeaderEntry
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

const DEFAULT_ENVIRONMENTS: Environment[] = [
  {
    id: 'default',
    name: 'Local Dev',
    variables: [
      { key: 'HOST', value: 'localhost:50051', enabled: true },
      { key: 'TOKEN', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', enabled: true },
    ],
  },
  {
    id: 'staging',
    name: 'Staging Cluster',
    variables: [
      { key: 'HOST', value: 'grpc-staging.internal:443', enabled: true },
      { key: 'TOKEN', value: 'Bearer eyJhbGciOi...', enabled: true },
    ],
  },
];

const DEFAULT_COLLECTIONS: Collection[] = [
  {
    id: 'default',
    name: 'Order Lifecycle Suite',
    requests: [],
  },
];

export const App: React.FC = () => {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [target, setTarget] = useState('localhost:50051');
  const [protocol, setProtocol] = useState<'grpc' | 'connect'>('grpc');
  const [tls, setTLS] = useState<TLSConfig>({ useTls: false, insecureSkipVerify: false });
  const [reflecting, setReflecting] = useState(false);

  // Tabs
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Environments
  const [environments, setEnvironments] = useState<Environment[]>(() => {
    try {
      const stored = localStorage.getItem('protolens_environments');
      return stored ? JSON.parse(stored) : DEFAULT_ENVIRONMENTS;
    } catch {
      return DEFAULT_ENVIRONMENTS;
    }
  });

  const [activeEnvId, setActiveEnvId] = useState<string>(() => {
    return localStorage.getItem('protolens_active_env_id') || 'default';
  });

  // Collections
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const stored = localStorage.getItem('protolens_collections');
      return stored ? JSON.parse(stored) : DEFAULT_COLLECTIONS;
    } catch {
      return DEFAULT_COLLECTIONS;
    }
  });

  // Mock server state
  const [mockRunning, setMockRunning] = useState(false);
  const [mockPort, setMockPort] = useState(50055);
  const [mockRules, setMockRules] = useState<MockRule[]>([]);

  // Modals state
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [aiPresetsOpen, setAIPresetsOpen] = useState(false);
  const [protoModalOpen, setProtoModalOpen] = useState(false);
  const [envModalOpen, setEnvModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [benchmarkModalOpen, setBenchmarkModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [jwtModalOpen, setJwtModalOpen] = useState(false);
  const [jwtInspectToken, setJwtInspectToken] = useState('');
  const [collectionsModalOpen, setCollectionsModalOpen] = useState(false);

  // Active WebSocket connections for streams keyed by tabId
  const activeSockets = useRef<Record<string, WebSocket>>({});

  // Active Environment Helper
  const currentEnv = environments.find((e) => e.id === activeEnvId) || environments[0];

  // Fetch initial schema and mock status on mount
  useEffect(() => {
    fetch('/api/schema')
      .then((res) => res.json())
      .then((data) => {
        if (data?.services && data.services.length > 0) {
          setServices(data.services);
          if (data.endpoint) setTarget(data.endpoint);
          openInitialTab(data.services[0].methods[0], data.endpoint || 'localhost:50051');
        } else {
          handleLoadSample();
        }
      })
      .catch(() => {
        handleLoadSample();
      });

    fetch('/api/mock/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.running) {
          setMockRunning(true);
          setMockPort(data.port);
          if (data.rules) setMockRules(data.rules);
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
        { id: '1', key: 'authorization', value: 'Bearer {{TOKEN}}', enabled: false },
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

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleUpdateTab = (updates: Partial<TabItem>) => {
    setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)));
  };

  const handleSelectMethod = (method: MethodInfo) => {
    const existing = tabs.find((t) => t.method.fullName === method.fullName);
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
        { id: '1', key: 'authorization', value: 'Bearer {{TOKEN}}', enabled: false },
      ],
      tls: { ...tls },
      timeoutMs: 5000,
      response: null,
      loading: false,
      streamEvents: [],
      isStreamActive: false,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSockets.current[id]) {
      activeSockets.current[id].close();
      delete activeSockets.current[id];
    }
    const remaining = tabs.filter((t) => t.id !== id);
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
    const resolvedTarget = interpolateText(target, currentEnv);
    if (!resolvedTarget) return;
    setReflecting(true);

    try {
      const res = await fetch('/api/schema/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: resolvedTarget, tls }),
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

  // Save Environments
  const handleSaveEnvironments = (envs: Environment[], activeId: string) => {
    setEnvironments(envs);
    setActiveEnvId(activeId);
    try {
      localStorage.setItem('protolens_environments', JSON.stringify(envs));
      localStorage.setItem('protolens_active_env_id', activeId);
    } catch (e) {
      console.error(e);
    }
  };

  // Save Collections
  const handleSaveCollections = (cols: Collection[]) => {
    setCollections(cols);
    try {
      localStorage.setItem('protolens_collections', JSON.stringify(cols));
    } catch (e) {
      console.error(e);
    }
  };

  // Invocation Execution with Variable Interpolation
  const handleExecute = async () => {
    if (!activeTab) return;

    if (activeTab.method.kind !== 'unary') {
      handleStartStream();
      return;
    }

    handleUpdateTab({ loading: true });

    // Interpolate environment and dynamic variables
    const finalTarget = interpolateText(activeTab.target || target, currentEnv);
    const finalPayload = interpolateText(activeTab.payloadJson, currentEnv);

    const headersMap: Record<string, string> = {};
    activeTab.headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        const k = interpolateText(h.key, currentEnv);
        const v = interpolateText(h.value, currentEnv);
        headersMap[k] = v;
      });

    try {
      const res = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: finalTarget,
          method: activeTab.method.fullName,
          payloadJson: finalPayload,
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

    const finalTarget = interpolateText(activeTab.target || target, currentEnv);
    const finalPayload = interpolateText(activeTab.payloadJson, currentEnv);

    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProto}//${window.location.host}/api/stream`;
    const ws = new WebSocket(wsUrl);

    activeSockets.current[activeTab.id] = ws;

    const headersMap: Record<string, string> = {};
    activeTab.headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        headersMap[interpolateText(h.key, currentEnv)] = interpolateText(h.value, currentEnv);
      });

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: 'start',
          target: finalTarget,
          method: activeTab.method.fullName,
          payloadJson: finalPayload,
          headers: headersMap,
          tls: activeTab.tls,
          timeoutMs: activeTab.timeoutMs,
        })
      );
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

    ws.onerror = () => {
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
    const finalPayload = interpolateText(payloadJson, currentEnv);
    activeSockets.current[activeTab.id].send(
      JSON.stringify({
        action: 'send',
        payloadJson: finalPayload,
      })
    );
  };

  const handleHalfCloseStream = () => {
    if (!activeTab || !activeSockets.current[activeTab.id]) return;
    activeSockets.current[activeTab.id].send(
      JSON.stringify({
        action: 'half_close',
      })
    );
  };

  const handleCancelStream = () => {
    if (!activeTab || !activeSockets.current[activeTab.id]) return;
    activeSockets.current[activeTab.id].send(
      JSON.stringify({
        action: 'cancel',
      })
    );
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
      if (res.ok) {
        setMockRunning(false);
      }
    } catch {
      // Ignore
    }
  };

  // 1-Click Snapshot Live Response into Mock Rule
  const handleSaveAsMockRule = async (responseJson: string) => {
    if (!activeTab) return;
    const newRule: MockRule = {
      id: `rule_${Date.now()}`,
      method: activeTab.method.fullName,
      conditionField: '',
      conditionOp: 'exists',
      conditionVal: '',
      responseJson,
      statusCode: 0,
      latencyMs: 0,
    };
    const updated = [...mockRules, newRule];
    setMockRules(updated);

    if (mockRunning) {
      try {
        await fetch('/api/mock/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRule),
        });
      } catch (e) {
        console.error('Failed to register rule on mock server', e);
      }
    }
  };

  // History Replay Handlers
  const handleReplayHistory = async (item: HistoryItem) => {
    try {
      const res = await fetch('/api/invoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: item.target,
          method: item.method,
          payloadJson: item.payloadJson,
          headers: item.headers || {},
          protocol: item.protocol,
          tls: { useTls: false, insecureSkipVerify: false },
          timeoutMs: 5000,
        }),
      });
      const data = await res.json();
      if (activeTab) {
        handleUpdateTab({ response: data });
      }
    } catch (e: any) {
      alert(`Replay failed: ${e.message}`);
    }
  };

  const handleLoadHistoryInTab = (item: HistoryItem) => {
    if (!activeTab) return;
    const matchedMethod = services.flatMap((s) => s.methods).find((m) => m.fullName === item.method);
    const headersList: HeaderEntry[] = Object.entries(item.headers || {}).map(([k, v], idx) => ({
      id: `h_${idx}`,
      key: k,
      value: v,
      enabled: true,
    }));

    handleUpdateTab({
      target: item.target,
      payloadJson: item.payloadJson,
      headers: headersList.length > 0 ? headersList : activeTab.headers,
      protocol: item.protocol,
      ...(matchedMethod ? { method: matchedMethod, title: matchedMethod.name } : {}),
    });
    setHistoryDrawerOpen(false);
  };

  // Load Saved Request into Tab
  const handleLoadSavedRequest = (req: SavedRequest) => {
    const matchedMethod = services.flatMap((s) => s.methods).find((m) => m.fullName === req.methodFullName);
    if (matchedMethod) {
      handleSelectMethod(matchedMethod);
    }
    handleUpdateTab({
      target: req.target,
      protocol: req.protocol,
      payloadJson: req.payloadJson,
      headers: req.headers,
      tls: req.tls,
    });
  };

  // Open JWT Inspector from Header Click
  const handleInspectJwt = (token: string) => {
    setJwtInspectToken(token);
    setJwtModalOpen(true);
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
        activeEnvName={currentEnv?.name}
        onOpenEnvModal={() => setEnvModalOpen(true)}
        onOpenHistory={() => setHistoryDrawerOpen(true)}
        onOpenBenchmark={() => setBenchmarkModalOpen(true)}
        onOpenDiff={() => setDiffModalOpen(true)}
        onOpenCollections={() => setCollectionsModalOpen(true)}
        onOpenJwtInspector={() => {
          setJwtInspectToken('');
          setJwtModalOpen(true);
        }}
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
                onInspectJwt={handleInspectJwt}
              />

              {/* Right Panel: Response or Stream Timeline */}
              {activeTab.method.kind === 'unary' ? (
                <ResponsePanel
                  response={activeTab.response}
                  loading={activeTab.loading}
                  onSaveAsMockRule={handleSaveAsMockRule}
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

      {/* Modals & Drawers */}
      <MockDialog
        isOpen={mockModalOpen}
        onClose={() => setMockModalOpen(false)}
        mockRunning={mockRunning}
        mockPort={mockPort}
        initialRules={mockRules}
        onStartMock={handleStartMock}
        onStopMock={handleStopMock}
        onUpdateRules={(rules) => setMockRules(rules)}
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

      <EnvironmentModal
        isOpen={envModalOpen}
        onClose={() => setEnvModalOpen(false)}
        environments={environments}
        activeEnvId={activeEnvId}
        onSaveEnvironments={handleSaveEnvironments}
      />

      <HistoryDrawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        onReplay={handleReplayHistory}
        onLoadInTab={handleLoadHistoryInTab}
      />

      {activeTab && (
        <BenchmarkModal
          isOpen={benchmarkModalOpen}
          onClose={() => setBenchmarkModalOpen(false)}
          target={interpolateText(activeTab.target || target, currentEnv)}
          method={activeTab.method.fullName}
          payloadJson={interpolateText(activeTab.payloadJson, currentEnv)}
          tls={activeTab.tls}
        />
      )}

      <SchemaDiffModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
      />

      <JwtInspectorModal
        isOpen={jwtModalOpen}
        onClose={() => setJwtModalOpen(false)}
        initialToken={jwtInspectToken}
      />

      <CollectionsModal
        isOpen={collectionsModalOpen}
        onClose={() => setCollectionsModalOpen(false)}
        collections={collections}
        onSaveCollections={handleSaveCollections}
        currentTab={activeTab}
        onLoadRequest={handleLoadSavedRequest}
      />
    </div>
  );
};
