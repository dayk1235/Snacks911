import { dbGetProducts } from '@/lib/db';

export async function validateOrderItems(items: any[]) {
  try {
    const products = await dbGetProducts();
    const validItems = [];

    for (const item of items) {
      const qty = Number(item.qty || item.quantity);
      if (!qty || qty <= 0) continue;

      const pId = item.productId || item.product_id || item.id;
      const dbProduct = products.find(p => p.id === pId);

      if (!dbProduct) {
        continue;
      }

      validItems.push({
        ...item,
        id: dbProduct.id,
        productId: dbProduct.id,
        product_id: dbProduct.id,
        name: dbProduct.name,
        productName: dbProduct.name,
        product_name: dbProduct.name,
        price: dbProduct.price, // DB authoritative price
        unit_price: dbProduct.price,
        quantity: qty,
        qty: qty
      });
    }

    if (validItems.length === 0) throw new Error("Validation Error: No valid items found");
    return validItems;
  } catch (error) {
    console.error("[ValidationService] Error:", error);
    throw error;
  }
}
