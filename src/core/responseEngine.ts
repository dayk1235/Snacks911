/**
 * core/responseEngine.ts — GOD MODE Sales OS.
 *
 * Pure TypeScript — no React, no DOM, no side effects.
 * Input → Output only.
 *
 * Pipeline:
 *   1. detectIntent(text)
 *   2. updateState(intent, action, textInput)
 *   3. getPromptByStage(intent, stage, upsellStep)
 *   4. applyLoopStrategy() — changes strategy, not wording
 *   5. OUTPUT → { text, actions?, nextState }
 *
 * Rules:
 *   - No neutral responses
 *   - No unnecessary questions
 *   - duda → decide for user
 *   - rechazo → reduce pressure, offer alternatives
 *   - ordenando → trigger upsell
 *   - NEVER empty response
 */

import { detectIntent } from './intents';
import type { Intent, Stage } from './types';
import { applyLoopStrategy, getNextStrategy } from './antojo';
import type {
  ConversationState,
  QuickAction,
  ResponseOutput,
  PromptContext,
  UpsellStep,
  DeliveryStep,
} from './types';

export const INITIAL_STATE: ConversationState = {
  stage: 'inicio',
  lastIntent: 'mixto',
  lastResponse: null,
  comboSelected: false,
  upsellStep: 'none',
  deliveryStep: 'none',
  customerName: '',
  customerAddress: '',
  customerReference: '',
  customerPayment: '',
  orderConfirmed: false,
  retryCount: 0,
  cart: [],
  cartTotal: 0,
  whatsappUrl: null,
  reset: false,
};

// ─── Stage-aware prompt selector (GOD MODE copy) ──────────────────────────────

