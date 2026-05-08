import { dbGetSales } from './db';

export async function getSalesServer() {
  return await dbGetSales();
}
