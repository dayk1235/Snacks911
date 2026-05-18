import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseAdmin } from '@/lib/db.server';
import { getAIConfig } from '@/lib/ai/aiConfigManager';

export interface ARIAContext {
  // Operacional — de metricsEngine
  salesToday: number;
  dailyGoal: number;
  activeOrders: number;
  activeStaff: number;
  avgTicket: number;
  
  // Inteligencia — de revenueMetrics  
  topStrategy: string;        // qué estrategia de venta funcionó más hoy
  conversionRate: number;     // impresiones vs pedidos completados
  lostSales: number;          // pedidos abandonados
  
  // Inventario
  criticalStock: Array<{ name: string; stock: number; unit: string }>;
  
  // Meta
  tenantName: string;
  tenantId: string;
  date: string;
}

export interface ARIAMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ARIAEngine {
  private genAI: GoogleGenerativeAI;
  
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  public buildSystemPrompt(ctx: ARIAContext, tenantTone?: string): string {
    const stockAlerts = ctx.criticalStock.length > 0
      ? ctx.criticalStock.map(s => `- ${s.name}: ${s.stock} ${s.unit}`).join('\n')
      : 'Todo el inventario está en niveles óptimos.';

    const toneInstruction = tenantTone 
      ? `Mantén un tono de comunicación que sea: ${tenantTone}` 
      : 'Responde de manera profesional, concisa y analítica. Evita saludos largos. Ve directo al punto.';

    return `Eres ARIA (Admin Reporting Intelligence Assistant), el asistente ejecutivo de inteligencia de negocios para ${ctx.tenantName}.
Tu objetivo es analizar los datos operativos en tiempo real y proveer insights estratégicos y accionables al dueño del negocio o gerente.
${toneInstruction}

--- CONTEXTO OPERACIONAL ACTUAL (${ctx.date}) ---
Ventas Hoy: $${ctx.salesToday} MXN (Meta: $${ctx.dailyGoal} MXN)
Órdenes Activas: ${ctx.activeOrders}
Staff Activo: ${ctx.activeStaff}
Ticket Promedio: $${ctx.avgTicket.toFixed(2)} MXN

--- INTELIGENCIA DE VENTAS ---
Estrategia más exitosa hoy: ${ctx.topStrategy.toUpperCase()}
Tasa de Conversión (Impresión a Venta): ${(ctx.conversionRate * 100).toFixed(1)}%
Ventas Perdidas / Abandonadas: ${ctx.lostSales}

--- ALERTAS DE INVENTARIO CRÍTICO ---
${stockAlerts}

--- TUS DIRECTRICES ---
1. Usa estos datos para contextualizar cualquier pregunta del usuario.
2. Si el usuario pregunta por el estado del negocio, haz un resumen rápido resaltando lo crítico (ej. inventario bajo, o si estamos lejos de la meta).
3. Si la tasa de conversión es baja o las ventas perdidas son altas, sugiere usar estrategias de retargeting o urgencia.
4. Mantén tus respuestas precisas. Usa listas y bullet points cuando sea necesario para facilitar la lectura.
5. NO asumas datos que no están en este contexto. Si te piden un dato histórico que no tienes, indícalo claramente.
`;
  }

  public async query(params: {
    userMessage: string;
    context: ARIAContext;
    history: ARIAMessage[];
  }): Promise<{ text: string; model: string; tokensUsed: number }> {
    // Optionally fetch specific AI config for this tenant
    let tenantTone = '';
    try {
      const config = await getAIConfig(params.context.tenantId);
      if (config && config.tone) {
        tenantTone = config.tone;
      }
    } catch (e) {
      console.warn('[ARIAEngine] Could not load tenant AI config', e);
    }

    const modelName = 'gemini-2.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.buildSystemPrompt(params.context, tenantTone),
      generationConfig: {
        temperature: 0.2, // Low temperature for analytical precision
      }
    });

    const chat = model.startChat({
      history: params.history.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    });

    const result = await chat.sendMessage(params.userMessage);
    const responseText = result.response.text();
    const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

    await this.logInteraction({
      tenantId: params.context.tenantId,
      query: params.userMessage,
      response: responseText,
      model: modelName,
      tokens: tokensUsed
    });

    return {
      text: responseText,
      model: modelName,
      tokensUsed
    };
  }
  
  public async logInteraction(params: {
    tenantId: string;
    query: string;
    response: string;
    model: string;
    tokens: number;
  }): Promise<void> {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.from('ai_logs').insert({
        tenant_id: params.tenantId,
        user_message: params.query,
        bot_response: params.response,
        intent: 'ARIA_ADMIN_QUERY',
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[ARIAEngine] Failed to log interaction', e);
    }
  }
}

export const ariaEngine = new ARIAEngine();
