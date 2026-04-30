import { NextResponse } from 'next/server';
import { dbSaveOrder, dbGetProducts } from '@/lib/db';
import { getSession } from '@/lib/whatsappSession';
import { agentOrchestrator, runBot } from '@/core';

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
  // Mocking DB call - should use supabase.from('customers').select('name, total_orders, favorite_product').eq('phone', phone).single()
  return { 
    type: 'new' as string, 
    name: 'Hector',
    favorite_product: 'boneless' as string
  };
}

async function sendWhatsAppMessage(phone: string, text: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: text },
    }),
  });
}

export async function sendMenuList(phone: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
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

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function sendConfirmButtons(phone: string) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
  const payload = {
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
  };

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function sendUpsellButtons(phone: string, items: any[]) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
  
  const buttons = items.slice(0, 2).map(item => ({
    type: 'reply',
    reply: {
      id: `upsell_${item.id}`,
      title: item.name
    }
  }));

  buttons.push({
    type: 'reply',
    reply: {
      id: 'upsell_skip',
      title: 'No gracias'
    }
  });

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '¿Quieres agregar algo más? 🔥' },
      action: {
        buttons
      }
    }
  };

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function sendListMessage(phone: string, items: any[]) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
  const payload = {
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
  };

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function sendButtons(phone: string, text: string, buttons: any[]) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: {
            id: b.id,
            title: b.title
          }
        }))
      }
    }
  };

  await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.entry) return NextResponse.json({ status: 'ok' });

    const processedIds = new Set<string>();

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];
        for (const msg of messages) {
          if (msg.id && processedIds.has(msg.id)) continue;
          if (msg.id) processedIds.add(msg.id);

          const from = msg.from;
          const session = getSession(from);

          let text = msg.text?.body;
          
          if (msg.interactive?.list_reply?.id) {
            text = "__SELECT__:" + msg.interactive.list_reply.id;
          } else if (msg.interactive?.button_reply?.id) {
            text = "__BTN__:" + msg.interactive.button_reply.id;
          }

          if (!text) continue;

          const result = await runBot({
            channel: "WHATSAPP",
            message: text,
            phone: from
          });

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
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

