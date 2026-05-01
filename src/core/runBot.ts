import { dbGetCustomer, dbGetProducts, dbSaveOrder } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { validateOrderItems } from '@/core/validationService';
import { getCustomerProfile, updateCustomerFromOrder } from '@/core/customerProfileStore';



const sessions: Record<string, any> = {};

const STATES = {
  IDLE: "idle",
  BROWSING: "browsing",
  ORDERING: "ordering",
  UPSELL: "upsell",
  CONFIRMING: "confirming"
};

function getSession(phone: string) {
  if (!sessions[phone]) {
    sessions[phone] = {
      state: STATES.IDLE,
      cart: [],
      context: {}
    };
  }
  return sessions[phone];
}

function addToCart(session: any, product: any) {
  const existing = session.cart.find((item: any) => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    session.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1
    });
  }
}

function getTotal(cart: any[]) {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

export interface BotInput {
  channel: 'WHATSAPP' | 'WEB' | 'POS';
  message: string;
  phone: string;
}

export async function runBot({ channel, message, phone }: BotInput) {
  const session = getSession(phone);

  const ctx = {
    text: message.toLowerCase(),
    phone,
    channel
  };

  if (ctx.text.startsWith("__BTN__:")) {
    const id = ctx.text.replace("__BTN__:", "");
    if (id === "confirm") session.state = STATES.CONFIRMING;
    if (id === "more" || id === "add_more") session.state = STATES.BROWSING;
    
    if (id === "upsell_papas") {
      addToCart(session, { id: "papas_side", name: "Papas Fritas", price: 35 });
      session.state = STATES.ORDERING;
    }
    if (id === "upsell_refresco") {
      addToCart(session, { id: "refresco", name: "Refresco", price: 25 });
      session.state = STATES.ORDERING;
    }
    if (id === "skip") {
      session.state = STATES.ORDERING;
    }

    if (id === "cancel") {
      session.cart = [];
      session.state = STATES.IDLE;
      return { 
        text: "Pedido cancelado. 🚫\nEscribe 'menu' para empezar de nuevo.",
        type: "text" as const
      };
    }
  }

  // Detectar frustración / pedir humano (Human Handoff)
  if (ctx.text.match(/(humano|asesor|persona|ayuda|problema|error|no entiendo)/)) {
    session.state = STATES.IDLE;
    return {
      text: "Entiendo. 🛡️ Un asesor humano se conectará en un momento para ayudarte con tu pedido.",
      type: "text" as const
    };
  }

  const state = session.state;


  switch (state) {
    case STATES.IDLE:
      return await handleIdle(ctx, session);
    case STATES.BROWSING:
      return await handleBrowsing(ctx, session);
    case STATES.ORDERING:
      return await handleOrdering(ctx, session);
    case STATES.UPSELL:
      return handleUpsell(ctx, session);
    case STATES.CONFIRMING:
      return await handleConfirming(ctx, session);
    default:
      return await handleIdle(ctx, session);
  }
}

async function handleIdle(ctx: any, session: any) {
  const profile = await getCustomerProfile(ctx.phone);
  
  if (ctx.text.includes("menu")) {
    session.state = STATES.BROWSING;
    return { 
      text: "¡Claro! Te muestro el menú 🍔\n¿Qué se te antoja hoy?",
      type: "text" as const
    };
  }

  const welcomeMsg = profile && profile.totalOrders > 0 
    ? `¡Hola de nuevo ${profile.name || ''}! 👋\n¿Te gustaría tu favorito: ${profile.favoriteProduct}? o ¿ver el menú?`
    : `¡Hola! Bienvenido a Snacks 911 🍔\n¿Qué te gustaría pedir hoy?`;

  return { 
    text: welcomeMsg,
    type: "buttons" as const,
    data: [
      { id: "more", title: "Ver Menú 📋" }
    ]
  };
}

async function handleBrowsing(ctx: any, session: any) {
  if (ctx.text.includes("cancelar")) {
    session.state = STATES.IDLE;
    return { 
      text: "Listo, cancelado. 🚫\nEscribe 'menu' si cambias de opinión.",
      type: "text" as const
    };
  }

  // Simulación: Si selecciona producto
  if (ctx.text.includes("agregar") || ctx.text.includes("producto")) {
    session.state = STATES.ORDERING;
    addToCart(session, { id: "mock_product", name: "Producto", price: 100 });
    return { 
      text: "¡Agregado! 🔥\n¿Quieres algo más o confirmar?",
      type: "text" as const
    };
  }

  const products = await dbGetProducts();
  return {
    type: "list" as const,
    text: "Selecciona un producto 🍔",
    data: products.map(p => ({
      id: p.id,
      title: p.name,
      description: `$${p.price}`
    }))
  };
}

async function handleOrdering(ctx: any, session: any) {
  const products = await dbGetProducts();

  if (ctx.text.startsWith("__SELECT__:")) {
    const id = ctx.text.replace("__SELECT__:", "");
    const product = products.find(p => p.id === id);
    if (product) {
      addToCart(session, product);
      session.state = STATES.UPSELL;
      return {
        type: "buttons" as const,
        text: "🔥 Combina tu pedido:",
        data: [
          { id: "upsell_papas", title: "Agregar papas" },
          { id: "upsell_refresco", title: "Agregar bebida" },
          { id: "skip", title: "Continuar" }
        ]
      };
    }
  }

  if (ctx.text.includes("confirmar")) {
    session.state = STATES.CONFIRMING;
    return { 
      text: "¡Perfecto! Vamos a confirmar tu pedido. ✅",
      type: "text" as const
    };
  }

  if (ctx.text.includes("menu")) {
    session.state = STATES.BROWSING;
    return { 
      text: "Volviendo al menú... 🍔\n¿Qué más agregarás?",
      type: "text" as const
    };
  }

  const product = products.find(p => ctx.text.includes(p.name.toLowerCase()));

  if (product) {
    addToCart(session, product);
    session.state = STATES.UPSELL;
    return {
      type: "buttons" as const,
      text: `${product.name} agregado. 🔥\n¿Te gustaría algo más?`,
      data: [
        { id: "upsell_papas", title: "Agregar papas" },
        { id: "upsell_refresco", title: "Agregar bebida" },
        { id: "skip", title: "Continuar" }
      ]
    };
  }

  return {
    text:
      "🛒 Tu pedido:\n" +
      session.cart.map((i: any) => `${i.name} x${i.qty}`).join("\n") +
      `\n\nTotal: $${getTotal(session.cart)}`,
    type: "buttons" as const,
    data: [
      { id: "confirm", title: "Confirmar" },
      { id: "add_more", title: "Agregar más" },
      { id: "cancel", title: "Cancelar" }
    ]
  };
}

function handleUpsell(ctx: any, session: any) {
  if (ctx.text.includes("si") || ctx.text.includes("aceptar") || ctx.text.includes("quiero")) {
    addToCart(session, { id: "upsell_product", name: "Upsell", price: 45 });
  }

  session.state = STATES.CONFIRMING;
  return { 
    text: "¡Entendido! Sigamos con tu pedido. ✅",
    type: "text" as const
  };
}

async function handleConfirming(ctx: any, session: any) {
  if (ctx.text.includes("ok") || ctx.text.includes("si") || ctx.text.includes("confirmar")) {
    try {
      const validItems = await validateOrderItems(session.cart.map((item: any) => ({
        productId: item.id,
        productName: item.name,
        quantity: item.qty,
        price: item.price
      })));

      const total = validItems.reduce((sum, i) => sum + i.quantity * i.price, 0);

      await dbSaveOrder({
        id: '', // uuid auto
        status: 'pending',
        channel: 'WHATSAPP',
        total,
        createdAt: new Date().toISOString(),
        customerName: 'WhatsApp User',
        customerPhone: ctx.phone,
        items: validItems
      });

      // Phase B: Memoria - Actualizar perfil del cliente
      await updateCustomerFromOrder(ctx.phone, 'WhatsApp User', total, validItems);

      const confirmationText = 
        "🚨 ¡Oído Cocina! Tu orden está en la lumbre.\n\n" +
        session.cart.map((i: any) => `${i.name} x${i.qty}`).join("\n") +
        `\n\nTotal: $${total}\n\n🔥 Prepárate, el rescate va en camino.`;

      session.state = STATES.IDLE;
      session.cart = []; // Limpiar carrito post orden
      return { 
        text: confirmationText,
        type: "text" as const
      };

    } catch (e: any) {
      console.error("[runBot] Error validating/saving order:", e);
      // Fallback seguro (error controlado)
      return {
        text: "Lo siento, hubo un problema procesando tu pedido. 😔\nPor favor intenta de nuevo o espera a ser atendido.",
        type: "text" as const
      };
    }
  }

  if (ctx.text.includes("cancelar")) {
    session.state = STATES.IDLE;
    session.cart = []; // Limpiar carrito post cancelación
    return { 
      text: "Pedido cancelado. 🚫\nEscribe 'menu' para empezar de nuevo.",
      type: "text" as const
    };
  }

  return { 
    text: `¿Confirmas el pedido por un total de $${getTotal(session.cart)}? (ok/cancelar)`,
    type: "buttons" as const,
    data: [
      { id: "confirm_ok", title: "Confirmar" },
      { id: "confirm_cancel", title: "Cancelar" }
    ]
  };
}
