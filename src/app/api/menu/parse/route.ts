/**
 * POST /api/menu/parse
 *
 * AI-powered menu generator.
 * Takes a text description and generates a full structured menu
 * with realistic Mexican street food prices.
 *
 * Input: { description: "vendo alitas, boneless, papas, refrescos" }
 * Output: { success: true, items: [...], categories: [...] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMenuFromDescription } from '@/lib/menu-generator';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('[MenuGen] Request received');

  try {
    const body = await req.json().catch(() => null) as { description?: string } | null;
    const description = body?.description?.trim() || '';

    if (!description || description.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Describe que vendes. Ejemplo: "vendo alitas, boneless, papas, refrescos"',
        },
        { status: 400 }
      );
    }

    console.log(`[MenuGen] Generating menu from: "${description}"`);

    const result = generateMenuFromDescription(description);

    const elapsed = Date.now() - startTime;
    console.log(`[MenuGen] Generated ${result.totalItems} items in ${elapsed}ms`);

    return NextResponse.json({
      success: true,
      items: result.items,
      categories: result.categories,
      totalItems: result.totalItems,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error('[MenuGen] Error:', message);
    return NextResponse.json(
      {
        success: false,
        error: 'Error generando el menu. Intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}
