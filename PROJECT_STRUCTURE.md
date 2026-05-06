# Mapa del Proyecto - Snacks 911

## Estructura de Archivos

```
snacks911-web/
├── src/
│   ├── app/                     # Páginas (Next.js App Router)
│   │   ├── layout.tsx           # Layout raíz (fuentes, metadata)
│   │   ├── page.tsx             # Página principal (home)
│   │   ├── globals.css          # Estilos globales
│   │   │
│   │   ├── components/          # Componentes de la página principal
│   │   │   ├── ContactSection.tsx   # Sección de contacto
│   │   │   └── SiteFooter.tsx       # Footer del sitio
│   │   │
│   │   └── admin/              # Panel administrativo
│   │       ├── layout.tsx      # Layout del admin (sidebar, auth check)
│   │       ├── page.tsx        # Dashboard principal
│   │       ├── login/
│   │       │   └── page.tsx    # Página de login
│   │       ├── products/
│   │       │   └── page.tsx    # Gestión de productos
│   │       ├── orders/
│   │       │   └── page.tsx    # Gestión de pedidos
│   │       ├── sales/
│   │       │   └── page.tsx    # Reportes de ventas
│   │       └── settings/
│   │           └── page.tsx    # Configuración del negocio
│   │
│   ├── components/             # Componentes reutilizables
│   │   ├── Cart.tsx            # Carrito de compras (drawer)
│   │   ├── ChatBot.tsx         # Chat de ayuda flotante
│   │   ├── CustomCursor.tsx    # Cursor personalizado
│   │   ├── ExtrasSection.tsx   # Sección de extras/adiciones
│   │   ├── FireCanvas.tsx      # Canvas con efecto de fuego
│   │   ├── Hero.tsx           # Sección hero principal
│   │   ├── MenuSection.tsx     # Sección del menú
│   │   ├── Navbar.tsx         # Barra de navegación
│   │   ├── ParticlesCanvas.tsx # Partículas de fondo
│   │   ├── ProductCard.tsx     # Tarjeta de producto
│   │   ├── ReviewSection.tsx  # Sección de reseñas
│   │   ├── SoundToggle.tsx    # Toggle de sonido
│   │   ├── CartUpsell.tsx      # Upsell automático en carrito
│   │   └── Card.tsx           # Componente de tarjeta genérico
│   │
│   ├── core/                    # Lógica central del bot/ventas
│   │   ├── intentDetector.ts      # Detecta intención + extrae alergias
│   │   ├── allergyFilter.ts      # Filtra productos por ingredientes
│   │   ├── botEngine.ts         # Motor principal de respuestas
│   │   ├── offerAgent.ts        # Recomendaciones y upsells
│   │   ├── responseEngine.ts    # Pipeline GOD MODE de ventas
│   │   ├── contextRanker.ts      # Ranking de productos por intención
│   │   ├── agentOrchestrator.ts # Orquesta todos los agentes
│   │   ├── __tests__/            # Tests del core
│   │   │   ├── allergyFilter.test.ts
│   │   │   ├── intentDetector.test.ts
│   │   │   └── whatsapp-flow.test.ts
│   │   └── index.ts             # Exports centralizados
│   │
│   ├── lib/                    # Lógica y utilidades
│   │   ├── adminStore.ts       # Store para datos del admin (localStorage)
│   │   ├── adminTypes.ts       # Tipos TypeScript del admin
│   │   ├── db.ts               # Acceso a Supabase (dbGetProducts)
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── server/
│   │   │   └── supabaseServer.ts
│   │   └── whatsapp/
│   │       ├── intentDetector.ts  # Detector legacy WhatsApp
│   │       └── botEngine.ts     # Bot WhatsApp legacy
│   │
│   ├── data/                   # Datos estáticos
│   │   └── products.ts         # Productos y categorías (con ingredients)
│   │
│   ├── scripts/                 # Scripts de utilidad
│   │   └── upsert-products.ts  # Sincroniza DB con ingredients
│   │
│   └── types/                   # Tipos globales
│       └── index.ts            # Tipos compartidos (CartItem, Intent, etc.)
│
├── public/                      # Archivos estáticos
│   └── images/                  # Imágenes de productos
│
├── supabase/migrations/        # Migraciones de DB
│   └── 20260506_add_ingredients_to_products.sql
│
├── jest.config.js               # Configuración de Jest
├── package.json
└── next.config.ts              # Configuración de Next.js
```

