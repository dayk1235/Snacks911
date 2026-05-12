import { eventBus } from '@/core/eventBus';
import { sendMessage } from '@/core/whatsappClient';

/**
 * lib/commander.ts
 * 
 * The bridge between the Shadow Engine and the Owner's WhatsApp.
 * Formats alerts and sends them to the ADMIN_WHATSAPP_PHONE.
 */

let initialized = false;

export function initCommander() {
  if (initialized) return;
  initialized = true;

  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
  if (!adminPhone) {
    console.warn('[Commander] ADMIN_WHATSAPP_PHONE not set. Commander disabled.');
    return;
  }

  console.log('[Commander] Initialized. Listening for Shadow Engine alerts.');

  // Listen for Opportunities
  eventBus.on('OPPORTUNITY_DETECTED', async (payload) => {
    try {
      let icon = payload.score >= 80 ? '🔥' : '💡';
      if (payload.recommendedAction === 'SUGGEST_DISCOUNT') icon = '💰';

      const message = `${icon} *ALERTA DE VENTA*\n\n` +
        `*Cliente:* ${payload.userId}\n` +
        `*Motivo:* ${payload.reason}\n` +
        `*Score:* ${payload.score}/100\n\n` +
        `🛠️ *Comandos Rápidos (Responde):*\n` +
        `👉 *CUPON10 ${payload.userId}* (Ofrece 10% desc.)\n` +
        `👉 *TOMAR ${payload.userId}* (Pausar IA y hablar tú)\n` +
        `👉 *IGNORAR*`;

      await sendMessage(adminPhone, message);
    } catch (e) {
      console.error('[Commander] Error sending opportunity alert:', e);
    }
  });

  // Listen for Frustrations
  eventBus.on('FRUSTRATION_DETECTED', async (payload) => {
    try {
      const message = `🚨 *ALERTA: CLIENTE FRUSTRADO*\n\n` +
        `*Cliente:* ${payload.userId}\n` +
        `*Motivo:* ${payload.reason}\n\n` +
        `⚠️ La IA podría estar fallando con este cliente.\n\n` +
        `🛠️ *Comandos Rápidos (Responde):*\n` +
        `👉 *TOMAR ${payload.userId}* (Pausar IA y entrar tú)`;

      await sendMessage(adminPhone, message);
    } catch (e) {
      console.error('[Commander] Error sending frustration alert:', e);
    }
  });
}
