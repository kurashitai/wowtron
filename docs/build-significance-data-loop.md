# Build Significance Data Loop

## Goal

Make `Build Significance (Beta)` evolve from a cautious spec baseline into a reliable boss-specific build recommendation layer.

This is **not** user tracking. It is platform-improvement data for the analyzer.

## What WoWtron Should Collect

For each stored boss pull:

- `bossName`
- `difficulty`
- `reportCode`
- `fightId`
- `kill`
- `className`
- `spec`
- `role`
- `talents`
- `buildSignature`
- `buildSource`
- `rankPercent`
- `activeTime`
- `deaths`
- `reliabilityScore`

## What Counts As Useful Coverage

Per boss/spec, WoWtron should aim for:

- `20+` total pulls before showing any build comparison by default
- `8+` talent-tagged pulls before using talent mode
- `4+` kill pulls for the recommended build before showing medium confidence
- `8+` kill pulls for the recommended build before showing high confidence

Below that, WoWtron should stay in `spec fallback` and say so explicitly.

## Data Priorities

Priority order for new collection:

1. `Crown of the Cosmos`
2. `Fallen-King Salhadaar`
3. `Imperator Averzian`
4. `Vorasius`
5. `Lightblinded Vanguard`
6. `Vaelgor & Ezzorak`

Per boss, prioritize:

1. `DPS specs with multiple viable boss builds`
2. `healer specs with clear raid-CD or dispel build tradeoffs`
3. `tank specs with survival vs throughput tradeoffs`

## Review Questions

Each time build significance is reviewed, ask:

- Did WoWtron use real talent data or spec fallback?
- Is the recommended build backed by enough kill samples?
- Does the recommendation outperform the current build in completion rate?
- Does the recommendation still hold when filtering by the same difficulty?
- Is WoWtron blaming build when the actual issue is execution?

## Safety Rules

WoWtron should **not** make a strong build recommendation when:

- talent coverage is low
- kills are too few
- the delta is tiny
- the player is far below the spec execution baseline already

In those cases, the product should say:

- `Fix execution first`
- `Not enough talent-tagged data yet`
- `Spec baseline only`

## Improvement Loop

Weekly:

- refresh public Midnight corpus
- count talent-tagged coverage by boss/spec
- flag specs still stuck in fallback mode

Biweekly:

- review top build recommendations for false positives
- compare recommended build against current kill-standard logs

Monthly:

- promote boss/spec pairs from `beta fallback` to `talent mode`
- remove or downgrade recommendations that stopped holding up

## Product Standard

The build layer should only feel “smart” when it is true.

If the data is weak, WoWtron should be honest:

- `We do not have enough talent-tagged kills yet.`
- `This is a spec baseline warning, not a mandatory talent swap.`
