export interface Promo {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  promoPrice: number;
  validDays: number[]; // 0=Sun, 1=Mon, etc.
  validHours?: { from: number; to: number }; // 24h format
  urgency: string;
  badge: string;
  expiresAt?: string; // ISO date for time-limited promos
}

export const promos: Promo[] = [
  {
    id: 'promo_combo_911',
    title: '🔥 Combo 911 en $99 hoy',
    description: 'Alitas BBQ + Papas Gajo + Refresco. Precio especial solo hoy.',
    originalPrice: 169,
    promoPrice: 99,
    validDays: [1, 2, 3], // Mon-Wed
    urgency: '⏰ Termina en 3 horas',
    badge: 'SOLO HOY',
  },
  {
    id: 'promo_boneless_tuesday',
    title: '🔥 Martes de boneless',
    description: 'Boneless Clásico a precio especial. Solo los martes.',
    originalPrice: 79,
    promoPrice: 59,
    validDays: [2], // Tuesday
    urgency: '📅 Solo hoy martes',
    badge: 'MARTES',
  },
  {
    id: 'promo_callejero',
    title: '🔥 Combo Callejero $69',
    description: 'Papas Loaded x2 + Refresco. Sabor callejero al mejor precio.',
    originalPrice: 163,
    promoPrice: 69,
    validDays: [4, 5, 6], // Thu-Sat
    urgency: '⏰ Solo fin de semana',
    badge: 'FIN SEMANA',
  },
  {
    id: 'promo_2x1_papas',
    title: '🔥 2x1 Papas Loaded',
    description: 'Lleva 2 Papas Loaded por el precio de 1. ¡Comparte!',
    originalPrice: 138,
    promoPrice: 69,
    validDays: [4, 5], // Thu-Fri
    validHours: { from: 17, to: 20 }, // 5-8pm only
    urgency: '⏰ Solo 5pm–8pm',
    badge: '2x1',
  },
];

/** Check if a promo is currently active */
export function isPromoActive(promo: Promo, date: Date = new Date()): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  // Check day
  if (!promo.validDays.includes(day)) return false;

  // Check hours if specified
  if (promo.validHours) {
    if (hour < promo.validHours.from || hour >= promo.validHours.to) return false;
  }

  return true;
}

/** Get active promos for today */
export function getActivePromos(date: Date = new Date()): Promo[] {
  return promos.filter(p => isPromoActive(p, date));
}
