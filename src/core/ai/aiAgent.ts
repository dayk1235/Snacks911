import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';

/**
 * core/ai/aiAgent.ts
 * 
 * El nuevo cerebro transaccional. Utiliza Structured Outputs de Gemini
 * para leer el contexto y decidir qué hacer con el carrito y qué responder.
 */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface AgentAction {
  type: 'ADD_TO_CART' | 'REMOVE_FROM_CART' | 'CHECKOUT' | 'TALK' | 'CLEAR_CART';
  productId?: string;
  quantity?: number;
}

export interface AgentResponse {
  actions: AgentAction[];
  response_text: string;
}

const agentSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    actions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: { 
            type: SchemaType.STRING, 
            description: "Enum: ADD_TO_CART, REMOVE_FROM_CART, CHECKOUT, TALK, CLEAR_CART" 
          },
          productId: { 
            type: SchemaType.STRING, 
            description: "ID of the product (required for ADD/REMOVE)" 
          },
          quantity: { 
            type: SchemaType.INTEGER, 
            description: "Number of items (default 1)" 
          }
        },
        required: ["type"]
      }
    },
    response_text: {
      type: SchemaType.STRING,
      description: "El mensaje de texto en español mexicano que se enviará al cliente. Muy amigable y vendedor. Si agregaste algo al carrito, confírmalo aquí. Nunca digas IDs."
    }
  },
  required: ["actions", "response_text"]
};

export async function processTransaction(
  message: string, 
  cart: any[], 
  availableProducts: any[],
  businessName: string
): Promise<AgentResponse> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: agentSchema,
      temperature: 0.1 // Low temperature for deterministic JSON output
    }
  });

  // Simplify products for the prompt to save tokens
  const catalog = availableProducts.map(p => 
    `ID: ${p.id} | Nombre: ${p.name} | Precio: $${p.price} | Categoria: ${p.category}`
  ).join('\n');

  const cartStr = cart.length === 0 
    ? 'El carrito está vacío.' 
    : cart.map((i: any) => `- ${i.quantity}x ${i.name} (ID: ${i.productId || i.id})`).join('\n');

  const prompt = `
Eres el agente de ventas estrella de ${businessName}. Tu objetivo es tomar pedidos de comida rápido y de forma conversacional.

### CATÁLOGO DISPONIBLE:
${catalog}

### CARRITO ACTUAL DEL CLIENTE:
${cartStr}

### MENSAJE DEL CLIENTE:
"${message}"

### INSTRUCCIONES:
1. Mapea la petición del cliente al catálogo exacto usando los IDs.
2. Si el cliente quiere agregar algo, usa la acción ADD_TO_CART con el ID correspondiente.
3. Si el cliente quiere quitar algo que está en el carrito, usa REMOVE_FROM_CART.
4. Si el cliente ya quiere confirmar el pedido, envía la acción CHECKOUT.
5. Si el cliente solo saluda o hace una pregunta, usa TALK.
6. En el campo "response_text", escribe una respuesta natural, amigable, usando emojis, como si hablaras por WhatsApp en México. Si no encuentras lo que pide, dile amablemente qué sí hay. ¡No inventes productos!
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    
    if (!response || response.trim() === '') {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(response) as AgentResponse;
    return parsed;
  } catch (error) {
    console.error('[AIAgent] Error processing transaction:', error);
    // Fallback response if AI fails
    return {
      actions: [{ type: 'TALK' }],
      response_text: "Tuve un pequeño problema procesando eso. ¿Me lo repites? 😅"
    };
  }
}
