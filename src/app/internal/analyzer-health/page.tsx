import Link from 'next/link';
import { loadAnalyzerHealthPayload, loadBuildSignificanceHealthPayload, loadOutputQualityPayload } from '@/lib/platform-improvement/health';

function pct(value: number | undefined) {
  if (typeof value !== 'number') return '0%';
  return `${value}%`;
}

export default async function AnalyzerHealthPage() {
  const [health, outputQuality, buildHealth] = await Promise.all([
    loadAnalyzerHealthPayload(),
    loadOutputQualityPayload(),
    loadBuildSignificanceHealthPayload(),
  ]);

  const summary = (health?.summary as Record<string, unknown>) || {};
  const snapshotQuality = (health?.snapshotQuality as Record<string, unknown>) || {};
  const topFailureThemes = (health?.topFailureThemes as Array<Record<string, unknown>>) || [];
  const priorities = (health?.priorities as Array<Record<string, unknown>>) || [];
  const bossHealth = (health?.bossHealth as Array<Record<string, unknown>>) || [];
  const outputSummary = (outputQuality?.summary as Record<string, unknown>) || {};
  const buildSummary = (buildHealth?.summary as Record<string, unknown>) || {};

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Internal</p>
            <h1 className="text-4xl font-semibold">Analyzer Health</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Internal coverage and calibration view for Midnight raid analysis. This page is for platform improvement, not user tracking.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/internal/build-significance-health" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Build Significance
            </Link>
            <Link href="/" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Back to WoWtron
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Fixture pass rate" value={pct(summary.fixturePassRate as number | undefined)} subtitle={`${summary.passedFixtures || 0}/${summary.totalFixtures || 0} fixtures passing`} />
          <MetricCard title="Average score" value={String(summary.averageCalibrationScore || 0)} subtitle="Calibration score across reviewed fixtures" />
          <MetricCard title="Analyzer runs" value={String(summary.analyzerRuns || 0)} subtitle="Stored engine runs with snapshot quality" />
          <MetricCard title="Coverage bosses" value={String(summary.coverageBosses || 0)} subtitle="Midnight bosses represented in the public corpus" />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Talent-tagged records" value={String(buildSummary.talentTaggedRecords || 0)} subtitle="Stored build-aware player records" />
          <MetricCard title="Talent coverage" value={`${buildSummary.talentCoverageRate || 0}%`} subtitle="How much of the corpus can support real build checks" />
          <MetricCard title="Talent-ready pairs" value={String(buildSummary.talentReadyPairs || 0)} subtitle="Boss/spec pairs ready for stronger build calls" />
          <MetricCard title="Fallback pairs" value={String((buildSummary.betaFallbackPairs || 0) + (buildSummary.insufficientPairs || 0))} subtitle="Pairs still limited to fallback mode" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Top failure themes</h2>
            <p className="mt-1 text-sm text-slate-400">When fixtures fail, these are the most repeated reasons.</p>
            <div className="mt-4 space-y-3">
              {topFailureThemes.length === 0 ? (
                <p className="text-sm text-slate-500">No repeated failure themes recorded right now.</p>
              ) : (
                topFailureThemes.map((theme) => (
                  <div key={String(theme.theme)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-slate-200">{String(theme.theme)}</p>
                      <span className="text-xs text-amber-300">{theme.count} hits</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Snapshot quality</h2>
            <p className="mt-1 text-sm text-slate-400">How complete the stored analyzer runs are.</p>
            <div className="mt-4 space-y-3 text-sm">
              <QualityLine label="Command view" value={snapshotQuality.commandViewRate} total={snapshotQuality.totalRuns} />
              <QualityLine label="Phase readiness" value={snapshotQuality.phaseReadinessRate} total={snapshotQuality.totalRuns} />
              <QualityLine label="Plan overview" value={snapshotQuality.planOverviewRate} total={snapshotQuality.totalRuns} />
              <QualityLine label="Cause chains" value={snapshotQuality.causeChainRate} total={snapshotQuality.totalRuns} />
              <QualityLine label="Role coaching" value={snapshotQuality.coachingRate} total={snapshotQuality.totalRuns} />
              <QualityLine label="Reliability entries" value={snapshotQuality.reliabilityRate} total={snapshotQuality.totalRuns} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Boss priorities</h2>
            <p className="mt-1 text-sm text-slate-400">Where the next rule work should go first.</p>
            <div className="mt-4 space-y-3">
              {priorities.map((boss) => (
                <div key={String(boss.bossName)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-100">{String(boss.bossName)}</p>
                      <p className="mt-1 text-sm text-slate-400">{String(boss.nextPriority)}</p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-300">{String(boss.gapStatus)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Output quality</h2>
            <p className="mt-1 text-sm text-slate-400">Heuristic checks for whether the current output shape is usable.</p>
            <div className="mt-4 space-y-3 text-sm">
              <QualityLine label="Believable blocker" value={outputSummary.believableBlockerRate} total={outputSummary.total} />
              <QualityLine label="Believable next wipe" value={outputSummary.believableNextWipeRate} total={outputSummary.total} />
              <QualityLine label="Actionable top actions" value={outputSummary.actionableRate} total={outputSummary.total} />
              <QualityLine label="Useful cause chains" value={outputSummary.causeChainUsefulRate} total={outputSummary.total} />
              <QualityLine label="Boss memory ready" value={outputSummary.memoryReadyRate} total={outputSummary.total} />
              <QualityLine label="Reliability ready" value={outputSummary.reliabilityReadyRate} total={outputSummary.total} />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Boss health table</h2>
          <p className="mt-1 text-sm text-slate-400">Coverage, calibration and output quality side by side.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-3">Boss</th>
                  <th className="px-3 py-3">Coverage</th>
                  <th className="px-3 py-3">Calibration</th>
                  <th className="px-3 py-3">Output</th>
                  <th className="px-3 py-3">Gap</th>
                </tr>
              </thead>
              <tbody>
                {bossHealth.map((boss) => (
                  <tr key={String(boss.bossName)} className="border-b border-slate-900">
                    <td className="px-3 py-3 text-slate-100">{String(boss.bossName)}</td>
                    <td className="px-3 py-3 text-slate-300">
                      {boss.coveragePulls} pulls
                      <div className="text-xs text-slate-500">assignment signal {boss.goodAssignmentSignal}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {boss.calibrationPassRate}%
                      <div className="text-xs text-slate-500">avg score {boss.averageCalibrationScore}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{boss.outputActionableRate}% actionable</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-300">{String(boss.gapStatus)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-100">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function QualityLine({ label, value, total }: { label: string; value: unknown; total: unknown }) {
  const numericValue = typeof value === 'number' ? value : 0;
  const numericTotal = typeof total === 'number' ? total : 0;
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className="text-cyan-300">
        {numericValue}/{numericTotal}
      </span>
    </div>
  );
}
