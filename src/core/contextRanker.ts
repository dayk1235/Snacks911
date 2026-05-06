interface FoodIntent {
  categories: string[];
  dietary: string[];
  attributes: string[];
  keywords: string[];
}

interface Product {
  id: string | number;
  name: string;
  category?: string;
  dietaryTags?: string[];
  attributes?: string[];
  description?: string;
  price?: number;
}

const CATEGORY_KEYWORDS = new Set(['snack', 'drink', 'dessert', 'meal', 'breakfast', 'lunch', 'dinner', 'papas', 'boneless', 'alitas', 'combo']);

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  papas: ['francesa', 'fries'],
  boneless: [],
  alitas: ['wings'],
  combo: [],
};
const DIETARY_KEYWORDS = new Set(['gluten-free', 'vegan', 'vegetarian', 'dairy-free', 'nut-free', 'sugar-free']);
const ATTRIBUTE_KEYWORDS = new Set(['sweet', 'salty', 'crunchy', 'spicy', 'soft', 'chewy', 'cold', 'hot']);

export function extractFoodIntent(input: string): FoodIntent {
  const normalized = input.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = [...new Set(normalized.split(/\s+/).filter(w => w.length > 0))];

  const categories: string[] = [];
  words.forEach(w => {
    if (CATEGORY_KEYWORDS.has(w)) {
      categories.push(w);
    } else {
      for (const [canonical, synonyms] of Object.entries(KEYWORD_SYNONYMS)) {
        if (synonyms.includes(w)) {
          categories.push(canonical);
          break;
        }
      }
    }
  });

  const dietary = words.filter(w => DIETARY_KEYWORDS.has(w));
  const attributes = words.filter(w => ATTRIBUTE_KEYWORDS.has(w));
  const keywords = words;

  return { categories, dietary, attributes, keywords };
}

export function rankProductsByIntent(products: Product[], intent: FoodIntent): Product[] {
  const scoredProducts = products.map(product => {
    let score = 0;

    if (product.category && intent.categories.includes(product.category)) {
      score += 3;
    }

    if (product.dietaryTags) {
      product.dietaryTags.forEach(tag => {
        if (intent.dietary.includes(tag)) score += 2;
      });
    }

    if (product.attributes) {
      product.attributes.forEach(attr => {
        if (intent.attributes.includes(attr)) score += 1;
      });
    }

    const searchText = `${product.name} ${product.description || ''}`.toLowerCase();
    intent.keywords.forEach(keyword => {
      if (searchText.includes(keyword)) {
        score += CATEGORY_KEYWORDS.has(keyword) ? 2 : 1;
      }
    });

    return { product, score };
  });

  scoredProducts.sort((a, b) => b.score - a.score);
  return scoredProducts.map(item => item.product);
}
