import Link from 'next/link';
import { loadBuildSignificanceHealthPayload } from '@/lib/platform-improvement/health';

export default async function BuildSignificanceHealthPage() {
  const payload = await loadBuildSignificanceHealthPayload();
  const summary = (payload?.summary as Record<string, unknown>) || {};
  const bossSpecs = (payload?.bossSpecs as Array<Record<string, unknown>>) || [];
  const collectionPriorities = (payload?.collectionPriorities as Array<Record<string, unknown>>) || [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-300">Internal</p>
            <h1 className="text-4xl font-semibold">Build Significance Health</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Tracks when build comparison is still fallback-only and when WoWtron has enough talent-tagged boss history to make stronger calls.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/internal/analyzer-health" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Analyzer Health
            </Link>
            <Link href="/" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Back to WoWtron
            </Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Talent-tagged records" value={String(summary.talentTaggedRecords || 0)} subtitle={`of ${summary.totalRecords || 0} stored fight-player records`} />
          <MetricCard title="Coverage rate" value={`${summary.talentCoverageRate || 0}%`} subtitle="How much of the corpus has usable build detail" />
          <MetricCard title="Talent-ready pairs" value={String(summary.talentReadyPairs || 0)} subtitle={`of ${summary.bossSpecPairs || 0} boss/spec pairs`} />
          <MetricCard title="Fallback pairs" value={String((summary.betaFallbackPairs || 0) + (summary.insufficientPairs || 0))} subtitle="Pairs still not ready for strong talent-mode calls" />
        </section>

        {(summary.sourceBlocker || summary.nextAction) && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className="text-lg font-semibold text-amber-200">Current data-source blocker</h2>
            {summary.sourceBlocker ? <p className="mt-2 text-sm text-slate-200">{String(summary.sourceBlocker)}</p> : null}
            {summary.nextAction ? <p className="mt-2 text-sm text-amber-300">{String(summary.nextAction)}</p> : null}
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Collection priorities</h2>
            <p className="mt-1 text-sm text-slate-400">Where more build-tagged pulls will unlock the biggest product gain first.</p>
            <div className="mt-4 space-y-3">
              {collectionPriorities.map((item) => (
                <div key={String(item.key)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <p className="font-medium text-slate-100">{String(item.title)}</p>
                  <p className="mt-1 text-sm text-slate-400">{String(item.rationale)}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-800 px-2 py-1">{String(item.bossName)}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-1">{String(item.spec)}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-1">talent-tagged {String(item.currentTalentTaggedRecords)}</span>
                    <span className="rounded-full bg-slate-800 px-2 py-1">kills {String(item.currentKillRecords)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Mode standard</h2>
            <p className="mt-1 text-sm text-slate-400">When WoWtron should speak softly versus strongly.</p>
            <div className="mt-4 space-y-3 text-sm">
              <RuleLine title="Talent ready" text="8+ talent-tagged pulls and 4+ kills for the boss/spec pair." />
              <RuleLine title="Beta fallback" text="Enough boss/spec history to compare spec baselines, but still not enough to force talent-level calls." />
              <RuleLine title="Insufficient" text="Too little history even for a reliable baseline. Keep collecting before recommending." />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Boss / Spec coverage</h2>
          <p className="mt-1 text-sm text-slate-400">Which specs are ready for talent mode and which still need collection.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-3">Boss</th>
                  <th className="px-3 py-3">Spec</th>
                  <th className="px-3 py-3">Mode</th>
                  <th className="px-3 py-3">Records</th>
                  <th className="px-3 py-3">Talent-tagged</th>
                  <th className="px-3 py-3">Kills</th>
                  <th className="px-3 py-3">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {bossSpecs.map((item) => (
                  <tr key={`${String(item.bossName)}-${String(item.spec)}`} className="border-b border-slate-900">
                    <td className="px-3 py-3 text-slate-100">{String(item.bossName)}</td>
                    <td className="px-3 py-3 text-slate-300">{String(item.spec)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-fuchsia-300">{String(item.mode)}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-300">{String(item.totalRecords)}</td>
                    <td className="px-3 py-3 text-slate-300">{String(item.talentTaggedRecords)}</td>
                    <td className="px-3 py-3 text-slate-300">{String(item.killRecords)}</td>
                    <td className="px-3 py-3 text-slate-400">{String(item.recommendation)}</td>
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

function RuleLine({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="font-medium text-slate-100">{title}</p>
      <p className="mt-1 text-slate-400">{text}</p>
    </div>
  );
}
