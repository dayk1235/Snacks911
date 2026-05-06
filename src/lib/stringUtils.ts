/**
 * Normaliza un texto para realizar comparaciones seguras:
 * - Convierte todo a minúsculas (lowercase)
 * - Remueve acentos y marcas diacríticas
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

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
