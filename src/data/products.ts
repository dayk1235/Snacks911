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
    name: 'Combo 911',
    description: '12 piezas mixtas + papas grandes. Todo lo que necesitas.',
    price: 149,
    category: 'combos',
    image: '/images/combo.webp',
    popular: true,
    badge: '🚨 Mejor Valor',
  },
  {
    id: 8,
    name: 'Combo Doble',
    description: '20 piezas mixtas + 2 papas grandes. Para compartir sin peleas.',
    price: 229,
    category: 'combos',
    image: '/images/combo.webp',
    badge: '👥 Para 2',
  },
];

export const categories = [
  { id: 'todos', label: 'Todos' },
  { id: 'alitas', label: '🍗 Alitas' },
  { id: 'boneless', label: '🔥 Boneless' },
  { id: 'papas', label: '🍟 Papas' },
  { id: 'combos', label: '🚨 Combos' },
  { id: 'extras', label: '🍋 Extras' },
];
