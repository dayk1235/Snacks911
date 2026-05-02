import { NextRequest, NextResponse } from 'next/server';

console.log("WEBHOOK FILE LOADED");

import { supabaseAdmin } from '@/lib/server/supabaseServer';
import { getAIResponse, buildContextPayload, type MenuItemContext } from '@/lib/whatsapp/aiService';
import { dbGetProductsServer } from '@/lib/dbServer';
import { getBotResponse } from '@/core/botEngine';

/* =========================
   CONFIG
========================= */

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = 'v19.0';

/* =========================|
   GET — Webhook Verification
========================= */

export async function GET(req: Request) {
  console.log("WEBHOOK HIT GET");

  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  console.log({
    expected: process.env.WHATSAPP_VERIFY_TOKEN,
    received: token
  });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

/* =========================
   POST — Incoming Messages
========================= */

export async function POST(req: NextRequest) {
  console.log("WEBHOOK HIT POST");

  try {
    const body = await req.json();
    console.log('[WA] POST body:', JSON.stringify(body, null, 2));

    if (!body.entry) {
      return NextResponse.json({ status: 'ok' });
    }

    for (const entry of body.entry) {
      // Handle status updates (delivered, read, etc.)
      const statuses = entry.changes?.[0]?.value?.statuses || [];
      for (const status of statuses) {
        console.log('[WA] Status:', { id: status.id, status: status.status });
      }

      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];

        for (const msg of messages) {
          // Skip non-text messages
          if (msg.type !== 'text') {
            console.log('[WA] Skipping non-text:', msg.type);
            continue;
          }

          const messageId = msg.id;
          const from = msg.from;
          const text = msg.text?.body;

          if (!text || !from) continue;

          // DB-level deduplication
          const deduped = await deduplicateMessage(messageId, from, text);
          if (!deduped) {
            console.log('[WA] Duplicate message, skipping:', messageId);
            continue;
          }

          console.log('[WA] Processing:', { from, text });

          console.log("STEP 1: CALLING RUNBOT");

          // Deterministic response + AI fallback
          const response = await getBotResponse({
            message: text,
            phone: from
          });

          console.log("STEP 2: RUNBOT CALLED");

          console.log("[WA FINAL RESPONSE]:", response);

          // Send reply
          await sendWhatsAppMessage(from, response);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WA] Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 200 });
  }
}

/* =========================
   Deduplication (DB Unique)
========================= */

async function deduplicateMessage(messageId: string, phone: string, content: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('[WA] No supabaseAdmin client');
    return false;
  }

  const { error } = await supabaseAdmin
    .from('wa_messages')
    .insert({
      wa_message_id: messageId,
      phone_number: phone,
      direction: 'inbound',
      message_type: 'text',
      content: content,
    });

  if (error) {
    console.error('[WA] Dedup error FULL:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    // Unique violation = duplicate
    if (error.code === '23505') {
      return false;
    }
    return false;
  }

  return true;
}

/* =========================
   Deterministic Response + AI Fallback
========================= */

async function getDeterministicResponse(text: string, from: string): Promise<string> {
  const lower = text.toLowerCase();

  // Rule 1: Menu
  if (lower.includes('menu') || lower.includes('menú')) {
    return '¡Te muestro nuestro menú! 🍔\n\nAlitas BBQ - $120\nBoneless Mango Habanero - $130\nPapas Gajo Loaded - $80\nCombo 911 - $220\n\n¿Qué te gustaría ordenar?';
  }

  // Rule 2: Greeting
  if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buen dia')) {
    return '¡Hola! Bienvenido a Snacks 911 🍔\n¿Qué te gustaría pedir hoy?';
  }

  // Rule 3: Order intent
  if (lower.includes('pedido') || lower.includes('ordenar') || lower.includes('quiero') || lower.includes('me das')) {
    return '¡Excelente elección! 🔥\n¿Qué productos te gustaría ordenar?\n\nEscribe "menú" para ver nuestras opciones.';
  }

  // Rule 4: Help / Location / Hours
  if (lower.includes('ubicacion') || lower.includes('direccion') || lower.includes('donde')) {
    return 'Estamos en Av. Principal #123. 📍\nHorario: 1pm - 10pm todos los días.';
  }

  if (lower.includes('horario') || lower.includes('abierto') || lower.includes('cierran')) {
    return 'Abierto de 1pm a 10pm todos los días. 🕐\n¡Haz tu pedido ahora!';
  }

  // NO RULE MATCHED → AI Fallback (short prompt, max 240 chars)
  console.log('[WA] No rule matched, calling AI fallback...');
  try {
    const products = await dbGetProductsServer();
    const menuItems: MenuItemContext[] = products.map(p => ({
      name: p.name,
      price: p.price,
      category: p.category,
      description: p.description,
    }));

    const context = buildContextPayload(
      menuItems,
      [], // modifiers
      [], // announcements
      [], // promos
      [], // cart
      text
    );

    const aiResult = await getAIResponse(context);

    // Limit response to 240 characters max
    let message = aiResult.message_to_user || '¡Te ayudo! 🍔\nEscribe "menú" para ver nuestro catálogo.';
    if (message.length > 240) {
      message = message.substring(0, 237) + '...';
    }

    console.log('[WA] AI response:', message);
    return message;

  } catch (aiError) {
    console.error('[WA] AI fallback failed:', aiError);
    return '¡Gracias por escribirnos! 🍔\nEscribe "menú" para ver nuestro catálogo o "pedido" para hacer una orden.';
  }
}

/* =========================
   Send WhatsApp Message
========================= */

async function sendWhatsAppMessage(phone: string, text: string): Promise<boolean> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error('[WA] Missing credentials');
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const body = await response.text();

    if (!response.ok) {
      console.error('[WA] Send failed:', { status: response.status, body });
      return false;
    }

    console.log('[WA] ✅ Message sent:', response.status);
    return true;
  } catch (error) {
    console.error('[WA] Send error:', error);
    return false;
  }
}
