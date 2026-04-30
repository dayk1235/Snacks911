# 🚨 Snacks 911 — Sistema de Ventas AI Conversacional

> **"No vendemos comida. Vendemos certeza, velocidad y conexión."**

---

# 1. VISIÓN DEL SISTEMA
Snacks 911 es una plataforma omnicanal diseñada para transformar la venta de snacks en un proceso determinístico impulsado por inteligencia artificial. El sistema unifica la experiencia de compra en Web y WhatsApp con la operación física de Cocina y POS.

**Flujo End-to-End:**
1. **Cliente:** Inicia conversación en WhatsApp o entra a la Web.
2. **Bot AI:** Detecta intención, recomienda productos, gestiona el carrito y realiza upsells dinámicos.
3. **Pedido:** Se inyecta en tiempo real en Supabase con estado `pending`.
4. **Cocina (KDS):** Recibe alerta visual y sonora inmediata para iniciar la preparación.
5. **Entrega:** La cocina marca como `ready` y el cliente es notificado (vía WhatsApp).

---

# 2. ARQUITECTURA TÉCNICA

- **Core Engine (`runBot`):** Orquestador central que procesa mensajes y decide la siguiente acción.
- **State Machine:** Motor de estados finito que garantiza que el cliente siempre tenga un camino claro (Idle → Browsing → Ordering → Upsell → Confirming).
- **Base de Datos (Supabase):** Capa de persistencia en tiempo real para productos, órdenes, clientes y logs de eventos.
- **WhatsApp Cloud API:** Integración oficial mediante webhooks para comunicación bidireccional escalable.
- **Agent Orchestrator:** Capa de lógica inteligente para manejar ambigüedad y personalización (fallback de LLM).
- **Frontend (Next.js):** Interfaces reactivas para el Cliente (Web), Staff (KDS) y Gerencia (Admin).

---

# 3. COMPONENTES DEL SISTEMA

### 🤖 Bot Engine (runBot)
- **Qué es:** El cerebro conversacional del sistema.
- **Para qué sirve:** Automatiza la toma de pedidos 24/7 sin intervención humana.
- **Cómo se usa:** Procesa texto o botones, actualiza el estado de la sesión y genera respuestas interactivas.

### 🛒 Cart Engine
- **Qué es:** Gestor de persistencia temporal de productos.
- **Para qué sirve:** Mantiene el estado de lo que el cliente quiere comprar antes de finalizar.
- **Cómo se usa:** Permite agregar, incrementar cantidades, calcular totales y aplicar reglas de negocio.

### 📦 Orders System
- **Qué es:** Módulo de gestión de transacciones.
- **Para qué sirve:** Centraliza todos los pedidos de todos los canales (Web, WhatsApp, POS).
- **Cómo se usa:** Valida datos, genera IDs únicos y sincroniza estados con la cocina.

### 🍱 Products System
- **Qué es:** Catálogo maestro de inventario.
- **Para qué sirve:** Define precios, categorías, disponibilidad y descripciones.
- **Cómo se usa:** Consultable por el bot para recomendaciones y por el admin para gestión.

### 👥 Customer System
- **Qué es:** CRM ligero integrado.
- **Para qué sirve:** Identifica clientes recurrentes por su número de teléfono.
- **Cómo se usa:** Rastrea historial, preferencias y total de compras para personalización.

### 📲 WhatsApp Integration
- **Qué es:** Puente de comunicación oficial con Meta.
- **Para qué sirve:** Envío de mensajes de lista, botones y texto plano.
- **Cómo se usa:** El webhook recibe mensajes y el bot responde mediante la Cloud API.

### 🍳 Kitchen Panel (KDS)
- **Qué es:** Interfaz de alta velocidad para cocineros.
- **Para qué sirve:** Elimina el uso de papel y reduce errores de preparación.
- **Cómo se usa:** Muestra órdenes por orden de llegada con temporizadores de preparación.

### 📊 Admin Panel
- **Qué es:** Centro de control estratégico.
- **Para qué sirve:** Gestión de inventario, reportes de ventas y configuración de la tienda.
- **Cómo se usa:** Los gerentes ajustan precios, ven analíticas y auditan movimientos.

---

# 4. FASES DEL ROADMAP

## PHASE A — CORE BOT ✅ COMPLETADA
Fase centrada en establecer el motor de ventas básico y la conexión multicanal.
- [x] Arquitectura `runBot` y máquina de estados.
- [x] Motor de carrito dinámico con cálculo de totales.
- [x] Persistencia de órdenes en Supabase.
- [x] Webhook de WhatsApp funcional (Cloud API).
- [x] UX Interactiva: Mensajes de lista y botones de respuesta rápida.
- [x] Sistema de Upsell básico (sugerencia de papas/bebida).

