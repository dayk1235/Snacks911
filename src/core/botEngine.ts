import { dbGetProducts } from "@/lib/db";

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  const products = await dbGetProducts();

  console.log("PRODUCTS FROM DB:", products);

  if (!products || products.length === 0) {
    return "Ahorita no tengo productos disponibles 😔";
  }

  let text = "🔥 MENÚ Snacks 911 🔥\n\n";

  for (const p of products) {
    text += `🍗 ${p.name} - $${p.price}\n`;
  }

  text += "\n¿Qué te gustaría ordenar? 😏";

  return text;
}