## Componentes Principales (Actualizado)

### Página Principal (`src/app/page.tsx`)
- Importa y renderiza: Hero, ReviewSection, MenuSection, ExtrasSection, ContactSection, SiteFooter
- Maneja estado del carrito (`cartItems`, `cartOpen`)
- Maneja animaciones GSAP con ScrollTrigger

### Carrito (`src/components/Cart.tsx`)
- Drawer lateral con animación GSAP
- Lista de productos agregados
- Sección de extras sugeridos (`CartUpsell.tsx`)
- Modal de confirmación de pedido (`OrderConfirmModal`)
- Integración con WhatsApp para pedidos

### Navbar (`src/components/Navbar.tsx`)
- Navegación fija con efecto de ocultar al scroll
- Botón del carrito con badge animado
- Menú hamburguesa para móvil

### Admin Layout (`src/app/admin/layout.tsx`)
- Protección de rutas (check de autenticación)
- Sidebar con navegación
- Badge de pedidos pendientes

### Core Logic (`src/core/`)
- **Intent Detection:** `intentDetector.ts` detecta intención + extrae alergias
- **Allergy Filter:** `allergyFilter.ts` filtra SOLO por `ingredients`
- **Bot Engine:** `botEngine.ts` motor principal con `safeProducts`
- **Offer Agent:** `offerAgent.ts` recomendaciones y upsells con `safeProducts`
- **Response Engine:** `responseEngine.ts` pipeline GOD MODE
- **Tests:** `__tests__/` con 23 tests (intentDetector, allergyFilter, whatsapp-flow)

### WhatsApp Integration (`src/lib/whatsapp/`)
- `intentDetector.ts` legacy (movido ADD_TO_CART antes de menuTriggers)
- `botEngine.ts` legacy

## Flujo de Datos (Actualizado)

```
┌─────────────────────────────────────────────────────────────┐
│                     page.tsx (Home)                          │
│  - Estado: cartItems[], cartOpen                            │
│  - Funciones: addToCart(), updateQuantity()                 │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────┴─────────────────────────────────────┐
│                     Cart.tsx (Drawer)                          │
│  - Lista de productos agregados                           │
│  - Sección de upsell (CartUpsell.tsx)                     │
│  - Modal de confirmación (OrderConfirmModal)               │
└─────────────────────┬─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────┴─────────────────────────────────────┐
│                   WhatsApp / ChatBot                          │
│  ┌──────────────────────────────────────────┐              │
│  │  core/botEngine.ts (Motor principal)          │              │
│  │   1. Obtiene products de DB                     │              │
│  │   2. Extrae alergias de "sin X" del mensaje    │              │
│  │   3. Filtra → safeProducts (SOLO ingredients)   │              │
│  │   4. Pasa safeProducts a responseEngine         │              │
│  └──────────────────────────────────────────┘              │
│  ┌──────────────────────────────────────────┐              │
│  │  core/intentDetector.ts                       │              │
│  │   - detectIntent() retorna {intent, allergies[]} │              │
│  │   - extractAllergies(): "sin X", "soy alérgico"│              │
│  └──────────────────────────────────────────┘              │
│  ┌──────────────────────────────────────────┐              │
│  │  core/allergyFilter.ts                       │              │
│  │   - isProductSafe(): SOLO ingredients         │              │
│  │   - Bidireccional: ing⊂includes(allergy)       │              │
│  │                  allergy.includes(ing)        │              │
│  │   - Logs: producto, ingredientes, alergia     │              │
│  └──────────────────────────────────────────┘              │
│  ┌──────────────────────────────────────────┐              │
│  │  core/offerAgent.ts                        │              │
│  │   - getEntryRecommendation(safeProducts)       │              │
│  │   - getBestUpsell(safeProducts)           │              │
│  └──────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

**Nuevo Flujo de Recomendación:**
1. Usuario: "quiero papas sin salchicha"
2. `detectIntent()` → extrae `allergies: ['salchicha']`
3. `botEngine.getBotResponse()`:
   - Obtiene products de DB
   - Filtra inmediatamente: `safeProducts = filterProducts(products, allergies)`
   - Pasa `safeProducts` a todas las funciones
4. `getEntryRecommendation(intent, profile, safeProducts)`:
   - Recibe `safeProducts` directamente (no re-obtiene products)
   - Retorna UN producto de `safeProducts`
5. **Validación crítica**: Si recomendación NO está en `safeProducts` → recalcular
6. Respuesta: Solo productos de `safeProducts`
┌─────────────────────────────────────────────────────────────┐
│                     page.tsx (Home)                          │
│  - Estado: cartItems[], cartOpen                            │
│  - Funciones: addToCart(), updateQuantity()                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Navbar  │ │   Cart   │ │   Hero   │
    │ (badge)  │ │ (drawer) │ │  (CTAs)  │
    └──────────┘ └──────────┘ └──────────┘
                      │
                      ▼
              ┌───────────────┐
              │   WhatsApp    │
              │   (pedido)    │
              └───────────────┘
```

