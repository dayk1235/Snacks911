# WhatsApp Bot — Spec Oficial (Snacks 911)

_Fuente: equipo Snacks 911 — 2026-04-27_

---

## 1. Intent Catalog (20 intents)

### A. Ventas / Conversión
| # | Intent | Descripción |
|---|--------|------------|
| 1 | `SHOW_MENU` | Ver menú/categorías |
| 2 | `SHOW_CATEGORY` | Ver categoría específica (COMBOS/PROTEINA/PAPAS/etc.) |
| 3 | `PRODUCT_INFO` | Info de producto: precio, qué incluye, tamaño |
| 4 | `RECOMMEND` | "¿Qué me recomiendas?" |
| 5 | `ADD_TO_CART` | Agregar producto + cantidad |
| 6 | `SELECT_SAUCE` | Elegir salsa (BBQ / Mango Habanero / NONE) |
| 7 | `ADD_EXTRAS` | Dips/salsas extra |
| 8 | `UPSELL_COMBO` | Convertir a combo cuando aplique |
| 9 | `VIEW_CART` | Ver carrito actual |
| 10 | `EDIT_CART` | Quitar/cambiar cantidades |
| 11 | `CONFIRM_ORDER` | Confirmar pedido (resumen final) |
| 12 | `CHECKOUT` | Datos finales: nombre, dirección, pago, envío |

### B. Operación / Información
| # | Intent | Descripción |
|---|--------|------------|
| 13 | `HOURS` | Horarios |
| 14 | `LOCATION` | Ubicación |
| 15 | `DELIVERY_INFO` | Cobertura, costo, tiempos |
| 16 | `PAYMENT_METHODS` | Efectivo/tarjeta/transfer |
| 17 | `PROMOS_ACTIVE` | Promos activas |
| 18 | `ANNOUNCEMENTS` | "Hoy cerramos 9pm", "no hay X" |

### C. Soporte / Control
| # | Intent | Descripción |
|---|--------|------------|
| 19 | `HANDOFF_HUMAN` | Queja / caso raro / petición de humano |
| 20 | `UNKNOWN` | Fallback seguro |

---

## 2. State Machine

### Estados
| Estado | Descripción |
|--------|------------|
| `S0_IDLE` | Sin contexto |
| `S1_BROWSING_MENU` | Viendo menú/categorías |
| `S2_BUILDING_CART` | Agregando items |
| `S3_NEED_SAUCE` | Falta salsa para item que lo requiere |
| `S4_UPSELL_OFFER` | Ofrecer combo/extras |
| `S5_CONFIRM` | Resumen final |
| `S6_CHECKOUT` | Datos finales |
| `S7_HANDOFF` | Con humano |

### Reglas de Transición
```
"menú/ver menú"                 → S1_BROWSING_MENU
"quiero X / ponme X / dame X"  → S2_BUILDING_CART (si no requiere salsa)
                                  S3_NEED_SAUCE (si requires_sauce = true)
item con requires_sauce=true    → S3_NEED_SAUCE
salsa seleccionada              → S4_UPSELL_OFFER (si hay upsell aplicable)
                                  S2_BUILDING_CART (si no)
"ya/confirmo/ordena/pagar"      → S5_CONFIRM → S6_CHECKOUT
enojo/queja/"humano"            → S7_HANDOFF
UNKNOWN x2 seguidas             → S7_HANDOFF
```

---

## 3. Database Schema

### `products`
```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL, -- COMBOS|PROTEINA|PAPAS|BANDERILLAS|BEBIDAS|EXTRAS
  price numeric(10,2) NOT NULL,
  description_short text,
  is_best_seller boolean DEFAULT false,
  requires_sauce boolean DEFAULT false,
  is_active boolean DEFAULT true
);
```

### `combo_items`
```sql
CREATE TABLE combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_product_id uuid REFERENCES products(id),
  item_product_id uuid REFERENCES products(id),
  qty integer DEFAULT 1,
  notes text -- "incluye bebida"
);
```

