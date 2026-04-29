/**
 * Analizador de intenciones simple basado en palabras clave.
 * 
 * @param text - El texto ingresado por el usuario.
 * @returns La intención detectada.
 */
export type SimpleIntent = 'SELECT_ITEM' | 'CONFIRM' | 'REJECT' | 'MENU' | 'UNKNOWN';

export function parseIntent(text: string): SimpleIntent {
  const lower = text.toLowerCase().trim();

  // Keywords para MENU
  if (/(menu|lista|catalogo|ver|combos|opciones)/.test(lower)) {
    return 'MENU';
  }

  // Keywords para CONFIRM
  if (/(si|va|dale|acepto|confirmar|listo|ok|arre|quiero)/.test(lower)) {
    return 'CONFIRM';
  }

  // Keywords para REJECT
  if (/(no|nada|paso|cancelar|quitar|asi esta bien|luego)/.test(lower)) {
    return 'REJECT';
  }

  // Keywords para SELECT_ITEM (Productos específicos)
  if (/(mixto|boneless|alitas|papas|911|combo|power|fuego)/.test(lower)) {
    return 'SELECT_ITEM';
  }

  return 'UNKNOWN';
}
