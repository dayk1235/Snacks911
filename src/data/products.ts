export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: 'alitas' | 'boneless' | 'papas' | 'combos' | 'extras';
  image: string;
  spicy?: number;
  popular?: boolean;
  badge?: string;
  badges?: string[];
}

export const products: Product[] = [
  {
    id: 1,
    name: 'Alitas BBQ',
    description: 'Crujientes bañadas en salsa BBQ ahumada. Tu clásico favorito.',
    price: 89,
    category: 'alitas',
    image: '/images/alitas.webp',
    spicy: 1,
    popular: true,
  },
  {
    id: 2,
    name: 'Alitas Buffalo',
    description: 'Intensas y picantes con mantequilla derretida. Para los valientes.',
    price: 89,
    category: 'alitas',
    image: '/images/alitas.webp',
    spicy: 3,
    badge: '🔥 Top Seller',
  },
  {
    id: 3,
    name: 'Boneless Clásico',
    description: 'Trozos jugosos y dorados en salsa suave. Irresistibles.',
    price: 79,
    category: 'boneless',
    image: '/images/boneless.webp',
    spicy: 1,
    popular: true,
  },
  {
    id: 4,
    name: 'Boneless Inferno',
    description: 'Solo para valientes. Picante extremo que te dejará sin habla.',
    price: 79,
    category: 'boneless',
    image: '/images/boneless.webp',
    spicy: 3,
    badge: '💀 Extremo',
  },
  {
    id: 5,
    name: 'Papas Gajo',
    description: 'Crujientes por fuera, suaves por dentro. Perfectas para compartir.',
    price: 55,
    category: 'papas',
    image: '/images/papas.webp',
    spicy: 0,
  },
  {
    id: 6,
    name: 'Papas Loaded',
    description: 'Con queso derretido, jalapeños y crema agria. El siguiente nivel.',
    price: 69,
    category: 'papas',
    image: '/images/papas.webp',
    popular: true,
    badge: '⭐ Favorita',
  },
  {
    id: 7,
    name: '🔥 Combo 911 (El favorito)',
    description: 'Boneless (250g) + papas (250g) + 1 aderezo. El combo más pedido. Crujiente, jugoso y perfecto para quitar el antojo 🔥',
    price: 115,
    category: 'combos',
    image: '/images/combo.webp',
    popular: true,
    badge: '⭐ Más vendido',
    badges: ['⭐ Más vendido', '💥 Mejor opción'],
  },
  {
    id: 8,
    name: '💥 Combo Pareja (Mejor valor)',
    description: '2 boneless (250g c/u) + papas + 2 aderezos. Ideal para compartir. Más comida, mejor precio 😮‍🔥',
    price: 190,
    category: 'combos',
    image: '/images/combo.webp',
    popular: true,
    badge: '👥 Para 2',
    badges: ['👥 Para 2', '💰 Ahorra más'],
  },
  {
    id: 9,
    name: '💣 Combo Amigos (El más completo)',
    description: '2 alitas + 2 boneless + papas grandes + aderezos. Para cuando el antojo es serio. El combo más grande del menú 🔥',
    price: 260,
    category: 'combos',
    image: '/images/combo.webp',
    popular: true,
    badge: '🔥 Combo grande',
    badges: ['🔥 Combo grande', '🍗 Para compartir'],
  },
];

export const categories = [
  { id: 'todos', label: 'Todos' },
  { id: 'combos', label: '🔥 Combos' },
  { id: 'alitas', label: '🍗 Arma tu orden' },
  { id: 'boneless', label: '🍗 Boneless' },
  { id: 'papas', label: '🍟 Papas' },
  { id: 'extras', label: '➕ Agrega más' },
];
