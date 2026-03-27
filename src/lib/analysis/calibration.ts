import type { InsightSnapshot } from './log-insight-types';

export interface CalibrationFixture {
  id: string;
  bossName: string;
  expectedTopSummaryIncludes: string[];
  expectedCauseChainIncludes?: string[];
  expectedOwners?: string[];
  bannedSummaryIncludes?: string[];
}

export interface CalibrationResult {
  fixtureId: string;
  bossName: string;
  score: number;
  passed: boolean;
  findings: string[];
}

function containsAny(haystacks: string[], needles: string[]) {
  const lowerHaystacks = haystacks.map((value) => value.toLowerCase());
  return needles.some((needle) => lowerHaystacks.some((value) => value.includes(needle.toLowerCase())));
}

export function calibrateSnapshot(snapshot: InsightSnapshot, fixture: CalibrationFixture): CalibrationResult {
  const findings: string[] = [];
  let score = 100;

  const topSummaries = snapshot.briefInsights.slice(0, 3).map((insight) => insight.summary);
  const causeChains = snapshot.causeChains || [];
  const owners = snapshot.briefInsights.slice(0, 3).map((insight) => insight.owner);

  if (!containsAny(topSummaries, fixture.expectedTopSummaryIncludes)) {
    score -= 40;
    findings.push('Top brief insights missed the expected diagnosis.');
  }

  if (fixture.expectedCauseChainIncludes && !containsAny(causeChains, fixture.expectedCauseChainIncludes)) {
    score -= 25;
    findings.push('Cause chain did not include the expected wipe story.');
  }

  if (fixture.expectedOwners && !containsAny(owners, fixture.expectedOwners)) {
    score -= 20;
    findings.push('Top insights did not identify the expected owner.');
  }

  if (fixture.bannedSummaryIncludes && containsAny(topSummaries, fixture.bannedSummaryIncludes)) {
    score -= 20;
    findings.push('Top insights included a banned or misleading summary.');
  }

  return {
    fixtureId: fixture.id,
    bossName: fixture.bossName,
    score: Math.max(0, score),
    passed: score >= 70,
    findings,
  };
}

export function calibrateSnapshots(snapshots: InsightSnapshot[], fixtures: CalibrationFixture[]): CalibrationResult[] {
  return fixtures.map((fixture) => {
    const snapshot = snapshots.find((item) => item.bossName === fixture.bossName);
    if (!snapshot) {
      return {
        fixtureId: fixture.id,
        bossName: fixture.bossName,
        score: 0,
        passed: false,
        findings: ['No snapshot found for this boss fixture.'],
      };
    }

    return calibrateSnapshot(snapshot, fixture);
  });
}
