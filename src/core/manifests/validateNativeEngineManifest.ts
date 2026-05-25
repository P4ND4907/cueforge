import { z } from 'zod';

const REQUIRED_ENGINE_FIELDS = ['schema', 'version', 'sampleRate', 'blockSizeTarget', 'channels', 'modules', 'safety'];

export const NativeEndpointSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(['playback', 'recording', 'communications']).optional(),
  transport: z.enum(['usb', 'bluetooth', 'internal', 'virtual']).optional(),
  sampleRates: z.array(z.number()).default([]),
  channels: z.array(z.number()).default([]),
  defaultFor: z.array(z.string()).default([])
}).strict();

export const NativeHelperManifestSchema = z.object({
  manifestVersion: z.literal('cueforge.native.v1'),
  os: z.object({
    family: z.literal('windows'),
    build: z.string().optional()
  }).strict(),
  endpoints: z.array(NativeEndpointSchema),
  tools: z.object({
    equalizerApo: z.boolean().optional(),
    peace: z.boolean().optional(),
    sonar: z.boolean().optional(),
    voicemeeter: z.boolean().optional(),
    vbCable: z.boolean().optional()
  }).strict(),
  capabilities: z.object({
    canReadDefaults: z.boolean(),
    canReadSessions: z.boolean(),
    canReadLoopback: z.boolean(),
    canWriteApoDraft: z.boolean(),
    canModifySystemState: z.literal(false)
  }).strict()
}).strict();

function issuePath(issue: { path: PropertyKey[] }) {
  return issue.path.length ? issue.path.join('.') : '(root)';
}

export function validateNativeManifest(raw: unknown) {
  const parsed = NativeHelperManifestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issuePath(issue)}: ${issue.message}`)
    };
  }

  return {
    ok: true,
    manifest: parsed.data
  };
}

export function validateNativeEngineManifest(manifest: Record<string, any> = {}) {
  const errors: string[] = [];

  for (const field of REQUIRED_ENGINE_FIELDS) {
    if (!(field in manifest)) errors.push(`Missing ${field}.`);
  }

  if (manifest.schema !== 'cueforge.native-engine-manifest.v1') {
    errors.push('Wrong manifest schema.');
  }
  if (!Array.isArray(manifest.modules)) errors.push('modules must be an array.');
  if (manifest.sampleRate && (manifest.sampleRate < 8000 || manifest.sampleRate > 384000)) {
    errors.push('sampleRate is outside supported bounds.');
  }
  if (manifest.safety && manifest.safety.limiterRequired !== true) {
    errors.push('Native manifests must require a limiter.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
