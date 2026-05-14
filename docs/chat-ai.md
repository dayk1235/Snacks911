# Chat AI Pipeline

## Problem

Chat bot (web + WhatsApp) returned fallback error `"Tuve un pequeño problema procesando eso. ¿Me lo repites? 😅"` for ALL messages including simple greetings like "hola".

## Root Cause

`src/core/ai/aiAgent.ts` had a Gemini model configuration conflict:
- `responseSchema: agentSchema` (Structured Output) + `responseMimeType: 'application/json'` 
- SDK `@google/generative-ai@0.24.1` doesn't support both simultaneously on `gemini-1.5-flash`
- Every other working Gemini call in the codebase used `systemInstruction` + manual JSON parsing

## Solution

### `src/core/ai/aiAgent.ts`

- **Model**: `gemini-1.5-flash` → `gemini-2.5-flash-lite` (consistent with all other agents)
- **Removed**: `responseSchema`, `Schema`, `SchemaType`, `responseMimeType`
- **Added**: `systemInstruction` with JSON format instructions in plain text
- **Added**: Regex JSON extraction `raw.match(/\{[\s\S]*\}/)`
- **Added**: Auto-correction — if first parse fails, sends correction prompt to Gemini
- **Added**: API key validation (returns maintenance message vs generic error)
- **Added**: Differentiated error handling (auth errors vs JSON parse vs network)

### `src/core/botEngine.ts`

- **Greeting shortcut**: `isGreetingOnly(message)` → responds instantly without calling AI
- 3 randomized friendly greetings in Mexican Spanish
- No API call, no latency, no failure point

### JSON parsing strategy (same as `intentAgent.ts` and `aiService.ts`)

```
1. model.generateContent(prompt)
2. raw = response.text()
3. Try JSON.parse(raw)
4. If fails → regex extract { } from raw
5. If still fails → correction prompt → JSON.parse
6. If all fails → fallback
```

## Related files

| File | Role |
|------|------|
| `src/core/ai/aiAgent.ts` | Gemini model, prompt, JSON parse, auto-correction |
| `src/core/botEngine.ts` | Orchestration, greeting shortcut, UI builder, fallback products |
| `src/lib/ai/obsidianSync.ts` | Knowledge context (reads .md from /knowledge/) |
| `src/app/api/ai/chat/route.ts` | API endpoint → getBotResponse() |
| `src/app/api/whatsapp/webhook/route.ts` | WhatsApp → getBotResponse() |
