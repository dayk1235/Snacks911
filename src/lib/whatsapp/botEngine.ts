/**
 * botEngine.ts
 * The main brain — receives an incoming WhatsApp message,
 * detects intent, routes to the right handler, and sends a response.
 * Defensive: NEVER throws. All DB calls are optional-chained with fallbacks.
 */

import { detectIntent } from './intentDetector';
import {
  getSession, updateState, addToCart, removeFromCart,
  setSauceOnLastItem, formatCartText, logEvent,
  incrementUnknown, resetUnknown, clearCart, type CartItem
} from './sessionManager';
import { SALES_PLAYBOOKS, getRecommendation } from './salesPlaybooks';
import {
  sendText, sendMainMenu, sendSauceSelector,
  sendUpsellOffer, sendHandoffMessage, sendButtons
} from './metaClient';
import { getAIResponse, buildContextPayload, type MenuItemContext } from './aiService';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';

const db = () => supabaseAdmin ?? supabaseAnon ?? null;

// ── Fetch live DB context for AI calls ────────────────────────────────────
async function fetchMenuContext(): Promise<MenuItemContext[]> {
  try {
    const client = db();
    if (!client) return [];
    const { data } = await client
      .from('products')
      .select('name, price, category, description_short, is_best_seller')
      .eq('is_active', true)
      .order('is_best_seller', { ascending: false });
    return (data ?? []).map((p: any) => ({
      name:        p?.name              ?? '',
      price:       p?.price             ?? 0,
      category:    p?.category          ?? '',
      description: p?.description_short ?? '',
      best_seller: p?.is_best_seller    ?? false,
    }));
  } catch { return []; }
}

async function fetchProductPrice(productName: string): Promise<number> {
  try {
    const client = db();
    if (!client) return 0;
    const keyword = productName?.split(' ')?.[0] ?? productName;
    const { data } = await client
      .from('products')
      .select('price')
      .ilike('name', `%${keyword}%`)
      .single();
    return data?.price ?? 0;
  } catch { return 0; }
}

async function productRequiresSauce(productName: string): Promise<boolean> {
  try {
    const client = db();
    if (!client) return false;
    const keyword = productName?.split(' ')?.[0] ?? productName;
    const { data } = await client
      .from('products')
      .select('requires_sauce')
      .ilike('name', `%${keyword}%`)
      .single();
    return data?.requires_sauce ?? false;
  } catch { return false; }
}

async function fetchFaq(key: string): Promise<string | null> {
  try {
    const client = db();
    if (!client) return null;
    const { data } = await client.from('faqs').select('value').eq('key', key).single();
    return data?.value ?? null;
  } catch { return null; }
}

async function fetchActivePromos(): Promise<string[]> {
  try {
    const client = db();
    if (!client) return [];
    const now = new Date().toISOString();
    const { data } = await client
      .from('promos')
      .select('title')
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`);
    return (data ?? []).map((p: any) => p?.title ?? '').filter(Boolean);
  } catch { return []; }
}

async function fetchAnnouncements(): Promise<string[]> {
  try {
    const client = db();
    if (!client) return [];
    const now = new Date().toISOString();
    const { data } = await client
      .from('announcements')
      .select('text')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gte.${now}`);
    return (data ?? []).map((a: any) => a?.text ?? '').filter(Boolean);
  } catch { return []; }
}

async function fetchCategoryProducts(category: string): Promise<string> {
  try {
    const client = db();
    if (!client) return 'No disponible por el momento.';
    const { data } = await client
      .from('products')
      .select('name, price, description_short, is_best_seller')
      .eq('category', category)
      .eq('is_active', true)
      .order('is_best_seller', { ascending: false });
    if (!data || data.length === 0) return 'No hay productos disponibles en esta categoría.';
    return data.map((p: any) =>
      `${p?.is_best_seller ? '⭐ ' : ''}${p?.name ?? '?'} — $${p?.price ?? 0}${p?.description_short ? '\n   _' + p.description_short + '_' : ''}`
    ).join('\n');
  } catch { return 'No disponible por el momento.'; }
}

