/**
 * core/response/aiHandler.ts — AI response utilities extracted from responseEngine.
 *
 * Functions:
 *   1. applyAntiLoop — rotates sales strategy when a loop is detected
 *   2. parseUserRequest — extracts include/exclude keywords from user text
 *   3. extractProductEntities — resolves product entity names from intent result
 *   4. extractCategoryEntities — resolves category entity names from intent result
 *   5. matchProducts — matches products in catalog by intent and entities
 */

import { applyLoopStrategy, getBestStrategyFromAnalyticsSync } from "../antojo";
import type { AntiLoopStrategy } from "../antojo";
import type { PromptContext, Intent } from "../types";
import { parseEntitiesRecord } from "../intentDetector";
import { normalizeConstraintList } from "./formatting";

// ─── Anti-loop: STRATEGY ROTATOR (not wording change) ─────────────────────────

/**
 * When a loop is detected, applies a DIFFERENT SALES STRATEGY.
 * Cycles: ANTOJO → FOMO → SOCIAL PROOF → PRICE ANCHOR
 * The base message stays the same — the angle changes.
 */
export function applyAntiLoop(
  text: string,
  lastResponse: string | null,
  retryCount: number,
  ctx: PromptContext,
): { text: string; newRetryCount: number } {
  if (!lastResponse || text === lastResponse) {
    if (!lastResponse) return { text, newRetryCount: 0 };

    // Loop detected → pick best strategy from analytics (sync cache),
    // fallback to deterministic rotation if no analytics data available
    const strategy: AntiLoopStrategy = getBestStrategyFromAnalyticsSync(retryCount);
    const modifiedText = applyLoopStrategy(
      text,
      strategy,
      ctx.comboName,
      "combos",
      ctx.comboPrice,
      ctx.comboPrice + ctx.ahorroBoneless,
    );

    return { text: modifiedText, newRetryCount: retryCount + 1 };
  }

  return { text, newRetryCount: 0 };
}

// ─── User request parser ──────────────────────────────────────────────────────

export function parseUserRequest(text: string) {
  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents

  // Extract include keywords (e.g., "quiero papas", "dame alitas", "papas")
  const includeMatch =
    lower.match(
      /\b(?:con|quiero|dame)\s+([a-z\s]+?)(?=\s+(?:pero|sin)\s+|$)/i,
    ) || lower.match(/^([a-z\s]+?)(?=\s+(?:sin|pero sin)\s+|$)/i);

  let includeWords: string[] = [];
  if (includeMatch) {
    includeWords = includeMatch[1]
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // Expand allergy patterns (Normalized: no accents)
  const allergyPatterns = [
    /\b(?:sin|pero sin)\s+([a-z\s]+)(?=\s+|$|[,.])\b/i,
    /\b(?:soy alergico a|alergico a|no puedo comer)\s+([a-z\s]+)(?=\s+|$|[,.])\b/i,
  ];

  let excludeWords: string[] = [];
  for (const pattern of allergyPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const extracted = match[1]
        .trim()
        .split(/\s+/)
        .filter(
          (w) =>
            !["la", "el", "los", "las", "un", "una"].includes(
              w.toLowerCase(),
            ) && w.length > 2,
        );
      excludeWords = [...excludeWords, ...extracted];
    }
  }

  return { includeWords, excludeWords: Array.from(new Set(excludeWords)) };
}

// ─── Entity extractors ────────────────────────────────────────────────────────

export function extractProductEntities(
  intentResult: any,
  includeWords: string[],
): string[] {
  const e = parseEntitiesRecord(intentResult.entities);
  return normalizeConstraintList([
    ...(e.products || []),
    ...(intentResult.entities?.product ? [intentResult.entities.product] : []),
    ...includeWords,
  ]);
}

export function extractCategoryEntities(intentResult: any): string[] {
  const e = parseEntitiesRecord(intentResult.entities);
  return normalizeConstraintList([
    ...(e.categories || []),
    ...(intentResult.category && intentResult.category !== "none"
      ? [intentResult.category]
      : []),
  ]);
}

// ─── Product matcher ──────────────────────────────────────────────────────────

export function matchProducts(
  intent: string,
  entities: { product?: string[]; category?: string[] },
  products: any[],
): any[] {
  let filtered = [...products];
  const productEntities = entities.product || [];
  const categoryEntities = entities.category || [];

  // si intent = SHOW_CATEGORY: devolver todos los de la categoría
  if (intent === "SHOW_CATEGORY" && categoryEntities.length > 0) {
    return filtered.filter((p) => {
      const cat = String(p.category || "").toLowerCase();
      return categoryEntities.some((c) => cat.includes(c) || c.includes(cat));
    });
  }

  // si intent = ADD_TO_CART: priorizar coincidencias exactas
  if (intent === "ADD_TO_CART" && productEntities.length > 0) {
    const exactMatches = filtered.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      return productEntities.some((e) => name === e);
    });
    if (exactMatches.length > 0) return exactMatches;
  }

  // si entities.category: filtrar por categoría
  if (categoryEntities.length > 0) {
    filtered = filtered.filter((p) => {
      const cat = String(p.category || "").toLowerCase();
      return categoryEntities.some((c) => cat.includes(c) || c.includes(cat));
    });
  }

  // si entities.product: filtrar productos por nombre similar
  if (productEntities.length > 0) {
    filtered = filtered.filter((p) => {
      const searchSpace =
        `${p.name || ""} ${p.description || ""}`.toLowerCase();
      return productEntities.some((e) => searchSpace.includes(e));
    });
  }

  // si intent = RECOMMEND: devolver subset amplio (no exact match)
  if (intent === "RECOMMEND") {
    return filtered.length > 0 ? filtered : products;
  }

  return filtered.length > 0 ? filtered : products;
}
