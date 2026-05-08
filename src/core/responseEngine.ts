/**
 * core/responseEngine.ts — GOD MODE Sales OS.
 *
 * Pipeline:
 *   1. detectIntent(text)
 *   2. updateState(intent, action, textInput)
 *   3. getPromptByStage(intent, stage, upsellStep)
 *   4. applyLoopStrategy() — changes strategy, not wording
 *   5. OUTPUT → { text, actions?, nextState }
 */

import { filterProducts } from "./allergyFilter";
import { createUuid } from "@/lib/uuid";
import { extractFoodIntent, rankProductsByIntent } from "./contextRanker";
import { detectIntent } from "./intentDetector";
import { applyLoopStrategy, getBestStrategyFromAnalyticsSync } from "./antojo";
import type { AntiLoopStrategy } from "./antojo";
import { getBestStrategyFromAnalytics } from "./antojo";
import { getContext, clearContext, updateContext } from "./context";
import { addToCart, getCartContext, clearCartContext, getCartSummary } from "./cartEngine";
import { resolveNextState, type OrderState } from "./orderFlow";
import type {
  ConversationState,
  ResponseOutput,
  QuickAction,
  ProductRefs,
  PromptContext,
  Intent,
  Stage,
} from "./types";
import { getThermostatSettings } from "./salesThermostat";
import { validateResponseOutput } from "./responseValidator";
import { recordFallback } from "./autoTrainer";
import { isGreetingOnly, startsWithGreeting } from "./nluBaseline";
import { inventoryFilter } from "./inventoryFilter";

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
  cart: [],
  cartTotal: 0,
  whatsappUrl: null,
  orderTimestamp: undefined,
  reset: false,
  messages: [],
  allergies: [],
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

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

  if (next.cart.length > 0 && next.customerName && next.customerAddress) {
    const items = next.cart.map((i) => `• ${i}`).join("\n");
    const msg = `🔥 *Nuevo Pedido Snacks 911*\n\n🧾 Pedido:\n${items}\n\n💰 Total: $${next.cartTotal}\n\n📍 Entrega:\n• Nombre: ${next.customerName}\n• Dirección: ${next.customerAddress}\n• Referencia: ${next.customerReference || "N/A"}\n• Pago: ${next.customerPayment}\n\n👉 Tiempo estimado: 20-30 min`;
    next.whatsappUrl = `https://wa.me/525584507458?text=${encodeURIComponent(msg)}`;
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

  if (!state.comboSelected && state.cart.length === 0) {
    const comboAction = inferComboAction(lower);
    if (comboAction) return comboAction;
    if (intent === "aceptacion" && state.stage !== "ordenando")
      return "accept_combo_911";
  }

  if (!state.comboSelected || state.deliveryStep !== "none") {
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
    if (
      !state.cart.some((item) => item.includes("Papas")) &&
      hasAny(lower, ["papas", "loaded", "gajo"])
    )
      return "add_papas";
    if (
      !state.cart.some((item) => item.includes("Refresco")) &&
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
      !state.cart.some((item) => item.includes("Brownie")) &&
      hasAny(lower, ["brownie", "helado", "postre", "churro", "dulce"])
    )
      return "add_postre";
  }

  return undefined;
}

// ─── Upsell Generator ────────────────────────────────────────────────────────

function generateUpsell(productCategory: string, cart: any): string | null {
  // RULE: Skip if 3+ products in cart
  if (cart.items.length >= 3) return null;

  // RULE: Skip if already has bebida + papas + proteína
  const cartCategories = cart.items.map((item: any) => String(item.category || '').toLowerCase());
  const hasProteina = cartCategories.some((cat: string) => 
    ['proteina', 'alitas', 'boneless', 'pollo'].includes(cat)
  );
  const hasPapas = cartCategories.some((cat: string) => cat === 'papas');
  const hasBebidas = cartCategories.some((cat: string) => cat === 'bebidas');
  if (hasProteina && hasPapas && hasBebidas) return null;

  // Per-category upsell logic
  if (productCategory === 'proteina') {
    return "🔥 ¿Le agregamos papas o bebida para completar tu pedido?";
  }
  if (productCategory === 'papas') {
    return "🔥 ¿Quieres agregar una proteína como boneless o alitas?";
  }
  if (productCategory === 'combos') {
    return "🔥 ¿Te agrego una salsa o bebida extra?";
  }
  if (productCategory === 'bebidas') {
    return "🔥 ¿Te agrego algo para acompañar como boneless o papas?";
  }
  return null;
}

