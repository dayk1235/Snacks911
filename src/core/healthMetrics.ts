import { getSupabaseAdmin } from '@/lib/db.server';

/**
 * core/healthMetrics.ts
 * Aggregates system, business, and AI performance metrics.
 */

export interface SystemHealth {
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  system: {
    mode: "NORMAL" | "SAFE_MODE" | "EMERGENCY_MODE";
    lastRecovery: number;
  };
  errors: {
    lastMinute: number;
    last5Minutes: number;
  };
  business: {
    ordersToday: number;
    revenueToday: number;
    avgTicket: number;
  };
  ai: {
    totalMessages: number;
    totalCost: number;
    avgCostPerMessage: number;
  };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const lastMin = new Date(now.getTime() - 60000).toISOString();
  const last5Min = new Date(now.getTime() - 300000).toISOString();

  try {
    // 1. System State (from persistent table)
    const { data: stateData } = await supabase
      .from('system_state')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    // 2. Error Counts (from AI logs where error was captured)
    const { count: err1m } = await supabase
      .from('ai_logs')
      .select('id', { count: 'exact', head: true })
      .not('error', 'is', null)
      .gte('created_at', lastMin);

    const { count: err5m } = await supabase
      .from('ai_logs')
      .select('id', { count: 'exact', head: true })
      .not('error', 'is', null)
      .gte('created_at', last5Min);

    // 3. Business Metrics (Today's performance)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('total')
      .gte('created_at', todayStart);

    const ordersToday = ordersData?.length || 0;
    const revenueToday = (ordersData ?? []).reduce(
      (sum: number, o: any) => sum + (Number(o.total) || 0),
      0
    );
    const avgTicket = ordersToday > 0 ? revenueToday / ordersToday : 0;

    // 4. AI Performance (Cumulative usage)
    const { data: costData } = await supabase
      .from('ai_costs')
      .select('cost');

    const totalMessages = costData?.length || 0;
    const totalCost = (costData ?? []).reduce(
      (sum: number, c: any) => sum + (Number(c.cost) || 0),
      0
    );
    const avgCostPerMessage = totalMessages > 0 ? totalCost / totalMessages : 0;

    // 5. Status Classification Logic
    const mode = stateData?.mode || 'NORMAL';
    const errors1m = err1m || 0;
    const errors5m = err5m || 0;

    let status: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY";
    
    if (mode === "EMERGENCY_MODE" || errors1m >= 5) {
      status = "CRITICAL";
    } else if (mode === "SAFE_MODE" || errors5m >= 10) {
      status = "WARNING";
    }

    const health: SystemHealth = {
      status,
      system: {
        mode,
        lastRecovery: stateData?.updated_at ? new Date(stateData.updated_at).getTime() : 0
      },
      errors: {
        lastMinute: errors1m,
        last5Minutes: errors5m
      },
      business: {
        ordersToday,
        revenueToday: Number(revenueToday.toFixed(2)),
        avgTicket: Number(avgTicket.toFixed(2))
      },
      ai: {
        totalMessages,
        totalCost: Number(totalCost.toFixed(4)),
        avgCostPerMessage: Number(avgCostPerMessage.toFixed(6))
      }
    };

    console.log(`[HEALTH] status=${status} mode=${mode} orders=${ordersToday} revenue=${revenueToday.toFixed(2)} cost=${totalCost.toFixed(4)}`);
    
    return health;

  } catch (err) {
    console.error("[HEALTH] Critical metrics failure:", err);
    // Fallback to safe defaults to prevent crashing the observer
    return {
      status: "CRITICAL",
      system: { mode: "EMERGENCY_MODE", lastRecovery: 0 },
      errors: { lastMinute: 0, last5Minutes: 0 },
      business: { ordersToday: 0, revenueToday: 0, avgTicket: 0 },
      ai: { totalMessages: 0, totalCost: 0, avgCostPerMessage: 0 }
    };
  }
}
