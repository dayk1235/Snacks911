import crypto from 'crypto';

const CONEKTA_API = 'https://api.conekta.io';

function getApiKey(): string {
  const key = process.env.CONEKTA_API_KEY;
  if (!key) throw new Error('CONEKTA_API_KEY is not set');
  return key;
}

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${getApiKey()}:`).toString('base64')}`;
}

export interface PaymentLink {
  url: string;
  expiresAt: string;
  conektaOrderId: string;
  checkoutId: string;
}

export interface PaymentLinkParams {
  orderId: string;
  customerName: string;
  customerPhone: string;
  total: number;
  items: Array<{ productName: string; quantity: number; price: number }>;
  currency?: string;
}

export async function createPaymentLink(params: PaymentLinkParams): Promise<PaymentLink> {
  const lineItems = params.items.map((item) => ({
    name: item.productName.slice(0, 50),
    unit_price: Math.round(item.price * 100),
    quantity: item.quantity,
  }));

  const expiresAt = Math.floor(Date.now() / 1000) + 86400;

  const body = {
    currency: params.currency || 'MXN',
    customer_info: {
      name: params.customerName || 'Cliente Snacks 911',
      phone: params.customerPhone,
    },
    line_items: lineItems,
    checkout: {
      type: 'HostedPayment',
      allowed_payment_methods: ['cash', 'card', 'bank_transfer'],
      expires_at: expiresAt,
    },
    metadata: {
      order_id: params.orderId,
      source: 'snacks911-web',
    },
  };

  const res = await fetch(`${CONEKTA_API}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      Accept: 'application/vnd.conekta-v2.0.0+json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[conekta] createPaymentLink error:', res.status, err);
    throw new Error(`Conekta error (${res.status}): ${err}`);
  }

  const data = await res.json();

  return {
    url: data.checkout?.url || '',
    expiresAt: data.checkout?.expires_at
      ? new Date(data.checkout.expires_at * 1000).toISOString()
      : '',
    conektaOrderId: data.id,
    checkoutId: data.checkout?.id || '',
  };
}

export async function getPaymentStatus(conektaOrderId: string): Promise<{
  status: string;
  paymentStatus: string;
}> {
  const res = await fetch(`${CONEKTA_API}/orders/${conektaOrderId}`, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/vnd.conekta-v2.0.0+json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Conekta get status error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    status: data.status || 'unknown',
    paymentStatus: data.payment_status || 'unknown',
  };
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.CONEKTA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[conekta] CONEKTA_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }

  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface ConektaWebhookEvent {
  type: string;
  webhook_logs?: Array<{
    id: string;
    url: string;
    failed_attempts: number;
    last_attempted_at: number;
  }>;
  data: {
    object: {
      id: string;
      livemode: boolean;
      payment_status: string;
      amount: number;
      currency: string;
      status: string;
      metadata?: Record<string, string>;
      charges?: {
        data: Array<{
          id: string;
          status: string;
          paid_at: number;
          payment_method: {
            type: string;
            object: string;
          };
        }>;
      };
    };
    previous_attributes?: Record<string, unknown>;
  };
}

export function handleWebhook(
  payload: string,
  signature: string
): { valid: boolean; event: ConektaWebhookEvent | null } {
  const valid = verifyWebhookSignature(payload, signature);

  if (!valid) {
    return { valid: false, event: null };
  }

  try {
    const event: ConektaWebhookEvent = JSON.parse(payload);
    return { valid: true, event };
  } catch (err) {
    console.error('[conekta] Failed to parse webhook payload:', err);
    return { valid: false, event: null };
  }
}

export function extractOrderId(event: ConektaWebhookEvent): string | null {
  return event.data?.object?.metadata?.order_id || null;
}

export function mapConektaEventToPaymentStatus(
  eventType: string,
  paymentStatus: string
): string {
  const paidEvents = ['order.paid'];
  const expiredEvents = ['order.expired'];
  const cancelledEvents = ['order.cancelled', 'charge.refunded'];

  if (paidEvents.includes(eventType)) return 'paid';
  if (expiredEvents.includes(eventType)) return 'expired';
  if (cancelledEvents.includes(eventType)) return 'cancelled';

  if (paymentStatus === 'paid') return 'paid';
  if (paymentStatus === 'expired') return 'expired';
  if (paymentStatus === 'refunded') return 'cancelled';
  if (paymentStatus === 'pending_payment') return 'pending';

  return 'pending';
}
