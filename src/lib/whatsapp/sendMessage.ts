const WHATSAPP_API_VERSION = 'v19.0';

type WhatsAppApiPayload = Record<string, unknown>;

interface WhatsAppApiResult {
  ok: boolean;
  status: number;
  data: unknown;
}

interface ReplyButton {
  id: string;
  title: string;
}

interface ListRow {
  id: string;
  title: string;
  description?: string;
}

interface ListSection {
  title: string;
  rows: ListRow[];
}

interface UpsellOrderItem {
  name?: string;
  title?: string;
  category?: string;
  price?: number;
  quantity?: number;
  qty?: number;
}

interface UpsellOrder {
  items?: UpsellOrderItem[];
  total?: number;
  totalPrice?: number;
}

type ProductListCategory = 'papas' | 'alitas' | 'boneless' | 'postres';

interface ProductListSection {
  title: string;
  product_items: Array<{ product_retailer_id: string }>;
}

const PRODUCT_LIST_COPY: Record<ProductListCategory, { body: string; sectionTitle: string; envKey: string }> = {
  papas: {
    body: 'Papas listas para antojo.',
    sectionTitle: 'Papas',
    envKey: 'WHATSAPP_PRODUCT_RETAILER_IDS_PAPAS',
  },
  alitas: {
    body: 'Alitas calientes para pedir ya.',
    sectionTitle: 'Alitas',
    envKey: 'WHATSAPP_PRODUCT_RETAILER_IDS_ALITAS',
  },
  boneless: {
    body: 'Boneless crujientes para hoy.',
    sectionTitle: 'Boneless',
    envKey: 'WHATSAPP_PRODUCT_RETAILER_IDS_BONELESS',
  },
  postres: {
    body: 'Cierra con algo dulce.',
    sectionTitle: 'Postres',
    envKey: 'WHATSAPP_PRODUCT_RETAILER_IDS_POSTRES',
  },
};

function getWhatsAppConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token) {
    throw new Error('Missing WHATSAPP_TOKEN');
  }

  if (!phoneNumberId) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID');
  }

  return {
    token,
    endpoint: `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
  };
}

export function buildProductList(category: string) {
  const normalizedCategory = normalizeProductListCategory(category);
  const catalogId = process.env.WHATSAPP_CATALOG_ID;

  if (!catalogId) {
    throw new Error('Missing WHATSAPP_CATALOG_ID');
  }

  const config = PRODUCT_LIST_COPY[normalizedCategory];
  const productRetailerIds = getProductRetailerIdsFromEnv(config.envKey);

  if (productRetailerIds.length === 0) {
    throw new Error(`Missing real product_retailer_id values in ${config.envKey}`);
  }

  const sections: ProductListSection[] = [
    {
      title: config.sectionTitle,
      product_items: productRetailerIds.map((productRetailerId) => ({
        product_retailer_id: productRetailerId,
      })),
    },
  ];

  return {
    type: 'interactive',
    interactive: {
      type: 'product_list',
      body: { text: config.body },
      action: {
        catalog_id: catalogId,
        sections,
      },
    },
  };
}

export function buildWelcomeMessage() {
  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: '¿Qué se te antoja hoy? 🔥',
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: 'welcome_menu', title: '📋 Ver menú' },
          },
          {
            type: 'reply',
            reply: { id: 'welcome_promos', title: '🔥 Promociones' },
          },
          {
            type: 'reply',
            reply: { id: 'welcome_order', title: '🛒 Mi pedido' },
          },
        ],
      },
    },
  };
}

export function buildUpsell(order: UpsellOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total ?? order.totalPrice ?? calculateOrderTotal(items)) || 0;
  const hasBoneless = hasItemMatch(items, 'boneless');
  const hasPapas = hasItemMatch(items, 'papas') || hasItemMatch(items, 'papa');

  if (hasBoneless) {
    return buildUpsellButtons(
      '🔥 Agrega papas por +$20?',
      'upsell_add_papas',
      'Sí, papas 🍟'
    );
  }

  if (hasPapas) {
    return buildUpsellButtons(
      '🥤 ¿Una bebida fría para acompañar?',
      'upsell_add_bebida',
      'Sí, bebida'
    );
  }

  if (total > 0 && total < 100) {
    return buildUpsellButtons(
      '🔥 Te conviene subirlo a combo.',
      'upsell_upgrade_combo',
      'Ver combo'
    );
  }

  return buildUpsellButtons(
    '¿Quieres agregar algo más?',
    'upsell_show_menu',
    'Ver opciones'
  );
}

export async function sendWhatsAppMessage(
  to: string,
  message: WhatsAppApiPayload
): Promise<WhatsAppApiResult> {
  try {
    const { token, endpoint } = getWhatsAppConfig();
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      ...message,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await readResponseBody(response);

    if (!response.ok) {
      console.error('[whatsapp/sendMessage] Meta API error:', {
        status: response.status,
        data,
      });
      return { ok: false, status: response.status, data };
    }

    console.log('[whatsapp/sendMessage] Message sent:', {
      status: response.status,
      data,
    });

    return { ok: true, status: response.status, data };
  } catch (error) {
    console.error('[whatsapp/sendMessage] Send failed:', error);
    return {
      ok: false,
      status: 0,
      data: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendTextMessage(
  to: string,
  text: string,
  previewUrl = false
): Promise<WhatsAppApiResult> {
  return sendWhatsAppMessage(to, {
    type: 'text',
    text: {
      body: text,
      preview_url: previewUrl,
    },
  });
}

export async function sendButtonMessage(
  to: string,
  body: string,
  buttons: ReplyButton[],
  options?: { header?: string; footer?: string }
): Promise<WhatsAppApiResult> {
  return sendWhatsAppMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(options?.header ? { header: { type: 'text', text: options.header } } : {}),
      body: { text: body },
      ...(options?.footer ? { footer: { text: options.footer } } : {}),
      action: {
        buttons: buttons.slice(0, 3).map((button) => ({
          type: 'reply',
          reply: {
            id: button.id,
            title: button.title.slice(0, 20),
          },
        })),
      },
    },
  });
}

export async function sendListMessage(
  to: string,
  body: string,
  sections: ListSection[],
  options?: { header?: string; footer?: string; buttonText?: string }
): Promise<WhatsAppApiResult> {
  return sendWhatsAppMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(options?.header ? { header: { type: 'text', text: options.header } } : {}),
      body: { text: body },
      ...(options?.footer ? { footer: { text: options.footer } } : {}),
      action: {
        button: options?.buttonText || 'Ver opciones',
        sections,
      },
    },
  });
}

export async function sendProductMessage(
  to: string,
  catalogId: string,
  productRetailerId: string,
  body?: string,
  footer?: string
): Promise<WhatsAppApiResult> {
  return sendWhatsAppMessage(to, {
    type: 'interactive',
    interactive: {
      type: 'product',
      ...(body ? { body: { text: body } } : {}),
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        catalog_id: catalogId,
        product_retailer_id: productRetailerId,
      },
    },
  });
}

function normalizeProductListCategory(category: string): ProductListCategory {
  const normalized = category.toLowerCase().trim();

  if (
    normalized === 'papas' ||
    normalized === 'alitas' ||
    normalized === 'boneless' ||
    normalized === 'postres'
  ) {
    return normalized;
  }

  throw new Error(`Unsupported WhatsApp product_list category: ${category}`);
}

function getProductRetailerIdsFromEnv(envKey: string): string[] {
  const rawValue = process.env[envKey];
  if (!rawValue) return [];

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildUpsellButtons(body: string, acceptId: string, acceptTitle: string) {
  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: acceptId, title: acceptTitle.slice(0, 20) },
          },
          {
            type: 'reply',
            reply: { id: 'upsell_no_thanks', title: 'No, gracias' },
          },
        ],
      },
    },
  };
}

function hasItemMatch(items: UpsellOrderItem[], keyword: string): boolean {
  return items.some((item) => {
    const searchable = `${item.name || ''} ${item.title || ''} ${item.category || ''}`.toLowerCase();
    return searchable.includes(keyword);
  });
}

function calculateOrderTotal(items: UpsellOrderItem[]): number {
  return items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity ?? item.qty) || 1;
    return sum + price * quantity;
  }, 0);
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
