import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  })
);

const localOnly = args.localOnly === 'true' || args['local-only'] === 'true';
const steps = [];

function runNodeScript(script, extraArgs = []) {
  const result = spawnSync(process.execPath, [script, ...extraArgs], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`Step failed: ${script}`);
  }
  steps.push(script);
}

if (!localOnly && process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET) {
  runNodeScript('scripts/harvest-public-midnight-reports.mjs', ['--config=data/public-midnight-guilds.json', '--output=data/public-midnight-report-codes.json']);
  runNodeScript('scripts/build-midnight-training-queue.mjs');
  runNodeScript('scripts/build-midnight-calibration-corpus.mjs');
}

runNodeScript('scripts/build-midnight-public-coverage.mjs');
runNodeScript('scripts/build-midnight-review-register.mjs');
runNodeScript('scripts/build-midnight-rulepack-gap-register.mjs');
runNodeScript('scripts/build-output-quality-review.mjs');
runNodeScript('scripts/build-analyzer-health-report.mjs');
runNodeScript('scripts/build-improvement-backlog.mjs');
runNodeScript('scripts/build-review-cadence.mjs');
if ((process.env.PLATFORM_STORE_MODE === 'hybrid' || process.env.PLATFORM_STORE_MODE === 'db') && process.env.DATABASE_URL) {
  runNodeScript('scripts/sync-platform-phase1-to-db.cjs');
}

console.log(JSON.stringify({ ok: true, localOnly, steps }, null, 2));