// ─── Stage-aware prompt selector (GOD MODE copy) ──────────────────────────────

function getPromptByStage(
  intent: Intent,
  stage: Stage,
  upsellStep: ConversationState["upsellStep"],
): {
  text: (ctx: PromptContext) => string;
  actions?: QuickAction[] | ((ctx: PromptContext) => QuickAction[]);
  type?: "text" | "buttons" | "products";
} {
  // ── rechazo_fuerte: soft reset, zero pressure ────────────────────────────
  if (intent === "rechazo_fuerte") {
    return {
      text: () => `Sin presión. Cuando se te antoje, aquí seguimos. 🤘`,
    };
  }

  // ── pago_problema: payment alternatives, keep purchasing flow ────────────
  if (intent === "pago_problema") {
    return {
      text: () =>
        `Sin bronca. Aceptamos **transferencia** o **QR**.\n\n¿Cuál te va mejor?`,
      actions: [
        { label: "📱 QR", value: "payment_qr" },
        { label: "💳 Transferencia", value: "payment_transfer" },
      ],
    };
  }

  // ── rechazo: reduce pressure, offer 3 different alternatives ────────────
  if (intent === "rechazo") {
    return {
      text: () => `Entendido. ¿Algo diferente?`,
      actions: [
        { label: "🍗 Alitas", value: "show_alitas" },
        { label: "🥡 Boneless", value: "show_boneless" },
        { label: "🔥 Ver combos", value: "exploracion" },
      ],
    };
  }

  switch (stage) {
    // ── INICIO ────────────────────────────────────────────────────────────────
    case "inicio":
      if (intent === "gratitud") {
        return {
          text: () => `¡De nada! 🔥 Cuando quieras repetir, aquí estamos.`,
        };
      }
      if (intent === "despedida") {
        return { text: () => `¡Hasta luego! Que lo disfrutes. 🤘` };
      }
      // Default: ANTOJO hook → direct recommendation → single clear CTA
      return {
        text: (ctx) => {
          const welcomeVariants = [
            `🔥 **Crujientes, jugosos, recién hechos.**\n\n👉 **${ctx.comboName}** — $${ctx.comboPrice}. El más pedido.\n\n¿Lo preparo?`,
            `🤤 **Huele increíble por aquí.**\n\n👉 **${ctx.comboName}** — $${ctx.comboPrice}. El que todos piden.\n\n¿Va?`,
            `🔥 **Todo recién salido del horno.**\n\n👉 **${ctx.comboName}** — $${ctx.comboPrice}. El clásico que no falla.\n\n¿Lo preparo?`,
            `⚡ **Listo en 2 minutos.**\n\n👉 **${ctx.comboName}** — $${ctx.comboPrice}. El más vendido de la semana.\n\n¿Va?`,
          ];
          return welcomeVariants[
            Math.floor(Math.random() * welcomeVariants.length)
          ];
        },
        actions: [
          { label: "🔥 Sí, dámelo", value: "accept_combo_911" },
          { label: "🍗 Boneless", value: "accept_combo_boneless" },
          { label: "🌮 Callejero", value: "accept_combo_callejero" },
        ],
      };

    // ── EXPLORANDO ────────────────────────────────────────────────────────────
    case "explorando":
      if (intent === "exploracion") {
        return {
          text: () =>
            `Lo que hay:\n\n• 🔥 Combos — los más pedidos\n• 🍗 Alitas BBQ y Buffalo\n• 🥡 Boneless Clásico e Inferno\n• 🍟 Papas Gajo y Loaded\n• 🌭 Banderillas\n• 🍫 Postres\n\n¿Qué se te antoja?`,
          actions: [
            { label: "🔥 Combo 911", value: "accept_combo_911" },
            { label: "🍗 Alitas", value: "show_alitas" },
            { label: "🥡 Boneless", value: "show_boneless" },
          ],
        };
      }
      if (intent === "browsing") {
        return {
          text: (ctx) =>
            `Dale, mira. El **${ctx.comboName}** está cuando lo quieras. 🔥`,
        };
      }
      return {
        text: (ctx) =>
          `👉 **${ctx.comboName}** — $${ctx.comboPrice}. El que todos eligen.`,
        actions: [{ label: "🔥 Va, dámelo", value: "accept_combo_911" }],
      };

    // ── DECIDIENDO ────────────────────────────────────────────────────────────
    case "decidiendo":
      // duda → BOT DECIDES. No question. Direct push.
      if (intent === "duda") {
        return {
          text: (ctx) =>
            `Te decido yo: **${ctx.comboName}** — $${ctx.comboPrice}. Crujiente, caliente, todo incluido. 🔥\n\n¿Va?`,
          actions: [{ label: "🔥 Va, dámelo", value: "accept_combo_911" }],
        };
      }
      if (intent === "precio") {
        return {
          text: (ctx) =>
            `El que más conviene: **${ctx.comboBonelessName}** — $${ctx.comboBonelessPrice}.\n\nAhorras $${ctx.ahorroBoneless} vs individual. ¿Va?`,
          actions: [
            { label: "🔥 Sí, va", value: "accept_combo_boneless" },
            { label: "🌮 Callejero $89", value: "accept_combo_callejero" },
          ],
        };
      }
      if (intent === "hambre" || intent === "pedido") {
        return {
          text: (ctx) =>
            `🔥 **${ctx.comboName}** — $${ctx.comboPrice}. Recién hecho, caliente.\n\n¿Lo preparo?`,
          actions: [
            { label: "🔥 Sí, dámelo", value: "accept_combo_911" },
            { label: "🍗 Boneless", value: "accept_combo_boneless" },
          ],
        };
      }
      // Fallback decidiendo
      return {
        text: (ctx) =>
          `👉 **${ctx.comboName}** — $${ctx.comboPrice}. El que mejor sabe.\n\n¿Va?`,
        actions: [{ label: "🔥 Sí, dámelo", value: "accept_combo_911" }],
      };

    // ── ORDENANDO ─────────────────────────────────────────────────────────────
    case "ordenando":
      // UPSELL 1: PAPAS - Tecnica Pie en la Puerta + Anclaje
      if (upsellStep === "none" || upsellStep === "papas") {
        return {
          text: (ctx) =>
            `🍟 ¡Excelente elección! \n\nAcompaña tus ${ctx.comboName} con unas papas loaded extra crujientes. \n\n🔥 Solo +$${ctx.papasPrice}.`,
          type: "products",
          actions: (ctx) => [
            {
              label: "🍟 Sí, agrégalas",
              value: "add_papas",
              price: ctx.papasPrice,
              image:
                "https://images.unsplash.com/photo-1573082833946-f99a2dbbb50d?auto=format&fit=crop&w=400",
            },
            { label: "🤔 Por ahora no", value: "skip_papas" },
          ],
        };
      }
      // UPSELL 2: BEBIDA - Aversión a la perdida
      if (upsellStep === "bebida") {
        return {
          text: (ctx) =>
            `🥤 ¡Refrescante! \n\nUn refresco bien frío para acompañar. Casi todo el mundo lo agrega.\n\n💡 +$${ctx.bebidaPrice}.`,
          type: "products",
          actions: (ctx) => [
            {
              label: "🥤 Sí, dámelo",
              value: "add_bebida",
              price: ctx.bebidaPrice,
              image:
                "https://images.unsplash.com/photo-1596803244618-5d346399c390?auto=format&fit=crop&w=400",
            },
            { label: "🤔 Paso", value: "skip_bebida" },
          ],
        };
      }
      // UPSELL 3: POSTRE - Prueba Social + Reciprocidad
      if (upsellStep === "postre") {
        return {
          text: (ctx) =>
            `🍫 ¡El toque final! \n\nUn brownie caliente con helado para cerrar con broche de oro. \n\n✨ +$${ctx.postrePrice}.`,
          type: "products",
          actions: (ctx) => [
            {
              label: "🍫 ¡SÍ, QUIERO!",
              value: "add_postre",
              price: ctx.postrePrice,
              image:
                "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400",
            },
            { label: "🤔 Por ahora no", value: "skip_postre" },
          ],
        };
      }
      // upsellStep === 'done' → close
      if (upsellStep === "done") {
        return {
          text: (ctx) =>
            `🔥 Pedido listo. Total: **$${ctx.currentTotal}**\n\n¿Confirmamos?`,
          actions: [
            { label: "✅ Confirmar", value: "confirm_order" },
            { label: "🔄 Otro pedido", value: "order_again" },
          ],
        };
      }

      // Non-upsell intents within ordenando
      if (intent === "edicion") {
        return {
          text: (ctx) =>
            `Claro. ¿Qué agrego?\n\n• Papas Loaded — $${ctx.papasPrice}\n• Refresco — $${ctx.bebidaPrice}\n• Brownie — $${ctx.postrePrice}`,
          actions: [
            { label: "🍟 Papas", value: "add_papas" },
            { label: "🥤 Refresco", value: "add_bebida" },
            { label: "🍫 Brownie", value: "add_postre" },
          ],
        };
      }
      if (intent === "urgencia") {
        return {
          text: (ctx) =>
            `🔥 **${ctx.comboName}** — el más rápido de preparar. ¿Lo envío?`,
          actions: [{ label: "🔥 Rápido, dámelo", value: "accept_combo_911" }],
        };
      }
      // Guardia: nunca vacío en ordenando
      return {
        text: (ctx) =>
          `🔥 Pedido en progreso. Total: **$${ctx.currentTotal}**.\n\n¿Confirmamos?`,
        actions: [
          { label: "✅ Confirmar", value: "confirm_order" },
          { label: "Agregar algo", value: "edicion" },
        ],
      };

    // ── POST_VENTA ────────────────────────────────────────────────────────────
    case "post_venta":
      if (intent === "edicion") {
        return {
          text: (ctx) =>
            `¡Claro! Todavía estamos a tiempo. Agregamos lo que faltó a tu pedido actual de $${ctx.currentTotal}. ¿Qué más le ponemos?`,
        };
      }
      if (intent === "gratitud") {
        return { text: () => `¡De nada! 🔥 Buen provecho. 🍗` };
      }
      if (intent === "despedida") {
        return { text: () => `¡Hasta luego! 🤘` };
      }
      return { text: () => `Aquí seguimos para lo que necesites. 😊` };
  }
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

// ─── Anti-loop: STRATEGY ROTATOR (not wording change) ─────────────────────────

/**
 * When a loop is detected, applies a DIFFERENT SALES STRATEGY.
 * Cycles: ANTOJO → FOMO → SOCIAL PROOF → PRICE ANCHOR
 * The base message stays the same — the angle changes.
 */
function applyAntiLoop(
  text: string,
  lastResponse: string | null,
  retryCount: number,
  ctx: PromptContext,
): { text: string; newRetryCount: number } {
  if (!lastResponse || text === lastResponse) {
    if (!lastResponse) return { text, newRetryCount: 0 };

    // Loop detected → pick best strategy from analytics (sync cache),
    // fallback to deterministic rotation if no analytics data available
    const strategy: AntiLoopStrategy = getBestStrategyFromAnalyticsSync(retryCount);
    const modifiedText = applyLoopStrategy(
      text,
      strategy,
      ctx.comboName,
      "combos",
      ctx.comboPrice,
      ctx.comboPrice + ctx.ahorroBoneless,
    );

    return { text: modifiedText, newRetryCount: retryCount + 1 };
  }

  return { text, newRetryCount: 0 };
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

  if (
    !resolvedAction &&
    !action &&
    intent === "pedido" &&
    !next.comboSelected &&
    next.cart.length === 0
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
      next.cart = [comboMap[resolvedAction].name];
      next.cartTotal = comboMap[resolvedAction].price;
      next.stage = "ordenando";
    }

    if (resolvedAction === "add_papas") {
      next.upsellStep = "bebida";
      next.cart = [...next.cart, "Papas Loaded"];
      next.cartTotal += 69;
    }
    if (resolvedAction === "skip_papas") {
      next.upsellStep = "bebida";
    }
    if (resolvedAction === "add_bebida") {
      next.upsellStep = "postre";
      next.cart = [...next.cart, "Refresco 600ml"];
      next.cartTotal += 25;
    }
    if (resolvedAction === "skip_bebida") {
      next.upsellStep = "postre";
    }
    if (resolvedAction === "add_postre") {
      next.upsellStep = "done";
      next.cart = [...next.cart, "Brownie con Helado"];
      next.cartTotal += 59;
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
    next.cart.length === 0
  ) {
    next.comboSelected = true;
    next.upsellStep = "papas";
    next.cart = ["🔥 Combo 911"];
    next.cartTotal = 119;
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

// ─── Delivery prompts (short, direct) ─────────────────────────────────────────

function getDeliveryPrompt(
  step: ConversationState["deliveryStep"],
): { text: string; actions?: QuickAction[] } | null {
  switch (step) {
    case "name":
      return { text: `📍 Tu **nombre** para el envío.` };
    case "address":
      return { text: `📍 ¿Tu **dirección** de entrega?` };
    case "reference":
      return {
        text: `🏠 ¿Alguna **referencia** para llegar? (o escribe "ninguna")`,
      };
    case "payment":
      return {
        text: `💰 ¿Cómo pagas?\n\n• Efectivo 💵\n• Transferencia/QR 📱`,
        actions: [
          { label: "💵 Efectivo", value: "payment_cash" },
          { label: "📱 QR/Transferencia", value: "payment_qr" },
        ],
      };
    case "done":
      return {
        text: `🔥 **Pedido confirmado.**\n\n👉 Preparando todo recién hecho. 🤤\n👉 Te avisamos en cuanto salga.\n\nGracias por Snacks 911. 🔥`,
      };
    default:
      return null;
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
        actions: [
          {
            id: "p1",
            label: "Combo Mixto",
            value: "add_combo_mixto",
            price: 120,
            image:
              "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=400",
          },
          {
            id: "p5",
            label: "Papas Gajo",
            value: "add_papas_gajo",
            price: 80,
            image:
              "https://images.unsplash.com/photo-1573082833946-f99a2dbbb50d?auto=format&fit=crop&w=400",
          },
          {
            id: "p3",
            label: "Boneless Mango",
            value: "add_boneless_mango",
            price: 130,
            image:
              "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400",
          },
        ],
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
    console.error("[responseEngine] FATAL ERROR in Legacy Pipeline:", error);
    return validateResponseOutput(
      {
        text: `¡Hola! 🔥 El **${products.comboName}** ($${products.comboPrice}) es nuestra recomendación de hoy. ¿Te lo preparamos?`,
        type: "text",
        nextState: state,
      },
      state,
    );
  }
}

// ─── Exported helpers (used by ChatBot.tsx) ───────────────────────────────────

export function buildDeliveryPrompt(state: ConversationState): {
  text: string;
  actions?: QuickAction[];
} {
  return getDeliveryPrompt(state.deliveryStep) ?? { text: "" };
}

export function buildOrderConfirmation(
  state: ConversationState,
  products: ProductRefs,
): { text: string; actions?: QuickAction[] } {
  const t = state.cartTotal || products.currentTotal;
  const items: string[] = [];
  if (state.comboSelected) items.push(`- ${products.comboName} x1`);
  if (products.hasPapas) items.push(`- ${products.papasName} x1`);
  if (products.hasBebida) items.push(`- ${products.bebidaName} x1`);
  if (products.hasPostre) items.push(`- ${products.postreName} x1`);

  return {
    text: `🧾 **Tu pedido:**\n\n${items.join("\n")}\n\n💰 **Total: $${t}**\n\n👉 20-30 min\n\n¿Confirmas? ✅`,
    actions: [
      { label: "✅ Confirmar", value: "confirm_order" },
      { label: "🔄 Otro pedido", value: "order_again" },
    ],
  };
}
/**
 * handleMessageModular() — NEW Modular Sales System Engine Integration.
 *
 * Orchestrates the full pipeline using specialized agents.
 */
function parseUserRequest(text: string) {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents

  // Extract include keywords (e.g., "quiero papas", "dame alitas", "papas")
  const includeMatch =
    lower.match(
      /\b(?:con|quiero|dame)\s+([a-z\s]+?)(?=\s+(?:pero|sin)\s+|$)/i,
    ) || lower.match(/^([a-z\s]+?)(?=\s+(?:sin|pero sin)\s+|$)/i);

  let includeWords: string[] = [];
  if (includeMatch) {
    includeWords = includeMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // Expand allergy patterns (Normalized: no accents)
  const allergyPatterns = [
    /\b(?:sin|pero sin)\s+([a-z\s]+)(?=\s+|$|[,.])\b/i,
    /\b(?:soy alergico a|alergico a|no puedo comer)\s+([a-z\s]+)(?=\s+|$|[,.])\b/i,
  ];

  let excludeWords: string[] = [];
  for (const pattern of allergyPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const extracted = match[1]
        .trim()
        .split(/\s+/)
        .filter(
          (w) =>
            !["la", "el", "los", "las", "un", "una"].includes(
              w.toLowerCase(),
            ) && w.length > 2,
        );
      excludeWords = [...excludeWords, ...extracted];
    }
  }

  return { includeWords, excludeWords: Array.from(new Set(excludeWords)) };
}

function normalizeConstraintList(
  values: Array<string | undefined | null>,
): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase().trim())
        .filter(Boolean),
    ),
  );
}

