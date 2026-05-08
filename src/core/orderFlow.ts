export type OrderState =
  | 'IDLE'
  | 'BROWSING'
  | 'BUILDING_CART'
  | 'REVIEWING'
  | 'CONFIRMING'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_EXPIRED'
  | 'AWAITING_REVIEW'
  | 'AWAITING_REVIEW_COMMENT'
  | 'COMPLETED';

export interface FlowContext {
  state: OrderState;
  cartItems?: number;
  hasProductMatch?: boolean;
}

export function resolveNextState(
  current: OrderState,
  intent: string,
  ctx?: FlowContext,
): OrderState {
  const cartHasItems = (ctx?.cartItems ?? 0) > 0;
  const productMatch = ctx?.hasProductMatch ?? false;

  const upperIntent = intent.toUpperCase();

  // Guard: CONFIRM_ORDER requires items in cart
  if (upperIntent === 'CONFIRM_ORDER' && !cartHasItems) {
    return current === 'IDLE' ? 'IDLE' : 'BUILDING_CART';
  }

  // Guard: ADD_TO_CART requires a product match
  if (upperIntent === 'ADD_TO_CART' && !productMatch) {
    return current;
  }

  // Guard: VIEW_CART requires items in cart
  if (upperIntent === 'VIEW_CART' && !cartHasItems) {
    return current;
  }

  switch (current) {
    case 'IDLE':
      if (upperIntent === 'SHOW_MENU') return 'BROWSING';
      if (upperIntent === 'ADD_TO_CART') return 'BUILDING_CART';
      return 'IDLE';

    case 'BROWSING':
      if (upperIntent === 'ADD_TO_CART') return 'BUILDING_CART';
      return 'BROWSING';

    case 'BUILDING_CART':
      if (upperIntent === 'VIEW_CART') return 'REVIEWING';
      if (upperIntent === 'CONFIRM_ORDER') return 'CONFIRMING';
      return 'BUILDING_CART';

    case 'REVIEWING':
      if (upperIntent === 'ADD_TO_CART') return 'BUILDING_CART';
      if (upperIntent === 'CONFIRM_ORDER') return 'CONFIRMING';
      return 'REVIEWING';

    case 'CONFIRMING':
      if (upperIntent === 'CONFIRM_ORDER') return 'AWAITING_PAYMENT';
      return 'CONFIRMING';

    case 'AWAITING_PAYMENT':
      return 'AWAITING_PAYMENT';

    case 'PAYMENT_CONFIRMED':
      return 'IDLE';

    case 'PAYMENT_EXPIRED':
      return 'IDLE';

    case 'COMPLETED':
      return 'IDLE';
    default:
      return 'IDLE';
  }
}
