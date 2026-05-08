import { detectIntent } from './intentDetector';
import { getBotResponse } from './botEngine';
import { getCustomerProfile } from './customerProfileStore';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

interface CacheEntry {
  response: string;
  created_at: string;
}

async function getFromCache(key: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('ai_cache')
    .select('response, created_at')
    .eq('key', key)
    .single();

  if (error || !data) return null;

  const createdAt = new Date(data.created_at).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if (now - createdAt > twentyFourHours) {
    return null;
  }

  try {
    return JSON.parse(data.response);
  } catch {
    return data.response;
  }
}

async function saveToCache(key: string, response: any): Promise<void> {
  const responseStr = typeof response === 'string' ? response : JSON.stringify(response);
  await supabase
    .from('ai_cache')
    .upsert({ key, response: responseStr, created_at: new Date().toISOString() });
}

async function logCostEvent(event: string, cost: number): Promise<void> {
  await supabase
    .from('cost_events')
    .insert({ event, cost, created_at: new Date().toISOString() });
}

const STATIC_RESPONSES: Record<string, (profile: any) => string> = {
  'saludo': (profile) => `¡Hola ${profile?.name || 'amigo'}! 🍿 Bienvenido a Snacks 911. ¿En qué podemos ayudarte hoy?`,
  'pedir_menu': (profile) => `¡Claro, ${profile?.name || 'amigo'}! Aquí tienes nuestro menú completo: [Link al Menú] 📋`,
  'despedida': (profile) => `¡Hasta pronto, ${profile?.name || 'amigo'}! Que tengas un excelente día. ✌️`,
};

const INTENT_MAPPING: Record<string, string> = {
  'gratitud': 'saludo',
  'exploracion': 'pedir_menu',
  'despedida': 'despedida',
  'duda': 'duda_producto',
  'pedido': 'intencion_pedido',
  'complaint': 'queja',
};

export async function getCostEfficientResponse(userMessage: string, phone: string): Promise<any> {
  const { intent: rawIntent } = detectIntent(userMessage);
  const intent = INTENT_MAPPING[rawIntent] || rawIntent;

  if (['saludo', 'pedir_menu', 'despedida'].includes(intent)) {
    const profile = await getCustomerProfile(phone);
    const text = STATIC_RESPONSES[intent as keyof typeof STATIC_RESPONSES](profile);
    return { text, intent, type: 'text' };
  }

  const cacheKey = crypto.createHash('sha256').update(userMessage.substring(0, 50)).digest('hex');
  const cachedResponse = await getFromCache(cacheKey);
  if (cachedResponse) return cachedResponse;

  if (['duda_producto', 'intencion_pedido', 'queja'].includes(intent)) {
    const response = await getBotResponse({ message: userMessage, phone });
    await logCostEvent('ai_response', 1);
    await saveToCache(cacheKey, response);
    return response;
  }

  // Fallback for other intents not handled by static or specific AI categories
  return await getBotResponse({ message: userMessage, phone });
}
