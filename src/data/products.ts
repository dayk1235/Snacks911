export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: 'combos' | 'proteina' | 'papas' | 'banderillas' | 'bebidas' | 'extras' | 'postres';
  image: string;
  spicy?: number;
  popular?: boolean;
  badge?: string;
  badges?: string[];
  /** Para combos: suma de items individuales antes del descuento */
  originalPrice?: number;
  available?: boolean;
}

export const products: Product[] = [

  // ─── COMBOS 🔥 ────────────────────────────────────────────────────────────
  {
    id: 1,
    name: 'Combo Mixto 911',
    description: 'Boneless 150g + Alitas 6pz + Papas + Bebida. Lo mejor de dos mundos en un solo combo 🔥',
    price: 249,
    originalPrice: 339,
    category: 'combos',
    image: '/images/combo.webp',
    spicy: 1,
    popular: true,
    badges: ['⭐ Más vendido', '💰 Ahorra $90', '🔥 Bestia'],
  },
  {
    id: 2,
    name: 'Boneless Power 911',
    description: 'Boneless 250g + Papas + Bebida + Salsa a elegir. Para los que van en serio 💪',
    price: 155,
    originalPrice: 209,
    category: 'combos',
    image: '/images/boneless.webp',
    spicy: 1,
    popular: true,
    badges: ['⭐ Más vendido', '💰 Ahorra $54'],
  },
  {
    id: 3,
    name: 'Alitas Fuego 911',
    description: 'Alitas 12pz + Papas + Bebida + Salsa. Fuego puro en cada mordida 🔥',
    price: 145,
    originalPrice: 205,
    category: 'combos',
    image: '/images/alitas.webp',
    spicy: 2,
    badges: ['💰 Ahorra $60', '🍗 12 piezas'],
  },
  {
    id: 4,
    name: 'Combo Callejero 911',
    description: 'Banderilla + Salchipapas + Bebida. Sabor de calle, nivel 911 🌭',
    price: 175,
    originalPrice: 214,
    category: 'combos',
    image: '/images/combo.webp',
    spicy: 0,
    badges: ['🌭 Callejero', '💰 Ahorra $39'],
  },
  {
    id: 5,
    name: 'Combo Banderilla Suprema',
    description: '2 Banderillas + Papas con queso + Bebida. Doble antojo, doble disfrute 🧀',
    price: 149,
    originalPrice: 184,
    category: 'combos',
    image: '/images/combo.webp',
    spicy: 0,
    badges: ['💰 Ahorra $35'],
  },
  {
    id: 6,
    name: 'Combo Dedos de Queso + Papas',
    description: 'Dedos de queso + Papas clásicas + Bebida. Queso que se derrite, papas que crujen 🧀',
    price: 139,
    originalPrice: 175,
    category: 'combos',
    image: '/images/papas.webp',
    spicy: 0,
    badges: ['💰 Ahorra $36'],
  },
  {
    id: 7,
    name: 'Papas 911 Loaded',
    description: 'Papas grandes + Queso + Tocino + Jalapeños + Bebida. El loaded más cargado de la colonia 🤤',
    price: 149,
    originalPrice: 194,
    category: 'combos',
    image: '/images/papas.webp',
    spicy: 1,
    popular: true,
    badges: ['⭐ Más vendido', '💰 Ahorra $45', '🔥 Loaded'],
  },

  // ─── PROTEÍNA 🍗 ─────────────────────────────────────────────────────────
  {
    id: 8,
    name: 'Boneless 250g',
    description: 'Con papas chicas y salsa a elegir. Crujientes, jugosos y recién hechos 😋',
    price: 139,
    category: 'proteina',
    image: '/images/boneless.webp',
    spicy: 1,
    popular: true,
  },
  {
    id: 9,
    name: 'Alitas 6 piezas',
    description: 'Con papas chicas y salsa a elegir. Crujientes por fuera, jugosas por dentro 🔥',
    price: 125,
    category: 'proteina',
    image: '/images/alitas.webp',
    spicy: 1,
  },

  // ─── PAPAS Y ANTOJOS 🍟 ──────────────────────────────────────────────────
  {
    id: 10,
    name: 'Papas Clásicas',
    description: 'Con sal y especias 911. Crujientes, doradas y bien sazonadas 🍟',
    price: 45,
    category: 'papas',
    image: '/images/papas.webp',
    spicy: 0,
  },
  {
    id: 11,
    name: 'Papas con Queso',
    description: 'Cheddar fundido + tocino. El combo que no puedes rechazar 🧀',
    price: 65,
    category: 'papas',
    image: '/images/papas.webp',
    spicy: 0,
    popular: true,
    badge: '🧀 Favorita',
  },
  {
    id: 12,
    name: 'Salchipapas',
    description: 'Salchicha + papas + vegetales + salsas. Antojo callejero que no falla 🌭',
    price: 85,
    category: 'papas',
    image: '/images/papas.webp',
    spicy: 0,
    badge: '🌭 Callejero',
  },

  // ─── BANDERILLAS Y DEDOS 🍡 ───────────────────────────────────────────────
  {
    id: 13,
    name: 'Banderilla Coreana',
    description: 'Empanizada con salsa especial. Crujiente, dorada y con queso que se estira 🇰🇷',
    price: 79,
    category: 'banderillas',
    image: '/images/combo.webp',
    spicy: 0,
    popular: true,
    badge: '🇰🇷 Trending',
  },
  {
    id: 14,
    name: 'Dedos de Queso',
    description: '6 piezas + salsa marinara. Crujientes por fuera, queso fundido por dentro 🧀',
    price: 85,
    category: 'banderillas',
    image: '/images/combo.webp',
    spicy: 0,
    badge: '🧀 Hit',
  },

  // ─── BEBIDAS 🥤 ───────────────────────────────────────────────────────────
  {
    id: 15,
    name: 'Refresco 400ml',
    description: 'Coca, Sprite, Fanta, Manzanita. Bien frío para acompañar tu pedido 🥤',
    price: 30,
    category: 'bebidas',
    image: '/images/combo.webp',
    spicy: 0,
  },

  // ─── EXTRAS ➕ ────────────────────────────────────────────────────────────
  {
    id: 16,
    name: 'Salsa Extra',
    description: 'BBQ o Mango Habanero. Para bañarlo todo 🔥',
    price: 12,
    category: 'extras',
    image: '/images/alitas.webp',
    spicy: 2,
  },
  {
    id: 17,
    name: 'Dip Extra',
    description: 'Parmesano o Queso Cheddar. El dip que hace la diferencia 🧀',
    price: 15,
    category: 'extras',
    image: '/images/combo.webp',
    spicy: 0,
  },
];

