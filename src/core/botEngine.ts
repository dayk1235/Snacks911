import { dbGetProducts, dbSaveOrder } from "@/lib/db";

let pendingOrder: { name: string; price: number; qty: number } | null = null;

function extractQty(text: string) {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  const lower = message.toLowerCase();

  // Confirmación de pedido
  if (lower.includes("si") || lower.includes("sí")) {
    if (pendingOrder) {
      try {
        await dbSaveOrder({
          id: '',
          status: 'pending',
          items: [
            {
              productId: '',
              productName: pendingOrder.name,
              quantity: pendingOrder.qty,
              price: pendingOrder.price
            }
          ],
          total: pendingOrder.price * pendingOrder.qty,
          createdAt: new Date().toISOString(),
          customerName: 'WhatsApp',
          customerPhone: phone || ''
        });
        pendingOrder = null;
        return "✅ Pedido confirmado. En breve te contactamos 🙌";
      } catch (e) {
        console.error("Error saving order:", e);
        return "Tuve un problema guardando tu pedido. Por favor intenta de nuevo 😔";
      }
    }
    return "No tengo ningún pedido pendiente. ¿Qué te gustaría ordenar?";
  }

  const products = await dbGetProducts();

  console.log("PRODUCTS FROM DB:", products);

  if (!products || products.length === 0) {
    return "Ahorita no tengo productos disponibles 😔";
  }

  const found = products.find(p =>
    lower.includes(p.name.toLowerCase())
  );

  if (found) {
    const qty = extractQty(message);

    if (found && qty) {
      const total = found.price * qty;
      pendingOrder = { name: found.name, price: found.price, qty };

      return `🧾 Pedido:\n${qty} x ${found.name}\n\nTotal: $${total}\n\n¿Confirmas? (sí/no)`;
    }

    return `🔥 ${found.name}\nPrecio: $${found.price}\n\n¿CUántas quieres?`;
  }

  let text = "🔥 MENÚ Snacks 911 🔥\n\n";

  for (const p of products) {
    text += `🍗 ${p.name} - $${p.price}\n`;
  }

  text += "\n¿Qué te gustaría ordenar? 😏";

  return text;
}