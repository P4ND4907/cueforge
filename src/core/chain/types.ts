export type ChainSeverity = 'low' | 'medium' | 'high' | 'warning' | 'danger' | 'error';

export type NodeKind =
  | 'app-session'
  | 'virtual-mixer'
  | 'system-effect'
  | 'apo-layer'
  | 'physical-output'
  | 'physical-input'
  | 'communication-app'
  | 'game-app';

export type ChainNode = {
  id: string;
  kind: NodeKind;
  label: string;
  confidence: number;
  facts: Record<string, unknown>;
};

export type ChainEdge = {
  from: string;
  to: string;
  relation: 'routes-to' | 'processed-by' | 'defaults-to' | 'mirrors';
};

export type ChainRouteItem = {
  type: string;
  label: string;
  status: string;
  risk?: string;
};

export type ChainProblem = {
  id: string;
  severity: ChainSeverity;
  title: string;
  detail?: string;
  fix: string;
};

export type ChainTopologyWarning = {
  id: string;
  severity: ChainSeverity;
  title: string;
  detail: string;
  fix: string;
  nodeIds?: string[];
};

export type ChainGraphResult = {
  outputPath: ChainRouteItem[];
  inputPath: ChainRouteItem[];
  companions: Array<Record<string, unknown>>;
  virtualRoutes: ChainRouteItem[];
  confidence: number;
  evidenceConfidence: number;
  evidenceSource?: string;
  nodes?: ChainNode[];
  edges?: ChainEdge[];
  topologyWarnings?: ChainTopologyWarning[];
  problems: ChainProblem[];
  suggestions: string[];
};

export type BrowserEvidence = {
  audioApi: boolean;
  micApi: boolean;
  permission: 'granted' | 'prompt' | 'denied' | 'unknown';
  devices: Array<{
    kind: 'audioinput' | 'audiooutput';
    label?: string;
    deviceId?: string;
    isDefault?: boolean;
  }>;
};

export type InstallState = boolean | {
  installed?: boolean;
  detected?: boolean;
  name?: string;
  displayName?: string;
  version?: string;
  source?: string;
};

export type Endpoint = {
  id?: string;
  endpointId?: string;
  label?: string;
  name?: string;
  friendlyName?: string;
  FriendlyName?: string;
  kind?: 'audioinput' | 'audiooutput';
  role?: 'playback' | 'recording' | 'communications' | string;
  transport?: 'usb' | 'bluetooth' | 'internal' | 'virtual';
  sampleRates?: number[];
  channels?: number[];
  defaultFor?: string[];
  dataFlow?: 'render' | 'capture';
  isDefault?: boolean;
  state?: string;
};

export type AppSession = {
  app?: string;
  processName?: string;
  endpointId?: string;
  active?: boolean;
};

export type NativeEvidence = {
  manifestVersion: 'cueforge.native.v1';
  host?: { os: 'windows'; build?: string };
  os?: { family: 'windows'; build?: string };
  endpoints: Endpoint[];
  sessions?: AppSession[];
  tools: {
    equalizerApo?: InstallState;
    peace?: InstallState;
    sonar?: InstallState;
    voicemeeter?: InstallState;
    vbCable?: InstallState;
    [key: string]: InstallState | undefined;
  };
  defaults: {
    playback?: string;
    recording?: string;
    communicationsPlayback?: string;
    communicationsRecording?: string;
  };
  capabilities?: {
    canReadDefaults: boolean;
    canReadSessions: boolean;
    canReadLoopback: boolean;
    canWriteApoDraft: boolean;
    canModifySystemState: false;
  };
};
