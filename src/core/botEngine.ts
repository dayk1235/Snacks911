import { dbGetProducts } from "@/lib/db";

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  const products = await dbGetProducts();

  console.log("PRODUCTS FROM DB:", products);

  if (!products || products.length === 0) {
    return "Ahorita no tengo productos disponibles 😔";
  }

  const lower = message.toLowerCase();

  const found = products.find(p =>
    lower.includes(p.name.toLowerCase())
  );

  if (found) {
    return `🔥 ${found.name}\nPrecio: $${found.price}\n\n¿Cuántas quieres?`;
  }

  let text = "🔥 MENÚ Snacks 911 🔥\n\n";

  for (const p of products) {
    text += `🍗 ${p.name} - $${p.price}\n`;
  }

  text += "\n¿Qué te gustaría ordenar? 😏";

  return text;
}