function getPromptByStage(
  intent: Intent,
  stage: Stage,
  upsellStep: UpsellStep,
): { text: (ctx: PromptContext) => string; actions?: QuickAction[] } {

  // ── rechazo_fuerte: soft reset, zero pressure ────────────────────────────
  if (intent === 'rechazo_fuerte') {
    return {
      text: () => `Sin presión. Cuando se te antoje, aquí seguimos. 🤘`,
    };
  }

  // ── pago_problema: payment alternatives, keep purchasing flow ────────────
  if (intent === 'pago_problema') {
    return {
      text: () => `Sin bronca. Aceptamos **transferencia** o **QR**.\n\n¿Cuál te va mejor?`,
      actions: [
        { label: '📱 QR', value: 'payment_qr' },
        { label: '💳 Transferencia', value: 'payment_transfer' },
      ],
    };
  }

  // ── rechazo: reduce pressure, offer 3 different alternatives ────────────
  if (intent === 'rechazo') {
    return {
      text: () => `Entendido. ¿Algo diferente?`,
      actions: [
        { label: '🍗 Alitas', value: 'show_alitas' },
        { label: '🥡 Boneless', value: 'show_boneless' },
        { label: '🔥 Ver combos', value: 'exploracion' },
      ],
    };
  }

  switch (stage) {

    // ── INICIO ────────────────────────────────────────────────────────────────
    case 'inicio':
      if (intent === 'gratitud') {
        return { text: () => `¡De nada! 🔥 Cuando quieras repetir, aquí estamos.` };
      }
      if (intent === 'despedida') {
        return { text: () => `¡Hasta luego! Que lo disfrutes. 🤘` };
      }
      // Default: ANTOJO hook → direct recommendation → single clear CTA
      return {
        text: (ctx) =>
          `🔥 **Crujientes, jugosos, recién hechos.**\n\n👉 **${ctx.comboName}** — $${ctx.comboPrice}. El más pedido.\n\n¿Lo preparo?`,
        actions: [
          { label: '🔥 Sí, dámelo', value: 'accept_combo_911' },
          { label: '🍗 Boneless', value: 'accept_combo_boneless' },
          { label: '🌮 Callejero', value: 'accept_combo_callejero' },
        ],
      };

    // ── EXPLORANDO ────────────────────────────────────────────────────────────
    case 'explorando':
      if (intent === 'exploracion') {
        return {
          text: () =>
            `Lo que hay:\n\n• 🔥 Combos — los más pedidos\n• 🍗 Alitas BBQ y Buffalo\n• 🥡 Boneless Clásico e Inferno\n• 🍟 Papas Gajo y Loaded\n• 🌭 Banderillas\n• 🍫 Postres\n\n¿Qué se te antoja?`,
          actions: [
            { label: '🔥 Combo 911', value: 'accept_combo_911' },
            { label: '🍗 Alitas', value: 'show_alitas' },
            { label: '🥡 Boneless', value: 'show_boneless' },
          ],
        };
      }
      if (intent === 'browsing') {
        return {
          text: (ctx) =>
            `Dale, mira. El **${ctx.comboName}** está cuando lo quieras. 🔥`,
        };
      }
      return {
        text: (ctx) =>
          `👉 **${ctx.comboName}** — $${ctx.comboPrice}. El que todos eligen.`,
        actions: [{ label: '🔥 Va, dámelo', value: 'accept_combo_911' }],
      };

    // ── DECIDIENDO ────────────────────────────────────────────────────────────
    case 'decidiendo':
      // duda → BOT DECIDES. No question. Direct push.
      if (intent === 'duda') {
        return {
          text: (ctx) =>
            `Te decido yo: **${ctx.comboName}** — $${ctx.comboPrice}. Crujiente, caliente, todo incluido. 🔥\n\n¿Va?`,
          actions: [{ label: '🔥 Va, dámelo', value: 'accept_combo_911' }],
        };
      }
      if (intent === 'precio') {
        return {
          text: (ctx) =>
            `El que más conviene: **${ctx.comboBonelessName}** — $${ctx.comboBonelessPrice}.\n\nAhorras $${ctx.ahorroBoneless} vs individual. ¿Va?`,
          actions: [
            { label: '🔥 Sí, va', value: 'accept_combo_boneless' },
            { label: '🌮 Callejero $89', value: 'accept_combo_callejero' },
          ],
        };
      }
      if (intent === 'hambre' || intent === 'pedido') {
        return {
          text: (ctx) =>
            `🔥 **${ctx.comboName}** — $${ctx.comboPrice}. Recién hecho, caliente.\n\n¿Lo preparo?`,
          actions: [
            { label: '🔥 Sí, dámelo', value: 'accept_combo_911' },
            { label: '🍗 Boneless', value: 'accept_combo_boneless' },
          ],
        };
      }
      // Fallback decidiendo
      return {
        text: (ctx) =>
          `👉 **${ctx.comboName}** — $${ctx.comboPrice}. El que mejor sabe.\n\n¿Va?`,
        actions: [{ label: '🔥 Sí, dámelo', value: 'accept_combo_911' }],
      };

    // ── ORDENANDO ─────────────────────────────────────────────────────────────
    case 'ordenando':
      // Upsell flow: papas → bebida → postre → close
      if (upsellStep === 'none' || upsellStep === 'papas') {
        return {
          text: (ctx) =>
            `🍟 Papas **loaded** con queso derretido. +$${ctx.papasPrice}.\n\n¿Se las agrego?`,
          actions: [
            { label: '🍟 Sí, cargadas', value: 'add_papas' },
            { label: '❌ Sin papas', value: 'skip_papas' },
          ],
        };
      }
      if (upsellStep === 'bebida') {
        return {
          text: (ctx) =>
            `🥤 Refresco frío para acompañar. +$${ctx.bebidaPrice}.\n\n¿Va?`,
          actions: [
            { label: '🥤 Va', value: 'add_bebida' },
            { label: '❌ Sin bebida', value: 'skip_bebida' },
          ],
        };
      }
      if (upsellStep === 'postre') {
        return {
          text: (ctx) =>
            `🍫 Brownie caliente con helado. +$${ctx.postrePrice}.\n\n¿Lo incluimos?`,
          actions: [
            { label: '🍫 Sí', value: 'add_postre' },
            { label: '❌ Así cierro', value: 'skip_postre' },
          ],
        };
      }
      // upsellStep === 'done' → close
      if (upsellStep === 'done') {
        return {
          text: (ctx) =>
            `🔥 Pedido listo. Total: **$${ctx.currentTotal}**\n\n¿Confirmamos?`,
          actions: [
            { label: '✅ Confirmar', value: 'confirm_order' },
            { label: '🔄 Otro pedido', value: 'order_again' },
          ],
        };
      }

      // Non-upsell intents within ordenando
      if (intent === 'edicion') {
        return {
          text: (ctx) =>
            `Claro. ¿Qué agrego?\n\n• Papas Loaded — $${ctx.papasPrice}\n• Refresco — $${ctx.bebidaPrice}\n• Brownie — $${ctx.postrePrice}`,
          actions: [
            { label: '🍟 Papas', value: 'add_papas' },
            { label: '🥤 Refresco', value: 'add_bebida' },
            { label: '🍫 Brownie', value: 'add_postre' },
          ],
        };
      }
      if (intent === 'urgencia') {
        return {
          text: (ctx) =>
            `🔥 **${ctx.comboName}** — el más rápido de preparar. ¿Lo envío?`,
          actions: [{ label: '🔥 Rápido, dámelo', value: 'accept_combo_911' }],
        };
      }
      // Guardia: nunca vacío en ordenando
      return {
        text: (ctx) =>
          `🔥 Pedido en progreso. Total: **$${ctx.currentTotal}**.\n\n¿Confirmamos?`,
        actions: [
          { label: '✅ Confirmar', value: 'confirm_order' },
          { label: 'Agregar algo', value: 'edicion' },
        ],
      };

    // ── POST_VENTA ────────────────────────────────────────────────────────────
    case 'post_venta':
      if (intent === 'gratitud') {
        return { text: () => `¡De nada! 🔥 Buen provecho. 🍗` };
      }
      if (intent === 'despedida') {
        return { text: () => `¡Hasta luego! 🤘` };
      }
      return { text: () => `Aquí seguimos para lo que necesites. 😊` };
  }
}

