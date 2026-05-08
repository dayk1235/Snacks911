import { NextRequest, NextResponse } from 'next/server';

console.log("WEBHOOK FILE LOADED");

import { getSupabaseAdmin } from '@/lib/db.server';
import { getAIResponse, buildContextPayload, type MenuItemContext } from '@/lib/whatsapp/aiService';
import { dbGetProductsServer } from '@/lib/dbServer';
import { logConversation } from '@/lib/logger';
import { extractAndSaveInsights } from '@/core/ai/memoryAgent';
import { getBotResponse } from '@/core/botEngine';
import { detectIntent } from '@/core';

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

import { rateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  console.log("WEBHOOK HIT POST");

  try {
    const body = await req.json();
    
    if (!body.entry) {
      return NextResponse.json({ status: 'ok' });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages || [];

        for (const msg of messages) {
          const from = msg.from;
          
          // Rate Limit Check (per phone number)
          if (from && !rateLimit(from, 5, 10000)) {
            console.warn("[RATE LIMIT] WhatsApp sender:", from);
            // Return 429 to signal back-off
            return new Response("Too many requests", { status: 429 });
          }

          const messageId = msg.id;
          const text = msg.text?.body;
          const buttonId = msg?.interactive?.button_reply?.id;
          const listId = msg?.interactive?.list_reply?.id;

          if (!text && !buttonId && !listId) {
            console.log('[WA] Skipping non-text:', msg.type);
            continue;
          }

          const userInput = text || buttonId || listId;

          if (!userInput || !from) continue;

          // DB-level deduplication
          const deduped = await deduplicateMessage(messageId, from, userInput);
          if (!deduped) {
            console.log('[WA] Duplicate message, skipping:', messageId);
            continue;
          }

          // 1. Recibir mensaje (handled above in userInput)
          console.log('[WA] Processing:', { from, text: userInput });

          // 2. Detectar intent (NLU Layer)
          const nlu = detectIntent(userInput);
          console.log('[WA] Intent detected:', nlu.intent);

          // 4. Ejecutar brain unificado (Modular Pipeline)
          const output = await getBotResponse({
            message: userInput,
            phone: from
          });

          // 5. Actualizar contexto & Insights
          await logConversation({
            phone: from,
            user_message: userInput,
            bot_response: output.text,
            intent: nlu.intent
          });

          // Persistent memory insights (background)
          extractAndSaveInsights(from, userInput, output.text).catch((e) => 
            console.error('[WA] Insight error:', e)
          );

          console.log("[WA FINAL RESPONSE]:", output.text);

          // 6. Enviar respuesta
          await sendWhatsAppMessage(from, output.text);
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
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[WA] No getSupabaseAdmin() client');
    return false;
  }

  const { error } = await supabase
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
