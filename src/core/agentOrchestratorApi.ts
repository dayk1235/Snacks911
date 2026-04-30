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

  const output = await handleMessageModular(input.message, prevState, {
    ...productRefs,
    currentTotal: prevState.cartTotal,
    hasPapas: prevState.cart.includes('Papas Loaded'),
    hasBebida: prevState.cart.some((i) => i.includes('Refresco')),
    hasPostre: prevState.cart.some((i) => i.includes('Brownie')),
  });

  stateByPhone.set(input.phone, output.nextState);
  return { text: output.text, nextState: output.nextState };
}

