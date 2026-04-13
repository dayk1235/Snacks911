/**
 * POST /api/menu/save
 *
 * Saves menu items to the database.
 * Replaces ALL products — this is a full menu replacement.
 *
 * Request: JSON { items: [{ name, price, description, category, ... }] }
 * Response: { ok: true, count: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { dbSaveProduct, dbGetProducts } from '@/lib/db';
import type { AdminProduct } from '@/lib/adminTypes';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: Array<{ name: string; price: number; description: string; category: string; imageUrl?: string }> = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No hay productos para guardar' }, { status: 400 });
    }

    // Validate each item
    for (const item of items) {
      if (!item.name || typeof item.price !== 'number' || !item.category) {
        return NextResponse.json(
          { error: `Producto invalido: ${JSON.stringify(item)}` },
          { status: 400 }
        );
      }
    }

    // Delete ALL existing products first (full replacement)
    const existing = await dbGetProducts();
    for (const p of existing) {
      try { await deleteProductById(p.id); } catch {}
    }

    // Convert to AdminProduct format
    const products: AdminProduct[] = items.map((item, i) => ({
      id: `menu_${Date.now()}_${i}`,
      name: item.name,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || '',
      available: true,
      description: item.description || '',
      applicableProductIds: [],
    }));

    // Save all products
    let saved = 0;
    for (const product of products) {
      try {
        await dbSaveProduct(product);
        saved++;
      } catch (err) {
        console.error(`[MenuSave] Error saving "${product.name}":`, err);
      }
    }

    console.log(`[MenuSave] Saved ${saved}/${products.length} products`);

    return NextResponse.json({ ok: true, count: saved, total: products.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[MenuSave] Fatal error:', message);
    return NextResponse.json({ error: `Error al guardar: ${message}` }, { status: 500 });
  }
}

async function deleteProductById(id: string) {
  const { supabase } = await import('@/lib/supabase');
  await supabase.from('products').delete().eq('id', id);
}
