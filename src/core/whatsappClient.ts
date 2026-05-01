/**
 * core/whatsappClient.ts — Official WhatsApp Cloud API integration.
 * 
 * Part of Phase 3: Scale Foundation.
 * Provides a resilient client for sending messages and managing webhooks.
 */

import { CircuitBreaker } from './circuitBreaker';

const waCircuit = new CircuitBreaker();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID || '';
const API_VERSION = 'v18.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Sends a plain text message to a user.
 * 
 * Rules:
 * - Protections: Circuit Breaker included.
 * - Retries: 2 attempts on failure.
 * 
 * @param phone - Recipient phone number in E.164 format
 * @param text - Message content
 * @returns Promise<boolean> indicating success
 */
export async function sendMessage(phone: string, text: string): Promise<boolean> {
  if (!waCircuit.shouldAllowRequest()) {
    console.error('[WhatsApp] Circuit is OPEN. Request blocked.');
    return false;
  }

  const attemptSend = async (retriesRemaining: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Unknown WhatsApp API error');
      }

      waCircuit.recordSuccess();
      return true;
    } catch (error) {
      console.error(`[WhatsApp] Send attempt failed: ${error}`);
      
      if (retriesRemaining > 0) {
        console.log(`[WhatsApp] Retrying... (${retriesRemaining} left)`);
        return attemptSend(retriesRemaining - 1);
      }

      waCircuit.recordFailure();
      return false;
    }
  };

  return attemptSend(2);
}

/**
 * Configures the WhatsApp Webhook URL for receiving messages.
 * 
 * @param url - Publicly accessible webhook URL
 * @returns Promise<boolean> indicating if the webhook was set successfully
 */
export async function setWebhook(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/${PHONE_NUMBER_ID}/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        callback_url: url,
         verify_token: process.env.VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '',
        fields: ['messages'],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp] Failed to set webhook:', error);
    return false;
  }
}
