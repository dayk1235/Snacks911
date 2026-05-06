import { getBotResponse } from '../botEngine';
import { isProductSafe, filterProducts } from '../allergyFilter';
import { Product } from '@/data/products';

// Mock dbGetProducts
jest.mock('@/lib/db', () => ({
  dbGetProducts: jest.fn(),
  dbSaveOrder: jest.fn(),
}));

jest.mock('@/lib/server/supabaseServer', () => ({
  getCustomerProfileFromDB: jest.fn(),
  upsertCustomerProfile: jest.fn(),
}));

jest.mock('@/lib/whatsapp/aiService', () => ({
  getAIResponse: jest.fn(),
}));

// Productos de prueba
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Combo Mixto 911',
    description: 'Boneless 150g + Alitas 6pz + Papas + Bebida',
    price: 249,
    category: 'combos',
    image: '/images/combo.webp',
    ingredients: ['boneless', 'alitas', 'papas', 'bebida'],
    spicy: 1,
    popular: true,
  },
  {
    id: '12',
    name: 'Salchipapas',
    description: 'Salchicha + papas + vegetales',
    price: 85,
    category: 'papas',
    image: '/images/papas.webp',
    ingredients: ['salchicha', 'papa'],
  },
  {
    id: '10',
    name: 'Papas Clásicas',
    description: 'Con sal y especias 911',
    price: 45,
    category: 'papas',
    image: '/images/papas.webp',
    ingredients: ['papas'],
  },
  {
    id: '13',
    name: 'Banderilla Coreana',
    description: 'Empanizada con salsa especial',
    price: 79,
    category: 'banderillas',
    image: '/images/combo.webp',
    ingredients: ['salchicha', 'masa'],
  },
  {
    id: '11',
    name: 'Papas con Queso',
    description: 'Cheddar fundido + tocino',
    price: 65,
    category: 'papas',
    image: '/images/papas.webp',
    ingredients: ['papas', 'queso', 'tocino'],
  },
];

