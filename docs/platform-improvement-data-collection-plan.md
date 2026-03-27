# Platform Improvement Data Collection Plan

## Goal

Keep WoWtron improving over time by collecting platform-quality data, not personal user data.

This plan is focused on:

- analyzer accuracy
- boss and phase coverage
- false positives and false negatives
- rule-pack gaps
- snapshot quality
- progression usefulness

It is **not** focused on tracking personal user behavior, ad metrics, or account profiling.

## What To Collect

### 1. Analyzer Outcome Records

For every calibrated or reviewed pull, store:

- boss name
- zone
- fight ID
- report code
- kill / wipe
- boss HP remaining
- top brief insights
- top cause chain
- top owner
- phase readiness results
- plan-vs-execution status

Purpose:

- measure whether WoWtron is diagnosing the right problem
- compare wipe patterns by boss and phase
- track which output shapes are actually useful

### 2. Calibration Review Records

For every reviewed fixture or reviewed live pull, store:

- expected diagnosis
- actual diagnosis
- expected owner
- actual owner
- expected phase
- actual phase
- pass / fail
- failure reason
- false-positive tag
- false-negative tag

Purpose:

- build a real accuracy loop
- identify recurring failure modes in the analyzer

### 3. Rule-Pack Gap Records

For every boss and phase, maintain a structured gap file with:

- known mechanics covered
- mechanics still generic
- assignment types covered
- success criteria covered
- common false positives
- common missing diagnoses

Purpose:

- stop rule packs from drifting into “half done”
- keep expansion coverage visible

### 4. Snapshot Quality Records

For every stored snapshot, track whether it includes:

- command view
- phase readiness
- plan overview
- cause chain v2
- role coaching
- player reliability entries

Purpose:

- detect incomplete snapshot payloads
- prevent session and memory features from degrading silently

### 5. Progression Memory Records

For each boss across stored snapshots, aggregate:

- recurring blocker
- recurring wipe phase
- recurring owner
- kill conversion count
- most repeated failure summary
- most repeated next-wipe summary

Purpose:

- improve long-term guild usefulness
- reveal which outputs matter across a full progression cycle

### 6. Public Log Coverage Records

For public Midnight logs, keep a coverage table with:

- boss
- total reports
- total pulls
- wipes
- kills
- first-phase wipes
- late-phase wipes
- final-phase wipes
- logs with good assignment signal
- logs with poor data quality

Purpose:

- know where the dataset is strong or weak
- prioritize which bosses need more public examples

## What Not To Collect

Do not collect:

- personal browsing behavior
- account identity beyond what is already necessary for a report or fight reference
- cross-site tracking
- unrelated gameplay behavior outside analyzer quality needs
- private notes from users unless they explicitly export them

## Improvement Loops

### Loop A: Accuracy Loop

Weekly:

- add new reviewed fixtures
- rerun calibration
- tag failed fixtures
- classify failures by:
  - wrong owner
  - wrong phase
  - wrong priority
  - wrong cause chain
  - missing boss rule

### Loop B: Coverage Loop

Weekly or biweekly:

- expand public log corpus for VS / DR / MQD
- update coverage table
- find underrepresented bosses or late phases
- prioritize rule work where coverage is good enough to support it

### Loop C: Rule-Pack Loop

For each boss:

- compare reviewed pulls vs current rule pack
- add missing mechanic checkpoints
- add missing success criteria
- add false-positive suppressors
- revalidate calibration

### Loop D: Output Quality Loop

Review whether outputs are useful to a raid leader:

- Is `Biggest Blocker` still right?
- Is `Most Likely Next Wipe` believable?
- Are top actions actually actionable?
- Does `Boss Memory` help over a raid night?
- Are `Reliability Trends` highlighting the right people?

## Data Artifacts To Maintain

Recommended files:

- `data/midnight-calibration-corpus.json`
- `data/midnight-reviewed-fixtures.json`
- `data/midnight-calibration-results.json`
- `data/midnight-calibration-history.json`
- `data/midnight-rulepack-gap-register.json`
- `data/midnight-public-coverage.json`
- `data/midnight-output-quality-review.json`

## Priority Order

1. Grow reviewed fixtures for existing Midnight bosses
2. Build a boss/phase coverage register
3. Add rule-pack gap tracking
4. Add output-quality review records
5. Expand public log coverage continuously

## Definition Of Good Collection

The collection is good when it helps answer:

- which bosses are still too generic?
- which phases produce the most wrong calls?
- which mechanic types still create false positives?
- which outputs are reliable enough to trust in progression?
- where do we need more public examples before changing the engine?

If the collected data does not improve analyzer quality or RL usefulness, it should not be kept.
