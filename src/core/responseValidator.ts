import type { ConversationState, QuickAction, ResponseOutput } from './types';

const ACTION_VALUE_RE = /^[a-z0-9_:-]+$/i;

function hasBrokenFormatting(text: string): boolean {
  const boldCount = (text.match(/\*\*/g) || []).length;
  const backtickCount = (text.match(/`/g) || []).length;
  return text.includes('�') || boldCount % 2 !== 0 || backtickCount % 2 !== 0;
}

function sanitizeActions(actions: QuickAction[] | undefined): QuickAction[] | undefined {
  if (!actions?.length) return undefined;
  const filtered = actions.filter(a => a.label?.trim() && ACTION_VALUE_RE.test(a.value));
  return filtered.length ? filtered : undefined;
}

export function validateResponseOutput(
  output: ResponseOutput,
  prevState: ConversationState,
): ResponseOutput {
  let text = output.text?.trim() || 'Te ayudo con tu pedido. ¿Qué se te antoja?';
  let actions = sanitizeActions(output.actions);

  // state-response mismatch: confirmed order should not keep offering upsells
  if (output.nextState.orderConfirmed && /(papas|bebida|postre|upsell|agregamos)/i.test(text)) {
    text = 'Pedido confirmado. Te comparto el resumen y seguimos con la entrega.';
    actions = undefined;
  }

  // invalid formatting: fallback to plain text if markdown/emoji looks broken
  if (hasBrokenFormatting(text)) {
    text = text.replace(/\*\*/g, '').replace(/`/g, '').replace(/�/g, '').trim() || 'Listo, continuamos con tu pedido.';
  }

  // repeated rejected upsell: avoid pushing upsell again right after rejection
  if (
    (prevState.lastIntent === 'rechazo' || prevState.lastIntent === 'rechazo_fuerte') &&
    /(papas|bebida|postre|combo|agregar|upsell)/i.test(text)
  ) {
    text = 'Entendido. ¿Prefieres continuar con tu pedido actual o ver otra opción?';
    actions = undefined;
  }

  return { 
    text, 
    actions, 
    type: output.type,
    nextState: output.nextState 
  };
}