// ── Map interactive button/list reply IDs to text commands ───────────────
// Declared BEFORE processMessage so it is hoisted and callable inside.
function mapButtonReply(text: string): string | null {
  const map: Record<string, string> = {
    'cat_COMBOS':           'combos',
    'cat_PROTEINA':         'proteina',
    'cat_PAPAS':            'papas',
    'cat_BANDERILLAS':      'banderillas',
    'cat_BEBIDAS':          'bebidas',
    'cat_EXTRAS':           'extras',
    'intent_PROMOS':        'promos',
    'intent_RECOMMEND':     '¿qué me recomiendas?',
    'intent_VIEW_CART':     'mi carrito',
    'intent_SHOW_MENU':     'menú',
    'intent_CONFIRM':       'confirmar',
    'sauce_BBQ':            'BBQ',
    'sauce_Mango_Habanero': 'Mango Habanero',
    'sauce_NONE':           'sin salsa',
    'upsell_YES':           'cámbialo a combo',
    'upsell_NO':            'no gracias',
    'checkout_PICKUP':      'paso por él',
    'checkout_DELIVERY':    'delivery',
  };
  return map[text ?? ''] ?? null;
}

// ── Main engine ───────────────────────────────────────────────────────────
export async function processMessage(phone: string, rawText: string): Promise<void> {
  // ── Req 1: Log every incoming message ──────────────────────────────────
  console.log('[botEngine] BOT INPUT:', { phone: phone ?? 'unknown', text: rawText ?? '' });

  try {
    // ── Button/list reply IDs resolved first (before any DB calls) ───────
    const mapped = mapButtonReply(rawText ?? '');
    if (mapped) {
      console.log('[botEngine] Button reply mapped:', rawText, '->', mapped);
      await processMessage(phone, mapped);
      return;
    }

    // ── Session (safe default if DB fails) ────────────────────────────────
    const session = await getSession(phone).catch((err) => {
      console.error('[botEngine] getSession failed:', err);
      return null;
    });
    const cart  = session?.cart_data ?? [];
    const state = session?.state     ?? 'S0_IDLE';
    console.log('[botEngine] SESSION STATE:', { phone, state, cartItems: cart?.length ?? 0 });

    // ── Intent detection ──────────────────────────────────────────────────
    const detection = detectIntent(rawText ?? '');
    const intent    = detection?.intent     ?? 'UNKNOWN';
    const entities  = detection?.entities   ?? {};
    const confidence = detection?.confidence ?? 'LOW';
    console.log('[botEngine] INTENT DETECTED:', { intent, confidence, entities });

    if (intent !== 'UNKNOWN') {
      await resetUnknown(phone).catch(() => null);
    }

    console.log('[botEngine] ROUTING TO HANDLER:', intent);
    switch (intent) {

      // ── Menu browsing ─────────────────────────────────────────────────
      case 'SHOW_MENU': {
        await updateState(phone, 'S1_BROWSING_MENU').catch(() => null);
        await sendMainMenu(phone);
        break;
      }

      case 'SHOW_CATEGORY': {
        const cat      = (entities?.category as string) ?? '';
        const products = await fetchCategoryProducts(cat);
        const catName: Record<string, string> = {
          COMBOS:      '🍗 Combos',
          PROTEINA:    '💪 Proteína',
          PAPAS:       '🍟 Papas',
          BANDERILLAS: '🌮 Banderillas & Dedos',
          BEBIDAS:     '🥤 Bebidas',
          EXTRAS:      '🧀 Extras',
        };
        await updateState(phone, 'S1_BROWSING_MENU').catch(() => null);
        await sendText(phone, `*${catName[cat] ?? cat}*\n\n${products}\n\n¿Te anoto algo? 📝`);
        break;
      }

      case 'PRODUCT_INFO': {
        const product = (entities?.product as string) ?? '';
        if (!product) {
          await sendText(phone, '¿De qué producto quieres info? 🤔');
          break;
        }
        const client = db();
        if (!client) {
          await sendText(phone, `No puedo consultar info ahora mismo. Escribe *menú* para ver opciones.`);
          break;
        }
        const keyword = product?.split(' ')?.[0] ?? product;
        let productData: { name: string; price: number; description_short: string } | null = null;
        try {
          const { data } = await client
            .from('products')
            .select('name, price, description_short')
            .ilike('name', `%${keyword}%`)
            .single();
          productData = data ?? null;
        } catch { productData = null; }
        if (productData) {
          await sendText(phone, `*${productData?.name ?? product}* — $${productData?.price ?? 0}\n${productData?.description_short ?? ''}\n\n¿Te lo agrego? 🔥`);
        } else {
          await sendText(phone, `No encontré "${product}" en el menú. ¿Te muestro el menú completo?`);
        }
        break;
      }

      // ── Cart building ─────────────────────────────────────────────────
      case 'ADD_TO_CART': {
        const product = (entities?.product as string) ?? '';
        const qty     = (entities?.qty     as number) ?? 1;
        if (!product) {
          await sendText(phone, '¿Qué producto quieres? Te muestro el menú si quieres 📋');
          break;
        }
        const price         = await fetchProductPrice(product);
        const requiresSauce = await productRequiresSauce(product);
        const item: CartItem = { product, qty, unit_price: price };
        await addToCart(phone, item).catch(() => null);
        await logEvent(phone, 'order_started', { product, qty }).catch(() => null);

        if (requiresSauce) {
          await updateState(phone, 'S3_NEED_SAUCE').catch(() => null);
          await sendSauceSelector(phone, product);
        } else {
          await updateState(phone, 'S2_BUILDING_CART').catch(() => null);
          const playbook = SALES_PLAYBOOKS?.[product] ?? null;
          if (playbook && playbook.length > 0 && playbook[0]?.type === 'COMBO_UPGRADE') {
            await updateState(phone, 'S4_UPSELL_OFFER').catch(() => null);
            await logEvent(phone, 'upsell_shown', { product, offer: playbook[0]?.intent_key }).catch(() => null);
            await sendUpsellOffer(phone, playbook[0]?.message ?? '');
          } else {
            await sendText(phone, `✅ Agregado: ${qty}x ${product}\n\n¿Algo más o confirmamos tu pedido?`);
            await sendButtons(phone, '¿Qué sigue?', [
              { id: 'intent_VIEW_CART', title: '🛒 Ver carrito' },
              { id: 'intent_SHOW_MENU', title: '📋 Ver menú' },
              { id: 'intent_CONFIRM',   title: '✅ Confirmar' },
            ]);
          }
        }
        break;
      }

      case 'SELECT_SAUCE': {
        const sauce   = (entities?.sauce as string) ?? 'BBQ';
        const newCart = await setSauceOnLastItem(phone, sauce).catch(() => cart);
        await updateState(phone, 'S2_BUILDING_CART').catch(() => null);
        const lastItem = newCart?.[newCart.length - 1] ?? null;
        const playbook = lastItem ? (SALES_PLAYBOOKS?.[lastItem.product] ?? null) : null;
        if (playbook && playbook[0]?.type === 'COMBO_UPGRADE') {
          await updateState(phone, 'S4_UPSELL_OFFER').catch(() => null);
          await logEvent(phone, 'upsell_shown', { product: lastItem?.product }).catch(() => null);
          await sendUpsellOffer(phone, playbook[0]?.message ?? '');
        } else {
          await sendText(phone, `🌶️ Salsa ${sauce} anotada.\n¿Algo más o confirmamos?`);
          await sendButtons(phone, '¿Qué sigue?', [
            { id: 'intent_VIEW_CART', title: '🛒 Ver carrito' },
            { id: 'intent_SHOW_MENU', title: '📋 Ver menú' },
            { id: 'intent_CONFIRM',   title: '✅ Confirmar' },
          ]);
        }
        break;
      }

      case 'UPSELL_COMBO': {
        if (cart.length > 0) {
          const last     = cart[cart.length - 1];
          const playbook = SALES_PLAYBOOKS?.[last?.product ?? ''] ?? null;
          const upgrade  = playbook?.[0]?.upgrade_to ?? null;
          if (upgrade) {
            const newPrice = await fetchProductPrice(upgrade);
            const newCart  = [...cart.slice(0, -1), { ...last, product: upgrade, unit_price: newPrice }];
            const client   = db();
            if (client) {
              await client.from('wa_sessions').upsert({ phone_number: phone, cart_data: newCart }).catch(() => null);
            }
            await logEvent(phone, 'upsell_accepted', { from: last?.product, to: upgrade }).catch(() => null);
            await updateState(phone, 'S2_BUILDING_CART').catch(() => null);
            await sendText(phone, `✅ Cambiado a *${upgrade}* — $${newPrice}\n¿Algo más?`);
          }
        } else {
          await sendText(phone, '¿Qué producto quieres convertir a combo? 🤔');
        }
        break;
      }

      case 'VIEW_CART': {
        const text = formatCartText(cart);
        await sendText(phone, `🛒 *Tu pedido actual:*\n\n${text}`);
        if (cart.length > 0) {
          await sendButtons(phone, '¿Qué hacemos?', [
            { id: 'intent_CONFIRM',   title: '✅ Confirmar pedido' },
            { id: 'intent_SHOW_MENU', title: '📋 Agregar más' },
          ]);
        }
        break;
      }

      case 'EDIT_CART': {
        const remove = entities?.remove as string | undefined;
        if (remove) {
          const updated = await removeFromCart(phone, remove).catch(() => cart);
          await sendText(phone, `❌ Eliminado: ${remove}\n\n${formatCartText(updated)}`);
        } else {
          const menuItems = await fetchMenuContext();
          const aiRes = await getAIResponse(
            buildContextPayload(menuItems, [], [], [], cart, rawText)
          ).catch(() => ({ message_to_user: '¿Qué quieres cambiar del carrito?', intent_suggestion: 'ASK_MISSING_INFO' as const }));
          await sendText(phone, aiRes?.message_to_user ?? '¿Qué quieres cambiar del carrito?');
        }
        break;
      }

      // ── Checkout flow ─────────────────────────────────────────────────
      case 'CONFIRM_ORDER': {
        if (!cart || cart.length === 0) {
          await sendText(phone, 'Tu carrito está vacío 😅 ¿Te muestro el menú?');
          break;
        }
        const summary = formatCartText(cart);
        await updateState(phone, 'S5_CONFIRM').catch(() => null);
        await sendText(phone, `📋 *Resumen de tu pedido:*\n\n${summary}`);
        await sendButtons(phone, '¿Es para pickup o delivery?', [
          { id: 'checkout_PICKUP',   title: '🏃 Pickup (paso yo)' },
          { id: 'checkout_DELIVERY', title: '🛵 Delivery (me lo mandan)' },
        ]);
        break;
      }

      case 'CHECKOUT': {
        const delivery_type  = entities?.delivery_type  as string | undefined;
        const payment_method = entities?.payment_method as string | undefined;
        if (delivery_type) {
          await updateState(phone, 'S6_CHECKOUT').catch(() => null);
          if (delivery_type === 'DELIVERY') {
            await sendText(phone, '📍 ¿A qué dirección te lo enviamos?');
          } else {
            await sendText(phone, '🏃 Perfecto, vienes por él. ¿Cómo quieres pagar?\n• Efectivo 💵\n• Tarjeta 💳\n• Transferencia 📲');
          }
        } else if (payment_method) {
          const total  = cart.reduce((s, i) => s + ((i?.unit_price ?? 0) * (i?.qty ?? 1)), 0);
          const client = db();
          if (client) {
            await client.from('orders').insert({
              channel:        'WHATSAPP',
              status:         'CONFIRMED',
              customer_phone: phone,
              payment_method,
              total,
            }).catch(() => null);
          }
          await logEvent(phone, 'order_completed', { total, payment_method }).catch(() => null);
          await clearCart(phone).catch(() => null);
          await sendText(phone, `🔥 *¡Pedido confirmado!*\n\nTotal: $${total}\nPago: ${payment_method}\n\nTe avisamos cuando esté listo. ¡Gracias por elegir Snacks 911! 🙌`);
        } else {
          await sendText(phone, '¿Cómo quieres recibir tu pedido? ¿Pickup o delivery? 🤔');
        }
        break;
      }

      // ── FAQs ──────────────────────────────────────────────────────────
      case 'HOURS': {
        const ans = await fetchFaq('HOURS');
        await sendText(phone, `🕐 *Horarios:*\n${ans ?? 'Abrimos de Lunes a Domingo de 1pm a 10pm.'}`);
        break;
      }
      case 'LOCATION': {
        const ans = await fetchFaq('LOCATION');
        await sendText(phone, `📍 *Ubicación:*\n${ans ?? 'Consulta nuestra ubicación en Google Maps como Snacks 911.'}`);
        break;
      }
      case 'DELIVERY_INFO': {
        const ans = await fetchFaq('DELIVERY');
        await sendText(phone, `🛵 *Delivery:*\n${ans ?? 'Hacemos entrega en zona local. Pregunta por disponibilidad.'}`);
        break;
      }
      case 'PAYMENT_METHODS': {
        const ans = await fetchFaq('PAYMENTS');
        await sendText(phone, `💳 *Métodos de pago:*\n${ans ?? 'Aceptamos efectivo, tarjeta y transferencia bancaria.'}`);
        break;
      }
      case 'PROMOS_ACTIVE': {
        const promos = await fetchActivePromos();
        if (promos.length === 0) {
          await sendText(phone, '🏷️ No tenemos promos activas por ahora. ¡Pero nuestros combos siempre son un deal! ¿Te muestro el menú?');
        } else {
          await sendText(phone, `🏷️ *Promos de hoy:*\n• ${promos.join('\n• ')}`);
        }
        break;
      }
      case 'ANNOUNCEMENTS': {
        const notes = await fetchAnnouncements();
        if (notes.length === 0) {
          await sendText(phone, '✅ Todo en orden, estamos abiertos. ¿Qué se te antoja? 🔥');
        } else {
          await sendText(phone, `📢 *Aviso importante:*\n• ${notes.join('\n• ')}`);
        }
        break;
      }

      // ── AI-assisted ───────────────────────────────────────────────────
      case 'RECOMMEND': {
        const recs = getRecommendation({
          budget:    entities?.budget    as number | undefined,
          hunger:    entities?.hunger    as string | undefined,
          spice:     entities?.spice     as string | undefined,
          objection: entities?.objection as string | undefined,
        });
        if (recs.length > 0 && !entities?.compare) {
          const lines = recs.map(r => `⭐ *${r?.product ?? '?'}* — $${r?.price ?? 0}\n   ${r?.reason ?? ''}`).join('\n\n');
          await sendText(phone, `🤔 Te recomiendo:\n\n${lines}\n\n¿Te anoto alguno?`);
        } else {
          const menuItems = await fetchMenuContext();
          const aiRes = await getAIResponse(
            buildContextPayload(menuItems, [], [], [], cart, rawText)
          ).catch(() => ({ message_to_user: 'Cuéntame qué se te antoja y te ayudo 🔥', intent_suggestion: 'RECOMMEND' as const }));
          await sendText(phone, aiRes?.message_to_user ?? 'Cuéntame qué se te antoja y te ayudo 🔥');
        }
        break;
      }

      case 'HANDOFF_HUMAN': {
        await updateState(phone, 'S7_HANDOFF').catch(() => null);
        await logEvent(phone, 'handoff', { reason: entities?.reason ?? 'user_request', cart }).catch(() => null);
        await sendHandoffMessage(phone);
        break;
      }

      case 'UNKNOWN': {
        const count = await incrementUnknown(phone).catch(() => 1);
        if ((count ?? 1) >= 2) {
          await updateState(phone, 'S7_HANDOFF').catch(() => null);
          await logEvent(phone, 'handoff', { reason: 'unknown_x2' }).catch(() => null);
          await sendHandoffMessage(phone);
          break;
        }
        const menuItems = await fetchMenuContext();
        const [announcements, promos] = await Promise.all([fetchAnnouncements(), fetchActivePromos()]);
        const aiRes = await getAIResponse(
          buildContextPayload(menuItems, [], announcements, promos, cart, rawText)
        ).catch(() => ({ message_to_user: '¿En qué te puedo ayudar? Escribe *menú* para ver opciones 🔥', intent_suggestion: 'ASK_MISSING_INFO' as const }));
        if (aiRes?.intent_suggestion === 'HANDOFF') {
          await updateState(phone, 'S7_HANDOFF').catch(() => null);
          await logEvent(phone, 'handoff', { reason: 'ai_suggestion' }).catch(() => null);
        }
        await sendText(phone, aiRes?.message_to_user ?? '¿En qué te puedo ayudar? Escribe *menú* para ver opciones 🔥');
        break;
      }

      default:
        await sendText(phone, '¿En qué te puedo ayudar? 🔥 Escribe *menú* para ver opciones.');
    }
  } catch (err) {
    console.error('[botEngine] FATAL error in processMessage:', {
      phone: phone ?? 'unknown',
      text:  rawText ?? '',
      error: err instanceof Error ? err.message : String(err),
    });
    // Last-resort fallback — always responds to the user
    try {
      await sendText(phone ?? '', 'Oops, algo salió mal 😅 Escribe *menú* para empezar de nuevo.');
    } catch (fallbackErr) {
      console.error('[botEngine] Fallback sendText also failed:', fallbackErr);
    }
  }
}
