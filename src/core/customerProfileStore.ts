import { dbGetCustomer, dbUpsertCustomer, Customer } from '@/lib/db';
import { CustomerProfile } from './types';

export async function getCustomerProfile(phone: string): Promise<CustomerProfile | undefined> {
  try {
    const dbCustomer = await dbGetCustomer(phone);
    if (!dbCustomer) return undefined;

    // Map DB Customer to Core CustomerProfile
    return {
      phone: dbCustomer.phoneNumber,
      name: dbCustomer.name,
      totalOrders: dbCustomer.totalOrders,
      totalSpent: 0, // Placeholder if not in DB yet
      lastOrderAt: dbCustomer.lastOrderDate ? new Date(dbCustomer.lastOrderDate) : null,
      createdAt: new Date(dbCustomer.createdAt),
      favoriteProduct: dbCustomer.favoriteProduct,
    };
  } catch (error) {
    console.error("[CustomerProfile] Error fetching:", error);
    return undefined;
  }
}

export async function updateCustomerFromOrder(phone: string, name: string, total: number, items: any[]) {
  try {
    let customer = await dbGetCustomer(phone);
    
    // Detectar producto favorito de esta orden (el más caro o el de mayor cantidad)
    let favoriteProduct = null;
    if (items && items.length > 0) {
      const sortedItems = [...items].sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price));
      favoriteProduct = sortedItems[0]?.productName || null;
    }

    if (!customer) {
      customer = {
        phoneNumber: phone,
        name: name,
        totalOrders: 1,
        lastOrderDate: new Date().toISOString(),
        lastOrderTotal: total,
        favoriteProduct: favoriteProduct || '',
        createdAt: new Date().toISOString(),
      };
    } else {
      customer.totalOrders += 1;
      customer.lastOrderDate = new Date().toISOString();
      customer.lastOrderTotal = total;
      if (favoriteProduct) {
        customer.favoriteProduct = favoriteProduct;
      }
    }

    await dbUpsertCustomer(customer);
  } catch (error) {
    console.error("[CustomerProfile] Error updating:", error);
  }
}
