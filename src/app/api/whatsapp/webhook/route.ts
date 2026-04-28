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
    console.log("[whatsapp webhook] INCOMING PAYLOAD:", JSON.stringify(body, null, 2));

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (messages && messages.length > 0) {
      const message = messages[0];
      const phone = message.from;
      
      let text = "Mensaje no soportado";
      if (message.type === 'text') {
        text = message.text?.body ?? "";
      } else if (message.type === 'interactive') {
        text = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id ?? "";
      }

      if (phone) {
        // Direct fetch reply (Requirement 3 & 4)
        const phoneId = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
        const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
        
        if (phoneId && token) {
          await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              text: { body: "¡Recibí tu mensaje en Vercel! Pasando al bot..." }
            })
          }).catch(err => console.error("[whatsapp webhook] Direct fetch error:", err));
        }

        // Pass to complex bot engine
        await processMessage(phone, text);
      }
    }
  } catch (err) {
    console.error("[whatsapp webhook] POST handler error:", err);
  }

  // Requirement 7: Always return 200 OK
  return new Response("OK", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
