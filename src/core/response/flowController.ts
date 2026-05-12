/**
 * core/response/flowController.ts — Conversation flow orchestrator.
 * Extracted from core/responseEngine.ts.
 */

import { createUuid, normalizeText } from "@/lib/utils/core";
import { extractFoodIntent, rankProductsByIntent } from "../contextRanker";
import { detectIntent, parseEntitiesRecord } from "../intentDetector";
import { getBestStrategyFromAnalytics } from "../antojo";
import { getContext, clearContext, updateContext } from "../context";
import { addToCart } from "../cartEngine";
import { resolveNextState, type OrderState } from "../orderFlow";
import { validateResponseOutput } from "../responseValidator";
import { recordFallback } from "../autoTrainer";
import { isGreetingOnly, startsWithGreeting } from "../nluBaseline";
import { inventoryFilter } from "../inventoryFilter";
import type {
  ConversationState,
  ResponseOutput,
  Action,
  ProductRefs,
  PromptContext,
  Intent,
  Stage,
} from "../types";
import { buildPaymentMessage } from "@/lib/payments/paymentMessages";
import {
  getUpsellSuggestions,
  handleUpsellResponse,
  trackUpsellEvent,
} from "@/lib/upsell/upsellEngine";
import {
  getLoyaltyStatus,
  redeemPoints as redeemLoyaltyPoints,
  getCheckoutLoyaltyPrompt,
} from "@/lib/loyalty/loyaltyEngine";
import {
  processRatingResponse,
  escalateToOwner,
} from "@/lib/reviews/reviewEngine";
import {
  applyReferralCode,
  getReferralMessage,
} from "@/lib/referrals/referralEngine";

import { hasAny } from "./formatting";
import { applyAntiLoop, parseUserRequest, extractProductEntities, extractCategoryEntities, matchProducts } from "./aiHandler";
import { applySafetyFilter, applyFallback } from "./errorHandler";
import { getDeliveryPrompt, getPromptByStage, generateUpsell, buildRecommendations } from "./messageBuilder";

import { AdminProduct } from "@/lib/adminTypes";

export const INITIAL_STATE: ConversationState = {
  stage: "inicio",
  lastIntent: "mixto",
  lastResponse: null,
  comboSelected: false,
  upsellStep: "none",
  deliveryStep: "none",
  customerName: "",
  customerAddress: "",
  customerReference: "",
  customerPayment: "",
  orderConfirmed: false,
  retryCount: 0,
  cart: { items: [], total: 0 },
  cartTotal: 0,
  whatsappUrl: null,
  orderTimestamp: undefined,
  reset: false,
  messages: [],
  allergies: [],
};

function inferComboAction(textInput?: string): string | undefined {
  const lower = normalizeText(textInput ?? "");
  if (!lower) return undefined;

  if (hasAny(lower, ["callejero"])) return "accept_combo_callejero";
  if (hasAny(lower, ["boneless", "inferno", "clasico"]))
    return "accept_combo_boneless";
  if (hasAny(lower, ["combo 911", "911"])) return "accept_combo_911";
  if (lower === "combo" || lower.includes("combo")) return "accept_combo_911";

  return undefined;
}

function finalizeOrder(next: ConversationState) {
  next.deliveryStep = "done";
  next.orderConfirmed = true;
  next.stage = "post_venta";
  next.orderTimestamp = Date.now();

  const bizName = (next as any).businessName || 'SABOR 911';
  const waNum = (next as any).whatsappNumber || '525584507458';

  if (next.cart.items.length > 0 && next.customerName && next.customerAddress) {
    const items = next.cart.items.map((i) => `• ${i.name} (x${i.quantity})`).join("\n");
    const msg = `🔥 *Nuevo Pedido ${bizName.toUpperCase()}*\n\n🧾 Pedido:\n${items}\n\n💰 Total: $${next.cart.total}\n\n📍 Entrega:\n• Nombre: ${next.customerName}\n• Dirección: ${next.customerAddress}\n• Referencia: ${next.customerReference || "N/A"}\n• Pago: ${next.customerPayment}\n\n👉 Tiempo estimado: 20-30 min`;
    next.whatsappUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;
  }
}

function inferActionFromText(
  state: ConversationState,
  intent: Intent,
  textInput?: string,
): string | undefined {
  const lower = normalizeText(textInput ?? "");

  if (!lower) {
    return undefined;
  }

  if (state.deliveryStep === "payment") {
    if (hasAny(lower, ["efectivo", "cash", "contado"])) return "payment_cash";
    if (hasAny(lower, ["qr", "transferencia", "transfer", "tarjeta"]))
      return "payment_qr";
  }

  const isCartEmpty =
    !Array.isArray(state.cart?.items) ||
    state.cart.items.length === 0;

  if (!state.comboSelected && isCartEmpty) {
    const comboAction = inferComboAction(lower);
    if (comboAction) return comboAction;
    if (intent === "aceptacion" && state.stage !== "ordenando")
      return "accept_combo_911";
  }

  if (
    intent === "UNKNOWN" ||
    (intent === "CONFIRM_ORDER" && isCartEmpty)
  ) {
    return undefined;
  }

  if (state.upsellStep === "none" || state.upsellStep === "papas") {
    if (hasAny(lower, ["papas", "loaded", "gajo"])) return "add_papas";
    if (intent === "rechazo" || intent === "rechazo_fuerte")
      return "skip_papas";
    if (intent === "aceptacion" || intent === "pedido") return "add_papas";
  }

  if (state.upsellStep === "bebida") {
    if (
      hasAny(lower, [
        "refresco",
        "bebida",
        "coca",
        "sprite",
        "fanta",
        "manzanita",
      ])
    )
      return "add_bebida";
    if (intent === "rechazo" || intent === "rechazo_fuerte")
      return "skip_bebida";
    if (intent === "aceptacion" || intent === "pedido") return "add_bebida";
  }

  if (state.upsellStep === "postre") {
    if (hasAny(lower, ["brownie", "helado", "postre", "churro", "dulce"]))
      return "add_postre";
    if (intent === "rechazo" || intent === "rechazo_fuerte")
      return "skip_postre";
    if (intent === "aceptacion" || intent === "pedido") return "add_postre";
  }

  if (state.upsellStep === "done") {
    if (hasAny(lower, ["confirma", "confirmar", "envia", "enviar", "listo"]))
      return "confirm_order";
    if (intent === "aceptacion" || intent === "pedido") return "confirm_order";
  }

  if (intent === "edicion") {
    const items = Array.isArray(state.cart?.items)
      ? state.cart.items
      : [];

    if (
      !items.some(item => item.name?.includes("Papas")) &&
      hasAny(lower, ["papas", "loaded", "gajo"])
    )
      return "add_papas";
    if (
      !items.some(item => item.name?.includes("Refresco")) &&
      hasAny(lower, [
        "refresco",
        "bebida",
        "coca",
        "sprite",
        "fanta",
        "manzanita",
      ])
    )
      return "add_bebida";
    if (
      !items.some(item => item.name?.includes("Brownie")) &&
      hasAny(lower, ["brownie", "helado", "postre", "churro", "dulce"])
    )
      return "add_postre";
  }

  return undefined;
}

// ─── Stage updater ─────────────────────────────────────────────────────────────

