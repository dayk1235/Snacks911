/**
 * Centralized alerting system.
 * Sends notifications to external webhooks (Slack, Discord, etc.)
 */
export async function sendAlert(message: string) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn("[ALERT] ALERT_WEBHOOK_URL not configured. Message:", message);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message })
    });

    if (!response.ok) {
      console.error("[ALERT FAILED]", response.status, await response.text());
    } else {
      console.log("[ALERT SENT] Message:", message.split('\n')[0]);
    }
  } catch (e) {
    console.error("[ALERT EXCEPTION]", e);
  }
}
