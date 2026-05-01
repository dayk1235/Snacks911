# PHASE A — UI-FIRST MIGRATION

## TASK 0 — Enable UI Types (Products / Buttons / Text)

### 🎯 Objetivo
Permitir que el bot devuelva tipos de UI (products, buttons, text) sin romper el sistema actual basado en texto.

---

## ⚙️ Cambios

### 1. ResponseOutput (types.ts)
Agregar soporte a type y payload:

- type: 'text' | 'buttons' | 'products'
- actions: soporta image y price

---

### 2. responseEngine.ts
Todos los outputs deben incluir:

- type dinámico:
  - 'buttons' si hay actions
  - 'text' si no hay actions

---

### 3. Nuevo tipo: PRODUCTS
Agregar respuesta especial cuando:

- intent === exploracion

Debe devolver:

- type: 'products'
- actions: lista de productos con:
  - label
  - value
  - image
  - price

---

### 4. UI (OrderBot.tsx)

Actualizar:

- Msg interface → incluir type
- setMsgs → guardar type

---

### 5. Render UI

Agregar render especial:

if (type === 'products') → mostrar cards horizontales

---

## 🧠 Reglas

- NO romper lógica actual
- NO modificar runBot
- Mantener text como fallback
- UI decide render

---

## ✅ Resultado esperado

- Bot soporta:
  - text
  - buttons
  - products
- UI muestra cards
- Sistema sigue estable


DIME CUANDO TERMINES CADA TAREA CON UN DONE.