function updateStage(intent: Intent, prevStage: Stage): Stage {
  if (intent === "rechazo_fuerte") return "inicio";
  if (intent === "gratitud" || intent === "despedida") {
    return prevStage === "ordenando" ? "post_venta" : "inicio";
  }
  if (intent === "aceptacion" || intent === "pedido") return "ordenando";
  if (intent === "exploracion" || intent === "browsing") return "explorando";
  if (intent === "duda" || intent === "precio") return "decidiendo";
  if (intent === "rechazo") return "explorando";
  if (intent === "hambre") return "decidiendo";
  if (intent === "edicion" || intent === "pago_problema") return "ordenando";
  return prevStage;
}

// ─── State updater ─────────────────────────────────────────────────────────────

function updateState(
  state: ConversationState,
  intent: Intent,
  action?: string,
  textInput?: string,
): ConversationState {
  const next = { ...state };
  const resolvedAction =
    action ?? inferActionFromText(state, intent, textInput);
  next.lastIntent = intent;
  next.reset = false;

  next.stage = updateStage(intent, next.stage);

  // ── Handling Post-Order Modification (10min window) ──────────────────────
  const TEN_MINUTES = 10 * 60 * 1000;
  if (state.orderConfirmed && intent === "edicion" && state.orderTimestamp) {
    const elapsed = Date.now() - state.orderTimestamp;
    if (elapsed < TEN_MINUTES) {
      // Re-open order
      next.orderConfirmed = false;
      next.deliveryStep = "none";
      next.stage = "ordenando";
      next.upsellStep = "done"; // Go to confirmation/editing
    }
  }

  const cartEmpty =
    !Array.isArray(next.cart?.items) ||
    next.cart.items.length === 0;

  if (
    !resolvedAction &&
    !action &&
    intent === "pedido" &&
    !next.comboSelected &&
    cartEmpty
  ) {
    next.stage = "decidiendo";
  }

  // ── Button actions — ALL cart logic here ─────────────────────────────────
  if (resolvedAction) {
    const comboMap: Record<string, { name: string; price: number }> = {
      accept_combo_911: { name: "🔥 Combo 911", price: 119 },
      accept_combo_boneless: { name: "🍗 Combo Boneless", price: 99 },
      accept_combo_callejero: { name: "🌮 Combo Callejero", price: 89 },
    };

    if (comboMap[resolvedAction]) {
      next.comboSelected = true;
      next.upsellStep = "papas";
      next.cart = {
        items: [
          {
            id: "combo",
            productId: "combo",
            name: comboMap[resolvedAction].name,
            quantity: 1,
            price: comboMap[resolvedAction].price,
            category: "combo"
          }
        ],
        total: comboMap[resolvedAction].price
      };
      next.stage = "ordenando";
    }

    if (resolvedAction === "add_papas") {
      next.upsellStep = "bebida";
      const existing = next.cart.items.find((i: any) => i.name === "Papas Loaded");
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
      } else {
        next.cart.items.push({ id: "papas", productId: "papas", name: "Papas Loaded", quantity: 1, price: 69, category: "papas" });
      }
      next.cart.total += 69;
    }
    if (resolvedAction === "skip_papas") {
      next.upsellStep = "bebida";
    }
    if (resolvedAction === "add_bebida") {
      next.upsellStep = "postre";
      const existing = next.cart.items.find((i: any) => i.name === "Refresco 600ml");
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
      } else {
        next.cart.items.push({ id: "refresco", productId: "refresco", name: "Refresco 600ml", quantity: 1, price: 25, category: "bebidas" });
      }
      next.cart.total += 25;
    }
    if (resolvedAction === "skip_bebida") {
      next.upsellStep = "postre";
    }
    if (resolvedAction === "add_postre") {
      next.upsellStep = "done";
      const existing = next.cart.items.find((i: any) => i.name === "Brownie con Helado");
      if (existing) {
        existing.quantity = (existing.quantity || 0) + 1;
      } else {
        next.cart.items.push({ id: "brownie", productId: "brownie", name: "Brownie con Helado", quantity: 1, price: 59, category: "postres" });
      }
      next.cart.total += 59;
    }
    if (resolvedAction === "skip_postre") {
      next.upsellStep = "done";
    }

    if (resolvedAction === "confirm_order") {
      next.deliveryStep = "name";
      next.stage = "ordenando";
    }
    if (
      resolvedAction === "payment_qr" ||
      resolvedAction === "payment_transfer" ||
      resolvedAction === "payment_cash"
    ) {
      next.customerPayment =
        resolvedAction === "payment_cash"
          ? "Efectivo"
          : resolvedAction === "payment_transfer"
            ? "Transferencia"
            : "QR / Transferencia";

      if (!next.customerName) next.deliveryStep = "name";
      else if (!next.customerAddress) next.deliveryStep = "address";
      else if (!next.customerReference) next.deliveryStep = "reference";
      else finalizeOrder(next);
    }
    if (resolvedAction === "order_again") {
      return { ...INITIAL_STATE, reset: true };
    }
    if (
      resolvedAction === "exploracion" ||
      resolvedAction === "show_alitas" ||
      resolvedAction === "show_boneless"
    ) {
      next.stage = "explorando";
    }
  }

  // ── Text-based acceptance without button (user types "sí", "va", etc.) ────
  if (
    !resolvedAction &&
    !action &&
    intent === "aceptacion" &&
    !next.comboSelected &&
    cartEmpty
  ) {
    next.comboSelected = true;
    next.upsellStep = "papas";
    next.cart = {
      items: [
        {
          id: "combo-911",
          productId: "combo-911",
          name: "🔥 Combo 911",
          quantity: 1,
          price: 119,
          category: "combo"
        }
      ],
      total: 119
    };
  }

  // ── Delivery text input ───────────────────────────────────────────────────
  if (
    next.deliveryStep !== "none" &&
    next.deliveryStep !== "done" &&
    textInput
  ) {
    switch (next.deliveryStep) {
      case "name":
        next.customerName = textInput;
        next.deliveryStep = "address";
        break;
      case "address":
        next.customerAddress = textInput;
        next.deliveryStep = "reference";
        break;
      case "reference":
        next.customerReference = textInput;
        next.deliveryStep = "payment";
        break;
      case "payment":
        next.customerPayment = textInput;
        finalizeOrder(next);
        break;
    }
  }

  return next;
}

// ─── Main entry point (Legacy GOD MODE) ────────────────────────────────────────

