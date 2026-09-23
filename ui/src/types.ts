export type RPCKind = 'unary' | 'server_stream' | 'client_stream' | 'bidirectional';

export interface FieldInfo {
  name: string;
  jsonName: string;
  number: number;
  type: string;
  isRepeated: boolean;
  isMap: boolean;
  mapKeyType?: string;
  mapValType?: string;
  messageType?: string;
  enumValues?: string[];
  oneofGroup?: string;
  description?: string;
}

export interface MessageInfo {
  fullName: string;
  name: string;
  fields: FieldInfo[];
  description?: string;
}

export interface MethodInfo {
  name: string;
  fullName: string; // /package.Service/Method
  service: string;
  package: string;
  kind: RPCKind;
  clientStreaming: boolean;
  serverStreaming: boolean;
  input: MessageInfo;
  output: MessageInfo;
  inputTemplate: string;
  description?: string;
}

export interface ServiceInfo {
  name: string;
  fullName: string;
  package: string;
  methods: MethodInfo[];
  description?: string;
}

export interface SchemaRegistry {
  endpoint?: string;
  source: 'reflection' | 'file' | 'memory';
  services: ServiceInfo[];
}

export interface TLSConfig {
  useTls: boolean;
  insecureSkipVerify: boolean;
  rootCaCert?: string;
  clientCert?: string;
  clientKey?: string;
  serverNameOverride?: string;
}

export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface InvocationResponse {
  success: boolean;
  statusCode: number;
  statusMessage: string;
  responseJson: string;
  durationMs: number;
  headers?: Record<string, string[]>;
  trailers?: Record<string, string[]>;
  error?: string;
}

export interface StreamEvent {
  event: 'started' | 'sent' | 'received' | 'headers' | 'trailers' | 'closed' | 'error';
  timestamp: string;
  sequence?: number;
  payloadJson?: string;
  bytes?: number;
  latencyMs?: number;
  headers?: Record<string, string[]>;
  trailers?: Record<string, string[]>;
  statusCode?: number;
  statusMessage?: string;
  error?: string;
  totalDurationMs?: number;
}

export interface TabItem {
  id: string;
  title: string;
  method: MethodInfo;
  target: string;
  protocol: 'grpc' | 'connect';
  payloadJson: string;
  headers: HeaderEntry[];
  tls: TLSConfig;
  timeoutMs: number;
  response: InvocationResponse | null;
  loading: boolean;
  streamEvents: StreamEvent[];
  isStreamActive: boolean;
}

export interface MockRule {
  id: string;
  method: string;
  conditionField: string;
  conditionOp: 'equals' | 'contains' | 'exists';
  conditionVal: string;
  responseJson: string;
  statusCode: number;
  latencyMs: number;
}

export interface MockConfig {
  port: number;
  latencyMs: number;
  errorCode: number;
  responseOverrides: Record<string, string>;
  rules?: MockRule[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  target: string;
  method: string;
  protocol: 'grpc' | 'connect';
  payloadJson: string;
  headers?: Record<string, string>;
  statusCode: number;
  statusMessage: string;
  durationMs: number;
  responseJson?: string;
  error?: string;
}

export interface BenchmarkRequest {
  target: string;
  method: string;
  payloadJson: string;
  headers?: Record<string, string>;
  tls: TLSConfig;
  concurrency: number;
  durationSeconds: number;
  totalRequests?: number;
}

export interface BenchmarkReport {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  elapsedSeconds: number;
  rps: number;
  latencyMinMs: number;
  latencyAvgMs: number;
  latencyMaxMs: number;
  latencyP50Ms: number;
  latencyP90Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  statusCodes: Record<string, number>;
}

export type DiffType = 'BREAKING' | 'ADDITION' | 'MODIFIED';

export interface DiffItem {
  type: DiffType;
  category: 'Service' | 'Method' | 'Field';
  location: string;
  description: string;
}

export interface SchemaDiffReport {
  hasBreakingChanges: boolean;
  totalBreaking: number;
  totalAdditions: number;
  totalModified: number;
  diffs: DiffItem[];
}

export interface SavedRequest {
  id: string;
  name: string;
  methodName: string;
  methodFullName: string;
  target: string;
  protocol: 'grpc' | 'connect';
  payloadJson: string;
  headers: HeaderEntry[];
  tls: TLSConfig;
  savedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: SavedRequest[];
}

export interface DecodedJwt {
  header: Record<string, any>;
  payload: Record<string, any>;
  raw: string;
  isValid: boolean;
  isExpired: boolean;
  expiresInSeconds?: number;
}

