import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const inputPath = args.input || 'data/midnight-calibration-results.json';
const historyPath = args.history || 'data/midnight-calibration-history.json';

const latest = JSON.parse(await fs.readFile(inputPath, 'utf8'));
let history = { generatedAt: new Date().toISOString(), runs: [] };

try {
  history = JSON.parse(await fs.readFile(historyPath, 'utf8'));
} catch {
  history = { generatedAt: new Date().toISOString(), runs: [] };
}

const previous = history.runs[history.runs.length - 1];
const regression = previous
  ? {
      averageScoreDelta: latest.summary.averageScore - previous.summary.averageScore,
      passedDelta: latest.summary.passed - previous.summary.passed,
      failedDelta: latest.summary.failed - previous.summary.failed,
    }
  : null;

history.runs.push({
  recordedAt: new Date().toISOString(),
  summary: latest.summary,
  regression,
});

await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
console.log(
  JSON.stringify(
    {
      history: historyPath,
      totalRuns: history.runs.length,
      latestAverageScore: latest.summary.averageScore,
      regression,
    },
    null,
    2
  )
);
