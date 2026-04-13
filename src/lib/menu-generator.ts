/**
 * AI-powered menu generator.
 *
 * Takes a user description and generates a full structured menu
 * with realistic Mexican street food prices.
 *
 * Example input: "vendo alitas, boneless, papas, refrescos"
 * Output: [{ name, price, description, category }]
 */

// ── Price Database (MXN street food ranges) ──
const PRODUCT_DB: Record<string, Array<{
  name: string;
  price: number;
  description: string;
  category: string;
}>> = {
  alitas: [
    { name: 'Alitas BBQ', price: 89, description: 'Crujientes banadas en salsa BBQ ahumada', category: 'alitas' },
    { name: 'Alitas Buffalo', price: 89, description: 'Picantes con salsa buffalo clasica', category: 'alitas' },
    { name: 'Alitas Mango Habanero', price: 95, description: 'Dulce y picante, salsa artesanal', category: 'alitas' },
    { name: 'Alitas Clasicas', price: 79, description: 'Sazonadas con especias de la casa', category: 'alitas' },
  ],
  boneless: [
    { name: 'Boneless BBQ', price: 79, description: 'Jugosos en salsa BBQ suave', category: 'boneless' },
    { name: 'Boneless Buffalo', price: 79, description: 'Picantes con salsa buffalo', category: 'boneless' },
    { name: 'Boneless Mango Habanero', price: 85, description: 'Dulce y extremo, salsa artesanal', category: 'boneless' },
    { name: 'Boneless Clasicos', price: 75, description: 'Crujientes con sazon de la casa', category: 'boneless' },
  ],
  papas: [
    { name: 'Papas Gajo', price: 55, description: 'Crujientes por fuera, suaves por dentro', category: 'papas' },
    { name: 'Papas Loaded', price: 69, description: 'Con queso, tocino, jalapenos y crema', category: 'papas' },
    { name: 'Papas Clasicas', price: 45, description: 'Fritas crujientes con sal y limon', category: 'papas' },
    { name: 'Papas con Queso', price: 59, description: 'Bañadas en queso cheddar derretido', category: 'papas' },
  ],
  refrescos: [
    { name: 'Refresco 600ml', price: 25, description: 'Coca-Cola, Sprite, Fanta o Manzanita', category: 'extras' },
    { name: 'Refresco 2L', price: 45, description: 'Para compartir, variedad de sabores', category: 'extras' },
    { name: 'Agua Embotellada', price: 20, description: 'Agua natural 1L', category: 'extras' },
    { name: 'Jarra de Agua', price: 40, description: 'Sabor de temporada, 1L', category: 'extras' },
  ],
  kombos: [
    { name: 'Combo 911', price: 115, description: 'Boneless 250g + Papas + Aderezo', category: 'combos' },
    { name: 'Combo Pareja', price: 190, description: '2 Boneless 250g + Papas + 2 Aderezos', category: 'combos' },
    { name: 'Combo Alitas', price: 130, description: 'Alitas + Papas Gajo + Refresco', category: 'combos' },
    { name: 'Combo Amigos', price: 260, description: '2 Alitas + 2 Boneless + Papas Grandes', category: 'combos' },
  ],
  extras: [
    { name: 'Salsa Valentina', price: 5, description: 'Salsa picante clasica', category: 'extras' },
    { name: 'Salsa Buffalo', price: 10, description: 'Porcion extra de salsa buffalo', category: 'extras' },
    { name: 'Salsa Habanero', price: 10, description: 'Salsa habanero artesanal', category: 'extras' },
    { name: 'Limones', price: 0, description: '6 limones frescos gratis', category: 'extras' },
    { name: 'Cebolla Curtida', price: 10, description: 'Porcion de cebolla curtida', category: 'extras' },
    { name: 'Aderezo Ranch', price: 10, description: 'Aderezo ranch cremoso', category: 'extras' },
    { name: 'Aderezo Blue Cheese', price: 12, description: 'Aderezo azul intenso', category: 'extras' },
  ],
  corn_dogs: [
    { name: 'Corn Dog Clasico', price: 45, description: 'Salchicha empanizada con mostaza', category: 'extras' },
    { name: 'Corn Dog Coreano', price: 55, description: 'Crujiente con papas y azucar', category: 'extras' },
    { name: 'Corn Dog con Queso', price: 50, description: 'Relleno de queso derretido', category: 'extras' },
  ],
  postres: [
    { name: 'Brownie con Helado', price: 55, description: 'Brownie tibio con helado de vainilla', category: 'extras' },
    { name: 'Churros', price: 35, description: 'Crujientes con azucar y canela', category: 'extras' },
    { name: 'Flan Napolitano', price: 40, description: 'Cremoso con caramelo casero', category: 'extras' },
  ],
};

// ── Keyword mapping ──
const KEYWORD_MAP: Record<string, string[]> = {
  alitas: ['alitas', 'wing', 'wings', 'ala'],
  boneless: ['boneless', 'boneles', 'hueso', 'pechuga'],
  papas: ['papas', 'papa', 'fries', 'frita', 'gajo', 'loaded'],
  refrescos: ['refresco', 'refrescos', 'bebida', 'bebidas', 'coca', 'sprite', 'soda'],
  combos: ['combo', 'combos', 'paquete', 'paquetes', 'menu'],
  extras: ['extra', 'extras', 'salsa', 'aderezo', 'limon', 'cebolla', 'queso'],
  corn_dogs: ['corn dog', 'corndog', 'hot dog', 'salchicha', 'maiz'],
  postres: ['postre', 'postres', 'dulce', 'brownie', 'churro', 'flan'],
};

export interface GeneratedMenuItem {
  name: string;
  price: number;
  description: string;
  category: string;
}

export interface GenerationResult {
  items: GeneratedMenuItem[];
  categories: string[];
  totalItems: number;
}

/**
 * Detect categories from user description.
 */
function detectCategories(input: string): string[] {
  const lower = input.toLowerCase();
  const detected: string[] = [];

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) {
      detected.push(category);
    }
  }

  return detected.length > 0 ? detected : ['alitas', 'boneless', 'papas', 'combos'];
}

/**
 * Generate menu items from detected categories.
 */
function generateItems(categories: string[]): GeneratedMenuItem[] {
  const items: GeneratedMenuItem[] = [];

  for (const cat of categories) {
    const products = PRODUCT_DB[cat];
    if (products) {
      // Include all items from each category
      items.push(...products.map(p => ({
        name: p.name,
        price: p.price,
        description: p.description,
        category: p.category,
      })));
    }
  }

  // Remove duplicates by name
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Main generation function.
 */
export function generateMenuFromDescription(description: string): GenerationResult {
  const categories = detectCategories(description);
  const items = generateItems(categories);

  return {
    items,
    categories,
    totalItems: items.length,
  };
}
