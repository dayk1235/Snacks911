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
│   │   └── Card.tsx           # Componente de tarjeta genérico
│   │
│   ├── lib/                    # Lógica y utilidades
│   │   ├── adminStore.ts       # Store para datos del admin (localStorage)
│   │   ├── adminTypes.ts       # Tipos TypeScript del admin
│   │   └── sound.ts            # Utilidades de sonido
│   │
│   ├── data/                   # Datos estáticos
│   │   └── products.ts         # Productos y categorías
│   │
│   └── types/                   # Tipos globales
│       └── index.ts            # Tipos compartidos (CartItem, etc.)
│
├── public/                      # Archivos estáticos
│   └── images/                  # Imágenes de productos
│
└── next.config.ts              # Configuración de Next.js
```

## Componentes Principales

### Página Principal (`src/app/page.tsx`)
- Importa y renderiza: Hero, ReviewSection, MenuSection, ExtrasSection, ContactSection, SiteFooter
- Maneja estado del carrito (`cartItems`, `cartOpen`)
- Maneja animaciones GSAP con ScrollTrigger

### Carrito (`src/components/Cart.tsx`)
- Drawer lateral con animación GSAP
- Lista de productos agregados
- Sección de extras sugeridos (`CartExtras`)
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

## Flujo de Datos

```
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

## Tecnologías

- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Animaciones:** GSAP + ScrollTrigger
- **Estilos:** CSS inline + globals.css
- **Persistencia:** localStorage

## Issues Conocidos (Pendientes de Resolver)

1. **🔴 Seguridad:** Credenciales expuestas en cliente
2. **🟡 Persistencia:** Carrito no se guarda al refrescar
3. **🟡 Performance:** Animaciones GSAP sin cleanup en algunos casos
4. **🟡 Datos:** Duplicación de productos entre `products.ts` y `adminStore.ts`

## Próximos Pasos

- [ ] Mover autenticación a API routes (server-side)
- [ ] Agregar persistencia del carrito
- [ ] Limpiar animaciones GSAP en useEffect
- [ ] Unificar fuente de datos de productos