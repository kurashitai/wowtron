import { spawn } from 'node:child_process';

const steps = [
  ['node', ['scripts/backfill-talent-spell-names.mjs']],
  ['node', ['scripts/build-build-significance-health.mjs']],
  ['node', ['scripts/build-build-enrichment-queue.mjs']],
];

function runStep(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  for (const [command, args] of steps) {
    await runStep(command, args);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        steps: steps.map(([command, args]) => `${command} ${args.join(' ')}`),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
