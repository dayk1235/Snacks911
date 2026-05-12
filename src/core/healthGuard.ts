import { getSystemHealth } from './bugHealthScore';
import type { BugReport } from './bugDetector';

export type OperationRisk = 'deploy' | 'refactor' | 'pricing_change' | 'ai_model_change' | 'safe';

const CRITICAL_ONLY_BLOCKED: OperationRisk[] = [
  'deploy',
  'refactor',
  'pricing_change',
  'ai_model_change',
];

export function assertSystemHealthy(
  bugReports: BugReport[],
  requiredLevel: 'healthy' | 'degraded',
  operation: OperationRisk,
): void {
  const health = getSystemHealth(bugReports);

  if (health.status === 'critical') {
    if (CRITICAL_ONLY_BLOCKED.includes(operation)) {
      throw new Error(
        `[HEALTH_GUARD] BLOCKED: system health is critical ` +
        `(score: ${health.score}, critical bugs: ${health.breakdown.critical}). ` +
        `Operation '${operation}' rejected.`,
      );
    }
    console.warn(
      `[HEALTH_GUARD] System critical (score: ${health.score}). ` +
      `Safe operation '${operation}' allowed with warning.`,
    );
    return;
  }

  if (health.status === 'degraded') {
    if (CRITICAL_ONLY_BLOCKED.includes(operation)) {
      throw new Error(
        `[HEALTH_GUARD] BLOCKED: system is degraded (score: ${health.score}). ` +
        `Operation '${operation}' is restricted — only safe operations allowed.`,
      );
    }

    if (requiredLevel === 'healthy') {
      throw new Error(
        `[HEALTH_GUARD] BLOCKED: operation '${operation}' requires healthy status, ` +
        `but system is degraded (score: ${health.score}).`,
      );
    }

    console.warn(
      `[HEALTH_GUARD] System degraded (score: ${health.score}). ` +
      `Operation '${operation}' allowed with warning.`,
    );
  }
}
