import { getContext, updateContext } from "./context";
import { processTransaction } from "./ai/aiAgent";
import { addToCart, clearCartContext } from "./cartEngine";
import { dbSaveOrder } from "@/lib/db.server";
import { isGreetingOnly } from "./nluBaseline";
import type { Action, UICard, UICart, BotUI } from "./types";
import { getProductImage, products as staticProducts } from "@/data/products";

function getProductImageUrl(product: any): string {
  return product.image_url || product.imageUrl || product.image || getProductImage(product) || '';
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

async function dbGetProductsSafe() {
  const fallback = staticProducts.map(p => ({
    id: String(p.id),
    name: p.name,
    price: p.price,
    category: p.category,
    imageUrl: p.image,
    image: p.image,
    available: p.available !== false,
    description: p.description || '',
    originalPrice: p.originalPrice,
    badges: p.badges,
    popular: p.popular,
  }));

  try {
    const res = await fetch(`${BASE}/api/products?all=true`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.products)) return data.products;
      if (Array.isArray(data.data)) return data.data;
    }
    
    const arr = Array.isArray(data) ? data : [];
    return arr.length > 0 ? arr : fallback;
  } catch (err) {
    console.error('[botEngine] dbGetProductsSafe failed, using static fallback:', (err as Error)?.message);
    return fallback;
  }
}

