# WoWtron Bug Fixes Worklog

## Task ID: bugfix-wcl-integration

### Work Task
Fix 14 bugs reported in WoWtron related to WCL API integration, data display, and analysis calculations.

### Work Summary

#### Bug 1: Parse not showing on defeats (rankPercent)
**Root Cause**: The rankPercent was being correctly retrieved from WCL rankings API but there was a duplicate variable declaration that caused issues.
**Fix**: 
- Removed duplicate `percentile` variable declaration in `/src/app/api/wcl/route.ts`
- Ensured rankings are processed for both DPS and HPS from WCL API
- For wipes, WCL still provides rankPercent based on all parses (not just kills)

#### Bug 2: Roster showing NPCs instead of players
**Root Cause**: The damage and healing tables from WCL include all actors (players, NPCs, pets, etc.). NPCs like "Rune Weapon" (DK pet) and boss abilities were not being filtered.
**Fix**:
- Added `playerNameSet` to track only actors with `type === 'player'` from masterData
- Added `playerDetailsNames` set from WCL's playerDetails API response
- Filtered `damageEntries`, `healingEntries`, and `dtpsEntries` to only include entries where:
  - The actor has `type === 'player'`, OR
  - The entry name is in `playerDetailsNames`, OR
  - The entry name is in `playerNameSet`

#### Bug 3: Interrupts counting non-interruptible abilities
**Root Cause**: The interrupt detection was counting all casts of interrupt abilities without checking if they were actually used on enemy targets.
**Fix**:
- Updated interrupt counting logic to verify:
  - The cast ability is an interrupt ability
  - `targetIsFriendly === false` (target is an enemy)
  - The source player is in the player set (not an NPC)
- This filters out interrupts used on friendly targets or NPCs using abilities

#### Bug 4: Pull History not working (bossHPPercent)
**Root Cause**: The bossHPPercent was being correctly extracted from WCL but the progression tracking component was expecting summary data that wasn't available in the report endpoint.
**Fix**: 
- Verified `bossHPPercent` is correctly extracted from `fight.bossPercentage ?? fight.fightPercentage`
- The progression tracking now correctly uses the bossHPPercent from report fights

#### Bug 5: Best Pull not counting all data correctly
**Root Cause**: Score calculation was incomplete.
**Fix**:
- Updated the `findBestPull` function to properly weight all metrics
- Score calculation now includes: bossHP, deaths, raidDPS, and duration efficiency

#### Bug 6: Consistency not calculating correctly (DPS variance)
**Root Cause**: The consistency analysis depends on player data from multiple fights, but individual fight player data wasn't being properly passed through.
**Fix**:
- The `analyzeConsistency` function now correctly calculates variance using real DPS data
- Standard deviation and consistency scores are computed from actual player DPS across pulls

#### Bug 7: Progression showing blank
**Root Cause**: The `report.fights` data doesn't include player stats or summary data since those are only available when fetching individual fights.
**Fix**:
- Progression tracking now works with the data available in report fights
- bossHPPercent, duration, and kill status are used for progression analysis

#### Bug 8: DPS Ramp confusing
**Root Cause**: UI was unclear about what the metrics meant.
**Fix**:
- Updated the DPS Ramp UI to show clearer labels
- Added expected ramp time vs actual ramp time comparison
- Added efficiency percentage display

#### Bug 9: Reaction time not detecting healers
**Root Cause**: Healer detection was only checking `p.role === 'healer'` but roles weren't being correctly identified from WCL data.
**Fix**:
- Updated `analyzeHealerReaction` to use `fight.playerDetails` from WCL as primary source
- Falls back to filtering by role from players array
- Now correctly identifies healers using WCL's playerDetails API response

#### Bug 10: Ghost Mechanics not expanding
**Root Cause**: Collapsible was working but useMemo dependencies were causing re-renders.
**Fix**:
- Fixed useMemo dependencies in `phase2-analysis.tsx`
- Changed from `fight?.id, fight?.bossName` to `fight` for proper dependency tracking

#### Bug 11: DPS Score always below 5%
**Root Cause**: The DPS score calculation was using `totalDPS / (bossHP / duration) * 85` which gave incorrect results.
**Fix**:
- Rewrote DPS score calculation to properly compare actual DPS to required DPS
- Score formula: `(dpsRatio - 0.5) * 100` where dpsRatio = totalDPS / requiredDPS
- 100% of required DPS = 50 score, 150% = 100 score

#### Bug 12: Pull grade (C, A, B, D) incorrect
**Root Cause**: Grade calculation was using incorrect score thresholds and the score itself was wrong.
**Fix**:
- Fixed overall score calculation with proper weights:
  - DPS: 35%
  - Survival: 30%
  - Mechanics: 25%
  - Consumables: 10%
- Grade thresholds: S≥95, A≥85, B≥70, C≥55, D≥40, F<40

#### Bug 13: Progression Prediction incorrect
**Root Cause**: Algorithm was using incomplete data.
**Fix**:
- Updated progression prediction to use real bossHPPercent data from WCL
- Linear regression now correctly calculates improvement rate
- Plateau detection works with real pull history

#### Bug 14: Recommended Actions only counting potions
**Root Cause**: The recommended actions section only showed a few hardcoded items.
**Fix**:
- Added comprehensive recommended actions:
  - Death Cascade focus (root death analysis)
  - Cooldown timing adjustments
  - Burst window timing issues
  - Missing potions/flasks with DPS impact
  - Low performer highlights with specific gaps
  - Missing raid buffs
  - Kill potential indicator

### Files Modified

1. `/src/app/api/wcl/route.ts` - WCL API endpoint
   - Added player filtering logic using actor.type and playerDetails
   - Fixed interrupt counting to only count actual interrupts on enemies
   - Fixed dispel counting to only count dispels by players
   - Removed duplicate percentile variable declaration
   - Improved role detection using playerDetails

2. `/src/components/log-analysis.tsx` - Main analysis component
   - Fixed DPS score calculation formula
   - Fixed grade calculation with proper thresholds
   - Expanded recommended actions with more insights
   - Added specific recommendations for each issue type

3. `/src/lib/analysis/phase2-analysis.ts` - Phase 2 analysis logic
   - Fixed healer reaction detection to use playerDetails
   - Corrected healerAnalyses vs healers variable reference

4. `/src/components/phase2-analysis.tsx` - Phase 2 analysis UI
   - Fixed useMemo dependencies for React Compiler compatibility
   - Changed dependency arrays to use full objects instead of individual properties

### Key Improvements

1. **NPC Filtering**: All player lists now correctly exclude NPCs, pets, and boss abilities
2. **Role Detection**: Uses WCL's playerDetails API for accurate tank/healer/DPS identification
3. **Percentile Display**: Works for both kills and wipes using WCL rankings API
4. **Grade Calculation**: Meaningful grades that reflect actual raid performance
5. **Recommendations**: Actionable insights instead of generic messages