// ─── Stage updater ─────────────────────────────────────────────────────────────

function updateStage(intent: Intent, prevStage: Stage): Stage {
  if (intent === 'rechazo_fuerte') return 'inicio';
  if (intent === 'gratitud' || intent === 'despedida') {
    return prevStage === 'ordenando' ? 'post_venta' : 'inicio';
  }
  if (intent === 'aceptacion' || intent === 'pedido') return 'ordenando';
  if (intent === 'exploracion' || intent === 'browsing') return 'explorando';
  if (intent === 'duda' || intent === 'precio') return 'decidiendo';
  if (intent === 'rechazo') return 'explorando';
  if (intent === 'hambre') return 'decidiendo';
  if (intent === 'edicion' || intent === 'pago_problema') return 'ordenando';
  return prevStage;
}

// ─── Anti-loop: STRATEGY ROTATOR (not wording change) ─────────────────────────

function applyAntiLoop(
  text: string,
  lastResponse: string | null,
  retryCount: number,
  ctx: PromptContext,
): { text: string; newRetryCount: number } {
  // No loop detected
  if (!lastResponse || text !== lastResponse) {
    return { text, newRetryCount: 0 };
  }

  // Loop detected → apply next strategy
  const strategy = getNextStrategy(retryCount);
  const modifiedText = applyLoopStrategy(
    text,
    strategy,
    ctx.comboName,
    'combos',
    ctx.comboPrice,
    ctx.comboPrice + ctx.ahorroBoneless,
  );

  return { text: modifiedText, newRetryCount: retryCount + 1 };
}

// ─── State updater ─────────────────────────────────────────────────────────────

