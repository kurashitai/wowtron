# WoWtron Analysis Calibration Workflow

This workflow exists to keep the raid analyzer honest once real guild logs start flowing through the product.

## Goal

The analyzer should not only produce plausible insights. It should produce the right top diagnosis, the right owner, and a believable wipe story for known encounters.

## Fixture Format

Use one fixture per reviewed log:

- `bossName`
- `expectedTopSummaryIncludes`
- `expectedCauseChainIncludes`
- `expectedOwners`
- `bannedSummaryIncludes`

Do not treat `coverage_reference` items as full fixtures yet. They only prove that a public report contains that boss. Real calibration should prefer entries backed by complete pull metadata (`kill`, `duration`, `bossHPPercent`).

The implementation lives in:

- [calibration.ts](/D:/WoWTron/src/lib/analysis/calibration.ts)

## Recommended Review Loop

1. Save a snapshot from a real pull in WoWtron.
2. Create a fixture that describes the expected top diagnosis.
3. Run calibration on the saved snapshots.
4. Review failed findings.
5. Fix the boss rule pack, assignment logic, or wording.
6. Re-run calibration before shipping analyzer changes.

## Local Review Pipeline

The repository now supports a fixture-review flow:

```bash
npm run wcl:build-fixtures
npm run wcl:review-fixtures
npm run wcl:validate-fixtures
npm run wcl:build-snapshot-template
npm run wcl:capture-snapshots
npm run wcl:run-calibration
npm run wcl:append-calibration-history
```

Files:

- [midnight-fixture-candidates.json](/D:/WoWTron/data/midnight-fixture-candidates.json)
- [midnight-reviewed-fixtures.json](/D:/WoWTron/data/midnight-reviewed-fixtures.json)
- [midnight-calibration-snapshots.json](/D:/WoWTron/data/midnight-calibration-snapshots.json)
- [midnight-calibration-results.json](/D:/WoWTron/data/midnight-calibration-results.json)

Use `midnight-reviewed-fixtures.json` as the human-reviewed source of truth. Fill:

- `expectedTopSummaryIncludes`
- `expectedCauseChainIncludes`
- `expectedOwners`
- `bannedSummaryIncludes`

Validation will fail them as `incomplete` until the important expectation fields are filled.

## Snapshot Export And Runner

Snapshots are still generated inside WoWtron from the actual analyzer. The workflow is:

1. Open the reviewed fight in WoWtron.
2. Let the analyzer save a snapshot for that fight.
3. Use `Export snapshots` in the saved snapshots card.
4. Merge or place that JSON into `midnight-calibration-snapshots.json`.
5. Run `npm run wcl:run-calibration`.

There is now also an automated capture path for calibration:

```bash
npm run wcl:capture-snapshots
npm run wcl:run-calibration
```

This capture path calls WoWtron's `/api/wcl?action=fight` route for every reviewed fixture and builds a calibration snapshot file automatically. It is not a full replacement for the browser analyzer yet, but it is enough to start measuring calibration coverage and drift without manual export.

The capture flow now goes through WoWtron's `/api/calibration?action=snapshot` route, which keeps the snapshot-building logic in one shared server-side place instead of duplicating it inside the Node script.

Use `npm run wcl:append-calibration-history` after each run to persist the latest score and detect regressions over time.

The calibration runner matches by:

- `bossName`
- `reportCode`
- `fightId`

This keeps kill and wipe references separate even for the same boss.

## What To Measure

- Did the top 3 insights identify the real wipe cause?
- Did the analyzer blame the right owner?
- Did the cause chain reflect what actually happened?
- Did the analyzer avoid misleading throughput blame when the pull was really lost to mechanics?
- Did the analyzer avoid generic advice when a boss-specific call was required?

## Initial Priority Logs

- Early Voidspire progression wipes
- Fights with repeated interrupt failures
- Fights with missed raid-CD coverage
- Fights where the wipe was really strategy and not individual execution

## Important Constraint

Calibration only becomes valuable with real logs reviewed by a human who actually understands why the pull failed. Until then, the framework is in place, but the fixtures are still waiting on production data.
