/**
 * metaClient.ts
 * Sends messages to WhatsApp Cloud API (Meta).
 * Supports: text, interactive list, interactive buttons.
 */

const META_BASE = 'https://graph.facebook.com/v19.0';

function getPhoneId() {
  return process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
}

function getToken() {
  return process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
}

async function sendRaw(payload: Record<string, unknown>): Promise<void> {
  const phoneId = getPhoneId();
  const token = getToken();

  if (!phoneId || !token) {
    // Dev mode — just log
    console.log('[metaClient] DEV MODE — would send:', JSON.stringify(payload, null, 2));
    return;
  }

  const res = await fetch(`${META_BASE}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[metaClient] Meta API error:', err);
  }
}

// ── Send plain text ────────────────────────────────────────────────────────
export async function sendText(to: string, text: string): Promise<void> {
  await sendRaw({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { body: text, preview_url: false },
  });
}

// ── Send interactive list (up to 10 rows) ─────────────────────────────────
export interface ListSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

export async function sendList(
  to: string,
  header: string,
  body: string,
  buttonLabel: string,
  sections: ListSection[],
  footer?: string
): Promise<void> {
  await sendRaw({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: header },
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: { button: buttonLabel, sections },
    },
  });
}

// ── Send interactive reply buttons (up to 3) ──────────────────────────────
export interface ReplyButton {
  id: string;
  title: string;
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: ReplyButton[],
  header?: string,
  footer?: string
): Promise<void> {
  await sendRaw({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      ...(header ? { header: { type: 'text', text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) }, // max 20 chars
        })),
      },
    },
  });
}

// ── Pre-built message helpers ──────────────────────────────────────────────
export async function sendMainMenu(to: string): Promise<void> {
  await sendList(
    to,
    '🔥 Snacks 911',
    '¿Qué se te antoja hoy? Elige una categoría:',
    'Ver categoría',
    [
      {
        title: 'Nuestro Menú',
        rows: [
          { id: 'cat_COMBOS', title: '🍗 Combos', description: 'Desde $139 — incluyen papas + bebida' },
          { id: 'cat_PROTEINA', title: '💪 Proteína', description: 'Boneless y Alitas' },
          { id: 'cat_PAPAS', title: '🍟 Papas', description: 'Clásicas, con queso y más' },
          { id: 'cat_BANDERILLAS', title: '🌮 Banderillas', description: 'Banderilla coreana y dedos de queso' },
          { id: 'cat_BEBIDAS', title: '🥤 Bebidas', description: 'Refresco 400ml — $30' },
          { id: 'cat_EXTRAS', title: '🧀 Extras', description: 'Salsas y dips' },
        ],
      },
      {
        title: 'Más opciones',
        rows: [
          { id: 'intent_PROMOS', title: '🏷️ Promos de hoy', description: 'Descuentos y combos especiales' },
          { id: 'intent_RECOMMEND', title: '🤔 ¿Qué me recomiendas?', description: 'Te ayudo a elegir' },
        ],
      },
    ],
    'Snacks 911 · Siempre a tiempo 🔥'
  );
}

export async function sendSauceSelector(to: string, productName: string): Promise<void> {
  await sendButtons(
    to,
    `¿Con qué salsa quieres tu ${productName}?`,
    [
      { id: 'sauce_BBQ', title: '🍖 BBQ' },
      { id: 'sauce_Mango_Habanero', title: '🌶️ Mango Habanero' },
      { id: 'sauce_NONE', title: '🚫 Sin salsa' },
    ]
  );
}

export async function sendUpsellOffer(to: string, message: string): Promise<void> {
  await sendButtons(
    to,
    message,
    [
      { id: 'upsell_YES', title: '✅ Sí, cámbialo' },
      { id: 'upsell_NO', title: '❌ No, está bien' },
    ]
  );
}

export async function sendHandoffMessage(to: string): Promise<void> {
  await sendText(
    to,
    'Ya te apoyo con eso 🙌 Te paso con alguien que puede resolverlo rápido.\n¿Me confirmas tu nombre y qué fue lo que pediste?'
  );
}
