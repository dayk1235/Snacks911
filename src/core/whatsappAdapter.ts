import { getBotResponse } from './botEngine';

export type WhatsAppAdapterMessageType = 'text' | 'button' | 'list' | 'order';

export interface WhatsAppAdapterMessage {
  from: string;
  type: WhatsAppAdapterMessageType;
  payload: any;
  tenantId?: string;
}

export interface ProcessedWhatsAppOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface ProcessedWhatsAppOrder {
  items: ProcessedWhatsAppOrderItem[];
  total: number;
  status: 'pending';
  id?: string;
  confirmationMessage?: string;
  nextQuestions?: string[];
}

export type WhatsAppAdapterResponse =
  | { type: 'text'; content: any }
  | { type: 'interactive'; content: any };

const mockOrders: ProcessedWhatsAppOrder[] = [];

export async function handleIncomingMessage(
  msg: WhatsAppAdapterMessage
): Promise<WhatsAppAdapterResponse> {
  if (msg.type === 'order') {
    return handleCatalogOrder(msg);
  }

  const input = getInputFromWhatsAppMessage(msg);
  if (!input) {
    return {
      type: 'text',
      content: 'No pude leer ese mensaje. Mándame texto o usa una opción del menú.',
    };
  }

  const botResponse = await getBotResponse({
    message: input,
    phone: msg.from,
    tenantId: msg.tenantId,
  });

  if (hasInteractiveContent(botResponse)) {
    return {
      type: 'interactive',
      content: botResponse,
    };
  }

  return {
    type: 'text',
    content: botResponse.text,
  };
}

export async function processOrder(orderPayload: any): Promise<ProcessedWhatsAppOrder> {
  const items = normalizeOrderItems(orderPayload);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const order: ProcessedWhatsAppOrder = {
    items,
    total,
    status: 'pending',
    confirmationMessage: 'Pedido recibido. Confirmo tus productos y seguimos con la entrega.',
    nextQuestions: [
      '¿Cuál es tu dirección de entrega?',
      '¿Pagarás en efectivo, transferencia o tarjeta?',
    ],
  };

  const savedOrderId = await trySaveOrder(orderPayload, order);
  if (savedOrderId) {
    return { ...order, id: savedOrderId };
  }

  const mockOrder = { ...order, id: `mock-wa-${Date.now()}` };
  mockOrders.push(mockOrder);
  console.warn('[whatsappAdapter] Order stored in memory mock:', mockOrder.id);
  return mockOrder;
}

function getInputFromWhatsAppMessage(msg: WhatsAppAdapterMessage): string {
  if (msg.type === 'text') {
    return String(msg.payload?.text || msg.payload?.body || msg.payload || '').trim();
  }

  if (msg.type === 'button' || msg.type === 'list') {
    return String(msg.payload?.id || msg.payload?.title || msg.payload?.text || '').trim();
  }

  return '';
}

async function handleCatalogOrder(msg: WhatsAppAdapterMessage): Promise<WhatsAppAdapterResponse> {
  const order = await processOrder({
    ...msg.payload,
    customerPhone: msg.from,
    tenantId: msg.tenantId,
  });

  const summary = order.items
    .map((item) => {
      return `• ${item.quantity}x ${item.productName} - $${item.price * item.quantity}`;
    })
    .join('\n');

  return {
    type: 'text',
    content: `Recibí tu pedido:\n${summary || '• Pedido de catálogo'}\n\nTotal: $${order.total}\n\n¿Me compartes tu dirección y método de pago?`,
  };
}

function normalizeOrderItems(orderPayload: any): ProcessedWhatsAppOrderItem[] {
  const rawItems = Array.isArray(orderPayload?.product_items)
    ? orderPayload.product_items
    : Array.isArray(orderPayload?.items)
      ? orderPayload.items
      : [];

  return rawItems.map((item: any) => {
    const productId = String(
      item.product_retailer_id ||
      item.product_id ||
      item.productId ||
      item.id ||
      ''
    );
    const productName = String(
      item.product_name ||
      item.productName ||
      item.name ||
      productId ||
      'Producto'
    );
    const quantity = Number(item.quantity || item.qty) || 1;
    const price = Number(item.item_price || item.price || item.unit_price) || 0;

    return {
      productId,
      productName,
      quantity,
      price,
    };
  });
}

async function trySaveOrder(orderPayload: any, order: ProcessedWhatsAppOrder): Promise<string | null> {
  if (typeof window !== 'undefined') return null;

  try {
    const { getSupabaseAdmin } = await import('@/lib/db.server');
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_phone: orderPayload.customerPhone || '',
        total: order.total,
        channel: 'WHATSAPP',
        status: order.status,
        tenant_id: orderPayload.tenantId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[whatsappAdapter] Order insert failed:', error);
      return null;
    }

    const orderId = data?.id;
    if (!orderId || order.items.length === 0) return orderId || null;

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(order.items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        price: item.price,
      })));

    if (itemsError) {
      console.error('[whatsappAdapter] Order items insert failed:', itemsError);
    }

    return orderId;
  } catch (error) {
    console.error('[whatsappAdapter] DB unavailable, using mock order:', error);
    return null;
  }
}

function hasInteractiveContent(botResponse: any): boolean {
  return Boolean(
    botResponse?.actions?.length ||
    botResponse?.ui?.cards?.length ||
    botResponse?.type === 'buttons' ||
    botResponse?.type === 'products'
  );
}
