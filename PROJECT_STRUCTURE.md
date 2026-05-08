# Snacks 911 — Estructura Completa del Proyecto

Este documento contiene la lista detallada de todos los archivos que componen el proyecto **Snacks 911**, organizada por directorios.

```text
.
├── src
│   ├── app                        # Páginas y API (Next.js App Router)
│   │   ├── admin                  # Dashboard Administrativo
│   │   │   ├── audit              # Auditoría de cajas
│   │   │   ├── cash               # Gestión de efectivo
│   │   │   ├── login              # Login administrativo
│   │   │   ├── menu               # Editor de menú
│   │   │   ├── optimize           # Herramientas de optimización
│   │   │   ├── orders             # Visualización de pedidos
│   │   │   ├── pos                # Punto de Venta (Caja)
│   │   │   ├── products           # Gestión de productos
│   │   │   ├── reports            # Reportes de ventas
│   │   │   ├── sales              # Métricas en tiempo real
│   │   │   ├── settings           # Configuración del local
│   │   │   └── staff              # Gestión de personal
│   │   ├── api                    # Endpoints del Servidor
│   │   │   ├── ai                 # ChatBot y Aprobaciones IA
│   │   │   ├── auth               # Login de clientes
│   │   │   ├── whatsapp           # Webhook y Health de Meta
│   │   │   └── ...                # Otros endpoints (pedidos, productos, etc.)
│   │   ├── menu                   # Vista de Menú para el cliente
│   │   ├── orders                 # Seguimiento de pedidos del cliente
│   │   ├── reset-password         # Flujo de recuperación de contraseña
│   │   └── globals.css            # Estilos globales
│   ├── core                       # MOTOR PRINCIPAL (Lógica de Negocio)
│   │   ├── ai                     # Agentes de memoria y contexto
│   │   ├── __tests__              # Pruebas unitarias y de integración
│   │   ├── botEngine.ts           # Cerebro unificado (WhatsApp + Web)
│   │   ├── responseEngine.ts      # Generador de respuestas y ventas
│   │   ├── intentDetector.ts      # Clasificación de NLU
│   │   ├── cartEngine.ts          # Gestión lógica del carrito
│   │   ├── context.ts             # Almacén de sesiones persistentes
│   │   ├── orderFlow.ts           # Control de estados del pedido
│   │   └── types.ts               # Definiciones de tipos globales
│   ├── components                 # Componentes de React
│   │   ├── chat                   # UI de la burbuja de chat y bot
│   │   ├── kitchen                # Panel para Cocina (KDS)
│   │   ├── cart                   # UI de Carrito y Banners de Upsell
│   │   ├── layout                 # Navbar, Footer, Cursores
│   │   ├── modals                 # Alertas, Selectores, Personalizadores
│   │   └── sections               # Secciones de la Landing Page
│   ├── lib                        # Clientes y Utilidades
│   │   ├── db.server.ts           # Acceso a DB desde el servidor
│   │   ├── supabase.ts            # Cliente Supabase
│   │   ├── adminStore.ts          # Estado administrativo
│   │   ├── posStore.ts            # Lógica del Punto de Venta
│   │   └── whatsappSession.ts     # Manejo de sesiones de Meta
│   ├── data                       # Semillas y JSONs de entrenamiento
│   │   ├── products.ts            # Base de datos local de productos
│   │   └── menu.ts                # Estructura del menú
│   └── tests                      # Entorno de pruebas E2E
├── supabase                       # Infraestructura
│   └── migrations                 # Historial de cambios en PostgreSQL
├── public                         # Archivos Estáticos
│   ├── images                     # Logos, Banners, Fondos
│   └── alert-cocina.mp3           # Sonido de alerta para pedidos
├── scripts                        # Scripts de Automatización
│   ├── syncAllProducts.ts         # Sincronización DB/Local
│   └── convert-images.mjs         # Optimización de imágenes
├── ai                             # Scripts externos de IA (CLI)
├── README.md                      # Documentación básica
├── ROADMAP.md                     # Plan de desarrollo
├── SECURITY_FIX_GUIDE.md          # Guía de seguridad RLS
├── package.json                   # Dependencias y scripts de npm
└── tsconfig.json                  # Configuración de TypeScript
```

---
*Generado automáticamente el 2026-05-07*