# Requisitos: Control de Flujo Conversacional

**Objetivo:**
Dejar de depender de respuestas completas de IA y mover la lógica de conversación al sistema.

**Contexto:**
Actualmente el chatbot usa Gemini para generar respuestas completas. Esto causa problemas de flujo (repite recomendaciones, no respeta contexto).

---

## 1. Intent Agent
**Archivo:** \`/ai/runtime/intentAgent.ts\`
**Función:** \`detectIntent(message: string)\`
- Debe usar Gemini (\`gemini-2.5-flash-lite\`)
- Devolver JSON con:
  \`\`\`json
  {
    "intent": "string",
    "producto": "string" | null
  }
  \`\`\`

## 2. Flow Engine
**Archivo:** \`/ai/runtime/flowEngine.ts\`
**Función:** \`handleMessage(message, intentData, state)\`
- Controlar flujo SIN usar IA
- Manejar estados:
  \`\`\`json
  {
    "producto": "string" | null,
    "paso": "inicio" | "seleccion" | "confirmacion" | "cierre"
  }
  \`\`\`

### Reglas de negocio:
- Si usuario ya eligió producto → NO recomendar otros
- Si usuario confirma → avanzar
- Si usuario quiere pagar → cerrar
- Si no hay contexto → mostrar menú

## 3. Integración en endpoint
**Archivo:** \`/api/ai/chat\`
**Flujo:**
1. Recibir mensaje
2. Llamar \`detectIntent()\`
3. Pasar resultado a \`handleMessage()\`
4. Devolver respuesta

## 4. Compatibilidad
- NO romper UI actual
- Mantener formato de respuesta \`string\`

## 5. Manejo de errores
- Fallback si Gemini falla
- Retry si JSON es inválido

---
**IMPORTANTE:**
NO eliminar sistema actual aún. Implementar como nueva capa controlada.
