/**
 * botEngine.ts
 * The main brain — receives an incoming WhatsApp message,
 * detects intent, routes to the right handler, and sends a response.
 */

import { detectIntent } from './intentDetector';
import {
  getSession, updateState, addToCart, removeFromCart,
  setSauceOnLastItem, formatCartText, logEvent,
  incrementUnknown, resetUnknown, clearCart, type CartItem, type BotSession
} from './sessionManager';
import { SALES_PLAYBOOKS, getRecommendation } from './salesPlaybooks';
import {
  sendText, sendMainMenu, sendSauceSelector,
  sendUpsellOffer, sendHandoffMessage, sendList, sendButtons
} from './metaClient';
import { getAIResponse, buildContextPayload, type MenuItemContext } from './aiService';
import { supabaseAdmin, supabaseAnon } from '@/lib/server/supabaseServer';

const db = () => supabaseAdmin || supabaseAnon;

// ── Fetch live DB context for AI calls ────────────────────────────────────
async function fetchMenuContext(): Promise<MenuItemContext[]> {
  const client = db();
  if (!client) return [];
  const { data } = await client
    .from('products')
    .select('name, price, category, description_short, is_best_seller')
    .eq('is_active', true)
    .order('is_best_seller', { ascending: false });
  return (data || []).map((p: any) => ({
    name: p.name,
    price: p.price,
    category: p.category,
    description: p.description_short,
    best_seller: p.is_best_seller,
  }));
}

async function fetchProductPrice(productName: string): Promise<number> {
  const client = db();
  if (!client) return 0;
  const { data } = await client
    .from('products')
    .select('price, requires_sauce')
    .ilike('name', `%${productName.split(' ')[0]}%`)
    .single();
  return data?.price || 0;
}

async function productRequiresSauce(productName: string): Promise<boolean> {
  const client = db();
  if (!client) return false;
  const { data } = await client
    .from('products')
    .select('requires_sauce')
    .ilike('name', `%${productName.split(' ')[0]}%`)
    .single();
  return data?.requires_sauce || false;
}

async function fetchFaq(key: string): Promise<string | null> {
  const client = db();
  if (!client) return null;
  const { data } = await client.from('faqs').select('value').eq('key', key).single();
  return data?.value || null;
}

async function fetchActivePromos(): Promise<string[]> {
  const client = db();
  if (!client) return [];
  const now = new Date().toISOString();
  const { data } = await client
    .from('promos')
    .select('title')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  return (data || []).map((p: any) => p.title);
}

async function fetchAnnouncements(): Promise<string[]> {
  const client = db();
  if (!client) return [];
  const now = new Date().toISOString();
  const { data } = await client
    .from('announcements')
    .select('text')
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  return (data || []).map((a: any) => a.text);
}

async function fetchCategoryProducts(category: string): Promise<string> {
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
    `${p.is_best_seller ? '⭐ ' : ''}${p.name} — $${p.price}${p.description_short ? '\n   _' + p.description_short + '_' : ''}`
  ).join('\n');
}

