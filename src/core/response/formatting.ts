/**
 * core/response/formatting.ts — Text formatting utilities extracted from responseEngine.
 *
 * Functions:
 *   - hasAny(text, terms)              → checks if text contains any of the given terms
 *   - normalizeConstraintList(values)  → deduplicates, lowercases, and trims a list of constraint values
 *   - sanitizeRestrictedMentions(…)    → replaces mention of restricted products with a safe placeholder
 */

export function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function normalizeConstraintList(
  values: Array<string | undefined | null>,
): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase().trim())
        .filter(Boolean),
    ),
  );
}

export function sanitizeRestrictedMentions(
  responseText: string,
  allProducts: any[],
  safeProducts: any[],
  hasActiveRestrictions: boolean,
) {
  if (!hasActiveRestrictions) return responseText;

  const prohibitedProducts = allProducts.filter(
    (product) =>
      !safeProducts.some((safeProduct) => safeProduct.id === product.id),
  );

  return prohibitedProducts.reduce((text, product) => {
    const name = String(product.name || "").trim();
    if (!name) return text;

    const namePattern = new RegExp(
      `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi",
    );
    return text.replace(namePattern, "[opción segura]");
  }, responseText);
}