function extractProductEntities(
  intentResult: any,
  includeWords: string[],
): string[] {
  return normalizeConstraintList([
    ...(intentResult.entities?.products || []),
    ...(intentResult.entities?.product ? [intentResult.entities.product] : []),
    ...includeWords,
  ]);
}

function extractCategoryEntities(intentResult: any): string[] {
  return normalizeConstraintList([
    ...(intentResult.entities?.categories || []),
    ...(intentResult.category && intentResult.category !== "none"
      ? [intentResult.category]
      : []),
  ]);
}

function applySafetyFilter(products: any[], constraints: string[]): any[] {
  if (!constraints || constraints.length === 0) {
    return products;
  }
  return filterProducts(products, constraints);
}

function applyFallback(
  intent: string,
  matchedProducts: any[],
  safeProducts: any[],
  allProducts: any[],
): any[] {
  if (safeProducts && safeProducts.length > 0) {
    return safeProducts;
  }
  if (matchedProducts && matchedProducts.length > 0) {
    return matchedProducts;
  }
  const topGlobal = allProducts ? allProducts.slice(0, 5) : [];
  if (topGlobal.length > 0) {
    return topGlobal;
  }
  return allProducts || [];
}

function buildRecommendations(
  products: any[],
  constraints: string[] = [],
): any[] {
  const safeProducts = applySafetyFilter(products, constraints);

  // Shuffle safe products to provide variety
  const shuffled = [...safeProducts].sort(() => Math.random() - 0.5);

  const combos = shuffled.filter(
    (p) => String(p.category).toLowerCase() === "combos",
  );
  const proteina = shuffled.filter((p) => {
    const cat = String(p.category).toLowerCase();
    return cat === "proteina" || cat === "alitas" || cat === "boneless";
  });
  const papas = shuffled.filter((p) => {
    const cat = String(p.category).toLowerCase();
    const name = String(p.name).toLowerCase();
    return cat === "papas" || name.includes("papas");
  });

  const selected = new Set<any>();

  // Ensure variety: combo + papas + proteína
  if (combos.length > 0) selected.add(combos[0]);
  if (papas.length > 0) selected.add(papas[0]);
  if (proteina.length > 0) selected.add(proteina[0]);

  // Fill remaining slots up to 5 with shuffled products
  for (const p of shuffled) {
    if (selected.size >= 5) break;
    selected.add(p);
  }

  return Array.from(selected);
}

