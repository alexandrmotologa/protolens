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

export interface MockConfig {
  port: number;
  latencyMs: number;
  errorCode: number;
  responseOverrides: Record<string, string>;
}
