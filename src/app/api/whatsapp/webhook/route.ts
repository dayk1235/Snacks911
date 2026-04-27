// Force Node.js runtime (NOT edge) to avoid any runtime quirks
export const runtime = 'nodejs';
// Disable caching — Meta must always get a fresh response
export const dynamic = 'force-dynamic';

import { processMessage } from '@/lib/whatsapp/botEngine';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'snacks911-bot-secret';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      // Return EXACT challenge string — no JSON, no quotes, no whitespace
      return new Response(String(challenge), {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Meta health-check or unknown call — always 200
    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return new Response('OK', { status: 200 });
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    const entry   = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    // Skip delivery/read status updates
    if (!value?.messages?.length) {
      return new Response('OK', { status: 200 });
    }

    const message = value.messages[0];
    const phone   = message?.from;
    let text: string | null = null;

    if (message?.type === 'text') {
      text = message.text?.body ?? null;
    } else if (message?.type === 'interactive') {
      text = message.interactive?.button_reply?.id
          ?? message.interactive?.list_reply?.id
          ?? null;
    }

    if (text && phone) {
      processMessage(phone, text).catch(err =>
        console.error('[webhook] processMessage error:', err)
      );
    }
  } catch (err) {
    console.error('[webhook] POST error:', err);
  }

  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