export const categories = [
  { id: 'todos',       label: 'Todos' },
  { id: 'combos',     label: '🔥 Combos' },
  { id: 'proteina',   label: '🍗 Proteína' },
  { id: 'papas',      label: '🍟 Papas y Antojos' },
  { id: 'banderillas',label: '🍡 Banderillas' },
  { id: 'bebidas',    label: '🥤 Bebidas' },
  { id: 'extras',     label: '➕ Extras' },
];

export const PRODUCT_IMAGE_MAP: Record<string | number, string> = {
  1: '/images/combo.webp',
  2: '/images/boneless.webp',
  3: '/images/alitas.webp',
  4: '/images/combo.webp',
  5: '/images/combo.webp',
  6: '/images/papas.webp',
  7: '/images/papas.webp',
  8: '/images/boneless.webp',
  9: '/images/alitas.webp',
  10: '/images/papas.webp',
  11: '/images/papas.webp',
  12: '/images/papas.webp',
  13: '/images/combo.webp',
  14: '/images/combo.webp',
  15: '/images/combo.webp',
  16: '/images/alitas.webp',
  17: '/images/combo.webp',
  'p1': '/images/alitas.webp',
  'p2': '/images/alitas.webp',
  'p3': '/images/boneless.webp',
  'p4': '/images/boneless.webp',
  'p5': '/images/papas.webp',
  'p6': '/images/combo.webp',
  'e1': '/images/alitas.webp',
  'e2': '/images/alitas.webp',
  'e3': '/images/combo.webp',
  'e4': '/images/combo.webp',
  'e5': '/images/combo.webp',
  'e6': '/images/combo.webp',
  'e7': '/images/combo.webp',
  'e8': '/images/alitas.webp',
};

export function getProductImage(product: { id?: string | number, name?: string, category?: string }): string {
  if (product.id && PRODUCT_IMAGE_MAP[product.id]) {
    return PRODUCT_IMAGE_MAP[product.id];
  }
  
  const name = product.name?.toLowerCase() || '';
  if (name.includes('alitas')) return '/images/alitas.webp';
  if (name.includes('boneless')) return '/images/boneless.webp';
  if (name.includes('combo')) return '/images/combo.webp';
  if (name.includes('papas')) return '/images/papas.webp';
  if (name.includes('banderilla')) return '/images/combo.webp';
  
  if (product.category === 'proteina' || product.category === 'alitas') return '/images/alitas.webp';
  if (product.category === 'combos') return '/images/combo.webp';
  if (product.category === 'papas') return '/images/papas.webp';
  
  return '/images/logo.png';
}
