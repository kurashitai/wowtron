# Platform Improvement Phase 1

## Goal

Make collection and persistence reliable before deeper platform observability.

This phase stores:

- raw WCL artifacts
- normalized fight records
- fight player records
- fight phase records
- analyzer runs
- public Midnight coverage rollups
- reviewed-fixture calibration records
- initial rulepack gap register

It does **not** collect personal browsing behavior or ad-style user metrics.

## Storage Strategy

### Immediate path: file-backed

Phase 1 writes locally without requiring a database:

- raw artifacts: `.wowtron-cache/platform-improvement/raw-artifacts`
- structured records: `data/platform-improvement`

This keeps the platform usable right now and avoids blocking on infrastructure.

### Relational path: Postgres

The Prisma schema is now prepared for Postgres with models for:

- `RawLogArtifact`
- `FightRecord`
- `FightPlayerRecord`
- `FightPhaseRecord`
- `AnalyzerRun`
- `CalibrationReview`
- `CoverageRollup`
- `RulepackGap`

Set:

```env
PLATFORM_STORE_MODE=hybrid
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wowtron
```

When Postgres is configured, the same repository layer can write to both file and DB without changing callers.

## Runtime Flow

### `/api/wcl?action=report`

Persists:

- raw WCL report payload
- normalized report payload artifact

### `/api/wcl?action=fight`

Persists:

- raw fight input bundle from WCL
- normalized fight payload artifact
- `FightRecord`
- `FightPlayerRecord`
- `FightPhaseRecord`

### `/api/calibration?action=snapshot`

Persists:

- calibration snapshot artifact
- analyzer run built from the shared engine

### Client log analysis

When the log-analysis UI computes a pull locally, it now posts the result to `/api/analyzer-runs`, which persists an `AnalyzerRun` keyed by the fight plus the output signature.

## Jobs

### Rebuild local Phase 1 artifacts only

```bash
npm run wcl:build-coverage
npm run wcl:build-review-register
npm run wcl:build-rulepack-gaps
```

### Full Phase 1 refresh

Local only:

```bash
npm run wcl:phase1-refresh -- --localOnly=true
```

With WCL credentials available:

```bash
npm run wcl:phase1-refresh
```

That flow will:

1. refresh public Midnight report coverage
2. rebuild the local calibration corpus
3. rebuild Midnight coverage rollups
4. rebuild calibration review records
5. rebuild the rulepack gap register

## Main Output Files

- `data/midnight-public-coverage.json`
- `data/midnight-calibration-review-register.json`
- `data/midnight-rulepack-gap-register.json`
- `data/platform-improvement/coverage-rollups/*`
- `data/platform-improvement/calibration-reviews/*`
- `data/platform-improvement/rulepack-gaps/*`
- `data/platform-improvement/fight-records/*`
- `data/platform-improvement/fight-player-records/*`
- `data/platform-improvement/fight-phase-records/*`
- `data/platform-improvement/analyzer-runs/*`

## Definition Of Done For Phase 1

Phase 1 is in good shape when:

- WoWtron can persist useful analyzer output without a DB
- raw WCL artifacts are reusable locally
- public Midnight coverage can be rebuilt without rethinking the pipeline
- reviewed fixtures are registered in a machine-readable format
- rulepack work can be prioritized from actual coverage and calibration data
