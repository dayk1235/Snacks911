/**
 * lib/reviews/reviewEngine.ts
 *
 * Post-delivery review engine for Snacks 911.
 *
 * Flow:
 *   1. Scheduler finds delivered orders (+40min)
 *   2. Sends buildReviewRequestMessage
 *   3. Customer replies with 1-5
 *   4. processRatingResponse:
 *      - 4-5★ → Send Google link
 *      - 1-3★ → Ask why + Escalate to owner
 */

import { getSupabaseAdmin } from '@/lib/db.server';
import { sendText } from '@/lib/whatsapp/metaClient';
import { normalizeText } from '@/lib/utils/core';

const GOOGLE_MAPS_REVIEW_URL = process.env.GOOGLE_MAPS_REVIEW_URL || 'https://g.page/r/YOUR_LINK/review';
const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || '521234567890'; // Use international format without +

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewResponse {
  rating: number;
  nextAction: 'send_google_link' | 'escalate' | 'ask_comment' | 'none';
  message: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function buildReviewRequestMessage(customerName: string): string {
  const name = customerName ? ` *${customerName}*` : '';
  return [
    `👋 ¡Hola${name}! Esperamos que hayas disfrutado tus Snacks 911. 🍟✨`,
    '',
    `¿Cómo calificarías tu experiencia hoy?`,
    '',
    `1️⃣ 😤 (Muy mala)`,
    `2️⃣ 😕 (Mala)`,
    `3️⃣ 😊 (Regular)`,
    `4️⃣ 😄 (Buena)`,
    `5️⃣ 🤩 (¡Excelente!)`,
    '',
    `Responde con un número del *1 al 5*.`,
  ].join('\n');
}

export function buildGoogleReviewMessage(): string {
  return [
    `✨ ¡Qué alegría que te haya gustado! ✨`,
    '',
    `Nos ayudaría muchísimo si nos regalas una reseña en Google. ¡Nos motiva a seguir mejorando! 🙏`,
    '',
    `🔗 ${GOOGLE_MAPS_REVIEW_URL}`,
    '',
    `¡Gracias por ser parte de Snacks 911! 🤘`,
  ].join('\n');
}

export function buildEscalationFollowupMessage(): string {
  return [
    `🙏 Lamentamos mucho que tu experiencia no haya sido perfecta.`,
    '',
    `¿Podrías contarnos brevemente qué falló? Tu comentario será enviado directamente al dueño para corregirlo de inmediato.`,
  ].join('\n');
}

// ─── Processing ───────────────────────────────────────────────────────────────

/**
 * Processes the user's rating reply.
 * Returns rating, action, and the message to send back.
 */
export async function processRatingResponse(
  userId: string,
  orderId: string,
  message: string
): Promise<ReviewResponse> {
  const normalized = normalizeText(message.trim());
  const ratingMatch = normalized.match(/\b([1-5])\b/);

  if (!ratingMatch) {
    return {
      rating: 0,
      nextAction: 'none',
      message: 'Por favor, responde con un número del *1 al 5* para calificar tu pedido. 🙏',
    };
  }

  const rating = parseInt(ratingMatch[1]);
  const supabase = getSupabaseAdmin();

  // Save rating to order
  await supabase
    .from('orders')
    .update({ rating })
    .eq('id', orderId);

  if (rating >= 4) {
    return {
      rating,
      nextAction: 'send_google_link',
      message: buildGoogleReviewMessage(),
    };
  } else {
    return {
      rating,
      nextAction: 'ask_comment',
      message: buildEscalationFollowupMessage(),
    };
  }
}

/**
 * Escalates a negative review to the owner via WhatsApp.
 */
export async function escalateToOwner(
  orderId: string,
  rating: number,
  comment: string,
  customerPhone: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Update DB
    await supabase
      .from('orders')
      .update({ 
        review_comment: comment,
        review_escalated: true 
      })
      .eq('id', orderId);

    // Send WhatsApp to owner
    const alertMsg = [
      `🚨 *ALERTA DE RESEÑA NEGATIVA* 🚨`,
      '',
      `Pedido: \`${orderId}\``,
      `Cliente: ${customerPhone}`,
      `Calificación: *${rating}/5* ⭐`,
      '',
      `*Comentario:*`,
      `_"${comment}"_`,
      '',
      `Favor de contactar al cliente para resolverlo.`,
    ].join('\n');

    await sendText(OWNER_WHATSAPP, alertMsg);
    console.log(`[reviewEngine] Escalated order ${orderId} to owner.`);

  } catch (err) {
    console.error('[reviewEngine] escalateToOwner error:', err);
  }
}
