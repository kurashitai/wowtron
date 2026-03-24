# WoWtron Development Worklog

## Session: WCL Data Integration Fixes
**Date**: 2026-03-24
**Task ID**: 1-2

---

## Problem Identified

The user reported critical issues with WCL data integration:
1. All damage/healing data showing as zeros
2. Parse/Percentile data not being displayed
3. Defensive abilities showing 0 used
4. Interrupts showing 0
5. Timeline bugged
6. Grades being calculated despite zero data (indicating mock/random fallback)

## Root Cause Found

**The WCL GraphQL API returns table data as a JSON-encoded STRING, not as a JavaScript object.**

The API response structure is:
```json
{
  "data": {
    "reportData": {
      "report": {
        "table": {
          "data": "{\"entries\":[...],\"total\":...}"  // STRING!
        }
      }
    }
  }
}
```

The previous code was checking `if (table.data && table.data.entries)` which always failed because:
1. `table.data` is a **string** (e.g., `"{\"entries\":[...]}"`)
2. Strings don't have an `entries` property
3. Result: functions returned `{ total: 0, entries: [] }` - empty data!

## Files Modified

### 1. `/src/lib/warcraft-logs-api.ts`

Fixed 7 functions to properly parse JSON string responses:

1. **`fetchWCLDamageDone`** - Added `JSON.parse()` for string data
2. **`fetchWCLHealingDone`** - Added `JSON.parse()` for string data
3. **`fetchWCLDamageTaken`** - Added `JSON.parse()` for string data
4. **`fetchWCLSummary`** - Added `JSON.parse()` for string data
5. **`fetchWCLPlayerDetails`** - Added `JSON.parse()` for string data
6. **`fetchWCLDpsRankings`** - Added `JSON.parse()` for string data
7. **`fetchWCLHpsRankings`** - Added `JSON.parse()` for string data

### The Fix Pattern Applied

```typescript
// Check if data is a string (JSON that needs parsing)
if (typeof table.data === 'string') {
  try {
    const parsed = JSON.parse(table.data);
    if (parsed?.entries) {
      return parsed as WCLTableData;
    }
  } catch (e) {
    console.error('[WCL API] Failed to parse table.data as JSON:', e);
  }
}
// Check if data is already an object with entries
if (typeof table.data === 'object' && table.data.entries) {
  return table.data;
}
```

### 2. `/src/app/api/wcl/route.ts`

Fixed by agent:
- Line 797-811: Bloodlust is only added to timeline when actually detected in cast events
- Line 887: `bloodlusts: bloodlustCast ? 1 : 0` reflects actual detection
- Lines 421-447: Interrupt counting now checks for `cast.type === 'interrupt'`

### 3. `/src/app/globals.css`

Fixed CSS import:
```css
@import "tailwindcss";
@import "tw-animate-css";
```

## Expected Results After Fix

- ✅ Player cards should show real DPS/HPS values from WCL
- ✅ Parse percentiles should appear from rankings data
- ✅ Damage/healing totals should be non-zero
- ✅ Timeline shows real events from the fight
- ✅ Defensive tracking has actual cast events
- ✅ Interrupt counts show real interrupt casts
- ✅ Grades are only calculated when there's valid data

## Debug Logging Added

All API functions now log diagnostic information:
- Type of response data received
- Whether data was parsed from a string
- Count of entries found
- Warnings when no entries are found

## How to Test

1. Load a WCL report URL in the application
2. Select a fight and check:
   - Player cards show real DPS/HPS values
   - Timeline shows bloodlust only if actually used
   - Interrupt counts reflect actual interrupts
   - Players with no activity show "No Data" badge
   - Grades are "-" for players without valid data

## Credentials Verified

WCL OAuth credentials are working:
- CLIENT_ID: `a15df201-c6ce-4cbc-af8e-a2cb2850af24`
- CLIENT_SECRET: Configured in `.env`

OAuth token retrieval tested successfully with curl.

---

## Next Steps for User

To fully test the fix, provide a valid WCL report code (16-character alphanumeric string from a warcraftlogs.com URL). The application should now correctly:
1. Parse damage/healing data from WCL
2. Display parse percentiles
3. Track defensive cooldown usage
4. Count interrupts
5. Show timeline events
6. Calculate accurate grades based on real data