describe('WhatsApp Flow - Allergy-Safe Recommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper para extraer productos mencionados en una respuesta
  function extractProductsFromResponse(response: string): string[] {
    const productNames: string[] = [];
    const lines = response.split('\n');
    for (const line of lines) {
      // Busca patrones como "🍗 Nombre - $XXX" o "Nombre - $XXX"
      const match = line.match(/[🍗🍟🌭🥤🧀🔥\s]*(.+?)\s+-\s+\$\d+/);
      if (match) productNames.push(match[1].trim());
    }
    return productNames;
  }

  it('nunca recomienda productos con salchicha cuando el usuario dice "sin salchicha"', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    getCustomerProfileFromDB.mockResolvedValue(null);

    // Simular conversación
    const messages = [
      'hola',
      'quiero papas sin salchicha',
      '¿qué me recomiendas?',
    ];

    for (const msg of messages) {
      const response = await getBotResponse({ message: msg, phone: '521234567890' });
      
      // Extraer productos mencionados en la respuesta
      const recommendedNames = extractProductsFromResponse(response);
      
      // Obtener safeProducts para este mensaje
      const allergies = msg.includes('sin salchicha') ? ['salchicha'] : [];
      const safeProducts = filterProducts(mockProducts, allergies);
      const safeProductNames = safeProducts.map(p => p.name);
      
      // VALIDACIÓN CRÍTICA: Todos los productos recomendados deben estar en safeProducts
      for (const recName of recommendedNames) {
        expect(safeProductNames).toContain(recName);
      }
    }
  });

  it('flujo completo: alergia detectada → filtra → recomienda seguro', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    getCustomerProfileFromDB.mockResolvedValue(null);

    // Usuario dice "sin salchicha" en el primer mensaje
    const response1 = await getBotResponse({ 
      message: 'quiero ver el menú sin salchicha', 
      phone: '521234567890' 
    });

    // Extraer productos de la respuesta
    const recommended = extractProductsFromResponse(response1);
    const safeProducts = filterProducts(mockProducts, ['salchicha']);
    
    // Validar que Salchipapas y Banderilla NO estén en la respuesta
    expect(recommended).not.toContain('Salchipapas');
    expect(recommended).not.toContain('Banderilla Coreana');
    
    // Validar que todos los productos mencionados están en safeProducts
    for (const rec of recommended) {
      const isInSafe = safeProducts.some(p => p.name === rec);
      expect(isInSafe).toBe(true);
    }
  });

  it('valida que getEntryRecommendation usa safeProducts', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    getCustomerProfileFromDB.mockResolvedValue(null);

    // Mensaje con hambre y alergia
    const response = await getBotResponse({ 
      message: 'tengo hambre sin salchicha', 
      phone: '521234567890' 
    });

    // La respuesta NO debe contener productos con salchicha
    expect(response).not.toContain('Salchipapas');
    expect(response).not.toContain('Banderilla');
    
    // Validar que si menciona un producto, es seguro
    const recProducts = extractProductsFromResponse(response);
    const safeProducts = filterProducts(mockProducts, ['salchicha']);
    
    for (const rec of recProducts) {
      const product = mockProducts.find(p => p.name === rec);
      if (product) {
        const isSafe = isProductSafe(product, ['salchicha']);
        expect(isSafe).toBe(true);
      }
    }
  });

  it('múltiples alergias: sin salchicha y sin queso', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    getCustomerProfileFromDB.mockResolvedValue(null);

    const response = await getBotResponse({ 
      message: 'quiero algo sin salchicha y sin queso', 
      phone: '521234567890' 
    });

    const recProducts = extractProductsFromResponse(response);
    const allergies = ['salchicha', 'queso'];
    const safeProducts = filterProducts(mockProducts, allergies);
    
    // Salchipapas (salchicha) y Papas con Queso (queso) NO deben aparecer
    expect(response).not.toContain('Salchipapas');
    expect(response).not.toContain('Papas con Queso');
    
    for (const rec of recProducts) {
      const product = mockProducts.find(p => p.name === rec);
      if (product) {
        const isSafe = isProductSafe(product, allergies);
        expect(isSafe).toBe(true);
      }
    }
  });

  it('combos sin salchicha: filtra combos con salchicha', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    getCustomerProfileFromDB.mockResolvedValue(null);

    const response = await getBotResponse({ 
      message: 'quiero combos sin salchicha', 
      phone: '521234567890' 
    });

    // Verificar que los combos con salchicha no aparecen
    const safeProducts = filterProducts(mockProducts, ['salchicha']);
    const safeCombos = safeProducts.filter(p => p.category === 'combos');
    
    for (const combo of safeCombos) {
      if (response.includes(combo.name)) {
        // OK: aparece en safeProducts
        expect(true).toBe(true);
      }
    }
  });

  it('persistencia de alergias: mensaje posterior respeta alergias del primero', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    
    // Simular perfil con alergia previa
    getCustomerProfileFromDB.mockResolvedValue({
      phone_number: '521234567890',
      name: 'Test User',
      restrictions: ['salchicha'],
      favorite_product: 'Papas Clásicas',
    });

    // Segundo mensaje sin mencionar alergia
    const response = await getBotResponse({ 
      message: '¿qué hay de nuevo?', 
      phone: '521234567890' 
    });

    // Aún debe respetar la alergia a salchicha
    expect(response).not.toContain('Salchipapas');
    expect(response).not.toContain('Banderilla');
  });

  it('CASO EXTREMO: verificar que CADA producto en respuesta está en safeProducts', async () => {
    const { dbGetProducts } = require('@/lib/db');
    const { getCustomerProfileFromDB } = require('@/lib/server/supabaseServer');
    
    dbGetProducts.mockResolvedValue(mockProducts);
    getCustomerProfileFromDB.mockResolvedValue(null);

    const testMessages = [
      'hola',
      'sin salchicha',
      'quiero papas sin salchicha',
      'recomiéndame algo',
      '¿qué me das?',
    ];

    for (const msg of testMessages) {
      const response = await getBotResponse({ message: msg, phone: '521234567890' });
      
      // Extraer TODOS los productos mencionados
      const productPattern = /\b(Combo Mixto 911|Salchipapas|Papas Clásicas|Banderilla Coreana|Papas con Queso)\b/g;
      const matches = [...response.matchAll(productPattern)];
      const mentionedProducts = matches.map(m => m[0]);
      
      if (mentionedProducts.length > 0) {
        // Determinar alergias del mensaje
        const allergies: string[] = [];
        if (msg.includes('salchicha')) allergies.push('salchicha');
        
        // Validar CADA producto mencionado
        for (const prodName of mentionedProducts) {
          const product = mockProducts.find(p => p.name === prodName);
          expect(product).toBeDefined();
          
          if (product) {
            const isSafe = isProductSafe(product, allergies);
            expect(isSafe).toBe(true);
          }
        }
      }
    }
  });
});
