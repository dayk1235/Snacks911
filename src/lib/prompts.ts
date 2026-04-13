/**
 * prompts.ts — Dynamic prompt templates per intent (optional, unused by responseEngine).
 * Kept as reference for future AI integration.
 */

export interface PromptContext {
  comboName: string; comboPrice: number;
  papasName: string; papasPrice: number;
  bebidaName: string; bebidaPrice: number;
  postreName: string; postrePrice: number;
  comboBonelessName: string; comboBonelessPrice: number; ahorroBoneless: number;
  currentTotal: number;
  hasPapas: boolean; hasBebida: boolean; hasPostre: boolean;
}

export interface PromptTemplate {
  text: (ctx: PromptContext) => string;
}

export const PROMPTS: Record<string, PromptTemplate> = {};
