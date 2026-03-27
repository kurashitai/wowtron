# WoWtron Logs Product Direction

## Positioning

WoWtron should not compete with Warcraft Logs by exposing more raw data.

WoWtron should answer a simpler question:

**What should this raid fix before the next pull?**

That means the logs experience must prioritize:

1. Root cause
2. Severity
3. Ownership
4. Next action

## Core Product Principles

### 1. Interpretation before visualization
The first screen should explain the wipe in plain language before showing graphs, rankings, or timelines.

### 2. Fewer blocks, stronger hierarchy
A raid leader should understand the pull in under 30 seconds.

### 3. Actionable outputs only
Every surfaced issue should answer:
- What happened?
- Why does it matter?
- Who owns the fix?
- What should change next pull?

### 4. English-first, Portuguese-second
English should be the default UI language and content language.
Portuguese should be supported as a secondary locale, not mixed into the same experience.

## Current Product Problems

### 1. The app is still positioned as a broad WoW platform
The main app still presents guild management, recruitment, M+, pricing, fake auth flows, and demo surfaces.

This weakens the main value proposition and creates noise around the logs product.

### 2. The logs screen is overloaded
The analysis page exposes too many panels, badges, scores, and advanced sections at once.

The result is density without clarity.

### 3. The analysis logic is too heuristic-driven
Several core insights are inferred from generic keywords, fixed thresholds, and role-based assumptions instead of boss-aware or event-aware logic.

This makes recommendations feel shallow or unreliable.

### 4. Language is inconsistent
The project metadata is in English, but core logs analysis copy is partially in Portuguese.

That is a product quality issue, not only a translation issue.

## Recommended Logs Experience

### Screen 1: Pull Brief
The top area should contain only:
- Wipe summary
- Confidence level
- Top 3 next-pull actions
- Responsible roles or players

Example:
- Wipe cause: missed mechanic during Phase 2 add overlap
- Biggest consequence: first healer death caused cascade in 9s
- Next pull actions:
  - Healers: assign raid CD at 03:42
  - Melee: stop dying to `Void Eruption`
  - Raid: hold burst for add spawn at 05:10

### Screen 2: Evidence
Only after the brief:
- death timeline
- mechanic failures
- cooldown gaps
- repeated player mistakes
- pull-to-pull delta vs best pull

### Screen 3: Detail
Only after evidence:
- full roster cards
- raw DPS/HPS numbers
- advanced metrics
- debug-style breakdowns

## Recommended Information Model

Every issue should be normalized into a common shape:

- `type`
- `severity`
- `confidence`
- `phase`
- `owner`
- `summary`
- `evidence`
- `recommendation`
- `repeatCount`

This will make the UI much easier to simplify and rank.

## What WoWtron Should Detect Well

The product does not need to solve everything at once.
It needs to be excellent at a few high-value failure modes:

1. Avoidable deaths
2. Repeated mechanic failures
3. Missing or late raid cooldown coverage
4. Player responsibility failures
5. Pull regression or improvement
6. Strategy-level bottlenecks by phase

## What Should Be Deprioritized

These are low-value if shown too early:

- generic parse-style grades
- inflated scorecards
- broad all-in-one platform messaging
- cosmetic dashboard widgets
- data that does not change the next pull call

## UX Direction

The logs page should feel like a raid command console, not a marketplace dashboard.

Use:
- strong section contrast
- compact but readable cards
- explicit severity colors
- larger narrative text near the top
- fewer decorative gradients in analysis surfaces

Avoid:
- too many equal-weight cards
- mixed languages
- collapsibles hiding core information
- “advanced mode” as a crutch for poor default hierarchy

## Internationalization Direction

### Default locale
`en`

### Secondary locale
`pt-BR`

### Rules
- Do not mix English and Portuguese in the same default UI.
- Keep analysis labels, recommendations, statuses, and export text localized through one translation layer.
- Write product copy in English first.

## 3-Step Execution Plan

### Phase 1: Refocus
- Narrow homepage and in-app messaging around raid log analysis
- Rebuild the logs page around `Pull Brief -> Evidence -> Detail`
- Remove or hide low-value demo surfaces from the primary flow

### Phase 2: Normalize insights
- Move current ad-hoc recommendations into a unified issue model
- Add confidence scoring
- Rank issues by impact on progression
- Separate player mistakes from raid strategy problems

### Phase 3: Boss-specific quality
- Add Midnight boss-specific mechanic rules
- Improve phase-aware wipe diagnosis
- Improve ownership mapping for assignments and cooldown plans

## Success Criteria

WoWtron is becoming useful when a raid leader can:

- understand the wipe in under 30 seconds
- explain the next pull plan in under 60 seconds
- identify whether the problem was execution, healing coverage, or strategy
- compare the current pull against the best recent pull without opening WCL
