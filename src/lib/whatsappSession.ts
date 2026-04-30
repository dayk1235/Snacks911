type Session = {
  step: 'idle' | 'ordering' | 'confirming';
  cart: any[];
  selectedProductId?: string;
  upsellOptions?: any[];
};

const sessions: Record<string, Session> = {};

export function getSession(phone: string): Session {
  if (!sessions[phone]) {
    sessions[phone] = { step: 'idle', cart: [] };
  }
  return sessions[phone];
}
