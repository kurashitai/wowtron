import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  buildBuildSignificanceReport,
  type BuildComparisonHistoricalRecord,
  type BuildComparisonPlayerInput,
} from '@/lib/platform-improvement/build-significance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bossName = typeof body?.bossName === 'string' ? body.bossName : '';
    const difficulty = typeof body?.difficulty === 'string' ? body.difficulty : undefined;
    const currentPlayers = Array.isArray(body?.players) ? (body.players as BuildComparisonPlayerInput[]) : [];

    if (!bossName) {
      return NextResponse.json({ error: 'Missing bossName' }, { status: 400 });
    }

    if (currentPlayers.length === 0) {
      return NextResponse.json({ error: 'Missing players' }, { status: 400 });
    }

    const client = db as any;
    if (!client?.$queryRawUnsafe) {
      return NextResponse.json({ error: 'Database store is not available for build significance.' }, { status: 503 });
    }

    const sql = `
      SELECT
        fpr."name",
        fpr."role",
        fpr."className",
        fpr."spec",
        fr."difficulty",
        fpr."talents",
        fpr."buildSignature",
        fpr."buildSource",
        fpr."rankPercent",
        fpr."activeTime",
        fpr."deaths",
        fpr."reliabilityScore",
        fr."kill"
      FROM "fight_player_records" fpr
      INNER JOIN "fight_records" fr ON fr."key" = fpr."fightKey"
      WHERE fr."bossName" = $1
      ${difficulty ? 'AND fr."difficulty" = $2' : ''}
    `;
    let records = difficulty
      ? await client.$queryRawUnsafe(sql, bossName, difficulty)
      : await client.$queryRawUnsafe(sql, bossName);
    if (difficulty && Array.isArray(records) && records.length === 0) {
      records = await client.$queryRawUnsafe(
        `
          SELECT
            fpr."name",
            fpr."role",
            fpr."className",
            fpr."spec",
            fr."difficulty",
            fpr."talents",
            fpr."buildSignature",
            fpr."buildSource",
            fpr."rankPercent",
            fpr."activeTime",
            fpr."deaths",
            fpr."reliabilityScore",
            fr."kill"
          FROM "fight_player_records" fpr
          INNER JOIN "fight_records" fr ON fr."key" = fpr."fightKey"
          WHERE fr."bossName" = $1
        `,
        bossName
      );
    }

    const historicalRecords: BuildComparisonHistoricalRecord[] = (records as any[]).map((record) => ({
      name: record.name,
      role: record.role,
      className: record.className,
      spec: record.spec,
      difficulty: record.difficulty || undefined,
      talents: Array.isArray(record.talents) ? record.talents : [],
      buildSignature: record.buildSignature || undefined,
      buildSource: record.buildSource || undefined,
      rankPercent: Number(record.rankPercent || 0),
      activeTime: Number(record.activeTime || 0),
      deaths: Number(record.deaths || 0),
      reliabilityScore: record.reliabilityScore ?? undefined,
      kill: Boolean(record.kill),
    }));

    const report = buildBuildSignificanceReport({
      bossName,
      requestedDifficulty: difficulty,
      currentPlayers,
      historicalRecords,
    });

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to build significance report.' },
      { status: 500 }
    );
  }
}