### `modifiers`
```sql
CREATE TABLE modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- SAUCE|DIP|EXTRA
  name text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true
);
```

### `product_modifier_rules`
```sql
CREATE TABLE product_modifier_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  modifier_type text NOT NULL, -- SAUCE|DIP
  is_required boolean DEFAULT false,
  max_select integer DEFAULT 1,
  included_count integer DEFAULT 1
);
```

### `announcements`
```sql
CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean DEFAULT true
);
```

### `promos`
```sql
CREATE TABLE promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL, -- PERCENT|FIXED|BUNDLE
  value numeric(10,2),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  rules_json jsonb DEFAULT '{}'::jsonb
);
```

### `faqs`
```sql
CREATE TABLE faqs (
  key text PRIMARY KEY, -- HOURS|LOCATION|PAYMENTS|DELIVERY
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);
```

### `orders`
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text DEFAULT 'WHATSAPP', -- WHATSAPP|WEB|POS
  status text DEFAULT 'DRAFT', -- DRAFT|CONFIRMED|CANCELLED
  customer_name text,
  customer_phone text,
  delivery_type text, -- PICKUP|DELIVERY
  address text,
  payment_method text, -- CASH|CARD|TRANSFER
  total numeric(10,2),
  created_at timestamptz DEFAULT now()
);
```

### `order_items`
```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  product_id uuid REFERENCES products(id),
  qty integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  selected_modifiers_json jsonb DEFAULT '[]'::jsonb
);
```

### `wa_sessions`
```sql
CREATE TABLE wa_sessions (
  phone_number text PRIMARY KEY,
  state text NOT NULL DEFAULT 'S0_IDLE',
  cart_data jsonb DEFAULT '[]'::jsonb,
  unknown_count integer DEFAULT 0,
  last_interaction timestamptz DEFAULT now()
);
```

### `wa_events` (KPIs)
```sql
CREATE TABLE wa_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text,
  event_type text, -- order_started|upsell_accepted|handoff|order_completed
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## 4. Sales Playbooks (Upsell)

### Boneless 250g ($139)
1. **Combo upsell:** "¿Te lo convierto en Boneless Power 911 por $155? Incluye bebida + salsa."
2. **Addon:** "¿Le agregamos Dip Cheddar por $15?"

### Alitas 6pz ($125)
1. **Volume upsell:** "Por $145 está Alitas Fuego 911: 12pz + bebida + salsa + papas. ¿Te conviene ese?"
2. **Addon:** "¿Quieres salsa extra por $12?"

### Papas / Salchipapas
1. "¿Quieres agregar bebida por $30?"
2. "¿Le ponemos dip por $15?"

### "No sé qué pedir" (3-question flow)
1. "¿Qué tanto picante? (nada/medio/fuerte)"
2. "¿Cuánta hambre? (leve/normal/mucha)"
3. "¿Presupuesto? (≤$150 / $150–200 / $200+)"

**Recomendación por presupuesto:**
- ≤$150 → Boneless 250g $139 o Papas Loaded $149
- $150–200 → Boneless Power $155 o Combo Banderilla Suprema $149
- $200+ → Combo Mixto 911 $249 (mejor valor y variedad)

---

## 5. AI Guardrails (System Prompt)

```
Eres el experto de ventas de Snacks 911. Eres breve, directo y persuasivo.

REGLAS (nunca las rompas):
- NUNCA inventes precios, productos, disponibilidad u horarios.
- Solo menciona lo que existe en MENU_CONTEXT.
- Si falta un dato, pregunta 1 cosa a la vez.
- Siempre intenta cerrar con: resumen + pregunta de confirmación.
- Prioriza productos ⭐ (best_seller).
- Mensajes cortos: máx 3 oraciones, bullets si aplica, emoji mínimo.
- Si hay queja, enojo o petición fuera de menú → devuelve: {"action":"handoff","reason":"..."}

CONTEXT_PAYLOAD:
{{ menu_items | modifiers | announcements_active | promos_active | cart_state }}
```