## Persistencia (localStorage)

| Clave | Descripción |
|-------|-------------|
| `snacks911_admin_products` | Productos del admin |
| `snacks911_admin_orders` | Pedidos |
| `snacks911_admin_settings` | Configuración (WhatsApp, horarios) |
| `snacks911_admin_sales` | Histórico de ventas |
| `snacks911_admin_categories` | Categorías personalizadas |
| `admin_token` | Token de sesión |
| `snacks911_sidebar_collapsed` | Estado del sidebar |

## Tecnologías (Actualizado)

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Animaciones:** GSAP + ScrollTrigger
- **Estilos:** CSS inline + globals.css
- **Persistencia:** localStorage (admin) + Supabase (products, profiles)
- **Testing:** Jest + ts-jest (34 tests passing)
- **Base de Datos:** Supabase (PostgreSQL + Supabase Auth)
- **Columna agregada:** `products.ingredients jsonb`

## Issues Corregidos

1. **✅ Seguridad:** Credenciales expuestas en cliente → Movidas a `.env.local`
2. **✅ Persistencia:** Carrito se pierde al refrescar → Persistido en `snacks911_cart`
3. **✅ Performance:** Animaciones GSAP sin cleanup → Agregado `useEffect` cleanup
4. **✅ Datos:** Duplicación de productos → Unificado en `products.ts` + DB sync
5. **✅ Filtrado:** `allergyFilter` usaba name/description → **SOLO `ingredients`**
6. **✅ Extracción:** Alergias "sin X" no se detectaban → **`extractAllergies()` en `intentDetector.ts`**
7. **✅ Flujo seguro:** Recomendaciones fuera de `safeProducts` → **Validación + recálculo**

## Próximos Pasos

- [x] Forzar uso de `safeProducts` en TODO el flujo de recomendación
- [x] Agregar extracción de alergias dinámicas desde "sin X"
- [x] Mover lógica ADD_TO_CART y productAlone antes de menuTriggers
- [x] Migración DB: agregar columna `ingredients jsonb`
- [x] Agregar tests: `intentDetector.test.ts` (8), `allergyFilter.test.ts` (8), `whatsapp-flow.test.ts` (7)
- [ ] Mover autenticación a API routes (server-side)
- [ ] Agregar persistencia del carrito en DB
- [ ] Limpiar animaciones GSAP en useEffect
- [ ] Unificar fuente de datos de productos (DB + ingredients)
- [ ] Agregar tests E2E (Playwright)
- [ ] Implementar métricas de conversión (Google Analytics)

## Próximos Pasos

- [ ] Mover autenticación a API routes (server-side)
- [ ] Agregar persistencia del carrito
- [ ] Limpiar animaciones GSAP en useEffect
- [ ] Unificar fuente de datos de productos