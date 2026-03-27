import fs from 'node:fs/promises';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value];
  })
);

const backlogPath = args.backlog || 'data/midnight-priority-backlog.json';
const healthPath = args.health || 'data/midnight-analyzer-health.json';
const outputPath = args.output || 'data/midnight-review-cadence.json';

const backlog = JSON.parse(await fs.readFile(backlogPath, 'utf8'));
const health = JSON.parse(await fs.readFile(healthPath, 'utf8'));

const topBacklog = (backlog.items || []).slice(0, 5);
const topBosses = (health.priorities || []).slice(0, 3).map((item) => item.bossName);

const payload = {
  generatedAt: new Date().toISOString(),
  weekly: {
    goal: 'Keep calibration honest and catch regressions early.',
    checklist: [
      'Run calibration and review failed findings.',
      `Review the top backlog items: ${topBacklog.map((item) => item.title).join('; ') || 'none yet'}.`,
      `Inspect the current priority bosses: ${topBosses.join(', ') || 'none yet'}.`,
      'Append new reviewed fixtures if new progression pulls exist.',
    ],
  },
  biweekly: {
    goal: 'Decide where rule work and public coverage work should move next.',
    checklist: [
      'Review rulepack gaps and move one boss from queued to in-progress.',
      'Check whether poor-quality public coverage is blocking a boss.',
      'Review output quality samples and mark any misleading summaries.',
    ],
  },
  monthly: {
    goal: 'Use data to redirect product work, not just engine work.',
    checklist: [
      'Re-rank backlog categories by impact on raid leader usefulness.',
      'Review whether Boss Memory and Session Review are still helping progression.',
      'Decide whether new encounters or a new raid tier should enter the fixture program.',
    ],
  },
};

await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ output: outputPath }, null, 2));