function matchProducts(
  intent: string,
  entities: { product?: string[]; category?: string[] },
  products: any[],
): any[] {
  let filtered = [...products];
  const productEntities = entities.product || [];
  const categoryEntities = entities.category || [];

  // si intent = SHOW_CATEGORY: devolver todos los de la categoría
  if (intent === "SHOW_CATEGORY" && categoryEntities.length > 0) {
    return filtered.filter((p) => {
      const cat = String(p.category || "").toLowerCase();
      return categoryEntities.some((c) => cat.includes(c) || c.includes(cat));
    });
  }

  // si intent = ADD_TO_CART: priorizar coincidencias exactas
  if (intent === "ADD_TO_CART" && productEntities.length > 0) {
    const exactMatches = filtered.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      return productEntities.some((e) => name === e);
    });
    if (exactMatches.length > 0) return exactMatches;
  }

  // si entities.category: filtrar por categoría
  if (categoryEntities.length > 0) {
    filtered = filtered.filter((p) => {
      const cat = String(p.category || "").toLowerCase();
      return categoryEntities.some((c) => cat.includes(c) || c.includes(cat));
    });
  }

  // si entities.product: filtrar productos por nombre similar
  if (productEntities.length > 0) {
    filtered = filtered.filter((p) => {
      const searchSpace =
        `${p.name || ""} ${p.description || ""}`.toLowerCase();
      return productEntities.some((e) => searchSpace.includes(e));
    });
  }

  // si intent = RECOMMEND: devolver subset amplio (no exact match)
  if (intent === "RECOMMEND") {
    return filtered.length > 0 ? filtered : products;
  }

  return filtered.length > 0 ? filtered : products;
}

