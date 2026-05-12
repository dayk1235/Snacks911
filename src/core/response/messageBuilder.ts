/**
 * core/response/messageBuilder.ts — Message and prompt builders.
 *
 * Extracted from core/responseEngine.ts.
 */

import type {
  ConversationState,
  Action,
  ProductRefs,
  PromptContext,
  Intent,
  Stage,
  BotUI,
  UICard,
} from "../types";
import { applySafetyFilter } from "./errorHandler";

// ─── Upsell Generator ────────────────────────────────────────────────────────

export function generateUpsell(productCategory: string, cart: any): string | null {
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

export function getPromptByStage(
  intent: Intent,
  stage: Stage,
  upsellStep: ConversationState["upsellStep"],
): {
  text: (ctx: PromptContext) => string;
  actions?: Action[] | ((ctx: PromptContext) => Action[]);
  type?: "text" | "buttons" | "products";
  ui?: BotUI | ((ctx: PromptContext) => BotUI);
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
        { id: "payment-qr", type: "navigate", label: "📱 QR", value: "payment_qr" },
        { id: "payment-transfer", type: "navigate", label: "💳 Transferencia", value: "payment_transfer" },
      ],
    };
  }

  // ── rechazo: reduce pressure, offer 3 different alternatives ────────────
  if (intent === "rechazo") {
    return {
      text: () => `Entendido. ¿Algo diferente?`,
      actions: [
        { id: "show-alitas", type: "show_category", label: "🍗 Alitas", value: "show_alitas" },
        { id: "show-boneless", type: "show_category", label: "🥡 Boneless", value: "show_boneless" },
        { id: "exploracion", type: "navigate", label: "🔥 Ver combos", value: "exploracion" },
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
          { id: "accept-combo-911", type: "add_to_cart", label: "🔥 Sí, dámelo", value: "accept_combo_911" },
          { id: "accept-combo-boneless", type: "add_to_cart", label: "🍗 Boneless", value: "accept_combo_boneless" },
          { id: "accept-combo-callejero", type: "add_to_cart", label: "🌮 Callejero", value: "accept_combo_callejero" },
        ],
      };

    // ── EXPLORANDO ────────────────────────────────────────────────────────────
    case "explorando":
      if (intent === "exploracion") {
        return {
          text: () =>
            `Lo que hay:\n\n• 🔥 Combos — los más pedidos\n• 🍗 Alitas BBQ y Buffalo\n• 🥡 Boneless Clásico e Inferno\n• 🍟 Papas Gajo y Loaded\n• 🌭 Banderillas\n• 🍫 Postres\n\n¿Qué se te antoja?`,
          actions: [
            { id: "accept-combo-911-exp", type: "add_to_cart", label: "🔥 Combo 911", value: "accept_combo_911" },
            { id: "show-alitas-exp", type: "show_category", label: "🍗 Alitas", value: "show_alitas" },
            { id: "show-boneless-exp", type: "show_category", label: "🥡 Boneless", value: "show_boneless" },
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
        actions: [{ id: "accept-combo-911-default", type: "add_to_cart", label: "🔥 Va, dámelo", value: "accept_combo_911" }],
      };

    // ── DECIDIENDO ────────────────────────────────────────────────────────────
    case "decidiendo":
      // duda → BOT DECIDES. No question. Direct push.
      if (intent === "duda") {
        return {
          text: (ctx) =>
            `Te decido yo: **${ctx.comboName}** — $${ctx.comboPrice}. Crujiente, caliente, todo incluido. 🔥\n\n¿Va?`,
          actions: [{ id: "accept-combo-911-duda", type: "add_to_cart", label: "🔥 Va, dámelo", value: "accept_combo_911" }],
        };
      }
      if (intent === "precio") {
        return {
          text: (ctx) =>
            `El que más conviene: **${ctx.comboBonelessName}** — $${ctx.comboBonelessPrice}.\n\nAhorras $${ctx.ahorroBoneless} vs individual. ¿Va?`,
          actions: [
            { id: "accept-combo-boneless-price", type: "add_to_cart", label: "🔥 Sí, va", value: "accept_combo_boneless" },
            { id: "accept-combo-callejero-price", type: "add_to_cart", label: "🌮 Callejero $89", value: "accept_combo_callejero" },
          ],
        };
      }
      if (intent === "hambre" || intent === "pedido") {
        return {
          text: (ctx) =>
            `🔥 **${ctx.comboName}** — $${ctx.comboPrice}. Recién hecho, caliente.\n\n¿Lo preparo?`,
          actions: [
            { id: "accept-combo-911-hambre", type: "add_to_cart", label: "🔥 Sí, dámelo", value: "accept_combo_911" },
            { id: "accept-combo-boneless-hambre", type: "add_to_cart", label: "🍗 Boneless", value: "accept_combo_boneless" },
          ],
        };
      }
      // Fallback decidiendo
      return {
        text: (ctx) =>
          `👉 **${ctx.comboName}** — $${ctx.comboPrice}. El que mejor sabe.\n\n¿Va?`,
        actions: [{ id: "accept-combo-911-fallback", type: "add_to_cart", label: "🔥 Sí, dámelo", value: "accept_combo_911" }],
      };

    // ── ORDENANDO ─────────────────────────────────────────────────────────────
    case "ordenando":
      // UPSELL 1: PAPAS - Tecnica Pie en la Puerta + Anclaje
      if (upsellStep === "none" || upsellStep === "papas") {
        return {
          text: (ctx) =>
            `🍟 ¡Excelente elección! \n\nAcompaña tus ${ctx.comboName} con unas papas loaded extra crujientes. \n\n🔥 Solo +$${ctx.papasPrice}.`,
          type: "products",
          ui: (ctx) => ({
            cards: [
              {
                id: "card-papas",
                title: "🍟 Papas Loaded",
                price: ctx.papasPrice,
                imageUrl: "https://images.unsplash.com/photo-1573082833946-f99a2dbbb50d?auto=format&fit=crop&w=400",
                actions: [
                  { id: "add-papas", type: "add_to_cart", label: "🍟 Sí, agrégalas", value: "add_papas" }
                ]
              }
            ]
          }),
          actions: [
            { id: "skip-papas", type: "dismiss", label: "🤔 Por ahora no", value: "skip_papas" },
          ],
        };
      }
      // UPSELL 2: BEBIDA - Aversión a la perdida
      if (upsellStep === "bebida") {
        return {
          text: (ctx) =>
            `🥤 ¡Refrescante! \n\nUn refresco bien frío para acompañar. Casi todo el mundo lo agrega.\n\n💡 +$${ctx.bebidaPrice}.`,
          type: "products",
          ui: (ctx) => ({
            cards: [
              {
                id: "card-bebida",
                title: "🥤 Refresco Frío",
                price: ctx.bebidaPrice,
                imageUrl: "https://images.unsplash.com/photo-1596803244618-5d346399c390?auto=format&fit=crop&w=400",
                actions: [
                  { id: "add-bebida", type: "add_to_cart", label: "🥤 Sí, dámelo", value: "add_bebida" }
                ]
              }
            ]
          }),
          actions: [
            { id: "skip-bebida", type: "dismiss", label: "🤔 Paso", value: "skip_bebida" },
          ],
        };
      }
      // UPSELL 3: POSTRE - Prueba Social + Reciprocidad
      if (upsellStep === "postre") {
        return {
          text: (ctx) =>
            `🍫 ¡El toque final! \n\nUn brownie caliente con helado para cerrar con broche de oro. \n\n✨ +$${ctx.postrePrice}.`,
          type: "products",
          ui: (ctx) => ({
            cards: [
              {
                id: "card-postre",
                title: "🍫 Brownie con Helado",
                price: ctx.postrePrice,
                imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400",
                actions: [
                  { id: "add-postre", type: "add_to_cart", label: "🍫 ¡SÍ, QUIERO!", value: "add_postre" }
                ]
              }
            ]
          }),
          actions: [
            { id: "skip-postre", type: "dismiss", label: "🤔 Por ahora no", value: "skip_postre" },
          ],
        };
      }
      // upsellStep === 'done' → close
      if (upsellStep === "done") {
        return {
          text: (ctx) =>
            `🔥 Pedido listo. Total: **$${ctx.currentTotal}**\n\n¿Confirmamos?`,
          actions: [
            { id: "confirm-order", type: "checkout", label: "✅ Confirmar", value: "confirm_order" },
            { id: "order-again", type: "navigate", label: "🔄 Otro pedido", value: "order_again" },
          ],
        };
      }

      // Non-upsell intents within ordenando
      if (intent === "edicion") {
        return {
          text: (ctx) =>
            `Claro. ¿Qué agrego?\n\n• Papas Loaded — $${ctx.papasPrice}\n• Refresco — $${ctx.bebidaPrice}\n• Brownie — $${ctx.postrePrice}`,
          actions: [
            { id: "add-papas-edit", type: "add_to_cart", label: "🍟 Papas", value: "add_papas" },
            { id: "add-bebida-edit", type: "add_to_cart", label: "🥤 Refresco", value: "add_bebida" },
            { id: "add-postre-edit", type: "add_to_cart", label: "🍫 Brownie", value: "add_postre" },
          ],
        };
      }
      if (intent === "urgencia") {
        return {
          text: (ctx) =>
            `🔥 **${ctx.comboName}** — el más rápido de preparar. ¿Lo envío?`,
          actions: [{ id: "accept-combo-911-urgencia", type: "add_to_cart", label: "🔥 Rápido, dámelo", value: "accept_combo_911" }],
        };
      }
      // Guardia: nunca vacío en ordenando
      return {
        text: (ctx) =>
          `🔥 Pedido en progreso. Total: **$${ctx.currentTotal}**.\n\n¿Confirmamos?`,
        actions: [
          { id: "confirm-order-fallback", type: "checkout", label: "✅ Confirmar", value: "confirm_order" },
          { id: "edicion-fallback", type: "navigate", label: "Agregar algo", value: "edicion" },
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

// ─── Delivery prompts (short, direct) ─────────────────────────────────────────

export function getDeliveryPrompt(
  step: ConversationState["deliveryStep"],
): { text: string; actions?: Action[] } | null {
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
          { id: "payment-cash", type: "navigate", label: "💵 Efectivo", value: "payment_cash" },
          { id: "payment-qr-final", type: "navigate", label: "📱 QR/Transferencia", value: "payment_qr" },
        ],
      };
    case "done":
      return {
        text: `🔥 **Pedido confirmado.**\n\n👉 Preparando todo recién hecho. 🤤\n👉 Te avisamos en cuanto salga.\n\n¡Gracias por tu confianza! 🔥`,
      };
    default:
      return null;
  }
}

// ─── Exported helpers (used by ChatBot.tsx) ───────────────────────────────────

export function buildDeliveryPrompt(state: ConversationState): {
  text: string;
  actions?: Action[];
} {
  return getDeliveryPrompt(state.deliveryStep) ?? { text: "" };
}

export function buildOrderConfirmation(
  state: ConversationState,
  products: ProductRefs,
): { text: string; actions?: Action[] } {
  const t = state.cartTotal || products.currentTotal;
  const items: string[] = [];
  if (state.comboSelected) items.push(`- ${products.comboName} x1`);
  if (products.hasPapas) items.push(`- ${products.papasName} x1`);
  if (products.hasBebida) items.push(`- ${products.bebidaName} x1`);
  if (products.hasPostre) items.push(`- ${products.postreName} x1`);

  return {
    text: `🧾 **Tu pedido:**\n\n${items.join("\n")}\n\n💰 **Total: $${t}**\n\n👉 20-30 min\n\n¿Confirmas? ✅`,
    actions: [
      { id: "confirm-order-summary", type: "checkout", label: "✅ Confirmar", value: "confirm_order" },
      { id: "order-again-summary", type: "navigate", label: "🔄 Otro pedido", value: "order_again" },
    ],
  };
}

export function buildRecommendations(
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
