# Public Midnight Dataset

The right way to calibrate WoWtron is not to scrape random logs. It is to curate a public dataset of real Midnight raid reports from guilds that actually progressed the encounters.

## Recommended Starter Size

- `50-100 report codes`
- `200-300 meaningful pulls`
- a mix of:
  - early wipes
  - deep progression wipes
  - kills

That is enough to start separating:

- common wipe patterns
- repeated mechanic failures
- throughput walls
- boss-specific success criteria

## How To Collect Report Codes

Use the Warcraft Logs GraphQL `reportData.reports(...)` collection endpoint to fetch public reports for specific guilds and zones.

Official docs:

- https://www.warcraftlogs.com/v2-api-docs/warcraft/reportdata.doc.html
- https://www.warcraftlogs.com/v2-api-docs/warcraft/reportpagination.doc.html
- https://www.warcraftlogs.com/v2-api-docs/warcraft/report.doc.html

## Local Harvester

Use:

```bash
node scripts/harvest-public-midnight-reports.mjs --config=data/public-midnight-guilds.example.json
```

For the first verified seed list in this repository, use:

```bash
node scripts/harvest-public-midnight-reports.mjs --config=data/public-midnight-guilds.json
```

The config file should contain known public guild sources. For each source, provide:

- `guildName`
- `guildServerSlug`
- `guildServerRegion`
- `zoneID` or `gameZoneID`

The harvester also validates each report by content and only keeps it if the report contains bosses from `VS / DR / MQD`.

## Best Dataset Shape

Do not try to make the first dataset huge.

A better first pass is:

- 5-10 guilds
- 5-10 reports each
- focus on bosses you care about now

## Verified Public Seed Sources

As of March 26, 2026, these guild sources were verified to expose public reports through the WCL API and produced Midnight raid reports when sampled:

- `Internet Explorers` / `Kael'thas` / `US`
- `comma` / `Sargeras` / `US`
- `Saviors` / `Drak'thul` / `EU`

Stored in:

- [public-midnight-guilds.json](/D:/WoWTron/data/public-midnight-guilds.json)

That is enough to build:

- wipe fixtures
- kill fixtures
- common mechanic failure buckets
- expected phase timelines

Current local corpus snapshot from this seed:

- `20` verified Midnight report codes
- `103` queued report/boss jobs
- `278` total pulls in the local corpus
- `136` complete pulls with kill/wipe metadata ready for calibration
- `142` cached partial pulls that already expand boss coverage without re-hitting the API

Current boss coverage in the local corpus:

- `Imperator Averzian`: `64` pulls, `14` kills
- `Vorasius`: `66` pulls, `13` kills
- `Fallen-King Salhadaar`: `46` pulls, `13` kills
- `Vaelgor & Ezzorak`: `29` pulls, `12` kills
- `Lightblinded Vanguard`: `26` pulls, `11` kills
- `Crown of the Cosmos`: `47` pulls, `8` kills

## Calibration Pipeline

Once report codes are harvested, build the local training base in two more steps:

```bash
npm run wcl:build-queue
npm run wcl:build-corpus
npm run wcl:build-fixtures
```

Outputs:

- [midnight-training-queue.json](/D:/WoWTron/data/midnight-training-queue.json)
- [midnight-calibration-corpus.json](/D:/WoWTron/data/midnight-calibration-corpus.json)
- [midnight-fixture-candidates.json](/D:/WoWTron/data/midnight-fixture-candidates.json)

This turns raw report codes into:

- a fetch queue by report and boss
- boss-level pull inventory
- kill vs wipe references
- candidate fixtures ready for human review

## Dataset Tiers

The local dataset now has two useful tiers:

- `coverage`: we know a public report contains a Midnight boss because it is already cached in `report-fights`
- `calibration`: we have full pull metadata such as kill/wipe, duration, and boss HP because `report-summary` was fetched successfully

Coverage is valuable because it tells us which bosses are present in the local corpus without hammering the API again. Calibration is the gold tier we need for real kill-vs-wipe training.

Because WCL can rate-limit client credentials, the corpus builder is intentionally incremental:

- it processes a small batch of report codes at a time
- it reuses local cache first
- it records `cached_partial` when a boss is known locally but the full pull summary is still pending

## Important Limitation

Warcraft Logs client credentials do not automatically hand us a magical global list of all Midnight reports. The best path is targeted collection from known public guilds.