function sanitizeRestrictedMentions(
  responseText: string,
  allProducts: any[],
  safeProducts: any[],
  hasActiveRestrictions: boolean,
) {
  if (!hasActiveRestrictions) return responseText;

  const prohibitedProducts = allProducts.filter(
    (product) =>
      !safeProducts.some((safeProduct) => safeProduct.id === product.id),
  );

  return prohibitedProducts.reduce((text, product) => {
    const name = String(product.name || "").trim();
    if (!name) return text;

    const namePattern = new RegExp(
      `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi",
    );
    return text.replace(namePattern, "[opción segura]");
  }, responseText);
}

/**
 * handleMessageModular() — NEW Modular Sales System Engine Integration.
 *
 * Orchestrates the full pipeline using specialized agents.
 */
import { AdminProduct } from "@/lib/adminTypes";

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

    console.log("[responseEngine] MODULAR PIPELINE START");

  const userId = String(state.phone || "anonymous");
  const userCtx = getContext(userId);
  const n = normalizeText(text);

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
    hasProductMatch: (intentResult.entities?.products?.length ?? 0) > 0,
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
  const { includeWords, excludeWords } = parseUserRequest(text);

  // 2. Extraer entidades (producto, categoría)
  const productEntities = extractProductEntities(intentResult, includeWords);
  const categoryEntities = extractCategoryEntities(intentResult);

  // 3. Extraer restricciones (alergias, "sin", etc.)
  const allConstraints = normalizeConstraintList([
    ...(state.allergies || []),
    ...(intentResult.allergies || []),
    ...(intentResult.filters || []),
    ...(intentResult.entities?.restrictions || []),
    ...excludeWords,
  ]);
  const hasActiveRestrictions = allConstraints.length > 0;
  const nextState = { ...state, allergies: allConstraints };

  // 4. Obtener productos base desde DB
  const rawProducts = allProductsOverride || (await (await import("@/lib/db.server")).dbGetProducts());

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
  const matchedProducts = matchProducts(
    intentResult.intent,
    { product: productEntities, category: categoryEntities },
    allProducts as any[],
  );

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
  // If the user already has items in the cart and sends a short/additive
  // message, treat it as ADD_TO_CART instead of falling into SHOW_MENU /
  // recommendation flows that would reset the conversation focus.
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
  // ─────────────────────────────────────────────────────────────────────────

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
      if (!productEntities.length) {
        updateContext(userId, { flowState: nextFlow });
        return validateResponseOutput({
          text: '¿Qué producto quieres agregar exactamente? 😅',
          type: 'text',
          nextState: state
        }, state);
      }
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
  const hasProducts = Array.isArray(intentResult.entities?.products) && intentResult.entities.products.length > 0;
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
    if (!intentResult.entities?.products?.length && includeWords.length === 0) {
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
        lastProduct === productToAdd.id &&
        userCtx.lastAddTimestamp &&
        now - userCtx.lastAddTimestamp < 3000
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

    // ── Upsell logic (new) ────────────────────────────────────────────────────
    const productCategory = String(productToAdd.category || '').toLowerCase();
    const upsellMessage = generateUpsell(productCategory, userCtx.cart) || '';
    // ───────────────────────────────────────────────────────────────────────────

    const textRes = `✅ ${productToAdd.name} agregado a tu pedido\nTotal: $${userCtx.cart.total}${upsellMessage ? `\n\n${upsellMessage}` : ''}\n\n¿Quieres algo más o confirmamos?`;

      updateContext(userId, {
        lastIntent: intentResult.intent,
        constraints: allConstraints,
        lastProductsShown: responseProducts.map((p: any) => String(p.id)),
        flowState: nextFlow
      });

   return validateResponseOutput(
     {
       text: textRes,
       type: "text",
       nextState,
     },
     state,
   );
     }
   }

  // 7.1 Handle Recommend Logic — curated trio: 1 combo + 1 papas + 1 bebida
  if (intentResult.intent.toUpperCase() === "RECOMMEND") {
    const safe = safeAllProductsBase as any[];

    const combo  = safe.find((p) => String(p.category).toLowerCase() === "combos");
    const papas  = safe.find((p) => String(p.category).toLowerCase() === "papas");
    const bebida = safe.find((p) => String(p.category).toLowerCase() === "bebidas");

    const picks = [combo, papas, bebida].filter(Boolean);

    const lines = picks
      .map((p: any) => `🍗 ${p.name} — $${p.price}`)
      .join("\n");

    const total = picks.reduce((sum: number, p: any) => sum + p.price, 0);

  const textRes = picks.length > 0
    ? `💡 Te recomiendo este combo perfecto:\n\n${lines}\n\nTotal si pides todo: $${total} 🔥\n\n¿Arrancamos con algo de esto?`
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
    const cartLines = userCtx.cart.items.map((i: any) => `- ${i.name} x${i.qty || 1}`).join('\n');
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

  // 7.3 Handle Confirm Order Logic
  if (intentResult.intent.toUpperCase() === "CONFIRM_ORDER") {
    // Check for valid cart context before confirming
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

    try {
      console.log('🟡 INTENT: CONFIRM_ORDER');
      console.log('🛒 CART:', userCtx.cart);

      await (await import("@/lib/db.server")).dbSaveOrder({
        id: createUuid(),
        status: "pending",
        channel: "WHATSAPP",
        total: userCtx.cart.total,
        createdAt: new Date().toISOString(),
        customerPhone: userId,
        customerName: "Cliente",
        whatsappConfirmed: true,
        items: userCtx.cart.items.map((i: any) => ({
          productId: String(i.id),
          productName: i.name,
          quantity: i.qty || 1,
          price: i.price
        }))
      });

      console.log('✅ ORDER CREATED:', {
        total: userCtx.cart.total,
        items: userCtx.cart.items.length
      });
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
    }

    const finalTotal = userCtx.cart.total;
    clearContext(userId);

    updateContext(userId, {
      lastIntent: intentResult.intent,
      constraints: allConstraints,
      flowState: nextFlow
    });

    return validateResponseOutput(
      {
        text: `🔥 Pedido confirmado\nTotal: $${finalTotal}`,
        type: "text",
        nextState
      },
      state
    );
  }

  // 7.4 Handle Unknown Intent
  if (intentResult.intent.toUpperCase() === "UNKNOWN" || intentResult.intent.toUpperCase() === "OTHER") {
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
    console.error("[responseEngine] FATAL ERROR in Modular Pipeline:", error);
    // Absolute fallback to keep the user engaged
    let fallbackProducts = (allProductsOverride && allProductsOverride.length > 0) 
      ? allProductsOverride 
      : [];
      
    if (fallbackProducts.length === 0 && typeof window === 'undefined') {
      try {
        const { dbGetProducts } = await import("@/lib/db.server");
        fallbackProducts = (await dbGetProducts()).slice(0, 5);
      } catch (e) {
        console.error("[responseEngine] Error loading fallback products:", e);
      }
    }
      
    return validateResponseOutput(
      {
        text: "¡Hola! 👋 Hubo un pequeño salto en la conexión, pero aquí seguimos. ¿Qué te gustaría ordenar?",
        type: "products",
        actions: fallbackProducts.map(p => ({
          id: String(p.id),
          label: p.name,
          value: `add_${p.id}`,
          price: p.price
        })),
        nextState: state,
      },
      state,
    );
  }
}
