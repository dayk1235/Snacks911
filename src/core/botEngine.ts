import { dbGetProducts, dbSaveOrder } from "@/lib/db";
import { getAIResponse } from "@/lib/whatsapp/aiService";

const memory = new Map<string, { product: any; qty: number }>();

function extractQty(text: string) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  const lower = message.toLowerCase();

  const isOrderIntent = /quiero|dame|ordenar|pedir/i.test(message);
  const isConfirming = (lower.includes("si") || lower.includes("sí")) && phone;
  
  // Existing logic check...
  const products = await dbGetProducts();
  const foundProduct = products.find(p => lower.includes(p.name.toLowerCase()));

  console.log("DEBUG:", {
    message,
    isConfirming,
    foundProduct,
    isOrderIntent
  });

  const shouldUseAI =
    !isConfirming &&
    !foundProduct &&
    !isOrderIntent;

  console.log("[Gemini USED]:", shouldUseAI);

  const context = {
    menu_items: products.map(p => ({
      name: p.name,
      price: p.price,
      category: p.category
    })),
    modifiers: [],
    announcements_active: [],
    promos_active: [],
    cart_state: [],
    customer_message: message
  };

  // Confirmación de pedido
  if ((lower.includes("si") || lower.includes("sí")) && phone) {
    const order = memory.get(phone);

    if (!order) {
      return "No tengo tu pedido 😅 inténtalo otra vez";
    }

    try {
      await dbSaveOrder({
        id: '',
        status: 'pending',
        channel: 'WHATSAPP',
        whatsappConfirmed: true,
        items: [
          {
            productId: '',
            productName: order.product.name,
            quantity: order.qty,
            price: order.product.price
          }
        ],
        total: order.product.price * order.qty,
        createdAt: new Date().toISOString(),
        customerName: 'WhatsApp',
        customerPhone: phone
      });

      memory.delete(phone);

      return "✅ Pedido confirmado. En breve te contactamos 🙌";
    } catch (e) {
      console.error("Error saving order:", e);
      return "Tuve un problema guardando tu pedido 😔";
    }
  }

  if (!products || products.length === 0) {
    return "Ahorita no tengo productos disponibles 😔";
  }

  const found = products.find(p =>
    lower.includes(p.name.toLowerCase())
  );

  if (found) {
    const qty = extractQty(message);

    if (found && qty && phone) {
      const total = found.price * qty;
      memory.set(phone, { product: found, qty });

      return `🧾 Pedido:\n${qty} x ${found.name}\n\nTotal: $${total}\n\n¿Confirmas? (sí/no)`;
    }

    return `🔥 ${found.name}\nPrecio: $${found.price}\n\n¿CUántas quieres?`;
  }

  let text = "🔥 MENÚ Snacks 911 🔥\n\n";

  for (const p of products) {
    text += `🍗 ${p.name} - $${p.price}\n`;
  }

  text += "\n¿Qué te gustaría ordenar? 😏";

  if (shouldUseAI) {
    try {
      const ai = await getAIResponse(context);
      if (ai?.message_to_user) {
        return ai.message_to_user;
      }
    } catch {}
  }

  return text;
}