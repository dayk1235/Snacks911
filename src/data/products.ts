export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: 'alitas' | 'boneless' | 'papas' | 'combos' | 'banderillas' | 'postres' | 'extras';
  image: string;
  spicy?: number;
  popular?: boolean;
  badge?: string;
  badges?: string[];
  /** For combos: the sum of individual items before discount */
  originalPrice?: number;
}

export const products: Product[] = [
  // ─── 1. COMBOS 🔥 ─────────────────────────────────────────────────
  {
    id: 1,
    name: '🔥 Combo 911',
    description: 'Alitas crujientes, recién hechas, bien bañadas en BBQ caliente… y papas doradas al lado. Brutal 🤤',
    price: 119,
    originalPrice: 169,
    category: 'combos',
    image: '/images/combo.webp',
    spicy: 1,
    popular: true,
    badges: ['🔥 Más pedido', '⭐ Best seller', '💰 Ahorra $50'],
  },
  {
    id: 2,
    name: '🍗 Combo Boneless',
    description: 'Boneless crujientes, jugosos y calientitos… con papas cargadas de queso derretido. Adictivo 🔥',
    price: 99,
    originalPrice: 148,
    category: 'combos',
    image: '/images/combo.webp',
    spicy: 1,
    popular: true,
    badges: ['⚡ Rápido', '💰 Ahorra $49'],
  },
  {
    id: 3,
    name: '🌮 Combo Callejero',
    description: 'Papas humeantes, crujientes y cargadas de queso caliente… con refresco helado al lado. Callejero puro 🤤',
    price: 89,
    originalPrice: 163,
    category: 'combos',
    image: '/images/combo.webp',
    spicy: 0,
    popular: true,
    badges: ['🔥 Calle', '💰 Ahorra $74'],
  },

  // ─── 2. ALITAS ──────────────────────────────────────────────────────
  {
    id: 4,
    name: 'Alitas BBQ',
    description: 'Crujientes por fuera, jugosas por dentro. Recién hechas y bien bañadas en BBQ caliente 🍯',
    price: 89,
    category: 'alitas',
    image: '/images/alitas.webp',
    spicy: 1,
    popular: true,
  },
  {
    id: 5,
    name: 'Alitas Buffalo',
    description: 'Doradas, calientes y bañadas en salsa picante que quema rico. No puedes parar 🔥',
    price: 89,
    category: 'alitas',
    image: '/images/alitas.webp',
    spicy: 3,
    badge: '🔥 Top Seller',
  },

  // ─── 3. BONELESS ────────────────────────────────────────────────────
  {
    id: 6,
    name: 'Boneless Clásico',
    description: 'Crujientes, dorados y recién hechos… bañados en salsa caliente que se te cae por los dedos 😋',
    price: 79,
    category: 'boneless',
    image: '/images/boneless.webp',
    spicy: 1,
    popular: true,
  },
  {
    id: 7,
    name: 'Boneless Inferno',
    description: 'Calientes, crujientes y con salsa picante que te hace sudar. Solo para valientes 💀🌶️',
    price: 79,
    category: 'boneless',
    image: '/images/boneless.webp',
    spicy: 3,
    badge: '💀 Extremo',
  },

  // ─── 4. PAPAS ───────────────────────────────────────────────────────
  {
    id: 8,
    name: 'Papas Gajo',
    description: 'Crujientes, doradas y humeantes… perfectas para dipear. El acompañante que roba el show 🍟',
    price: 55,
    category: 'papas',
    image: '/images/papas.webp',
    spicy: 0,
  },
  {
    id: 9,
    name: 'Papas Loaded',
    description: 'Cargadas de queso derretido caliente, jalapeños y crema. Un pecado que vale la pena 🤤',
    price: 69,
    category: 'papas',
    image: '/images/papas.webp',
    popular: true,
    badge: '⭐ Favorita',
  },

  // ─── 5. BANDERILLAS ────────────────────────────────────────────────
  {
    id: 10,
    name: 'Banderilla Clásica',
    description: 'Empanizada crujiente, caliente y recién hecha. Estilo callejero que te deja queriendo más 🌭',
    price: 35,
    category: 'banderillas',
    image: '/images/combo.webp',
    spicy: 0,
  },
  {
    id: 11,
    name: 'Banderilla con Queso',
    description: 'Crujiente por fuera, queso fundido caliente por dentro. Una mordida y te enamoras 🧀',
    price: 45,
    category: 'banderillas',
    image: '/images/combo.webp',
    spicy: 0,
    popular: true,
    badge: '🧀 Favorita',
  },
  {
    id: 12,
    name: 'Banderilla Coreana',
    description: 'Empanizada dorada, crujiente y con mozzarella caliente que se estira. La más adictiva 🔥',
    price: 55,
    category: 'banderillas',
    image: '/images/combo.webp',
    spicy: 0,
    badge: '🇰🇷 Trending',
  },

  // ─── 6. POSTRES ────────────────────────────────────────────────────
  {
    id: 13,
    name: 'Brownie con Helado',
    description: 'Brownie caliente, chocolate intenso… y helado frío que se derrite encima. El final perfecto 🍫',
    price: 59,
    category: 'postres',
    image: '/images/combo.webp',
    spicy: 0,
    popular: true,
    badge: '🍫 Dulce',
  },
  {
    id: 14,
    name: 'Churros con Chocolate',
    description: 'Crujientes por fuera, suaves por dentro… con salsa de chocolate caliente que te mancha los dedos ✨',
    price: 45,
    category: 'postres',
    image: '/images/combo.webp',
    spicy: 0,
  },
];

export const categories = [
  { id: 'todos', label: 'Todos' },
  { id: 'combos', label: '🔥 Combos' },
  { id: 'alitas', label: '🍗 Alitas' },
  { id: 'boneless', label: '🍗 Boneless' },
  { id: 'papas', label: '🍟 Papas' },
  { id: 'banderillas', label: '🌭 Banderillas' },
  { id: 'postres', label: '🍫 Postres' },
  { id: 'extras', label: '➕ Agrega más' },
];
