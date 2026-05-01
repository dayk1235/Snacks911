SNACKS911_ROADMAP_AI_V1

GOAL:
bot ventas omnicanal estable + escalable

ORDER:
0 → E → B → H → I → J → K → C → D → F → G

---

PHASE :
name: safety
goal: evitar errores IA y perdida dinero
steps:
1:
- crear validationService
- validar product_id (DB)
- validar price (DB)
- validar quantity > 0
2:
- integrar en POST /orders
- integrar en runBot
3:
- fallback seguro (error controlado)
4:
- human_handoff (detectar frustracion)

---

PHASE :
name: estabilidad
goal: flujo confiable
steps:
1:
- status order: pending/preparing/ready
2:
- try/catch global en endpoints
3:
- logs claros
4:
- integrar handoff en flujo

---

PHASE :
name: memoria
goal: clientes recurrentes
steps:
1:
- guardar customer (phone)
2:
- update total_orders
- update last_order_total
3:
- detectar favorite_product
4:
- getCustomerProfile()

---

PHASE :
name: ux
goal: eliminar plantilla
steps:
1:
- crear HeroDecision component
2:
- opciones:
  - rapido
  - fuerte
  - viendo
3:
- conectar con store

---
COMPLETO 


PHASE :
name: brand
goal: personalidad
steps:
1:
- reemplazar textos:
  - agregar carrito
  - pedido confirmado
2:
- tono:
  - corto
  - urgente
  - directo

---..................

PHASE :
name: micro
goal: UI viva
steps:
1:
- animacion add item
2:
- feedback botones
3:
- transiciones

---

PHASE :
name: flujo
goal: web = bot
steps:
1:
- flujo:
  intent → productos → upsell
2:
- mantener estado
3:
- usar chatStore

---

PHASE :
name: ventas
goal: subir ticket
steps:
1:
- detectar carrito < 2 items
2:
- sugerir:
  - papas
  - bebida
3:
- integrar en runBot

---

PHASE :
name: analytics
goal: medir
steps:
1:
- eventos:
  - order_created
  - item_added
2:
- metricas:
  - total_orders
  - avg_ticket

---

PHASE :
name: saas
goal: escalar
steps:
1:
- agregar tenant_id
2:
- filtrar queries

---

PHASE :
name: innovacion
goal: futuro
steps:
1:
- suggestion engine
2:
- predictive order

---

RULES:
- 1 fase por ejecucion
- 1 step por vez (opcional)
- no mezclar fases
- codigo minimo
- output directo





-------------------------------------------------------------------------------------




SNACKS911_ROADMAP_EXEC_V2

FORMAT:
input: fase:X tarea:Y
output: FILE | PATCH | SQL (sin texto extra)

RULES:
- 1 tarea por ejecución
- cambios mínimos
- no refactor grande
- reutilizar código
- si ambiguo → solución simple

---

PHASE A (safety)

tarea:1
- crear validationService
- validar:
  product_id existe
  price coincide DB
  quantity > 0

tarea:2
- integrar validationService en:
  POST /api/orders

tarea:3
- integrar validationService en:
  runBot (antes de crear orden)

tarea:4
- fallback seguro:
  si falla validación → no crear orden
  devolver error controlado

tarea:5
- human_handoff:
  detectar mensajes:
    "humano"
    "no funciona"
    "ayuda"
  devolver flag

---

PHASE B (estabilidad)

tarea:1
- implementar order status:
  pending → preparing → ready

tarea:2
- agregar try/catch global en endpoints

tarea:3
- logs claros (console)

tarea:4
- integrar handoff en flujo

---

PHASE C (memoria)

tarea:1
- guardar customer por phone

tarea:2
- update:
  total_orders
  last_order_total

tarea:3
- detectar favorite_product

tarea:4
- getCustomerProfile()

---

PHASE D (ux)

tarea:1
- crear HeroDecision component

tarea:2
- botones:
  rapido
  fuerte
  viendo

tarea:3
- conectar con store

---

PHASE E (brand)

tarea:1
- reescribir textos:
  carrito
  confirmacion

tarea:2
- tono:
  corto
  urgente

---

PHASE F (micro)

tarea:1
- animacion add item

tarea:2
- feedback botones

tarea:3
- transiciones

---

PHASE H (flujo)

tarea:1
- flujo:
  intent → productos → upsell

tarea:2
- mantener estado

---

PHASE I (ventas)

tarea:1
- detectar carrito < 2 items

tarea:2
- sugerir:
  papas
  bebida

---

PHASE J (analytics)

tarea:1
- eventos:
  order_created
  item_added

tarea:2
- metricas:
  total_orders
  avg_ticket

---

PHASE K (saas)

tarea:1
- agregar tenant_id

tarea:2
- filtrar queries

---

PHASE L (innovacion)

tarea:1
- suggestion engine

tarea:2
- predictive order