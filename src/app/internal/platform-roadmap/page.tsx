import Link from 'next/link';
import { loadPriorityBacklogPayload, loadReviewCadencePayload } from '@/lib/platform-improvement/health';

export default async function PlatformRoadmapPage() {
  const [backlog, cadence] = await Promise.all([
    loadPriorityBacklogPayload(),
    loadReviewCadencePayload(),
  ]);

  const items = (backlog?.items as Array<Record<string, unknown>>) || [];
  const weekly = (cadence?.weekly as Record<string, unknown>) || {};
  const biweekly = (cadence?.biweekly as Record<string, unknown>) || {};
  const monthly = (cadence?.monthly as Record<string, unknown>) || {};

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Internal</p>
            <h1 className="text-4xl font-semibold">Platform Roadmap</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Data-driven backlog and review cadence for the analyzer. This is where coverage, calibration and output quality become product priorities.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/internal/analyzer-health" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Analyzer Health
            </Link>
            <Link href="/internal/build-significance-health" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Build Significance
            </Link>
            <Link href="/" className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">
              Back to WoWtron
            </Link>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-semibold">Priority backlog</h2>
            <p className="mt-1 text-sm text-slate-400">Automatically ranked from calibration, coverage quality, gap state and output quality.</p>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={String(item.key)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-100">{String(item.title)}</p>
                      <p className="mt-1 text-sm text-slate-400">{String(item.rationale)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-800 px-2 py-1">{String(item.category)}</span>
                        {item.bossName ? <span className="rounded-full bg-slate-800 px-2 py-1">{String(item.bossName)}</span> : null}
                        <span className="rounded-full bg-slate-800 px-2 py-1">score {String(item.priorityScore)}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-cyan-950 px-3 py-1 text-xs text-cyan-300">{String(item.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <CadenceCard title="Weekly" goal={String(weekly.goal || '')} items={(weekly.checklist as string[]) || []} />
            <CadenceCard title="Biweekly" goal={String(biweekly.goal || '')} items={(biweekly.checklist as string[]) || []} />
            <CadenceCard title="Monthly" goal={String(monthly.goal || '')} items={(monthly.checklist as string[]) || []} />
          </div>
        </section>
      </div>
    </main>
  );
}

function CadenceCard({ title, goal, items }: { title: string; goal: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{goal}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item} className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
