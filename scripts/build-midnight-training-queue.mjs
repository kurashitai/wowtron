import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/public-midnight-report-codes.json';
const outputPath = args.output || 'data/midnight-training-queue.json';

const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));

const queue = [];

for (const report of input.reports || []) {
  for (const bossName of report.matchedBosses || []) {
    queue.push({
      id: `${report.code}:${bossName}`,
      code: report.code,
      bossName,
      guildName: report.guildName,
      guildServerSlug: report.guildServerSlug,
      guildServerRegion: report.guildServerRegion,
      title: report.title,
      status: 'pending_fetch',
      notes: 'Awaiting full pull extraction into the calibration corpus.',
    });
  }
}

await fs.writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: queue.length,
  queue,
}, null, 2));

console.log(JSON.stringify({ output: outputPath, count: queue.length }, null, 2));