### Context Payload Structure
```json
{
  "menu_items": [
    { "name": "Boneless Power 911", "price": 155, "category": "COMBOS", "best_seller": true }
  ],
  "modifiers": [
    { "type": "SAUCE", "name": "BBQ", "price": 0 },
    { "type": "DIP", "name": "Queso Cheddar", "price": 15 }
  ],
  "announcements_active": [],
  "promos_active": [],
  "cart_state": []
}
```

### AI Response Structure
```typescript
interface AIResponse {
  message_to_user: string;
  intent_suggestion: 'RECOMMEND' | 'UPSELL' | 'ASK_MISSING_INFO' | 'HANDOFF';
  missing_fields?: string[];
}
```

---

## 6. Training Dataset (50 ejemplos)

| # | Utterance | Intent | Entities | Next State |
|---|-----------|--------|----------|------------|
| 1 | "Me pasas el menú" | SHOW_MENU | {} | S1_BROWSING_MENU |
| 2 | "Qué combos tienes?" | SHOW_CATEGORY | {category:"COMBOS"} | S1_BROWSING_MENU |
| 3 | "Dame el Combo Mixto" | ADD_TO_CART | {product:"Combo Mixto 911",qty:1} | S2_BUILDING_CART |
| 4 | "Quiero boneless" | ADD_TO_CART | {product:"Boneless 250g",qty:1} | S3_NEED_SAUCE |
| 5 | "Boneless power" | ADD_TO_CART | {product:"Boneless Power 911",qty:1} | S3_NEED_SAUCE |
| 6 | "Alitas 6" | ADD_TO_CART | {product:"Alitas 6pz",qty:1} | S3_NEED_SAUCE |
| 7 | "Alitas fuego" | ADD_TO_CART | {product:"Alitas Fuego 911",qty:1} | S3_NEED_SAUCE |
| 8 | "Una banderilla" | ADD_TO_CART | {product:"Banderilla coreana",qty:1} | S2_BUILDING_CART |
| 9 | "Dedos de queso" | ADD_TO_CART | {product:"Dedos de queso",qty:1} | S2_BUILDING_CART |
| 10 | "Salchipapas" | ADD_TO_CART | {product:"Salchipapas",qty:1} | S2_BUILDING_CART |
| 11 | "Cuánto cuesta el boneless?" | PRODUCT_INFO | {product:"Boneless 250g"} | S1_BROWSING_MENU |
| 12 | "Qué incluye el Boneless Power?" | PRODUCT_INFO | {product:"Boneless Power 911"} | S1_BROWSING_MENU |
| 13 | "Qué trae el Combo Mixto?" | PRODUCT_INFO | {product:"Combo Mixto 911"} | S1_BROWSING_MENU |
| 14 | "Cuánto sale la banderilla?" | PRODUCT_INFO | {product:"Banderilla coreana"} | S1_BROWSING_MENU |
| 15 | "Precio de las papas con queso" | PRODUCT_INFO | {product:"Papas con queso"} | S1_BROWSING_MENU |
| 16 | "Tienes BBQ?" | SELECT_SAUCE | {sauce:"BBQ"} | S2_BUILDING_CART |
| 17 | "Mango habanero" | SELECT_SAUCE | {sauce:"Mango Habanero"} | S2_BUILDING_CART |
| 18 | "Ponle BBQ a las alitas" | SELECT_SAUCE | {target:"Alitas",sauce:"BBQ"} | S2_BUILDING_CART |
| 19 | "Sin salsa" | SELECT_SAUCE | {sauce:"NONE"} | S2_BUILDING_CART |
| 20 | "Dame 2 salsas extra" | ADD_EXTRAS | {extra:"Salsa extra",qty:2} | S2_BUILDING_CART |
| 21 | "Agrega dip cheddar" | ADD_EXTRAS | {extra:"Dip Queso Cheddar",qty:1} | S2_BUILDING_CART |
| 22 | "Un dip parmesano" | ADD_EXTRAS | {extra:"Dip Parmesano",qty:1} | S2_BUILDING_CART |
| 23 | "Quiero 2 boneless" | ADD_TO_CART | {product:"Boneless 250g",qty:2} | S3_NEED_SAUCE |
| 24 | "Cámbialo a combo" | UPSELL_COMBO | {} | S4_UPSELL_OFFER |
| 25 | "Mejor el Boneless Power" | EDIT_CART | {replace_with:"Boneless Power 911"} | S3_NEED_SAUCE |
| 26 | "Qué me recomiendas?" | RECOMMEND | {} | S1_BROWSING_MENU |
| 27 | "Algo no picante" | RECOMMEND | {spice:"low"} | S1_BROWSING_MENU |
| 28 | "Tengo mucha hambre" | RECOMMEND | {hunger:"high"} | S1_BROWSING_MENU |
| 29 | "Con 150 que me alcanza?" | RECOMMEND | {budget:150} | S1_BROWSING_MENU |
| 30 | "Cuál conviene más, mixto o boneless power?" | RECOMMEND | {compare:["Combo Mixto 911","Boneless Power 911"]} | S1_BROWSING_MENU |
| 31 | "Muéstrame mi carrito" | VIEW_CART | {} | S2_BUILDING_CART |
| 32 | "Quita las papas" | EDIT_CART | {remove:"Papas"} | S2_BUILDING_CART |
| 33 | "Bájale a 1" | EDIT_CART | {qty_set:1} | S2_BUILDING_CART |
| 34 | "Agrega refresco" | ADD_TO_CART | {product:"Refresco 400ml",qty:1} | S2_BUILDING_CART |
| 35 | "Quiero pagar ya" | CONFIRM_ORDER | {} | S5_CONFIRM |
| 36 | "Confirmo el pedido" | CONFIRM_ORDER | {} | S5_CONFIRM |
| 37 | "Es para enviar" | CHECKOUT | {delivery_type:"DELIVERY"} | S6_CHECKOUT |
| 38 | "Paso por él" | CHECKOUT | {delivery_type:"PICKUP"} | S6_CHECKOUT |
| 39 | "Pago con efectivo" | CHECKOUT | {payment_method:"CASH"} | S6_CHECKOUT |
| 40 | "Pago con transferencia" | CHECKOUT | {payment_method:"TRANSFER"} | S6_CHECKOUT |
| 41 | "Dónde están?" | LOCATION | {} | S1_BROWSING_MENU |
| 42 | "A qué hora cierran?" | HOURS | {} | S1_BROWSING_MENU |
| 43 | "Hacen delivery?" | DELIVERY_INFO | {} | S1_BROWSING_MENU |
| 44 | "Qué promos hay hoy?" | PROMOS_ACTIVE | {} | S1_BROWSING_MENU |
| 45 | "Hoy está abierto?" | ANNOUNCEMENTS | {} | S1_BROWSING_MENU |
| 46 | "No me llegó mi pedido" | HANDOFF_HUMAN | {reason:"complaint"} | S7_HANDOFF |
| 47 | "Quiero hablar con alguien" | HANDOFF_HUMAN | {} | S7_HANDOFF |
| 48 | "Están bien caros" | RECOMMEND | {objection:"price"} | S1_BROWSING_MENU |
| 49 | "Dame 1 kilo de boneless" | UNKNOWN | {request:"off_menu"} | S7_HANDOFF |
| 50 | "No entiendo" | UNKNOWN | {} | S7_HANDOFF |

---

## 7. Message Templates

### Greeting / Menú
```
🔥 Menú Snacks 911:
Combos (desde $139) • Proteína • Papas • Banderilla • Bebidas • Extras
¿Te mando Combos o Proteína?
```

### Cierre rápido
```
Perfecto ✅ Tu pedido va así:
• [items]
Total: $___
¿Es pickup o delivery?
```

### Upsell corto
```
Tip 👀 Por $155 te conviene el Boneless Power 911 (boneless 250g + bebida + salsa). ¿Te lo cambio?
```

### Handoff
```
Ya te apoyo con eso 🙌 Te paso con un humano para resolverlo rápido.
¿Me confirmas tu nombre y qué fue lo que pediste?
```
