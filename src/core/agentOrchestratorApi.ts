import type { ConversationState, ProductRefs, ResponseOutput } from './types';
import { INITIAL_STATE, handleMessageModular } from './responseEngine';

const productRefs: ProductRefs = {
  comboName: '🔥 Combo 911',
  comboPrice: 119,
  papasName: 'Papas Loaded',
  papasPrice: 69,
  bebidaName: 'Refresco',
  bebidaPrice: 25,
  postreName: 'Brownie',
  postrePrice: 59,
  comboBonelessName: '🍗 Combo Boneless',
  comboBonelessPrice: 99,
  ahorroBoneless: 40,
  currentTotal: 0,
  hasPapas: false,
  hasBebida: false,
  hasPostre: false,
};

const stateByPhone = new Map<string, ConversationState>();

export async function agentOrchestrator(input: {
  message: string;
  phone: string;
}): Promise<Pick<ResponseOutput, 'text'> & { nextState: ConversationState }> {
  const prevState = stateByPhone.get(input.phone) ?? INITIAL_STATE;

  const items = Array.isArray(prevState.cart?.items)
    ? prevState.cart.items
    : [];

  const output = await handleMessageModular(input.message, prevState, {
    ...productRefs,
    currentTotal: prevState.cartTotal,
    hasPapas: items.some(i => i.name?.includes('Papas')),
    hasBebida: items.some(i => i.name?.includes('Refresco')),
    hasPostre: items.some(i => i.name?.includes('Brownie')),
  });

  stateByPhone.set(input.phone, output.nextState);
  return { text: output.text, nextState: output.nextState };
}