function updateState(
  state: ConversationState,
  intent: Intent,
  action?: string,
  textInput?: string,
): ConversationState {
  const next = { ...state };
  next.lastIntent = intent;
  next.reset = false;

  next.stage = updateStage(intent, next.stage);

  // ── Button actions — ALL cart logic here ─────────────────────────────────
  if (action) {
    const comboMap: Record<string, { name: string; price: number }> = {
      accept_combo_911:      { name: '🔥 Combo 911', price: 119 },
      accept_combo_boneless: { name: '🍗 Combo Boneless', price: 99 },
      accept_combo_callejero:{ name: '🌮 Combo Callejero', price: 89 },
    };

    if (comboMap[action]) {
      next.comboSelected = true;
      next.upsellStep = 'papas';
      next.cart = [comboMap[action].name];
      next.cartTotal = comboMap[action].price;
      next.stage = 'ordenando';
    }

    if (action === 'add_papas')    { next.upsellStep = 'bebida';  next.cart = [...next.cart, 'Papas Loaded']; next.cartTotal += 69; }
    if (action === 'skip_papas')   { next.upsellStep = 'bebida'; }
    if (action === 'add_bebida')   { next.upsellStep = 'postre';  next.cart = [...next.cart, 'Refresco 600ml']; next.cartTotal += 25; }
    if (action === 'skip_bebida')  { next.upsellStep = 'postre'; }
    if (action === 'add_postre')   { next.upsellStep = 'done';    next.cart = [...next.cart, 'Brownie con Helado']; next.cartTotal += 59; }
    if (action === 'skip_postre')  { next.upsellStep = 'done'; }

    if (action === 'confirm_order') {
      next.deliveryStep = 'name';
      next.stage = 'ordenando';
    }
    if (action === 'payment_qr' || action === 'payment_transfer') {
      next.customerPayment = action === 'payment_qr' ? 'QR' : 'Transferencia';
      if (!next.customerName)            next.deliveryStep = 'name';
      else if (!next.customerAddress)    next.deliveryStep = 'address';
      else next.deliveryStep = next.customerReference ? 'done' : 'reference';
    }
    if (action === 'order_again') {
      return { ...INITIAL_STATE, reset: true };
    }
    if (action === 'exploracion' || action === 'show_alitas' || action === 'show_boneless') {
      next.stage = 'explorando';
    }
  }

  // ── Text-based acceptance without button (user types "sí", "va", etc.) ────
  if (!action && (intent === 'aceptacion' || intent === 'pedido') && !next.comboSelected && next.cart.length === 0) {
    next.comboSelected = true;
    next.upsellStep = 'papas';
    next.cart = ['🔥 Combo 911'];
    next.cartTotal = 119;
  }

  // ── Delivery text input ───────────────────────────────────────────────────
  if (next.deliveryStep !== 'none' && next.deliveryStep !== 'done' && textInput) {
    switch (next.deliveryStep) {
      case 'name':      next.customerName = textInput;      next.deliveryStep = 'address';   break;
      case 'address':   next.customerAddress = textInput;   next.deliveryStep = 'reference'; break;
      case 'reference': next.customerReference = textInput; next.deliveryStep = 'payment';   break;
      case 'payment':
        next.customerPayment = textInput;
        next.deliveryStep = 'done';
        next.orderConfirmed = true;
        next.stage = 'post_venta';
        if (next.cart.length > 0 && next.customerName && next.customerAddress) {
          const items = next.cart.map(i => `• ${i}`).join('\n');
          const msg = `🔥 *Nuevo Pedido Snacks 911*\n\n🧾 Pedido:\n${items}\n\n💰 Total: $${next.cartTotal}\n\n📍 Entrega:\n• Nombre: ${next.customerName}\n• Dirección: ${next.customerAddress}\n• Referencia: ${next.customerReference || 'N/A'}\n• Pago: ${next.customerPayment}\n\n👉 Tiempo estimado: 20-30 min`;
          next.whatsappUrl = `https://wa.me/525584507458?text=${encodeURIComponent(msg)}`;
        }
        break;
    }
  }

  return next;
}

// ─── Delivery prompts (short, direct) ─────────────────────────────────────────