// ── Main engine ───────────────────────────────────────────────────────────
export async function processMessage(phone: string, rawText: string): Promise<void> {
  try {
    const session  = await getSession(phone);
    const detection = detectIntent(rawText);
    const { intent, entities } = detection;

    // Reset unknown counter on any recognized intent
    if (intent !== 'UNKNOWN') {
      await resetUnknown(phone);
    }

    // ── Handle button/list reply IDs ──────────────────────────────────────
    const mapped = mapButtonReply(rawText);
    if (mapped) {
      await processMessage(phone, mapped);
      return;
    }

    switch (intent) {
      case 'SHOW_MENU': {
        await updateState(phone, 'S1_BROWSING_MENU');
        await sendMainMenu(phone);
        break;
      }
      case 'SHOW_CATEGORY': {
        const cat = entities.category as string;
        const products = await fetchCategoryProducts(cat);
        const catName: Record<string, string> = {
          COMBOS: '🍗 Combos', PROTEINA: '💪 Proteína', PAPAS: '🍟 Papas',
          BANDERILLAS: '🌮 Banderillas & Dedos', BEBIDAS: '🥤 Bebidas', EXTRAS: '🧀 Extras'
        };
        await updateState(phone, 'S1_BROWSING_MENU');
        await sendText(phone, `*${catName[cat] || cat}*\n\n${products}\n\n¿Te anoto algo? 📝`);
        break;
      }
      case 'PRODUCT_INFO': {
        const product = entities.product as string;
        if (!product) {
          await sendText(phone, '¿De qué producto quieres info? 🤔');
          break;
        }
        const price = await fetchProductPrice(product);
        const client = db();
        const { data } = await client!
          .from('products')
          .select('name, price, description_short')
          .ilike('name', `%${product.split(' ')[0]}%`)
          .single();

        if (data) {
          await sendText(phone, `*${data.name}* — $${data.price}\n${data.description_short || ''}\n\n¿Te lo agrego? 🔥`);
        } else {
          await sendText(phone, `No encontré "${product}" en el menú. ¿Te muestro el menú completo?`);
        }
        break;
      }
      case 'ADD_TO_CART': {
        const { product, qty = 1 } = entities;
        if (!product) {
          await sendText(phone, '¿Qué producto quieres? Te muestro el menú si quieres 📋');
          break;
        }

        const price = await fetchProductPrice(product);
        const requiresSauce = await productRequiresSauce(product);

        const item: CartItem = { product, qty, unit_price: price };
        await addToCart(phone, item);
        await logEvent(phone, 'order_started', { product, qty });

        if (requiresSauce) {
          await updateState(phone, 'S3_NEED_SAUCE');
          await sendSauceSelector(phone, product);
        } else {
          await updateState(phone, 'S2_BUILDING_CART');
          const playbook = SALES_PLAYBOOKS[product];
          if (playbook && playbook.length > 0 && playbook[0].type === 'COMBO_UPGRADE') {
            await updateState(phone, 'S4_UPSELL_OFFER');
            await logEvent(phone, 'upsell_shown', { product, offer: playbook[0].intent_key });
            await sendUpsellOffer(phone, playbook[0].message);
          } else {
            await sendText(phone, `✅ Agregado: ${qty}x ${product}\n\n¿Algo más o confirmamos tu pedido?`);
            await sendButtons(phone, '¿Qué sigue?', [
              { id: 'intent_VIEW_CART',    title: '🛒 Ver carrito' },
              { id: 'intent_SHOW_MENU',    title: '📋 Ver menú' },
              { id: 'intent_CONFIRM',      title: '✅ Confirmar' },
            ]);
          }
        }
        break;
      }
      case 'SELECT_SAUCE': {
        const sauce = entities.sauce as string;
        const cart = await setSauceOnLastItem(phone, sauce);
        await updateState(phone, 'S2_BUILDING_CART');

        const lastItem = cart[cart.length - 1];
        const playbook = lastItem ? SALES_PLAYBOOKS[lastItem.product] : null;
        if (playbook && playbook[0]?.type === 'COMBO_UPGRADE') {
          await updateState(phone, 'S4_UPSELL_OFFER');
          await logEvent(phone, 'upsell_shown', { product: lastItem.product });
          await sendUpsellOffer(phone, playbook[0].message);
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
        const cart = session.cart_data;
        if (cart.length > 0) {
          const last = cart[cart.length - 1];
          const playbook = SALES_PLAYBOOKS[last.product];
          if (playbook?.[0]?.upgrade_to) {
            const newProduct = playbook[0].upgrade_to;
            const newPrice = await fetchProductPrice(newProduct);
            const newCart = [...cart.slice(0, -1), { ...last, product: newProduct, unit_price: newPrice }];
            const client = db();
            if (client) {
              await client.from('wa_sessions').upsert({ phone_number: phone, cart_data: newCart });
            }
            await logEvent(phone, 'upsell_accepted', { from: last.product, to: newProduct });
            await updateState(phone, 'S2_BUILDING_CART');
            await sendText(phone, `✅ Cambiado a *${newProduct}* — $${newPrice}\n¿Algo más?`);
          }
        }
        break;
      }
      case 'VIEW_CART': {
        const cart = session.cart_data;
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
        const { remove } = entities;
        if (remove) {
          const cart = await removeFromCart(phone, remove);
          await sendText(phone, `❌ Eliminado: ${remove}\n\n${formatCartText(cart)}`);
        } else {
          const menuItems = await fetchMenuContext();
          const aiRes = await getAIResponse(
            buildContextPayload(menuItems, [], [], [], session.cart_data, rawText)
          );
          await sendText(phone, aiRes.message_to_user);
        }
        break;
      }
      case 'CONFIRM_ORDER': {
        const cart = session.cart_data;
        if (!cart || cart.length === 0) {
          await sendText(phone, 'Tu carrito está vacío 😅 ¿Te muestro el menú?');
          break;
        }
        const summary = formatCartText(cart);
        await updateState(phone, 'S5_CONFIRM');
        await sendText(phone, `📋 *Resumen de tu pedido:*\n\n${summary}`);
        await sendButtons(phone, '¿Es para pickup o delivery?', [
          { id: 'checkout_PICKUP',   title: '🏃 Pickup (paso yo)' },
          { id: 'checkout_DELIVERY', title: '🛵 Delivery (me lo mandan)' },
        ]);
        break;
      }
      case 'CHECKOUT': {
        const { delivery_type, payment_method } = entities;
        if (delivery_type) {
          await updateState(phone, 'S6_CHECKOUT');
          if (delivery_type === 'DELIVERY') {
            await sendText(phone, '📍 ¿A qué dirección te lo enviamos?');
          } else {
            await sendText(phone, '🏃 Perfecto, vienes por él. ¿Cómo quieres pagar?\n• Efectivo 💵\n• Tarjeta 💳\n• Transferencia 📲');
          }
        } else if (payment_method) {
          const cart = session.cart_data;
          const total = cart.reduce((s, i) => s + i.unit_price * i.qty, 0);
          const client = db();
          if (client) {
            await client.from('orders').insert({
              channel: 'WHATSAPP',
              status: 'CONFIRMED',
              customer_phone: phone,
              payment_method,
              total,
            });
          }
          await logEvent(phone, 'order_completed', { total, payment_method });
          await clearCart(phone);
          await sendText(phone, `🔥 *¡Pedido confirmado!*\n\nTotal: $${total}\nPago: ${payment_method}\n\nTe avisamos cuando esté listo. ¡Gracias por elegir Snacks 911! 🙌`);
        }
        break;
      }
      case 'HOURS': {
        const ans = await fetchFaq('HOURS');
        await sendText(phone, `🕐 *Horarios:*\n${ans || 'Abrimos de Lunes a Domingo de 1pm a 10pm.'}`);
        break;
      }
      case 'LOCATION': {
        const ans = await fetchFaq('LOCATION');
        await sendText(phone, `📍 *Ubicación:*\n${ans || 'Consulta nuestra ubicación en Google Maps como Snacks 911.'}`);
        break;
      }
      case 'DELIVERY_INFO': {
        const ans = await fetchFaq('DELIVERY');
        await sendText(phone, `🛵 *Delivery:*\n${ans || 'Hacemos entrega en zona local. Pregunta por disponibilidad.'}`);
        break;
      }
      case 'PAYMENT_METHODS': {
        const ans = await fetchFaq('PAYMENTS');
        await sendText(phone, `💳 *Métodos de pago:*\n${ans || 'Aceptamos efectivo, tarjeta y transferencia bancaria.'}`);
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
      case 'RECOMMEND': {
        const recs = getRecommendation({
          budget: entities.budget,
          hunger: entities.hunger,
          spice: entities.spice,
          objection: entities.objection,
        });

        if (recs.length > 0 && !entities.compare) {
          const lines = recs.map(r => `⭐ *${r.product}* — $${r.price}\n   ${r.reason}`).join('\n\n');
          await sendText(phone, `🤔 Te recomiendo:\n\n${lines}\n\n¿Te anoto alguno?`);
        } else {
          const menuItems = await fetchMenuContext();
          const aiRes = await getAIResponse(
            buildContextPayload(menuItems, [], [], [], session.cart_data, rawText)
          );
          await sendText(phone, aiRes.message_to_user);
        }
        break;
      }
      case 'HANDOFF_HUMAN': {
        await updateState(phone, 'S7_HANDOFF');
        await logEvent(phone, 'handoff', { reason: entities.reason || 'user_request', cart: session.cart_data });
        await sendHandoffMessage(phone);
        break;
      }
      case 'UNKNOWN': {
        const count = await incrementUnknown(phone);
        if (count >= 2) {
          await updateState(phone, 'S7_HANDOFF');
          await logEvent(phone, 'handoff', { reason: 'unknown_x2' });
          await sendHandoffMessage(phone);
          break;
        }
        const menuItems = await fetchMenuContext();
        const aiRes = await getAIResponse(
          buildContextPayload(menuItems, [], await fetchAnnouncements(), await fetchActivePromos(), session.cart_data, rawText)
        );
        if (aiRes.intent_suggestion === 'HANDOFF') {
          await updateState(phone, 'S7_HANDOFF');
          await logEvent(phone, 'handoff', { reason: 'ai_suggestion' });
        }
        await sendText(phone, aiRes.message_to_user);
        break;
      }
      default:
        await sendText(phone, '¿En qué te puedo ayudar? 🔥 Escribe *menú* para ver opciones.');
    }
  } catch (err) {
    console.error('[botEngine] Error in processMessage:', err);
    try {
      // Graceful fallback if database or AI crashes completely
      await sendText(phone, 'Oops, tuvimos un problema procesando eso 😅. Escribe "menú" para empezar de nuevo.');
    } catch (sendErr) {
      console.error('[botEngine] Fallback sendText also failed:', sendErr);
    }
  }
}

// ── Map interactive button/list reply IDs to text commands ───────────────
function mapButtonReply(text: string): string | null {
  const map: Record<string, string> = {
    'cat_COMBOS':          'combos',
    'cat_PROTEINA':        'proteina',
    'cat_PAPAS':           'papas',
    'cat_BANDERILLAS':     'banderillas',
    'cat_BEBIDAS':         'bebidas',
    'cat_EXTRAS':          'extras',
    'intent_PROMOS':       'promos',
    'intent_RECOMMEND':    '¿qué me recomiendas?',
    'intent_VIEW_CART':    'mi carrito',
    'intent_SHOW_MENU':    'menú',
    'intent_CONFIRM':      'confirmar',
    'sauce_BBQ':           'BBQ',
    'sauce_Mango_Habanero':'Mango Habanero',
    'sauce_NONE':          'sin salsa',
    'upsell_YES':          'cámbialo a combo',
    'upsell_NO':           'no gracias',
    'checkout_PICKUP':     'paso por él',
    'checkout_DELIVERY':   'delivery',
  };
  return map[text] || null;
}
