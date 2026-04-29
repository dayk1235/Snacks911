/**
 * core/consultativeMatrix.ts — Business rules engine.
 * 
 * Centralizes sales strategies and constraints defined by the business.
 */

import rules from './sales-rules.json';

export interface SalesRules {
  priorityItems: string[];
  maxDiscountPercent: number;
  marginProtection: boolean;
  blockedUpsells: string[];
  happyHour: {
    start: string;
    end: string;
    multiplier: number;
  };
}

/**
 * Returns the current sales rules from the configuration matrix.
 * 
 * @returns SalesRules object
 */
export function getSalesRules(): SalesRules {
  return rules as SalesRules;
}
