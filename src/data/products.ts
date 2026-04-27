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
    image: '/images/combo-mixto.webp',
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
    image: '/images/boneless-power.webp',
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
    image: '/images/alitas-fuego.webp',
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
    image: '/images/combo-callejero.webp',
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
    image: '/images/banderilla-suprema.webp',
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
    image: '/images/dedos-papas.webp',
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
    image: '/images/papas-loaded.webp',
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
    image: '/images/papas-queso.webp',
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
    image: '/images/salchipapas.webp',
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
    image: '/images/banderilla-coreana.webp',
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
    image: '/images/dedos-queso.webp',
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
    image: '/images/refresco.webp',
    spicy: 0,
  },

  // ─── EXTRAS ➕ ────────────────────────────────────────────────────────────
  {
    id: 16,
    name: 'Salsa Extra',
    description: 'BBQ o Mango Habanero. Para bañarlo todo 🔥',
    price: 12,
    category: 'extras',
    image: '/images/salsa.webp',
    spicy: 2,
  },
  {
    id: 17,
    name: 'Dip Extra',
    description: 'Parmesano o Queso Cheddar. El dip que hace la diferencia 🧀',
    price: 15,
    category: 'extras',
    image: '/images/dip.webp',
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
