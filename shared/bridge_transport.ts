import { unwrapFfi } from './library_types';

const TRANSPORT = 'satli-bridge-chunks-v1';
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_CHUNK_BYTES = 512 * 1024;

/** Reassemble large snapshots once per token for both Steam UI and WebKit. */
export function createBridgeSnapshotLoader(
  readSnapshot: () => Promise<unknown>,
  readChunk: (token: string, index: number) => Promise<unknown>,
): () => Promise<unknown> {
  let cached: { token: string; count: number; bytes: number; payload: string } | undefined;
  return async () => {
    const raw = unwrapFfi(await readSnapshot());
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || typeof value !== 'object' || !('transport' in value)) {
      cached = undefined;
      return raw;
    }
    const manifest = value as Record<string, unknown>;
    const { token, count, bytes } = manifest;
    if (manifest.transport !== TRANSPORT || typeof token !== 'string' || !token
      || typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 128
      || typeof bytes !== 'number' || !Number.isInteger(bytes) || bytes < 1 || bytes > MAX_BYTES) {
      throw new Error('Invalid translation bridge manifest');
    }
    if (cached?.token === token && cached.count === count && cached.bytes === bytes) {
      return cached.payload;
    }
    const chunks: string[] = [];
    const encoder = new TextEncoder();
    let receivedBytes = 0;
    for (let index = 1; index <= count; index++) {
      const chunk = unwrapFfi(await readChunk(token, index));
      if (typeof chunk !== 'string') throw new Error('Invalid translation bridge chunk');
      const chunkBytes = encoder.encode(chunk).byteLength;
      if (chunkBytes < 1 || chunkBytes > MAX_CHUNK_BYTES) {
        throw new Error('Invalid translation bridge chunk size');
      }
      receivedBytes += chunkBytes;
      if (receivedBytes > bytes) throw new Error('Translation bridge exceeds declared size');
      chunks.push(chunk);
    }
    if (receivedBytes !== bytes) throw new Error('Incomplete translation bridge');
    const payload = chunks.join('');
    JSON.parse(payload);
    cached = { token, count, bytes, payload };
    return payload;
  };
}
