import { NextResponse } from 'next/server';
import { dbSaveOrder, dbGetProducts } from '@/lib/db';
import { getSession } from '@/lib/whatsappSession';
import { agentOrchestrator, runBot } from '@/core';
/* =========================
   CONFIG / HELPERS
========================= */
const UPSELLS: Record<string, any[]> = {
  boneless: [
    { id: "papas", name: "Papas", price: 45 },
    { id: "refresco", name: "Refresco", price: 25 }
  ],
  alitas: [
    { id: "papas", name: "Papas", price: 45 }
  ]
};
const PROMOS: Record<string, string> = {
  new: "🎉 10% OFF en tu primer pedido",
  casual: "🔥 Agrega papas gratis en tu pedido",
  vip: "💎 15% OFF + bebida gratis"
};
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function getCustomerData(phone: string) {
  return {
    type: 'new' as string,
    name: 'Hector',
    favorite_product: 'boneless' as string
  };
}
function getPhoneId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
}
async function sendToWhatsApp(phone: string, payload: Record<string, unknown>) {
  const phoneId = getPhoneId();
  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error('❌ WhatsApp send FAILED:', { status: response.status, body });
  } else {
    console.log('✅ WhatsApp send OK:', { status: response.status });
  }
  return { ok: response.ok, body };
}
/* =========================
   UI MESSAGES (LIST / BUTTONS)
========================= */
async function sendWhatsAppMessage(phone: string, text: string) {
  return sendToWhatsApp(phone, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: text },
  });
}
export async function sendMenuList(phone: string) {
  const products = await dbGetProducts();
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Menú Snacks 911 🍔' },
      body: { text: 'Selecciona un producto' },
      action: {
        button: 'Ver Menú',
        sections: [
          {
            title: 'Productos',
            rows: products.map(p => ({
              id: p.id,
              title: p.name,
              description: `$${p.price}`
            }))
          }
        ]
      }
    }
  };
  return sendToWhatsApp(phone, payload);
}
export async function sendConfirmButtons(phone: string) {
  return sendToWhatsApp(phone, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿Confirmar pedido?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'confirm_yes', title: 'Confirmar' } },
          { type: 'reply', reply: { id: 'confirm_no', title: 'Cancelar' } }
        ]
      }
    }
  });
}
export async function sendUpsellButtons(phone: string, items: any[]) {
  const buttons = items.slice(0, 2).map(item => ({
    type: 'reply',
    reply: { id: `upsell_${item.id}`, title: item.name }
  }));
  buttons.push({ type: 'reply', reply: { id: 'upsell_skip', title: 'No gracias' } });
  return sendToWhatsApp(phone, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿Quieres agregar algo más? 🔥' },
      action: { buttons }
    }
  });
}
export async function sendListMessage(phone: string, items: any[]) {
  return sendToWhatsApp(phone, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: 'Selecciona un producto 🍔' },
      action: {
        button: 'Ver menú',
        sections: [
          {
            title: 'Menú',
            rows: items.map(i => ({
              id: i.id,
              title: i.title,
              description: i.description
            }))
          }
        ]
      }
    }
  });
}
export async function sendButtons(phone: string, text: string, buttons: any[]) {
  return sendToWhatsApp(phone, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title }
        }))
      }
    }
  });
}
/* =========================
   WEBHOOK VERIFICATION (GET)
========================= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  console.log('WHATSAPP VERIFY:', { mode, token, expected: process.env.VERIFY_TOKEN });
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ WEBHOOK VERIFIED');
    return new Response(challenge ?? '', { status: 200 });
  }
  console.log('❌ WEBHOOK FAILED');
  return new Response('Forbidden', { status: 403 });
}
/* =========================
   INCOMING MESSAGES (POST)
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('📩 INCOMING WA BODY:', JSON.stringify(body, null, 2));
    if (!body.entry) {
      console.log('ℹ️ No entry in body');
      return NextResponse.json({ status: 'ok' });
    }
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ WHATSAPP: Missing credentials!', {
        hasToken: !!process.env.WHATSAPP_TOKEN,
        hasPhoneId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        hasPhoneIdAlt: !!process.env.WHATSAPP_PHONE_ID,
      });
    }
    const processedIds = new Set<string>();
    for (const entry of body.entry) {
      const statuses = entry.changes?.[0]?.value?.statuses || [];
      for (const status of statuses) {
        console.log('📊 STATUS UPDATE:', { id: status.id, status: status.status, recipient: status.recipient_id });
      }

      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          if (msg.id && processedIds.has(msg.id)) continue;
          if (msg.id) processedIds.add(msg.id);
          if (msg.type === 'reaction' || msg.type === 'system' || msg.type === 'unsupported') {
            console.log('⏭️ IGNORED:', { type: msg.type, from: msg.from });
            continue;
          }
          const from = msg.from;
          const session = getSession(from);
          let text = msg.text?.body;
          if (msg.interactive?.list_reply?.id) {
            text = "__SELECT__:" + msg.interactive.list_reply.id;
          } else if (msg.interactive?.button_reply?.id) {
            text = "__BTN__:" + msg.interactive.button_reply.id;
          }
          if (!text) continue;
          console.log('📨 MESSAGE:', { from, text });
          const result = await runBot({
            channel: "WHATSAPP",
            message: text,
            phone: from
          });
          console.log('🤖 BOT RESULT:', result);
          if (result.type === "list") {
            await sendListMessage(from, result.data);
          } else if (result.type === "buttons") {
            await sendButtons(from, result.text, result.data);
          } else {
            await sendWhatsAppMessage(from, result.text);
          }
        }
      }
    }
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}