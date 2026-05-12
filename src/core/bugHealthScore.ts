import { type BugReport } from '@/core/bugDetector';

export interface BugHealthScore {
  score: number;
  status: 'healthy' | 'degraded' | 'critical';
  breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const PRIORITY_WEIGHT: Record<BugReport['priority'], number> = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
};

export function getSystemHealth(bugReports: BugReport[]): BugHealthScore {
  const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const report of bugReports) {
    breakdown[report.priority]++;
  }

  let score = 100
    - breakdown.critical * PRIORITY_WEIGHT.critical
    - breakdown.high * PRIORITY_WEIGHT.high
    - breakdown.medium * PRIORITY_WEIGHT.medium
    - breakdown.low * PRIORITY_WEIGHT.low;

  if (score < 0) score = 0;

  let status: BugHealthScore['status'];
  if (score >= 90) {
    status = 'healthy';
  } else if (score >= 70) {
    status = 'degraded';
  } else {
    status = 'critical';
  }

  return { score, status, breakdown };
}
