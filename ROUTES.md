# Estructura de Rutas de Snacks 911

Este documento detalla la arquitectura de rutas disponibles en el sistema (Frontend y API), basado en Next.js App Router (`src/app`).

## 🌐 Rutas Públicas (Clientes)

- `/` — Inicio principal (Snacks 911).
- `/saas` — Landing page de la plataforma SaaS (Para Negocios).
- `/menu` — Menú interactivo y experiencia de pedido.
- `/onboarding` — Flujo de registro para la plataforma SaaS.
- `/login` — Inicio de sesión general.
- `/reset-password` — Recuperación de contraseñas.
- `/orders` — Seguimiento y estado de las órdenes para los clientes.

## 🔐 Panel Administrativo (`/admin`)

- `/admin` — Redirección al dashboard.
- `/admin/login` — Acceso exclusivo para staff/empleados.
- `/admin/dashboard` — Métricas generales y resumen operativo.
- `/admin/pos` — Punto de Venta (Point of Sale) interno.
- `/admin/orders` — Gestión y monitoreo de órdenes (Kitchen Display System).
- `/admin/menu` — Editor rápido del menú.
- `/admin/products` — Gestión avanzada de productos e inventario.
- `/admin/cash` — Control y corte de caja.
- `/admin/staff` — Gestión de empleados y permisos.
- `/admin/reports` — Reportes financieros y análisis de ventas.
- `/admin/audit` — Registro de auditoría (logs de eventos del sistema).
- `/admin/optimize` — Herramientas de optimización e IA (Insights).
- `/admin/settings` — Configuración general de la tienda.

---

## ⚙️ Endpoints de API (`/api/...`)

### Autenticación y Staff
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/reset-request`
- `/api/auth/reset-password`
- `/api/admin/login`
- `/api/admin/logout`
- `/api/admin/me`
- `/api/admin/staff`
- `/api/admin/reset-codes`

### Inteligencia Artificial
- `/api/ai/chat` — Motor de chat para clientes (OrderBot).
- `/api/ai/approve` — Flujos de validación IA.
- `/api/learn` — Posible endpoint de entrenamiento.

### Órdenes y POS
- `/api/orders`
- `/api/orders/confirm`
- `/api/orders/status`
- `/api/orders-list`
- `/api/pos/orders`

### Productos y Menú
- `/api/products`
- `/api/products/toggle`
- `/api/products/check`
- `/api/products/seed`
- `/api/products/delete-all`
- `/api/menu/parse`
- `/api/menu/save`

### WhatsApp y Pagos
- `/api/whatsapp/webhook`
- `/api/whatsapp/health`
- `/api/payments/create`
- `/api/payments/webhook`

### Analíticas y Operaciones
- `/api/store/settings`
- `/api/store/status`
- `/api/admin/metrics`
- `/api/analytics`
- `/api/cash`
- `/api/health`
- `/api/log`
- `/api/reviews/scheduler`
