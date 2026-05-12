import { sendMessage } from '@/core/whatsappClient';

/**
 * Centralized alerting system.
 * Sends notifications to external webhooks (Slack, Discord, etc.)
 * AND optionally to the admin via WhatsApp.
 */
export async function sendAlert(message: string) {
  if (process.env.NODE_ENV === 'test') return;

  // 1. Webhook Alert (Slack/Discord)
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message })
      });
    } catch (e) {
      console.error("[ALERT WEBHOOK EXCEPTION]", e);
    }
  }

  // 2. WhatsApp Admin Alert
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
  if (adminPhone) {
    try {
      await sendMessage(adminPhone, message);
    } catch (e) {
      console.error("[ALERT WA EXCEPTION]", e);
    }
  }

  // 3. Console fallback if no alerts configured
  if (!webhookUrl && !adminPhone) {
    console.warn("[ALERT] No notification channels configured. Message:", message);
  }
}
