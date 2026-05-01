import { dbGetProducts } from "@/lib/db";

export async function getBotResponse({ message, phone }: { message: string; phone?: string }) {
  const products = await dbGetProducts();

  console.log("PRODUCTS FROM DB:", products);

  return "DB_OK_" + (products?.length || 0);
}