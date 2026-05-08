import { getSupabaseAdmin } from '@/lib/db.server';

export interface AIConfig {
  tenantId: string;
  tone: 'friendly' | 'formal' | 'energetic' | 'street';
  personalityPrompt: string;
  upsellStrategy: 'passive' | 'moderate' | 'aggressive';
  maxUpsellSuggestions: number;
  prohibitedTopics: string[];
  safetyGuardrails: string;
}

/**
 * Retrieves AI configuration for a specific tenant.
 * Falls back to default 'friendly' personality if not found.
 */
export async function getAIConfig(tenantId: string): Promise<AIConfig> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('ai_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) {
    return {
      tenantId,
      tone: 'friendly',
      personalityPrompt: 'Eres un asistente amable y servicial.',
      upsellStrategy: 'moderate',
      maxUpsellSuggestions: 2,
      prohibitedTopics: [],
      safetyGuardrails: 'No hables de política ni religión.'
    };
  }

  return {
    tenantId: data.tenant_id,
    tone: data.tone,
    personalityPrompt: data.personality_prompt,
    upsellStrategy: data.upsell_strategy,
    maxUpsellSuggestions: data.max_upsell_suggestions,
    prohibitedTopics: data.prohibited_topics,
    safetyGuardrails: data.safety_guardrails
  };
}

/**
 * Example Usage in Prompt Generation
 * 
 * async function generatePrompt(tenantId: string, userInput: string) {
 *   const config = await getAIConfig(tenantId);
 *   
 *   return `
 *     SYSTEM PROMPT: ${config.personalityPrompt}
 *     TONE: ${config.tone}
 *     STRATEGY: ${config.upsellStrategy}
 *     SAFETY: ${config.safetyGuardrails}
 *     
 *     USER: ${userInput}
 *   `;
 * }
 */