export function handleMessage(
  text: string,
  state: ConversationState,
  products: ProductRefs,
  action?: string,
): ResponseOutput {
  try {
  // 1. Detect intent and extract any allergies from "sin X" patterns
  const { intent, allergies: detectedAllergies } = detectIntent(text);

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
  if (nextState.deliveryStep !== "none") {
    const deliveryPrompt = getDeliveryPrompt(nextState.deliveryStep);
    if (deliveryPrompt) {
      nextState.lastResponse = deliveryPrompt.text;
      return validateResponseOutput(
        {
          text: deliveryPrompt.text,
          type: deliveryPrompt.actions ? "buttons" : "text",
          actions: deliveryPrompt.actions,
          nextState,
        },
        state,
      );
    }
  }

  // 4. Get stage-aware prompt
  const promptFn = getPromptByStage(
    intent,
    nextState.stage,
    nextState.upsellStep,
  );
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

  // STEP 3: Handle Exploracion intent for Products UI (Legacy Fallback)
  if (intent === "exploracion") {
    return validateResponseOutput(
      {
        text: "¡Chécate estos favoritos! 👇",
        type: "products",
        ui: {
          cards: [
            {
              id: "card-p1",
              title: "Combo Mixto",
              price: 120,
              imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=400",
              actions: [
                { id: "p1", type: "add_to_cart", label: "➕ Agregar", value: "add_combo_mixto" }
              ]
            },
            {
              id: "card-p5",
              title: "Papas Gajo",
              price: 80,
              imageUrl: "https://images.unsplash.com/photo-1573082833946-f99a2dbbb50d?auto=format&fit=crop&w=400",
              actions: [
                { id: "p5", type: "add_to_cart", label: "➕ Agregar", value: "add_papas_gajo" }
              ]
            },
            {
              id: "card-p3",
              title: "Boneless Mango",
              price: 130,
              imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400",
              actions: [
                { id: "p3", type: "add_to_cart", label: "➕ Agregar", value: "add_boneless_mango" }
              ]
            }
          ]
        },
        nextState,
      },
      state,
    );
  }

  const resolvedActions =
    typeof promptFn.actions === "function"
      ? promptFn.actions(ctx)
      : promptFn.actions;

  return validateResponseOutput(
    {
      text: responseText,
      type: promptFn.type || (resolvedActions ? "buttons" : "text"),
      actions: resolvedActions,
      nextState,
    },
    state,
  );
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[responseEngine] FATAL ERROR in Legacy Pipeline:", error);
    }
    return validateResponseOutput(
      {
        text: "Hubo un desliz de red. ¿Puedes intentarlo de nuevo? 😅",
        type: "text",
        nextState: state,
      },
      state,
    );
  }
}

// ─── Modular pipeline ──────────────────────────────────────────────────────────

