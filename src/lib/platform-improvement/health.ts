import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJsonFile<T>(relativePath: string): Promise<T | null> {
  try {
    const filePath = path.join(process.cwd(), relativePath);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function loadAnalyzerHealthPayload() {
  return readJsonFile<Record<string, unknown>>('data/midnight-analyzer-health.json');
}

export async function loadOutputQualityPayload() {
  return readJsonFile<Record<string, unknown>>('data/midnight-output-quality-review.json');
}

export async function loadPriorityBacklogPayload() {
  return readJsonFile<Record<string, unknown>>('data/midnight-priority-backlog.json');
}

export async function loadReviewCadencePayload() {
  return readJsonFile<Record<string, unknown>>('data/midnight-review-cadence.json');
}

export async function loadBuildSignificanceHealthPayload() {
  return readJsonFile<Record<string, unknown>>('data/midnight-build-significance-health.json');
}
