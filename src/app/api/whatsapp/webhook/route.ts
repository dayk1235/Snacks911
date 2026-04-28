import { NextResponse } from "next/server";
import { processMessage } from "@/lib/whatsapp/botEngine";

export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "snacks911-bot-secret";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge !== null) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages?.length) {
      const message = messages[0];
      const phone = message.from;
      
      let text: string | null = null;
      if (message.type === 'text') {
        text = message.text?.body ?? null;
      } else if (message.type === 'interactive') {
        text = message.interactive?.button_reply?.id
            ?? message.interactive?.list_reply?.id
            ?? null;
      }

      if (text && phone) {
        await processMessage(phone, text);
      }
    }
  } catch (err) {
    console.error("[whatsapp webhook] POST error:", err);
  }

  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