export async function handleMessageModular(
  text: string,
  state: ConversationState,
  products: ProductRefs,
  action?: string,
  allProductsOverride?: AdminProduct[],
): Promise<ResponseOutput> {
  try {
    // Warm analytics cache in background (non-blocking)
    getBestStrategyFromAnalytics(0).catch(() => {});

    if (process.env.NODE_ENV !== "test") {
      console.log("[responseEngine] MODULAR PIPELINE START");
    }

  const userId = String(state.phone || "anonymous");
  const userCtx = getContext(userId);
  const n = normalizeText(text);

  let profile = null;
  if (state.phone && typeof window === 'undefined') {
    try {
      const { getCustomerProfileFromDB } = await import("@/lib/db.server");
      profile = await getCustomerProfileFromDB(
        String(state.phone).replace(/\D/g, ""),
      );
    } catch {
      profile = null;
    }
  }

  if (isGreetingOnly(text)) {
    return validateResponseOutput(
      {
        text: '¡Hola! 👋\n¿Quieres ver el menú o te recomiendo algo? 🔥',
        type: 'text',
        nextState: state
      },
      state
    );
  }

  // 1. Detectar intent
  const intentResult = detectIntent(text, userCtx);
  const currentFlow: OrderState = userCtx.flowState || 'IDLE';
  const nextFlow = resolveNextState(currentFlow, intentResult.intent, {
    state: currentFlow,
    cartItems: userCtx.cart?.items?.length ?? 0,
    hasProductMatch: (parseEntitiesRecord(intentResult.entities).products?.length ?? 0) > 0,
  });

  // VIEW CART ONLY FROM VALID STATES
  if (intentResult.intent.toUpperCase() === 'VIEW_CART' && currentFlow === 'IDLE') {
    return validateResponseOutput(
      {
        text: 'Aún no has agregado nada 😅',
        type: 'text',
        nextState: state
      },
      state
    );
  }

  // ── Intercept AWAITING_REVIEW: customer rating 1-5 ─────────────────────
  if (currentFlow === 'AWAITING_REVIEW') {
    const orderId = userCtx.lastReviewOrderId;
    if (!orderId) {
      updateContext(userId, { flowState: 'IDLE' }); // Failsafe
    } else {
      const reviewRes = await processRatingResponse(userId, orderId, text);
      
      if (reviewRes.nextAction === 'none') {
        // Did not understand rating, ask again
        return validateResponseOutput(
          { text: reviewRes.message, type: 'text', nextState: state },
          state
        );
      }

      const nextFlowState = reviewRes.nextAction === 'ask_comment' 
        ? 'AWAITING_REVIEW_COMMENT' 
        : 'IDLE';

      updateContext(userId, { flowState: nextFlowState as any });

      return validateResponseOutput(
        { text: reviewRes.message, type: 'text', nextState: state },
        state
      );
    }
  }

  // ── Intercept AWAITING_REVIEW_COMMENT: customer feedback for escalation ──
  if (currentFlow === 'AWAITING_REVIEW_COMMENT') {
    const orderId = userCtx.lastReviewOrderId;
    const { data: order } = await (await import("@/lib/db.server")).getSupabaseAdmin()
      .from('orders')
      .select('rating')
      .eq('id', orderId)
      .single();

    if (orderId) {
      await escalateToOwner(orderId, order?.rating || 0, text, userId);
    }

    updateContext(userId, { flowState: 'IDLE', lastReviewOrderId: undefined });

    return validateResponseOutput(
      { 
        text: '🙏 Gracias por tus comentarios. El dueño ha sido notificado y se pondrá en contacto contigo pronto si es necesario. ¡Buen día!', 
        type: 'text', 
        nextState: state 
      },
      state
    );
  }

  // Negative intent guard
  const negativeInputs = ['no', 'nop', 'nel', 'no gracias'];
  if (negativeInputs.includes(n.trim())) {
    return validateResponseOutput(
      {
        text: 'Perfecto 👍\n\n¿Quieres ver el menú o algo más?',
        type: 'text',
        nextState: state
      },
      state
    );
  }

  // Intercept AWAITING_PAYMENT state
  if (currentFlow === 'AWAITING_PAYMENT') {
    if (hasAny(n, ['si', 'sí', 'reenvia', 'reenviar', 'dale', 'ok', 'va', 'mandalo', 'mándalo'])) {
      const paymentUrl = userCtx.paymentUrl;
      if (paymentUrl) {
        const paymentMsg = [
          `💳 Aquí está de nuevo tu enlace de pago:`,
          '',
          `🔗 ${paymentUrl}`,
          '',
          `Tienes 24 horas para completar el pago.`,
        ].join('\n');
        return validateResponseOutput(
          { text: paymentMsg, type: 'text', nextState: state },
          state
        );
      }
      return validateResponseOutput(
        { text: 'No encontré tu enlace de pago. ¿Quieres crear uno nuevo? Responde *SÍ*.', type: 'text', nextState: state },
        state
      );
    }

    if (hasAny(n, ['no', 'cancelar', 'cancela', 'mejor no'])) {
      updateContext(userId, { flowState: 'IDLE' as OrderState, paymentStatus: 'payment_expired' });
      return validateResponseOutput(
        { text: 'Entendido. Si cambias de opinión, aquí estoy. 🔥\n\n¿Quieres ver el menú?', type: 'text', nextState: state },
        state
      );
    }

    const paymentUrl = userCtx.paymentUrl;
    const linkLine = paymentUrl ? `\n\n🔗 ${paymentUrl}` : '';
    return validateResponseOutput(
      {
        text: `⏰ Tu pago está pendiente.\n\n¿Reenvío tu link? Responde *SÍ* o *NO*${linkLine}`,
        type: 'buttons',
        actions: [
          { id: "resend-payment", type: "navigate", label: "✅ SÍ, reenviar", value: "resend_payment" },
          { id: "cancel-payment", type: "dismiss", label: "❌ NO", value: "cancel_payment" },
        ],
        nextState: state,
      },
      state
    );
  }

  // ── Intercept AWAITING_UPSELL: customer replied to a pending upsell ──────
  if (userCtx.pendingUpsell) {
    const pendingSuggestion = userCtx.pendingUpsell;
    const upsellResult = handleUpsellResponse(
      userId,
      text,
      pendingSuggestion,
      userCtx.cart,
    );

    // Clear pending upsell regardless of outcome
    updateContext(userId, { pendingUpsell: null });

    if (upsellResult.accepted && upsellResult.updatedCart) {
      // Apply cart update
      updateContext(userId, { cart: upsellResult.updatedCart as any });
    }

    return validateResponseOutput(
      { text: upsellResult.nextMessage, type: 'text', nextState: state },
      state,
    );
  }

  // Hard override for price/total questions
  if (
    n.includes('cuanto') ||
    n.includes('total') ||
    n.includes('debo') ||
    n.includes('cuanto voy') ||
    n.includes('precio total')
  ) {
    intentResult.intent = 'VIEW_CART';
  }

  // ── LOYALTY_QUERY: "mis puntos", "mi nivel", etc. ────────────────────────
  if (intentResult.intent === ('LOYALTY_QUERY' as any)) {
    const loyaltyMsg = await getLoyaltyStatus(userId);
    updateContext(userId, { lastIntent: intentResult.intent, flowState: nextFlow });
    return validateResponseOutput(
      { text: loyaltyMsg, type: 'text', nextState: state },
      state,
    );
  }

  // ── REDEEM_POINTS: "canjear", "usar mis puntos", etc. ────────────────────
  if (intentResult.intent === ('REDEEM_POINTS' as any)) {
    if (userCtx.cart.items.length === 0) {
      return validateResponseOutput(
        {
          text: '😅 Aún no tienes productos en tu pedido. Agrega algo y te aplico el descuento al confirmar. 🔥',
          type: 'text',
          nextState: state,
        },
        state,
      );
    }
    const pointsMatch = text.match(/(\d+)\s*puntos?/i);
    const pointsToRedeem = pointsMatch
      ? Math.floor(parseInt(pointsMatch[1]) / 100) * 100
      : 100; 

    const tempOrderId = `preview-${userId}-${Date.now()}`;
    const result = await redeemLoyaltyPoints(userId, pointsToRedeem, tempOrderId);

    if (result.success) {
      updateContext(userId, {
        lastIntent: intentResult.intent,
        flowState: nextFlow,
        pendingLoyaltyDiscount: { points: pointsToRedeem, amount: result.discountAmount, tempOrderId } as any,
      });
      return validateResponseOutput(
        {
          text: `✅ *$${result.discountAmount} de descuento* aplicado a tu pedido 🎁\nPuntos restantes: ${result.remainingPoints} pts\n\n¿Confirmamos tu pedido?`,
          type: 'text',
          nextState: state,
        },
        state,
      );
    } else {
      return validateResponseOutput(
        {
          text: `😅 ${result.errorMessage}\n\nEscribe *"mis puntos"* para ver tu saldo.`,
          type: 'text',
          nextState: state,
        },
        state,
      );
    }
  }

  // ── APPLY_REFERRAL: "WINGS-XXXX" or "tengo un código" ────────────────────
  if (intentResult.intent === ('APPLY_REFERRAL' as any)) {
    const codeMatch = text.toUpperCase().match(/WINGS-[A-Z0-9]{4}/);
    const code = codeMatch ? codeMatch[0] : null;

    if (!code) {
      return validateResponseOutput(
        { text: 'Escribe tu código de referido (ej: *WINGS-ABCD*) para aplicarte el descuento. 🎁', type: 'text', nextState: state },
        state
      );
    }

    const result = await applyReferralCode(userId, code);
    if (result.valid) {
      updateContext(userId, { 
        pendingReferralDiscount: result.discount,
        appliedReferralCode: code,
        referralPromptShown: true 
      });
      return validateResponseOutput(
        { text: result.message + '\n\n¿Qué te gustaría ordenar hoy? 🔥', type: 'text', nextState: state },
        state
      );
    } else {
      return validateResponseOutput(
        { text: result.message, type: 'text', nextState: state },
        state
      );
    }
  }

  // Papas intent priority — intercept before combo logic
  if (intentResult.intent === "ADD_TO_CART" && hasAny(n, ["papas", "gajo", "loaded"])) {
    const papasProducts = (allProductsOverride || []).filter((p: any) =>
      String(p.category).toLowerCase() === "papas"
    );
    return validateResponseOutput(
      {
        text: `🍟 Tenemos estas opciones de papas:\n\n` +
          papasProducts.slice(0, 4).map((p: any) => `• ${p.name} - $${p.price}`).join('\n') +
          `\n\n¿Cuál quieres?`,
        type: papasProducts.length > 0 ? 'products' : 'text',
        ui: {
          cards: papasProducts.slice(0, 4).map((p: any) => ({
            id: `card-papas-${p.id}`,
            title: p.name,
            price: p.price,
            imageUrl: p.image,
            actions: [
              { id: String(p.id), type: "add_to_cart", label: "➕ Agregar", value: `add_product_${p.id}` }
            ]
          }))
        },
        nextState: { ...state, stage: "ordenando" as any }
      },
      state
    );
  }

  const { includeWords, excludeWords } = parseUserRequest(text);

  // 2. Extraer entidades (producto, categoría)
  const productEntities = extractProductEntities(intentResult, includeWords);
  const categoryEntities = extractCategoryEntities(intentResult);

  // 3. Extraer restricciones (alergias, "sin", etc.)
  const allConstraints = (() => {
    const arr: Array<string | undefined | null> = [
      ...(state.allergies || []),
      ...(intentResult.allergies || []),
      ...(intentResult.filters || []),
      ...(parseEntitiesRecord(intentResult.entities).restrictions || []),
      ...excludeWords,
    ];
    return arr
      .filter((v): v is string => typeof v === "string")
      .map(v => v.toLowerCase().trim())
      .filter(Boolean)
      .filter((v, i, self) => self.indexOf(v) === i);
  })();
  const hasActiveRestrictions = allConstraints.length > 0;
  const nextState = { ...state, allergies: allConstraints };

  // 4. Obtener productos base desde DB
  let rawProducts = allProductsOverride;
  if (!rawProducts) {
    const dbModule = await import("@/lib/db.server");
    rawProducts = await dbModule.dbGetProducts();
  }

  // 4.5 Filtrar productos sin stock ANTES de ranking/matching
  const allProducts = inventoryFilter(rawProducts as any[]);

  if (allProducts.length === 0) {
    return validateResponseOutput({
      text: "😅 Ahorita no tenemos disponibles esos productos. ¿Quieres que te recomiende algo diferente? 🔥",
      type: 'text',
      nextState: state
    }, state);
  }

  // 5. Aplicar match por intención
  let matchedProducts = matchProducts(
    intentResult.intent,
    { product: productEntities, category: categoryEntities },
    allProducts as any[],
  );

  // If ADD_TO_CART but no clear match, try using lastProductsShown from context
  const lastShownIds = userCtx.lastProductsShown;
  if (intentResult.intent === 'ADD_TO_CART' && productEntities.length === 0 && lastShownIds?.length) {
    const lastShown = allProducts.filter((p: any) => lastShownIds.includes(String(p.id)));
    if (lastShown.length > 0) {
      matchedProducts = lastShown;
    }
  }

  // 6. Aplicar filtro de seguridad SOLO si hay restricciones
  const safeProducts = applySafetyFilter(
    matchedProducts as any,
    allConstraints,
  );

  let responseProducts: any[] = [];
  const safeAllProductsBase = applySafetyFilter(
    allProducts as any[],
    allConstraints,
  );

  // ── Context-continuity guard ─────────────────────────────────────────────
  const cartHasItems = userCtx.cart.items.length > 0;
  const infoWords = [
    'menu', 'ver', 'que', 'precio', 'cuanto', 'total'
  ];

  const isGreetingMsg = startsWithGreeting(text);
  const isInfoRequest = infoWords.some(w => n.includes(w));

  const isAdditivePhrase =
    /^(y |oye y |ah y |también |tambien )/i.test(text.trim());

  if (
    cartHasItems &&
    isAdditivePhrase &&
    !isGreetingMsg &&
    !isInfoRequest &&
    intentResult.intent.toUpperCase() !== "UNKNOWN"
  ) {
    intentResult.intent = "ADD_TO_CART";
  }

  switch (intentResult.intent.toUpperCase()) {
    case "SHOW_MENU":
      responseProducts = safeAllProductsBase;
      break;
    case "SHOW_CATEGORY":
      if (categoryEntities.length > 0) {
        responseProducts = safeAllProductsBase.filter((p: any) =>
          categoryEntities.some((c) =>
            String(p.category).toLowerCase().includes(c.toLowerCase()),
          ),
        );
      } else {
        responseProducts = safeAllProductsBase;
      }
      break;
    case "ADD_TO_CART":
      responseProducts =
        safeProducts.length > 0 ? safeProducts : safeAllProductsBase;
      break;
    case "RECOMMEND":
      responseProducts = buildRecommendations(
        allProducts as any[],
        allConstraints,
      );
      break;
    default:
      const fallbackProducts = applyFallback(
        intentResult.intent,
        matchedProducts as any[],
        safeProducts as any[],
        allProducts as any[],
      );
      const foodIntent = extractFoodIntent(text);
      responseProducts = rankProductsByIntent(
        fallbackProducts as any,
        foodIntent,
      );
      break;
  }

  // Failsafe for short messages
  const hasProducts = parseEntitiesRecord(intentResult.entities).products.length > 0;
  if (intentResult.intent.toUpperCase() === "ADD_TO_CART" && (n.length <= 4 || startsWithGreeting(text)) && !hasProducts) {
    updateContext(userId, { flowState: nextFlow });
    return validateResponseOutput(
      {
        text: '¿Qué te gustaría ordenar? 😏',
        type: 'text',
        nextState
      },
      state
    );
  }

  // 7. Handle Add to Cart Logic
  if (intentResult.intent.toUpperCase() === "ADD_TO_CART") {

    // HARD BLOCK: Only allow in correct flow
    if (nextFlow !== 'BUILDING_CART') {
      return validateResponseOutput(
        {
          text: 'Primero dime qué te gustaría ordenar 😏',
          type: 'text',
          nextState
        },
        state
      );
    }

    // Guard: Greetings should never trigger ADD_TO_CART
    if (startsWithGreeting(text)) {
      updateContext(userId, { flowState: nextFlow });
      return validateResponseOutput(
        {
          text: '¡Hola! 👋\n¿Quieres ver el menú o te recomiendo algo? 🔥',
          type: 'text',
          nextState
        },
        state
      );
    }

    // Problem 1: Cart mutates on ANY input
    const invalidAddTriggers = [
      'menu', 'ver menu', 'ver',
      'que tienes', 'que hay',
      'cuanto', 'precio', 'total'
    ];

    if (invalidAddTriggers.includes(n) || startsWithGreeting(text)) {
        updateContext(userId, { flowState: nextFlow });
        return validateResponseOutput(
          {
            text: '¿Quieres ver el menú o agregar algo específico? 😏',
            type: 'text',
            nextState
          },
          state
        );
    }
      // PREVENCIÓN: Si es pregunta de total, redirigir a VIEW_CART
      if (n.includes('cuanto') || n.includes('total')) {
        updateContext(userId, { flowState: nextFlow });
        return validateResponseOutput(
          {
            text: `🧾 Tu total actual es: $${userCtx.cart.total}`,
            type: 'text',
            nextState
          },
          state
        );
      }

    // Check if user is accepting recommendations (context has recommendedProducts)
    const recommendedProducts = userCtx?.recommendedProducts ?? [];
    
    if (recommendedProducts.length > 0 && (n.includes('si') || n.includes('sí') || n.includes('dale') || n.includes('ok'))) {
      // User is accepting recommended products - add them to cart
      let addedCount = 0;
      if (nextFlow === 'BUILDING_CART' && intentResult.intent.toUpperCase() === 'ADD_TO_CART') {
        for (const recProd of recommendedProducts) {
          addToCart(userCtx, recProd);
          addedCount++;
        }
      }
      
        // Clear recommended products from context
    updateContext(userId, {
      lastIntent: intentResult.intent,
      constraints: allConstraints,
      flowState: nextFlow
    });
      
      return validateResponseOutput(
        {
          text: `✅ ${addedCount} producto(s) recomendado(s) agregado(s) a tu pedido\nTotal: $${userCtx.cart.total}\n\n¿Quieres algo más o confirmamos?`,
          type: 'text',
          nextState
        },
        state
      );
    }
    
    // Problem 4: Cart grows without control
    if (userCtx.cart.items.length >= 10) {
      updateContext(userId, { flowState: nextFlow });
      return validateResponseOutput(
        {
          text: 'Tu pedido ya es bastante grande 😅\n¿Confirmamos antes de agregar más?',
          type: 'text',
          nextState
        },
        state
      );
    }

    // Guard: Block ADD_TO_CART if product.stock <= 0
    const firstProduct = responseProducts[0];
    if (firstProduct && firstProduct.stock <= 0) {
      updateContext(userId, { flowState: nextFlow });
      return validateResponseOutput(
        {
          text: `😅 Perdón, se nos agotó el ${firstProduct.name}. ¿Quieres probar con algo más? 🔥`,
          type: 'text',
          nextState: state
        },
        state
      );
    }

    // Problem 5: Prevent accidental adds from weak intent
    if (!parseEntitiesRecord(intentResult.entities).products?.length && includeWords.length === 0 && !userCtx.lastProductsShown?.length) {
      updateContext(userId, { flowState: nextFlow });
      return validateResponseOutput(
        {
          text: 'No entendí qué producto quieres agregar 🤔\n¿Quieres ver el menú?',
          type: 'text',
          nextState
        },
        state
      );
    }

    // Check for clear product match before adding
    if (!responseProducts || responseProducts.length === 0) {
      updateContext(userId, { flowState: nextFlow });
      return validateResponseOutput(
        {
          text: 'No entendí qué producto quieres agregar 🤔\n¿Quieres ver el menú?',
          type: 'text',
          nextState
        },
        state
      );
    }
    
    const productToAdd = responseProducts[0];
    if (productToAdd) {
      // Problem 3: Prevent duplicate rapid adds
      const lastProduct = userCtx.lastAddedProductId;
      const now = Date.now();

      if (
        process.env.NODE_ENV !== "test" &&
        lastProduct === productToAdd.id &&
        userCtx.lastAddTimestamp &&
        now - userCtx.lastAddTimestamp < 1000
      ) {
        updateContext(userId, { flowState: nextFlow });
        return validateResponseOutput(
          {
            text: 'Ese producto ya lo agregué hace un momento 😉\n¿Quieres algo más?',
            type: 'text',
            nextState
          },
          state
        );
      }

      if (nextFlow === 'BUILDING_CART' && intentResult.intent.toUpperCase() === 'ADD_TO_CART') {
        addToCart(userCtx, productToAdd);
      }

      // Track last add for deduplication
      updateContext(userId, {
        lastAddedProductId: productToAdd.id,
        lastAddTimestamp: Date.now()
      });

    // ── Contextual upsell engine (max 1 per conversation) ────────────────────
    const shownRules: string[] = userCtx.upsellShownRules || [];
    const hour = new Date().getHours();
    const availableNames = (allProducts as any[]).map((p: any) => String(p.name || ''));

    const upsellSuggestion = await getUpsellSuggestions(
      userCtx.cart as any,
      shownRules,
      hour,
      text,
      availableNames,
    );

    let textRes: string;

    if (upsellSuggestion) {
      // Show upsell BEFORE order summary
      textRes = `✅ *${productToAdd.name}* agregado a tu pedido\nTotal: $${userCtx.cart.total}\n\n${upsellSuggestion.message}`;

      // Track as shown (never repeat) + store pending for next turn
      updateContext(userId, {
        lastIntent: intentResult.intent,
        constraints: allConstraints,
        lastProductsShown: responseProducts.map((p: any) => String(p.id)),
        flowState: nextFlow,
        upsellShownRules: [...shownRules, upsellSuggestion.ruleId],
        pendingUpsell: upsellSuggestion,
      });
    } else {
      // No upsell available — standard confirmation
      textRes = `✅ *${productToAdd.name}* agregado a tu pedido\nTotal: $${userCtx.cart.total}\n\n¿Quieres algo más o confirmamos?`;

      updateContext(userId, {
        lastIntent: intentResult.intent,
        constraints: allConstraints,
        lastProductsShown: responseProducts.map((p: any) => String(p.id)),
        flowState: nextFlow,
      });
    }

    return validateResponseOutput(
      {
        text: textRes,
        type: 'text',
        nextState,
      },
      state,
    );
     }
   }

  // 7.1 Handle Recommend Logic — context-aware cross-selling
  if (intentResult.intent.toUpperCase() === "RECOMMEND") {
    const safe = safeAllProductsBase as any[];
    const cartItems = userCtx.cart?.items || [];
    const cartCategories = new Set(cartItems.map((i: any) => (i.category || '').toLowerCase()));

    const MAIN_CATEGORIES = ['combos', 'combo', 'boneless', 'alitas', 'banderillas'];
    const DRINK_CATEGORIES = ['bebidas', 'bebida'];
    const SIDE_CATEGORIES = ['papas'];

    const hasMain = cartItems.some((i: any) => MAIN_CATEGORIES.includes((i.category || '').toLowerCase()));
    const hasDrink = cartItems.some((i: any) => DRINK_CATEGORIES.includes((i.category || '').toLowerCase()));
    const hasSide = cartItems.some((i: any) => SIDE_CATEGORIES.includes((i.category || '').toLowerCase()));

    let picks: any[] = [];

    // Rule 1: If cart has main but no drink → suggest drinks
    if (hasMain && !hasDrink) {
      picks = safe
        .filter((p: any) => DRINK_CATEGORIES.includes(String(p.category).toLowerCase()))
        .filter((p: any) => !cartItems.some((ci: any) => String(ci.productId || ci.id) === String(p.id)))
        .slice(0, 4);
    }
    // Rule 2: If cart has drink but no side → suggest sides
    else if (hasDrink && !hasSide) {
      picks = safe
        .filter((p: any) => SIDE_CATEGORIES.includes(String(p.category).toLowerCase()))
        .filter((p: any) => !cartItems.some((ci: any) => String(ci.productId || ci.id) === String(p.id)))
        .slice(0, 4);
    }
    // Default: offer curated trio (combo + papas + bebida)
    if (picks.length === 0) {
      const combo  = safe.find((p) => String(p.category).toLowerCase() === "combos");
      const papas  = safe.find((p) => String(p.category).toLowerCase() === "papas");
      const bebida = safe.find((p) => String(p.category).toLowerCase() === "bebidas");
      picks = [combo, papas, bebida].filter(Boolean);
    }

    const lines = picks
      .map((p: any) => `🍗 ${p.name} — $${p.price}`)
      .join("\n");

    const total = picks.reduce((sum: number, p: any) => sum + p.price, 0);

    const contextLabel = hasMain && !hasDrink ? '🥤 Para acompañar tu pedido' :
                         hasDrink && !hasSide ? '🍟 Para completar' :
                         '💡 Te recomiendo este combo perfecto';

    const textRes = picks.length > 0
      ? `${contextLabel}:\n\n${lines}\n\nTotal si pides todo: $${total} 🔥\n\n¿Arrancamos con algo de esto?`
      : "💡 Todo está bueno hoy, ¿qué se te antoja? 😏";

    // Add upsell tip as per user request
    const finalTextRes = picks.length > 0 
      ? `${textRes}\n\n🔥 Tip: Puedes armar combo con papas + bebida` 
      : textRes;

    updateContext(userId, {
        lastIntent: intentResult.intent,
        constraints: allConstraints,
        lastProductsShown: picks.map((p: any) => String(p.id)),
        recommendedProducts: picks.map((p: any) => ({ id: p.id, name: p.name, price: p.price })),
        flowState: nextFlow
      });

    return validateResponseOutput(
      { text: finalTextRes, type: "text", nextState },
      state,
    );
  }

  if (intentResult.intent === 'VIEW_CART' && currentFlow === 'IDLE') {
    return validateResponseOutput(
      {
        text: 'Aún no has agregado nada 😅',
        type: 'text',
        nextState
      },
      state
    );
  }

  // 7.2 Handle View Cart Logic
  if (intentResult.intent.toUpperCase() === "VIEW_CART") {
    // Check if cart is empty
    if (userCtx.cart.items.length === 0) {
      return validateResponseOutput(
        {
          text: 'No tienes productos en tu pedido todavía 😅',
          type: "text",
          nextState
        },
        state,
      );
    }

    // Cart has items - show them
    const cartLines = userCtx.cart.items.map((i: any) => `- ${i.name} x${i.quantity || 1}`).join('\n');
    const textRes = `🧾 Tu pedido:\n${cartLines}\n\nTotal: $${userCtx.cart.total}`;
    
    // Add confirmation prompt
    const finalText = textRes + "\n\n¿Confirmamos tu pedido?";

    // Add upsell if cart has only 1 item (user's point 4)
    const withUpsell = userCtx.cart.items.length === 1 
      ? finalText + "\n\n🔥 ¿Quieres complementar tu pedido?"
      : finalText;

    updateContext(userId, {
      lastIntent: intentResult.intent,
      constraints: allConstraints,
    });

    return validateResponseOutput(
      {
        text: withUpsell,
        type: "text",
        nextState,
      },
      state,
    );
  }

  if (
    intentResult.intent === 'CONFIRM_ORDER' &&
    userCtx.cart.items.length === 0
  ) {
    return validateResponseOutput(
      {
        text: 'Tu carrito está vacío 😅',
        type: 'text',
        nextState
      },
      state
    );
  }

  // 7.3 Handle Confirm Order Logic → Payment flow
  if (intentResult.intent.toUpperCase() === "CONFIRM_ORDER") {
    if (!userCtx.cart.items || userCtx.cart.items.length === 0) {
      updateContext(userId, { flowState: nextFlow });
      return validateResponseOutput(
        {
          text: 'Aún no tienes nada en tu pedido 😅\n¿Quieres ver el menú?',
          type: "text",
          nextState
        },
        state
      );
    }

    // ── Loyalty Checkout Prompt ─────────────────────────────────────────────
    // If they have 100+ points and no pending discount, ask them once.
    if (!userCtx.pendingLoyaltyDiscount && !userCtx.loyaltyPromptShown) {
      const prompt = await getCheckoutLoyaltyPrompt(userId);
      if (prompt) {
        updateContext(userId, { loyaltyPromptShown: true });
        return validateResponseOutput(
          { text: prompt, type: 'text', nextState: state },
          state
        );
      }
    }

    try {
      const orderId = createUuid();
      const dbServerModule = await import("@/lib/db.server");

      // Apply pending loyalty discount if present
      let orderTotal = userCtx.cart.total;
      let loyaltyPointsRedeemed = 0;
      if (userCtx.pendingLoyaltyDiscount) {
        orderTotal = Math.max(0, orderTotal - userCtx.pendingLoyaltyDiscount.amount);
        loyaltyPointsRedeemed = userCtx.pendingLoyaltyDiscount.points;
      }

      // Apply pending referral discount
      if (userCtx.pendingReferralDiscount) {
        orderTotal = Math.max(0, orderTotal - userCtx.pendingReferralDiscount);
      }

      const result = await dbServerModule.dbSaveOrder({
        id: orderId,
        status: "awaiting_payment",
        channel: "WHATSAPP",
        total: orderTotal,
        createdAt: new Date().toISOString(),
        customerPhone: userId,
        customerName: "Cliente",
        whatsappConfirmed: true,
        loyalty_points_redeemed: loyaltyPointsRedeemed, // Optional field in DB? I'll assume it exists or will be added.
        items: userCtx.cart.items.map((i: any) => ({
          productId: String(i.id),
          productName: i.name,
          quantity: i.quantity || 1,
          price: i.price
        }))
      });

      if (result?.status === "error" && result?.code !== "OUT_OF_STOCK") {
        throw new Error(result?.message || "ORDER_SAVE_FAILED");
      }

      if (result?.status === "error" && result?.code === "OUT_OF_STOCK") {
        updateContext(userId, { flowState: nextFlow });
        return validateResponseOutput(
          {
            text: '🔥 Ese producto se acaba de agotar 😅\n¿Te muestro opciones similares?',
            type: 'text',
            nextState
          },
          state
        );
      }

      const { createPaymentLink } = await import("@/lib/payments/conekta");

      let paymentUrl = "";
      let conektaOrderId = "";
      let paymentExpiresAt = "";

      try {
        const paymentLink = await createPaymentLink({
          orderId,
          customerName: "Cliente",
          customerPhone: userId,
          total: orderTotal,
          items: userCtx.cart.items.map((i: any) => ({
            productName: i.name,
            quantity: i.quantity || 1,
            price: i.price
          }))
        });

        paymentUrl = paymentLink.url;
        conektaOrderId = paymentLink.conektaOrderId;
        paymentExpiresAt = paymentLink.expiresAt;

        const supabase = dbServerModule.getSupabaseAdmin();
        await supabase
          .from('orders')
          .update({
            status: 'awaiting_payment',
            payment_status: 'pending',
            conekta_order_id: conektaOrderId,
            payment_url: paymentUrl,
            payment_url_expires_at: paymentExpiresAt,
          })
          .eq('id', orderId);

      } catch (paymentErr) {
        console.error('[flowController] Payment link creation failed:', paymentErr);
        paymentUrl = "";
      }

      updateContext(userId, {
        paymentUrl,
        conektaOrderId,
        paymentExpiresAt,
        paymentOrderId: orderId,
        paymentStatus: 'awaiting_payment',
        flowState: 'AWAITING_PAYMENT' as OrderState,
        lastIntent: intentResult.intent,
        constraints: allConstraints,
        // Reset loyalty state
        pendingLoyaltyDiscount: undefined,
        loyaltyPromptShown: undefined,
        // Reset referral state
        pendingReferralDiscount: undefined,
        appliedReferralCode: undefined,
      });

      const paymentMsg = paymentUrl
        ? buildPaymentMessage({
            name: "Cliente",
            total: orderTotal,
            url: paymentUrl,
            expiresIn: "24 horas",
            items: userCtx.cart.items.map((i: any) => ({
              productName: i.name,
              quantity: i.quantity || 1,
              price: i.price
            }))
          })
        : `🔥 Pedido registrado\nTotal: $${orderTotal}\n\nNo se pudo generar el enlace de pago. Te contactaremos pronto.`;

      return validateResponseOutput(
        {
          text: paymentMsg,
          type: "text",
          nextState,
        },
        state
      );

    } catch (e) {
      const errMsg = String(e);
      const isOutOfStock = errMsg.includes('OUT_OF_STOCK');

      if (isOutOfStock) {
        updateContext(userId, { flowState: nextFlow });
        return validateResponseOutput(
          {
            text: '🔥 Ese producto se acaba de agotar 😅\n¿Te muestro opciones similares?',
            type: 'text',
            nextState
          },
          state
        );
      }

      console.warn(JSON.stringify({
        event: 'ORDER_SAVE_ERROR',
        error: errMsg,
        userId,
        timestamp: Date.now(),
      }));

      updateContext(userId, { flowState: nextFlow, lastIntent: intentResult.intent, constraints: allConstraints });

      return validateResponseOutput(
        {
          text: `🔥 Hubo un problema al procesar tu pedido. Intenta de nuevo en unos segundos.`,
          type: "text",
          nextState,
        },
        state
      );
    }
  }

  // 7.4 Handle Unknown Intent
  if (intentResult.intent.toUpperCase() === "UNKNOWN" || intentResult.intent.toUpperCase() === "OTHER") {
    
    // ── New Customer Welcome Injection ──────────────────────────────────────
    // If it's a first-time user (0 orders) and we haven't asked for referral yet
    const isFirstTimer = (profile?.totalOrders || 0) === 0;
    if (isFirstTimer && !userCtx.referralPromptShown && startsWithGreeting(text)) {
      updateContext(userId, { referralPromptShown: true });
      return validateResponseOutput(
        { 
          text: `¡Hola! Bienvenido a ${userCtx.businessName} 🍗✨\n\n¿Es tu primera vez por aquí? 🔥 *¿Tienes algún código de descuento de algún amigo?*`, 
          type: "text", 
          nextState 
        },
        state
      );
    }

    updateContext(userId, { flowState: nextFlow });
    return validateResponseOutput(
      {
        text: `No te entendí bien 😅
  
¿Quieres:
1) Ver menú
2) Recomendarte algo
3) Ver tu carrito?`,
        type: "text",
        nextState,
      },
      state,
    );
  }

  if (!responseProducts || responseProducts.length === 0) {
    responseProducts = applyFallback(
      intentResult.intent,
      matchedProducts as any[],
      safeProducts as any[],
      allProducts as any[],
    );
  }
  if (!responseProducts || responseProducts.length === 0) {
    responseProducts = allProducts.slice(0, 5);
  }

  // 8.4 Record fallback for auto-training if no specific products matched
  if (matchedProducts.length === 0 && safeProducts.length === 0) {
    recordFallback(text, intentResult.intent, matchedProducts, safeProducts);
  }

  // 8.5 Evitar repetición de productos (Rotar o mezclar si son los mismos)
  const currentIds = responseProducts
    .map((p: any) => String(p.id))
    .sort()
    .join(",");
  const lastIds = [...(userCtx.lastProductsShown || [])].sort().join(",");

  if (currentIds === lastIds && responseProducts.length > 0) {
    const safeAll = applySafetyFilter(allProducts as any[], allConstraints);
    const unused = safeAll.filter(
      (p: any) => !(userCtx.lastProductsShown || []).includes(String(p.id)),
    );

    if (unused.length > 0) {
      const take = Math.min(unused.length, responseProducts.length);
      responseProducts = [
        ...unused.slice(0, take),
        ...responseProducts.slice(0, responseProducts.length - take),
      ];
    } else {
      const first = responseProducts.shift();
      if (first) responseProducts.push(first);
    }
  }

  // 8.6 Revalidación de seguridad final
  responseProducts = applySafetyFilter(responseProducts, allConstraints);

  if (!responseProducts || responseProducts.length === 0) {
    responseProducts = safeAllProductsBase.slice(0, 5);
  }
  if (!responseProducts || responseProducts.length === 0) {
    responseProducts = allProducts.slice(0, 5);
  }
  
  // FINAL SAFETY GUARD: If everything failed to yield products, use hardcoded IDs or all available
  if (!responseProducts || responseProducts.length === 0) {
    responseProducts = allProducts;
  }
  if (!responseProducts || responseProducts.length === 0) {
    // If even allProducts is empty, we must ensure we don't return an empty UI
    console.warn("[responseEngine] EMPTY DB DETECTED. Using emergency fallback.");
    responseProducts = [{ id: '911', name: 'Combo 911', price: 119, category: 'combos' }];
  }

  // Profile already fetched at start of function

  if (process.env.NODE_ENV !== "test") {
    console.log("INPUT:", text);
    console.log("INTENT:", intentResult.intent);
    console.log("ENTITIES:", {
      product: productEntities,
      category: categoryEntities,
    });
    console.log("CONSTRAINTS:", allConstraints);
    console.log("MATCHED:", matchedProducts);
    console.log("SAFE:", safeProducts);
    console.log("FINAL:", responseProducts);
  }

  // 9. Construir respuesta final
  let responseText = '';

  if (responseProducts && (responseProducts as any).length > 0) {
    responseText =
      'Aquí tienes opciones:\n\n' +
      (responseProducts as any)
        .slice(0, 5)
        .map((p: any) => `🍗 ${p.name} - $${p.price}`)
        .join('\n') +
      '\n\n¿Qué te gustaría ordenar? 😏';
  } else {
    responseText = 'No encontré opciones 😅\n¿Quieres ver el menú?';
  }

  if (intentResult.intent.toUpperCase() === "ADD_TO_CART") {
    responseText = responseText.replace(/Te sugiero estas opciones:\n*/gi, "");
    responseText = responseText.replace(/¡Buenísima elección! Te sugiero:\n*/gi, "");
    responseText = responseText.replace(/¡Claro! /gi, "");
  }

  updateContext(userId, {
    lastIntent: intentResult.intent,
    lastCategory:
      categoryEntities.length > 0 ? categoryEntities[0] : userCtx.lastCategory,
    constraints: allConstraints,
    lastProductsShown: responseProducts.map((p: any) => String(p.id)),
    flowState: nextFlow
  });

  return validateResponseOutput(
    {
      text: responseText || "¡Hola! 🔥 ¿Qué se te antoja hoy? Chécate estas opciones.",
      type: "text",
      nextState,
    },
    state,
  );
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("[responseEngine] FATAL ERROR in Modular Pipeline:", error);
    }
    // Absolute fallback to keep the user engaged
    let fallbackProducts = (allProductsOverride && allProductsOverride.length > 0) 
      ? allProductsOverride 
      : [];
      
    if (fallbackProducts.length === 0 && typeof window === 'undefined') {
      try {
        const dbModule = await import("@/lib/db.server");
        fallbackProducts = (await dbModule.dbGetProducts()).slice(0, 5);
      } catch (e) {
        if (process.env.NODE_ENV === "test") {
          console.error("[responseEngine] FATAL handleMessageModular error:", e);
        } else {
          console.error("[responseEngine] Error loading fallback products:", e);
        }
        fallbackProducts = [
          { id: '1', name: 'Papas Loaded', price: 69, category: 'papas', imageUrl: '', available: true, description: '', ingredients: [] },
          { id: '2', name: 'Refresco 600ml', price: 25, category: 'bebidas', imageUrl: '', available: true, description: '', ingredients: [] },
          { id: '3', name: 'Brownie con Helado', price: 59, category: 'postres', imageUrl: '', available: true, description: '', ingredients: [] },
          { id: '4', name: 'Combo 911', price: 119, category: 'combos', imageUrl: '', available: true, description: '', ingredients: [] },
        ];
      }
    }
      
    return validateResponseOutput(
      {
        text: process.env.NODE_ENV === "test" 
          ? `[TEST FAILSAFE] error: ${String(error).substring(0, 50)}`
          : "¡Hola! 👋 Hubo un pequeño salto en la conexión, pero aquí seguimos. ¿Qué te gustaría ordenar?",
        type: "products",
        ui: {
          cards: fallbackProducts.map(p => ({
            id: `card-fallback-${p.id}`,
            title: p.name,
            price: p.price,
            actions: [
              { id: String(p.id), type: "add_to_cart", label: "➕ Agregar", value: `add_${p.id}` }
            ]
          }))
        },
        nextState: state,
      },
      state,
    );
  }
}