export async function getBotResponse({
  message,
  phone,
  tenantId,
}: {
  message: string;
  phone?: string;
  tenantId?: string;
}) {
  const isWeb = phone === 'web-user';
  const cleanPhone = phone ? normalizePhone(phone) : 'anonymous';
  const activeTenantId = tenantId || 'snacks911';

  // 1. Resolve Tenant Context
  let businessName = 'Snacks 911';
  try {
    const { getTenantBySlug } = await import('@/lib/tenant/tenantResolver');
    const tenant = await getTenantBySlug(activeTenantId);
    if (tenant) {
      businessName = tenant.business_name;
    }
  } catch (e) {
    console.error('[botEngine] Error resolving tenant:', e);
  }

  // 2. Load User Context
  const context = getContext(cleanPhone, activeTenantId, businessName);

  // 3. Fetch Available Products
  const allProducts = await dbGetProductsSafe();
  const availableProducts = allProducts.filter((p: any) => p.available !== false && p.stock !== 0);

  // 4. Shortcut: respond instantly to simple greetings without calling the AI
  if (isGreetingOnly(message)) {
    const greetings = [
      `¡Hola! 👋 Bienvenid@ a ${businessName}. ¿Qué se te antoja hoy?`,
      `¡Qué onda! 🔥 Soy tu asistente de ${businessName}. ¿Qué se te antoja hoy?`,
      `¡Hey! Bienvenid@ a ${businessName}. Dime qué te provoca y te lo preparo. 🍟`,
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    const greetingActions: Action[] = [
      { id: 'greet-combos', label: '🔥 Ver combos', type: 'show_category', value: 'ver combos' },
      { id: 'greet-menu', label: '📋 Ver menú', type: 'show_category', value: 'ver menu' },
      { id: 'greet-recommend', label: '🤔 Recomiéndame', type: 'recommend', value: 'recomiendame algo' },
    ];

    return {
      text: greeting,
      cart: context.cart,
      type: 'buttons',
      actions: greetingActions,
      ui: null
    };
  }

  // 5. Pass control to the Transactional AI Agent
  const aiResponse = await processTransaction(
    message,
    context.cart?.items || [],
    availableProducts,
    businessName
  );

  // 6. Execute AI Actions locally
  for (const action of aiResponse.actions) {
    switch (action.type) {
      case 'ADD_TO_CART':
        if (action.productId) {
          const product = availableProducts.find((p: any) => String(p.id) === String(action.productId));
          if (product) {
            // cartEngine uses an add function that modifies context.cart directly
            // or we can use the addToCart helper 
            const qty = action.quantity || 1;
            for (let i = 0; i < qty; i++) {
              addToCart(context, product);
            }
          }
        }
        break;

      case 'REMOVE_FROM_CART':
        if (action.productId && context.cart?.items) {
          // Remove item logic: filter it out and recalculate
          const itemIdx = context.cart.items.findIndex(i => String(i.productId || i.id) === String(action.productId));
          if (itemIdx > -1) {
            const item = context.cart.items[itemIdx];
            context.cart.items.splice(itemIdx, 1);
            context.cart.total -= item.price;
          }
        }
        break;

      case 'CLEAR_CART':
        clearCartContext(context);
        break;

      case 'CHECKOUT':
        // Move state to payment
        context.state = 'checkout';
        break;
        
      case 'TALK':
        // Just talking, no cart ops
        break;
    }
  }

  // 7. Persist Context Updates
  updateContext(cleanPhone, { 
    cart: context.cart, 
    state: context.state,
    lastUserMessage: message 
  });

  // 8. Build UI elements for rich chat experience
  const ui = buildChatUI(message, availableProducts, context, aiResponse);
  const actions = buildChatActions(message, context, aiResponse, availableProducts);

  return {
    text: aiResponse.response_text,
    cart: context.cart,
    type: actions.length > 0 ? 'buttons' : 'text',
    actions,
    ui
  };
}

function buildChatUI(
  message: string,
  availableProducts: any[],
  context: any,
  aiResponse: any
): BotUI | null {
  const ui: BotUI = {};
  const nMsg = message.toLowerCase().trim();
  const hasCart = context.cart?.items?.length > 0;

  // Cart summary when items exist
  if (hasCart) {
    const items = context.cart.items.map((item: any) => ({
      id: String(item.productId || item.id),
      name: item.name || 'Producto',
      price: item.price || 0,
      quantity: item.quantity || 1,
    }));
    ui.cart = {
      total: context.cart.total || 0,
      itemCount: items.length,
    };
  }

  // Product cards when user asks for menu/combos/categories
  const isMenuQuery = /menu|carta|combos|que (hay|tienen|venden)|muestrame|enseñame|productos|alitas|boneless|papas|banderilla|bebida|refresco|postre/i.test(nMsg);
  const isAddQuery = /quiero|dame|agrega|pon|añade|me das|pidamos|ordenar/i.test(nMsg);
  const hasTalk = aiResponse.actions?.some((a: any) => a.type === 'TALK');

  if (isMenuQuery && hasTalk) {
    // Extract relevant category or show all
    const combos = availableProducts.filter((p: any) => p.category === 'combos' && p.id).slice(0, 4);
    if (combos.length > 0) {
      ui.cards = combos.map((p: any) => ({
        id: String(p.id),
        title: p.name || '',
        description: p.description || '',
        price: p.price,
        imageUrl: getProductImageUrl(p),
      }));
    }
  }

  // Also show combo cards when cart has items (upsell opportunity)
  if (hasCart && !ui.cards && isAddQuery) {
    const extras = availableProducts.filter((p: any) =>
      ['papas', 'bebidas', 'postres', 'extras'].includes(p.category) && p.id
    ).slice(0, 3);
    if (extras.length > 0) {
      ui.cards = extras.map((p: any) => ({
        id: String(p.id),
        title: p.name || '',
        description: p.description || '',
        price: p.price,
        imageUrl: getProductImageUrl(p),
      }));
    }
  }

  return Object.keys(ui).length > 0 ? ui : null;
}

function buildChatActions(
  message: string,
  context: any,
  aiResponse: any,
  availableProducts: any[]
): Action[] {
  const actions: Action[] = [];
  const nMsg = message.toLowerCase().trim();
  const hasCart = context.cart?.items?.length > 0;
  const aiAdded = aiResponse.actions?.some((a: any) => a.type === 'ADD_TO_CART');
  const isMenuQuery = /menu|carta|combos|que (hay|tienen|venden)|muestrame/i.test(nMsg);
  const isAddQuery = /quiero|dame|agrega|pon|añade|me das|pidamos/i.test(nMsg);

  // If AI added items to cart, show cart actions
  if (aiAdded || (hasCart && !isMenuQuery)) {
    if (hasCart || aiAdded) {
      actions.push({ id: 'view-cart', label: '🛒 Ver carrito', type: 'view_cart', value: 'ver carrito' });
      actions.push({ id: 'checkout', label: '📦 Pedir ya', type: 'checkout', value: 'confirmar pedido' });
    }
  }

  // Menu/combos quick browse actions
  if (isMenuQuery) {
    actions.push({ id: 'show-combos', label: '🔥 Combos', type: 'show_category', value: 'ver combos' });
    actions.push({ id: 'show-menu', label: '📋 Todo el menú', type: 'show_category', value: 'ver menú' });
  }

  // Add quick product buttons when asking for recommendations
  if (/recomiend|sugiere|que me recomiendas|que sugieres|no se/i.test(nMsg)) {
    const popular = availableProducts
      .filter((p: any) => p.category === 'combos' && p.id)
      .slice(0, 3);
    popular.forEach((p: any) => {
      actions.push({
        id: `add-${p.id}`,
        label: `+ ${p.name} $${p.price}`,
        type: 'add_to_cart',
        value: `agrega ${p.name}`,
        payload: { productId: String(p.id), name: p.name, price: p.price },
        price: p.price,
        image: getProductImageUrl(p),
      } as Action);
    });
  }

  // If cart has items but user didn't just add, show checkout  
  if (hasCart && !aiAdded && !isMenuQuery && !isAddQuery) {
    if (!actions.some(a => a.type === 'checkout')) {
      actions.push({ id: 'checkout-end', label: '✅ Confirmar y pedir', type: 'checkout', value: 'confirmar pedido' });
    }
    actions.push({ id: 'clear-cart', label: '🗑️ Vaciar carrito', type: 'dismiss', value: 'vaciar carrito' });
  }

  return actions;
}