function getDeliveryPrompt(step: DeliveryStep): { text: string; actions?: QuickAction[] } | null {
  switch (step) {
    case 'name':      return { text: `📍 Tu **nombre** para el envío.` };
    case 'address':   return { text: `📍 ¿Tu **dirección** de entrega?` };
    case 'reference': return { text: `🏠 ¿Alguna **referencia** para llegar? (o escribe "ninguna")` };
    case 'payment':   return {
      text: `💰 ¿Cómo pagas?\n\n• Efectivo 💵\n• Transferencia/QR 📱`,
      actions: [
        { label: '💵 Efectivo', value: 'payment_cash_text' },
        { label: '📱 QR/Transferencia', value: 'payment_qr' },
      ],
    };
    case 'done': return {
      text: `🔥 **Pedido confirmado.**\n\n👉 Preparando todo recién hecho. 🤤\n👉 Te avisamos en cuanto salga.\n\nGracias por Snacks 911. 🔥`,
    };
    default: return null;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * handleMessage() — GOD MODE pipeline:
 * 1. detectIntent(text)
 * 2. updateState(intent, action, textInput)
 * 3. Intercept delivery flow if active
 * 4. getPromptByStage(intent, stage, upsellStep)
 * 5. applyAntiLoop() — strategy rotation
 * 6. Assert non-empty
 * 7. OUTPUT → { text, actions?, nextState }
 */
export function handleMessage(
  text: string,
  state: ConversationState,
  products: PromptContext,
  action?: string,
): ResponseOutput {
  // 1. Detect intent
  const { intent } = detectIntent(text);

  // 2. Update state
  const nextState = updateState(state, intent, action, text);

  // Build prompt context
  const ctx: PromptContext = {
    comboName: products.comboName,
    comboPrice: products.comboPrice,
    papasName: products.papasName,
    papasPrice: products.papasPrice,
    bebidaName: products.bebidaName,
    bebidaPrice: products.bebidaPrice,
    postreName: products.postreName,
    postrePrice: products.postrePrice,
    comboBonelessName: products.comboBonelessName,
    comboBonelessPrice: products.comboBonelessPrice,
    ahorroBoneless: products.ahorroBoneless,
    currentTotal: nextState.cartTotal || products.currentTotal,
    hasPapas: products.hasPapas,
    hasBebida: products.hasBebida,
    hasPostre: products.hasPostre,
  };

  // 3. Intercept delivery flow
  if (nextState.deliveryStep !== 'none') {
    const deliveryPrompt = getDeliveryPrompt(nextState.deliveryStep);
    if (deliveryPrompt) {
      nextState.lastResponse = deliveryPrompt.text;
      return { text: deliveryPrompt.text, actions: deliveryPrompt.actions, nextState };
    }
  }

  // 4. Get stage-aware prompt
  const promptFn = getPromptByStage(intent, nextState.stage, nextState.upsellStep);
  let responseText = promptFn.text(ctx);

  // 5. Apply anti-loop (strategy rotation)
  const { text: loopText, newRetryCount } = applyAntiLoop(
    responseText,
    state.lastResponse,
    nextState.retryCount,
    ctx,
  );
  responseText = loopText;
  nextState.retryCount = newRetryCount;

  // 6. Assert non-empty (NEVER empty response)
  if (!responseText?.trim()) {
    responseText = `🔥 **${ctx.comboName}** — $${ctx.comboPrice}. El más pedido. ¿Lo agregamos?`;
  }

  // 7. Store last response
  nextState.lastResponse = responseText;

  return {
    text: responseText,
    actions: promptFn.actions,
    nextState,
  };
}

// ─── Exported helpers (used by UI adapters) ───────────────────────────────────

export function buildDeliveryPrompt(state: ConversationState): { text: string; actions?: QuickAction[] } {
  return getDeliveryPrompt(state.deliveryStep) ?? { text: '' };
}

export function buildOrderConfirmation(
  state: ConversationState,
  products: PromptContext,
): { text: string; actions?: QuickAction[] } {
  const t = state.cartTotal || products.currentTotal;
  const items: string[] = [];
  if (state.comboSelected) items.push(`- ${products.comboName} x1`);
  if (products.hasPapas)   items.push(`- ${products.papasName} x1`);
  if (products.hasBebida)  items.push(`- ${products.bebidaName} x1`);
  if (products.hasPostre)  items.push(`- ${products.postreName} x1`);

  return {
    text: `🧾 **Tu pedido:**\n\n${items.join('\n')}\n\n💰 **Total: $${t}**\n\n👉 20-30 min\n\n¿Confirmas? ✅`,
    actions: [
      { label: '✅ Confirmar', value: 'confirm_order' },
      { label: '🔄 Otro pedido', value: 'order_again' },
    ],
  };
}
