import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return NextResponse.json(
      { ok: false, error: 'DISCORD_WEBHOOK_URL is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ ok: false, error: 'Missing brief content' }, { status: 400 });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: `Discord webhook failed (${response.status})` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Failed to post raid brief' },
      { status: 500 }
    );
  }
}
