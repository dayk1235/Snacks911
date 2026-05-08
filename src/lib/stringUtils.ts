import { normalizeText } from '@/lib/utils/core';

export { normalizeText };

/**
 * Realiza un match "fuzzy" básico verificando si el texto objetivo
 * incluye la cadena de búsqueda como substring, ignorando acentos
 * y diferencias de mayúsculas/minúsculas.
 *
 * Ejemplo:
 * fuzzyMatch("papas", "Papas clásicas") // true
 */
export function fuzzyMatch(searchQuery: string, targetText: string): boolean {
  if (!searchQuery || !targetText) return false;

  const normalizedQuery = normalizeText(searchQuery);
  const normalizedTarget = normalizeText(targetText);

  return normalizedTarget.includes(normalizedQuery);
}
