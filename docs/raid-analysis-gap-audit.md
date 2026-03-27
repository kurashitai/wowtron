# Raid Analysis Gap Audit

## Goal

Make WoWtron useful for raid leaders and officers who need to answer one question fast:

`What should we fix before the next pull?`

## What Is Better Now

- The logs flow is moving toward `Pull Brief -> Evidence -> Detail`.
- The brief uses a normalized insight model with severity, confidence, owner, phase, evidence, recommendation, and kind.
- Boss context is now enriched on the server before the client builds the brief.

## Biggest Gaps Still Open

### 1. Assignment Truth Is Missing

The product still detects assignment failures mostly from outcomes, not from the actual plan.

What is missing:

- interrupt rotations
- soak assignments
- dispel assignments
- externals and tank swap plans
- healer cooldown plans tied to damage events

Why it matters:

Without the intended assignment plan, WoWtron can say that something failed, but not whether the failure came from a missed assignment, a weak strategy, or a player improvising correctly after someone else failed.

### 2. Cause Chains Need To Be Stronger

The root-death view is useful, but the product still needs a more explicit event chain:

- first failure
- immediate consequence
- recovery attempt
- wipe conversion

Why it matters:

Raid leaders need causality, not correlation. A strong chain makes the brief credible.

### 3. Boss-Specific Rules Are Still Too Thin

The generic insight contract is correct, but it still needs per-boss rules for:

- priority mechanics
- phase success conditions
- common fake-positive patterns
- raid CD checkpoints
- tank/healer-specific fail states

Why it matters:

Generic heuristics are acceptable for fallback. They are not enough for progression-grade advice.

### 4. Confidence Needs Explanation

The brief now has a confidence field, but the UI does not explain why an insight is high or low confidence.

What should be shown:

- matched mechanic source
- number of repeated events
- whether the conclusion came from boss rules or generic fallback
- whether the signal is single-pull or trend-backed

Why it matters:

Users trust recommendations more when they understand why the system believes them.

### 5. Pull-To-Pull Delta Needs More Precision

Current delta insights are useful, but still shallow.

What is missing:

- comparison against best pull by phase
- comparison against last pull by assignment category
- “new problem introduced” vs “existing problem got worse”
- normalized delta for deaths, mechanics, and cooldown coverage

### 6. Coaching Should Be Role-Aware

Player coaching still leans too generic.

What is missing:

- tank swap errors
- missed externals
- healer ramp or spot-heal timing failures
- melee uptime vs mechanic greed
- ranged movement discipline
- interrupt ownership

### 7. Good Pull Definitions Are Missing

The product identifies failures better than success criteria.

It should also answer:

- what a good Phase 2 looks like
- what minimum execution bar is needed for a kill
- what signals indicate the raid is ready to progress

### 8. The UI Still Has Competing Panels

The brief is stronger, but lower-value sections still compete for attention.

Likely candidates to demote or remove from default view:

- broad scorecards without actionability
- generic benchmarks without direct coaching
- roster views that do not explain risk or assignments
- advanced widgets that repeat the same signal in a different format

## Missing Data Worth Adding

- spell-to-journal mapping from Blizzard data where available
- boss ability severity and phase metadata
- explicit assignment input from the user or raid plan import
- comp context such as missing immunities, dispels, knockbacks, and raid buffs
- trend memory across pulls and nights, not just inside one report

## Recommended Next Steps

1. Build an `assignment model` and compare actual execution against it.
2. Add `cause chain` generation so the wipe story is explicit.
3. Create `boss rule packs` for the first priority Midnight encounters.
4. Add `confidence reasons` to each brief insight.
5. Reduce default UI to the panels that directly change next-pull decisions.
