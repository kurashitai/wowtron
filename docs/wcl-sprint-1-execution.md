# WCL Sprint 1 Execution

This is the execution layer for Sprint 1: connect Warcraft Logs, validate the auth path, and prepare real-log calibration.

## Local Environment

Use `.env.local` with:

- `WCL_CLIENT_ID`
- `WCL_CLIENT_SECRET`

## Auth Validation

Run:

```bash
node scripts/test-wcl-auth.mjs
```

This confirms that the project can obtain a client-credentials token from Warcraft Logs.

## Real Log Calibration

To calibrate the analyzer with a real fight, you still need:

- a `report code`
- a `fightId`

Then run the local app and call:

```bash
node scripts/wcl-calibrate-report.mjs --code=REPORTCODE --fightId=123
```

This hits the WoWtron API route directly and confirms the real fight payload is coming through with:

- players
- deaths
- timeline
- boss context

## Current Limitation

Client credentials are enough to authenticate against Warcraft Logs, but they do not magically provide a list of reports to calibrate against. We still need known report codes from real raid logs to run real analyzer calibration.

## Next Calibration Inputs Needed

- 3-5 real report codes
- preferred bosses to prioritize
- the fight IDs for the pulls that matter most
