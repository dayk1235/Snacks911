import { UserContext } from "./userContext";
import { formatWhatsAppMessage } from "@/lib/whatsapp/formatter";

export interface ProductParam {
  name: string;
  price: number;
  category?: string;
  [key: string]: any;
}

export function buildResponse(
  products: ProductParam[],
  intent: string,
  context: UserContext,
): string {
  // Limit to 5 products for mobile readability
  const limitedProducts = products.slice(0, 5);

  let header = "";

  // 1. Context-aware Greeting
  const isFirstInteraction = !context.lastIntent;
  if (isFirstInteraction) {
    header += "¡Hola! ";
  }

  // 2. Direct & Punchy WhatsApp Headers
  const upperIntent = intent.toUpperCase();
  if (upperIntent === "ADD_TO_CART" || upperIntent === "PEDIDO") {
    header += "¡Buenísima elección! Te sugiero:";
  } else if (upperIntent === "RECOMMEND") {
    header += "💡 Te recomiendo probar:";
  } else if (upperIntent === "SHOW_CATEGORY" || upperIntent === "VER") {
    header += "🔥 Chécate estas opciones:";
  } else {
    header += "Aquí tienes lo mejor de hoy:";
  }

  // formatWhatsAppMessage enforces the 300-char limit and handles product emojis.
  let response = formatWhatsAppMessage(
    header.trim(),
    limitedProducts,
    "¿Cuál te gustaría ordenar? 😏",
  );

  // Final length safety check (Hard Limit 300 chars)
  if (response.length > 300) {
    response = response.substring(0, 297) + "...";
  }

  return response;
}
