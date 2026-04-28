import type { IntentResponse } from './intentAgent';

export interface ChatState {
  producto: string | null;
  extras: string[];
  bebida: string | null;
  paso: 'inicio' | 'seleccion' | 'extras' | 'confirmacion' | 'cierre';
  lastMessage?: string | null;
  ambiguousCount?: number;
}

export interface FlowResponse {
  message: string;
  nextState: ChatState;
}

/**
 * Controla TODO el flujo del chatbot de manera determinística (SIN usar IA).
 * 
 * Reglas:
 * - Si usuario ya eligió producto → NO recomendar otros
 * - Si usuario confirma → avanzar flujo
 * - Si usuario quiere pedir → cerrar
 * - Si no hay contexto → mostrar menú
 */
export function handleMessage(
  message: string,
  intentData: IntentResponse,
  state: Partial<ChatState>
): FlowResponse {
  let { intent } = intentData;
  const { producto } = intentData;

  // --- REGLA: Si ya hay producto y piden recomendaciones/menú, tratarlo como confirmar para avanzar
  if (state.producto && (intent === 'recomendacion' || intent === 'menu' || intent === 'combos')) {
    intent = 'confirmar';
  }

  // Clonar el estado para no mutar el original e inicializar valores por defecto
  const nextState: ChatState = {
    producto: state.producto || null,
    extras: state.extras || [],
    bebida: state.bebida || null,
    paso: state.paso || 'inicio',
    lastMessage: state.lastMessage || null,
    ambiguousCount: state.ambiguousCount || 0
  };
  let responseText = '';

  // Resetear contador si el intent no es 'otro'
  if (intent !== 'otro') {
    nextState.ambiguousCount = 0;
  }

  const createResponse = (msg: string): FlowResponse => {
    if (state.lastMessage && state.lastMessage === msg) {
      msg = "🔥 ¿Quieres que te recomiende algo o prefieres elegir directo?";
    }
    nextState.lastMessage = msg;
    return { message: msg, nextState };
  };

  // 1. Detección de producto principal y extras
  let wasAddedAsExtra = false;
  let addedExtraName = '';

  const lowerMessage = message.toLowerCase();

  // Detección manual de "papas" si ya hay producto, para evitar errores del LLM
  if (state.producto && nextState.paso !== 'cierre' && (lowerMessage.includes('con papas') || lowerMessage.includes('papas'))) {
    if (!nextState.extras.includes('papas')) {
      nextState.extras.push('papas');
    }
    wasAddedAsExtra = true;
    addedExtraName = 'papas';
  }

  // Detección mediante IA
  if (producto && nextState.paso !== 'cierre') {
    if (!state.producto) {
      // NO sobrescribir producto cuando ya existe en el estado original
      nextState.producto = producto;
      if (nextState.paso === 'inicio') {
        nextState.paso = 'seleccion';
      }
    } else if (producto.toLowerCase() !== state.producto.toLowerCase() && producto.toLowerCase() !== 'papas') {
      // Si ya hay producto principal, lo guardamos como extra o bebida
      wasAddedAsExtra = true;
      addedExtraName = producto;
      if (producto.toLowerCase().includes('refresco') || producto.toLowerCase().includes('coca') || producto.toLowerCase().includes('bebida')) {
        nextState.bebida = producto;
      } else {
        if (!nextState.extras.includes(producto)) {
          nextState.extras.push(producto);
        }
      }
    }
  }

  // --- REGLA EXTRA: Si se detectó que el usuario está agregando un extra
  if (wasAddedAsExtra) {
    nextState.paso = 'confirmacion';
    const emoji = addedExtraName.includes('papas') ? '🍟' : '🥤';
    return createResponse(`🔥 Va, le agrego ${addedExtraName} ${emoji}\n¿Quieres bebida o cerramos?`);
  }

  // --- REGLA 3: Si el usuario está en cierre -> NO sugerir nuevos productos ni desviarse
  if (nextState.paso === 'cierre') {
    if (intent === 'cancelar') {
      nextState.producto = null;
      nextState.extras = [];
      nextState.bebida = null;
      nextState.paso = 'inicio';
      return createResponse('🔥 Cancelamos el pedido. ¿Se te antojaba otra cosa?');
    }
    // Permitir avanzar solo si está confirmando
    if (intent !== 'confirmar') {
      return createResponse('🔥 Tu pedido ya está cerrado y casi listo.\n¿Te lo mando por WhatsApp ya?');
    }
  }

  switch (intent) {
    case 'saludo':
    case 'menu':
    case 'combos':
    case 'recomendacion':
      // --- REGLA 1: Si ya tiene producto -> NO permitir recomendaciones genéricas
      if (nextState.producto) {
        if (nextState.paso === 'confirmacion') {
          responseText = `🔥 Seguimos con tu ${nextState.producto}.\n¿Ya cerramos el pedido?`;
        } else {
          responseText = `🔥 Ya vi que quieres ${nextState.producto} 😏\n¿Qué le agregamos? ¿Papas, refresco?`;
          nextState.paso = 'extras';
        }
      } else {
        if (intent === 'recomendacion') {
          nextState.producto = 'combo mixto';
          nextState.paso = 'seleccion';
          responseText = '🔥 Te recomiendo el Combo Mixto 911 😏\n¿Lo quieres con papas y bebida?';
        } else {
          nextState.paso = 'inicio';
          responseText = '🔥 ¿Qué se te antoja?\n1️⃣ Combos\n2️⃣ Armar combo';
        }
      }
      break;

    case 'upsell':
      if (nextState.producto) {
        responseText = `🔥 ¡Excelente elección con ${nextState.producto}!\n¿Te agrego papas o bebida?`;
        nextState.paso = 'extras';
      } else {
        responseText = '🔥 ¿Qué se te antoja?\n1️⃣ Combos\n2️⃣ Armar combo';
      }
      break;

    case 'producto':
      if (nextState.paso === 'seleccion') {
        responseText = `🔥 Va, elegiste ${nextState.producto} 😏\n¿Le quieres agregar papas o algo más?`;
        nextState.paso = 'extras';
      } else {
        responseText = `🔥 ¡Listo! Agregado al pedido.\n¿Quieres agregar algo más o ya cerramos?`;
      }
      break;

    case 'confirmar':
      // --- REGLA 2: Si el usuario confirma -> avanzar paso (NO reiniciar)
      if (!nextState.producto && nextState.paso === 'inicio') {
        responseText = '🔥 Aún no elegimos nada 😏\n¿Quieres ver combos o armar algo?';
      } else if (nextState.paso === 'inicio') {
        nextState.paso = 'seleccion';
        responseText = '🔥 Perfecto, lo preparo 🍟\n¿Quieres agregar bebida o papas extras?';
      } else if (nextState.paso === 'seleccion') {
        nextState.paso = 'extras';
        responseText = '🔥 Perfecto, lo preparo 🍟\n¿Quieres agregar bebida o papas extras?';
      } else if (nextState.paso === 'extras') {
        nextState.paso = 'confirmacion';
        const extrasList = [...nextState.extras];
        if (nextState.bebida) extrasList.push(nextState.bebida);
        const extrasStr = extrasList.length > 0 ? `\n- ${extrasList.join('\n- ')}` : '';
        responseText = `🔥 Perfecto, te dejo:\n- ${nextState.producto}${extrasStr}\n\nTotal: $XXX\n\n¿Confirmo tu pedido?`;
      } else if (nextState.paso === 'confirmacion') {
        nextState.paso = 'cierre';
        responseText = '🔥 Listo, te mando al WhatsApp 📲';
      } else if (nextState.paso === 'cierre') {
        nextState.producto = null;
        nextState.extras = [];
        nextState.bebida = null;
        nextState.paso = 'inicio';
        responseText = '🔥 Redirigiendo a WhatsApp...';
      }
      break;

    case 'pedido':
      nextState.paso = 'cierre';
      responseText = '🔥 Va, cerramos tu pedido\n¿Te lo mando por WhatsApp?';
      break;

    case 'test_ai':
      responseText = 'Esto es un texto muy simple y aburrido de prueba para que el agente de ventas demuestre cómo lo mejora.';
      break;

    case 'cancelar':
      nextState.producto = null;
      nextState.extras = [];
      nextState.bebida = null;
      nextState.paso = 'inicio';
      responseText = '🔥 No hay bronca. Si se te antoja algo más al rato, aquí andamos.';
      break;

    case 'otro':
    default:
      nextState.ambiguousCount = (nextState.ambiguousCount || 0) + 1;

      if (nextState.ambiguousCount >= 2) {
        nextState.ambiguousCount = 0;
        nextState.producto = 'combo mixto';
        nextState.paso = 'seleccion';
        responseText = '🔥 Te recomiendo el Combo Mixto 911 🔥\n¿Te lo preparo?';
      } else {
        if (nextState.paso === 'seleccion' || nextState.paso === 'extras') {
          responseText = `🔥 Seguimos armando tu pedido con ${nextState.producto || ''}.\n¿Agregamos algo más o cerramos?`;
        } else if (nextState.paso === 'confirmacion') {
          responseText = `🔥 Ya casi tenemos todo listo.\n¿Cerramos el pedido ya?`;
        } else {
          responseText = '🔥 ¿Quieres ver combos o prefieres que te recomiende algo?';
        }
      }
      break;
  }

  return createResponse(responseText);
}
