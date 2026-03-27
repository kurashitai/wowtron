import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const PLATFORM_ROOT = path.join(process.cwd(), 'data', 'platform-improvement');
const RAW_ARTIFACT_ROOT = path.join(process.cwd(), '.wowtron-cache', 'platform-improvement', 'raw-artifacts');

function sanitizeSegment(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}

function getStructuredPath(collection: string, key: string) {
  return path.join(PLATFORM_ROOT, sanitizeSegment(collection), `${sanitizeSegment(key)}.json`);
}

function getRawArtifactPath(artifactType: string, cacheKey: string) {
  const hash = createHash('sha256').update(cacheKey).digest('hex');
  return path.join(RAW_ARTIFACT_ROOT, sanitizeSegment(artifactType), `${hash}.json`);
}

export async function writeStructuredRecord<T>(collection: string, key: string, value: T) {
  const filePath = getStructuredPath(collection, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export async function writeRawArtifact<T>(artifactType: string, cacheKey: string, value: T) {
  const filePath = getRawArtifactPath(artifactType, cacheKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}
