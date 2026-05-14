import { NextRequest, NextResponse } from 'next/server';

console.log("WEBHOOK FILE LOADED");

import { getSupabaseAdmin } from '@/lib/db.server';
import { getAIResponse, buildContextPayload, type MenuItemContext } from '@/lib/whatsapp/aiService';
import { dbGetProductsServer } from '@/lib/dbServer';
import { logConversation } from '@/lib/logger';
import { extractAndSaveInsights } from '@/core/ai/memoryAgent';
import { getBotResponse } from '@/core/botEngine';
import { detectIntent } from '@/core';
import { getDBCircuitHealth, resetDBCircuits } from '@/lib/db.server';
import { eventBus } from '@/core/eventBus';
import { initShadowEngine } from '@/core/ai/shadowEngine';
import { initCommander } from '@/lib/commander';
import { updateContext, getContext } from '@/core/context';

initShadowEngine();
initCommander();

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
    console.log("[WA RAW] Payload received:", JSON.stringify(body, null, 2).slice(0, 500));
    
    if (!body.entry) {
      return NextResponse.json({ status: 'ok' });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const metadata = change.value?.metadata;
        const displayPhoneNumber = metadata?.display_phone_number;
        const messages = change.value?.messages || [];

        // 0. Resolve Tenant
        if (!displayPhoneNumber) {
           console.error("[WA] Missing display_phone_number in metadata");
           continue;
        }
        
        const { getTenantByWhatsAppNumber } = await import('@/lib/tenant/tenantResolver');
        const tenant = await getTenantByWhatsAppNumber(displayPhoneNumber);

        if (!tenant) {
          console.error(`[WA] No active tenant found for number: ${displayPhoneNumber}`);
          continue;
        }

        for (const msg of messages) {
          const from = msg.from;
          
          // Rate Limit Check (per phone number)
          if (from && !rateLimit(from, 5, 10000)) {
            console.warn("[RATE LIMIT] WhatsApp sender:", from);
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

          console.log('[WA] Processing:', { from, text: userInput, tenant: tenant.business_name });
          
          // Emit raw user message event
          eventBus.emit('USER_MESSAGE', {
            tenantId: tenant.id,
            userId: from,
            message: userInput,
            timestamp: Date.now()
          });

          // --- Debug Admin ---
          const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
          console.log('[WA DEBUG] Admin Check:', { incoming: from, expected: adminPhone, match: from === adminPhone });

          if (adminPhone && from === adminPhone) {
            const handled = await handleAdminCommand(from, userInput, tenant.whatsapp_token, metadata.phone_number_id);
            if (handled) continue;
          }

          // 2. Detect Intent
          const nlu = detectIntent(userInput);
          
          updateContext(from, { lastUserMessage: userInput, tenantId: tenant.id });

          // 3. Check if bot is paused (Human intervened)
          const ctx = getContext(from);
          if (ctx.botPaused) {
            console.log(`[WA] Bot paused for ${from}, skipping AI response.`);
            continue;
          }

          // 4. Execute brain (Multi-tenant aware)
          const output = await getBotResponse({
            message: userInput,
            phone: from,
            tenantId: tenant.id
          });

          // 5. Update context
          await logConversation({
            phone: from,
            user_message: userInput,
            bot_response: output.text,
            intent: nlu.intent,
            tenant_id: tenant.id
          });

          // Persistent memory (scoped)
          extractAndSaveInsights(from, userInput, output.text).catch((e) => 
            console.error('[WA] Insight error:', e)
          );

          // 6. Send Response — use interactive buttons if available
          await sendBotResponse(
            from,
            output,
            tenant.whatsapp_token,
            metadata.phone_number_id
          );

          // Emit bot response event
          eventBus.emit('BOT_RESPONSE', {
            tenantId: tenant.id,
            userId: from,
            response: output.text,
            intentDetected: nlu.intent,
            timestamp: Date.now()
          });
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
   Admin Commands
========================= */

async function handleAdminCommand(phone: string, text: string, token?: string, phoneNumberId?: string): Promise<boolean> {
  const command = text.toUpperCase().trim();

  if (command === 'DB STATUS') {
    const health = getDBCircuitHealth();
    const status = `📊 *DB Circuit Health*\n\n` +
      `*AI Costs:* ${health.ai_costs.state} (F: ${health.ai_costs.failuresCount}, B: ${health.ai_costs.bufferSize})\n` +
      `*AI Logs:* ${health.ai_logs.state} (F: ${health.ai_logs.failuresCount}, B: ${health.ai_logs.bufferSize})`;
    await sendWhatsAppMessage(phone, status, token, phoneNumberId);
    return true;
  }

  if (command === 'DB RESET') {
    resetDBCircuits();
    await sendWhatsAppMessage(phone, "✅ Circuit breakers manually reset to CLOSED.");
    return true;
  }

  if (command === 'ADMIN HELP' || command === 'HELP ADMIN') {
    await sendWhatsAppMessage(phone, "🛠 *Admin Commands:*\n- DB STATUS\n- DB RESET\n- TOMAR <numero>\n- CUPON10 <numero>\n- ADMIN HELP", token, phoneNumberId);
    return true;
  }

  // --- Commander Shadow Interventions ---
  if (command.startsWith('TOMAR ')) {
    const targetPhone = command.replace('TOMAR ', '').trim();
    if (!targetPhone) return false;
    
    // Pause bot for this user
    updateContext(targetPhone, { botPaused: true });
    await sendWhatsAppMessage(phone, `✅ *Modo Manual Activado*\nLa IA ha sido pausada para ${targetPhone}. Ahora puedes responderle directamente desde la plataforma (o el bot ya no le contestará si le escribes tú). Para reactivar, envía: SOLTAR ${targetPhone}`, token, phoneNumberId);
    return true;
  }

  if (command.startsWith('SOLTAR ')) {
    const targetPhone = command.replace('SOLTAR ', '').trim();
    if (!targetPhone) return false;
    
    // Resume bot for this user
    updateContext(targetPhone, { botPaused: false });
    await sendWhatsAppMessage(phone, `🤖 *IA Reactivada*\nEl bot vuelve a tomar el control para ${targetPhone}.`, token, phoneNumberId);
    return true;
  }

  if (command.startsWith('CUPON10 ')) {
    const targetPhone = command.replace('CUPON10 ', '').trim();
    if (!targetPhone) return false;
    
    // Auto-inject a discount message
    await sendWhatsAppMessage(targetPhone, "🎁 *¡Sorpresa!*\nMi supervisor Héctor me acaba de autorizar a darte un *10% de descuento* si confirmas tu pedido ahora mismo. ¿Te animas? 😉", token, phoneNumberId);
    await sendWhatsAppMessage(phone, `✅ *Cupón Enviado* a ${targetPhone}.`, token, phoneNumberId);
    return true;
  }

  return false;
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
    Send Bot Response — smart routing
================================ */

interface BotAction {
  id?: string;
  label: string;
  type: string;
  value?: string;
}

interface BotOutput {
  text: string;
  type?: string;
  actions?: BotAction[];
  ui?: { cards?: { id: string; title: string; price?: number; imageUrl?: string }[] } | null;
}

async function sendBotResponse(
  phone: string,
  output: BotOutput,
  token?: string,
  phoneNumberId?: string
): Promise<void> {
  const activeToken = token || WHATSAPP_TOKEN;
  const activeId = phoneNumberId || PHONE_NUMBER_ID;
  if (!activeToken || !activeId) return;

  const hasActions = output.actions && output.actions.length > 0;
  const hasCards = output.ui?.cards && output.ui.cards.length > 0;

  // ── Interactive buttons (up to 3) ──
  if (hasActions && output.type === 'buttons') {
    const buttons = output.actions!
      .slice(0, 3)
      .map((a) => ({
        type: 'reply' as const,
        reply: {         id: a.value || a.id || a.label.slice(0, 20), title: a.label.slice(0, 20) },
      }));

    await waFetch(activeToken, activeId, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: output.text },
        action: { buttons },
      },
    });
    return;
  }

  // ── Product list (cards → interactive list) ──
  if (hasCards && output.type === 'products') {
    const cards = output.ui!.cards!;
    await waFetch(activeToken, activeId, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: { type: 'text', text: '🔥 Snacks 911' },
        body: { text: output.text },
        action: {
          button: 'Ver opciones',
          sections: [
            {
              title: 'Productos',
              rows: cards.slice(0, 10).map((c) => ({
                id: c.id || '',
                title: `${c.title} — $${c.price || 0}`,
              })),
            },
          ],
        },
      },
    });
    return;
  }

  // ── Plain text fallback ──
  await waFetch(activeToken, activeId, {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'text',
    text: { body: output.text, preview_url: false },
  });
}

async function waFetch(token: string, phoneId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('[WA] Send failed:', { status: res.status, body: await res.text() });
    }
  } catch (error) {
    console.error('[WA] Send error:', error);
  }
}

/* =========================
    Send WhatsApp Message
================================ */

async function sendWhatsAppMessage(phone: string, text: string, token?: string, phoneNumberId?: string): Promise<boolean> {
  const activeToken = token || WHATSAPP_TOKEN;
  const activeId = phoneNumberId || PHONE_NUMBER_ID;

  if (!activeToken || !activeId) {
    console.error('[WA] Missing credentials for tenant');
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${activeId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
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