## PHASE B — CUSTOMER MEMORY 🔥 PENDIENTE
Fase centrada en la recurrencia y el conocimiento del cliente.
- [ ] Historial de pedidos por teléfono persistente.
- [ ] Detección automática de `favorite_product`.
- [ ] Taste Graph (perfil de sabores: picante, salado, dulce).
- [ ] Reorder inteligente ("¿Lo mismo de siempre?").

## PHASE C — SALES INTELLIGENCE 🔥 PENDIENTE
Fase centrada en maximizar el ticket promedio mediante IA avanzada.
- [ ] `agentOrchestrator` con integración profunda de LLM.
- [ ] Menú dinámico basado en la hora y perfil del cliente.
- [ ] Upsells inteligentes (basados en "Flavor Gap" o faltantes del pedido).

## PHASE D — ANALYTICS 🔥 PENDIENTE
Fase centrada en la visibilidad y toma de decisiones basada en datos.
- [ ] Dashboard de métricas (Conversión, Ticket Promedio, LTV).
- [ ] Logs de eventos detallados (`wa_events`).
- [ ] Alertas inteligentes (Cocina saturada, Fallas en API).

## PHASE E — PRODUCT ENHANCEMENTS ⚠ EN PROGRESO
Fase centrada en pulir la experiencia de usuario final.
- [ ] Flujo de Reorder rápido.
- [ ] Tracking de pedido en tiempo real para el cliente.
- [ ] Integración de pagos digitales (Stripe/Mercado Pago).
- [ ] Menú visual interactivo mejorado.
- [ ] `Human Handoff`: Transferencia inteligente a agente humano.

## PHASE F — SAAS 🔥 PENDIENTE
Fase centrada en la escalabilidad a múltiples negocios.
- [ ] Arquitectura Multi-tenant (`tenant_id` en todas las tablas).
- [ ] Módulo de Facturación y suscripciones.
- [ ] Dashboard de configuración para nuevos negocios.

## PHASE G — INNOVACIÓN 🔥 PENDIENTE
Fase de vanguardia tecnológica.
- [ ] `Predictive Ordering`: Sugerencias proactivas antes de que el cliente escriba.
- [ ] Voice Bot: Pedidos por notas de voz.
- [ ] Promociones inteligentes automáticas.

---

# 5. FLUJOS DEL SISTEMA

### 1. Flujo Cliente
1. Saludo → 2. Ver Menú (Lista) → 3. Seleccionar → 4. Upsell (Botones) → 5. Resumen (Confirmar) → 6. WhatsApp URL.

### 2. Flujo Cocina
1. Orden Nueva (Sonido/Visual) → 2. "Aceptar" (Status: `preparing`) → 3. Preparar → 4. "Listo" (Status: `ready`).

### 3. Flujo Admin
1. Login → 2. Monitor de Ventas → 3. Ajustar Stock/Disponibilidad → 4. Ver Reportes Diarios.

### 4. Flujo de Dinero
1. Pedido Web/WhatsApp → 2. Pago Contra Entrega / Digital → 3. Registro en POS → 4. Corte de Caja.

---

# 6. ESTADO ACTUAL DEL PROYECTO

- **Funcionando:** Bot con estados, carrito, integración WhatsApp interactiva, guardado de órdenes, panel de cocina real-time, gestión de productos.
- **Faltante:** Memoria de cliente persistente, analíticas avanzadas, pagos integrados, multi-tenancy.
- **Riesgos:** Dependencia de API externa (Meta), latencia en respuestas de IA (si se usa intensivamente).

---

# 7. ORDEN DE EJECUCIÓN (PRÓXIMOS PASOS)

1. **Estabilización:** Finalizar la lógica de `Human Handoff` para cuando el bot no entiende.
2. **Customer Memory:** Implementar la tabla de perfiles y reconocimiento de clientes.
3. **Analytics:** Crear el primer dashboard de conversión para medir el éxito del bot.

---

# 8. REGLAS DEL PROYECTO

- **No saltar fases:** El Core Bot debe ser 100% estable antes de pasar a Inteligencia de Ventas.
- **Ventas antes que SaaS:** Primero el sistema debe ser rentable para un negocio antes de hacerlo multi-inquilino.
- **Simplicidad ante todo:** Si una respuesta del bot tiene más de 3 líneas, es demasiado larga.
