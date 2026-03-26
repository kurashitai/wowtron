import { createHash } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

type CacheEnvelope<T> = {
  createdAt: number;
  value: T;
};

const CACHE_ROOT = path.join(process.cwd(), '.wowtron-cache', 'wcl');

function getCacheFile(namespace: string, key: string): string {
  const safeNamespace = namespace.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  const hash = createHash('sha256').update(key).digest('hex');
  return path.join(CACHE_ROOT, safeNamespace, `${hash}.json`);
}

export async function getCachedValue<T>(
  namespace: string,
  key: string,
  maxAgeMs: number
): Promise<T | null> {
  try {
    const filePath = getCacheFile(namespace, key);
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;

    if (!parsed?.createdAt || !('value' in parsed)) {
      return null;
    }

    const isExpired = Date.now() - parsed.createdAt > maxAgeMs;
    if (isExpired) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export async function setCachedValue<T>(
  namespace: string,
  key: string,
  value: T
): Promise<void> {
  try {
    const filePath = getCacheFile(namespace, key);
    await mkdir(path.dirname(filePath), { recursive: true });

    const payload: CacheEnvelope<T> = {
      createdAt: Date.now(),
      value,
    };

    await writeFile(filePath, JSON.stringify(payload), 'utf-8');
  } catch (error) {
    console.warn('[WCL CACHE] Failed to write cache:', error);
  }
}
