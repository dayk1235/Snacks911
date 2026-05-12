import { getContext, updateContext } from "./context";
import { processTransaction } from "./ai/aiAgent";
import { addToCart, clearCartContext } from "./cartEngine";
import { dbSaveOrder } from "@/lib/db.server";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

async function dbGetProductsSafe() {
  const fallback = [
    { id: '1', name: 'Papas Loaded', price: 69, category: 'papas', imageUrl: '', available: true, description: '' },
    { id: '2', name: 'Refresco 600ml', price: 25, category: 'bebidas', imageUrl: '', available: true, description: '' },
    { id: '3', name: 'Brownie con Helado', price: 59, category: 'postres', imageUrl: '', available: true, description: '' },
    { id: '4', name: 'Combo 911', price: 119, category: 'combos', imageUrl: '', available: true, description: '' },
    { id: '5', name: 'Boneless', price: 129, category: 'boneless', imageUrl: '', available: true, description: '10 piezas' },
    { id: '6', name: 'Combo Mixto', price: 189, category: 'combos', imageUrl: '', available: true, description: 'Boneless + Papas' },
  ];

  try {
    const res = await fetch(`${BASE}/api/products?all=true`);
    if (!res.ok) throw new Error('Failed to fetch products');
    const data = await res.json();
    
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.products)) return data.products;
      if (Array.isArray(data.data)) return data.data;
    }
    
    return Array.isArray(data) ? data : fallback;
  } catch (err) {
    console.error('[botEngine] dbGetProductsSafe failed:', err);
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

  // 4. Pass control to the Transactional AI Agent
  const aiResponse = await processTransaction(
    message,
    context.cart?.items || [],
    availableProducts,
    businessName
  );

  // 5. Execute AI Actions locally
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

  // 6. Persist Context Updates
  updateContext(cleanPhone, { 
    cart: context.cart, 
    state: context.state,
    lastUserMessage: message 
  });

  return {
    text: aiResponse.response_text,
    cart: context.cart,
    type: 'text',
    ui: null // Legacy UI cards can be migrated here if needed
  };
}
