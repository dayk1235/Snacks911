import { getSystemState as dbGetSystemState, updateSystemState as dbUpdateSystemState } from '@/lib/db.server';
import { sendAlert } from '@/lib/alert';

export type SystemMode = 'NORMAL' | 'SAFE_MODE' | 'EMERGENCY_MODE';
export type HealingAction =
  | { type: 'NONE' }
  | { type: 'RETRY'; delayMs: number }
  | { type: 'FALLBACK_PROVIDER' }
  | { type: 'CLEAR_CACHE' }
  | { type: 'STATIC_RESPONSE'; fallbackText: string }
  | { type: 'NOTIFY_ADMIN' };

// In-memory fallback
let localState: any = {
  error_count: 0,
  last_error_at: null,
  mode: 'NORMAL'
};

const RECOVERY_WINDOW_MS = 120_000; // 2 minutes
const SAFE_MODE_THRESHOLD = 3;
const EMERGENCY_THRESHOLD = 8;
/**
 * syncWithDB() — Pull latest state and apply recovery logic
 */
async function syncWithDB() {
  try {
    const dbState = await dbGetSystemState();
    if (dbState) {
      const prevMode = localState.mode;
      localState = {
        error_count: dbState.error_count,
        last_error_at: dbState.last_error_at,
        mode: dbState.mode
      };

      // Recovery: If no errors in RECOVERY_WINDOW_MS, reset to NORMAL
      const now = Date.now();
      const lastError = localState.last_error_at ? new Date(localState.last_error_at).getTime() : 0;
      
      if (localState.mode !== 'NORMAL' && (now - lastError > RECOVERY_WINDOW_MS)) {
        console.log("[HEALTH] System recovered to NORMAL mode");
        localState.mode = 'NORMAL';
        localState.error_count = 0;
        await dbUpdateSystemState({ mode: 'NORMAL', error_count: 0 });
        
        await sendAlert("✅ System recovered to NORMAL");
      } else if (prevMode !== localState.mode && localState.mode !== 'NORMAL') {
        // Mode changed via external update (e.g. another instance)
        await handleModeChangeAlert(prevMode, localState.mode);
      }
    }
  } catch (err) {
    console.error("[HEALTH] DB sync failed, using in-memory fallback");
  }
}

async function handleModeChangeAlert(oldMode: SystemMode, newMode: SystemMode) {
  if (oldMode === newMode) return;
  
  if (newMode === 'EMERGENCY_MODE') {
    await sendAlert(`🚨 EMERGENCY_MODE ACTIVATED\nErrors: ${localState.error_count}\nTime: ${new Date().toLocaleTimeString()}`);
  } else if (newMode === 'SAFE_MODE') {
    await sendAlert(`⚠️ SAFE_MODE activated\nErrors: ${localState.error_count}`);
  } else if (newMode === 'NORMAL' && oldMode !== 'NORMAL') {
    await sendAlert("✅ System recovered to NORMAL");
  }
}

export async function registerErrorEvent(errorType: string, component: string): Promise<void> {
  await syncWithDB();

  const prevMode = localState.mode;
  localState.error_count++;
  localState.last_error_at = new Date().toISOString();

  // Recalculate Mode
  if (localState.error_count >= EMERGENCY_THRESHOLD) {
    localState.mode = 'EMERGENCY_MODE';
  } else if (localState.error_count >= SAFE_MODE_THRESHOLD) {
    localState.mode = 'SAFE_MODE';
  }

  console.log(`[HEALTH] ${localState.mode} | Errors: ${localState.error_count} | Source: ${component}`);

  if (prevMode !== localState.mode) {
    await handleModeChangeAlert(prevMode, localState.mode);
  }

  try {
    await dbUpdateSystemState({
      error_count: localState.error_count,
      last_error_at: localState.last_error_at,
      mode: localState.mode
    });
  } catch (err) {
    console.warn("[HEALTH] Persistent state update failed", err);
  }
}

export async function getSystemMode(): Promise<SystemMode> {
  await syncWithDB();
  return localState.mode;
}

export async function getHealingAction(): Promise<HealingAction> {
  const mode = await getSystemMode();

  if (mode === 'NORMAL') return { type: 'NONE' };

  if (mode === 'EMERGENCY_MODE') {
    return {
      type: 'STATIC_RESPONSE',
      fallbackText:
        '⚡ Tuvimos un detalle técnico, pero seguimos 🔥\n👉 Te recomiendo nuestro Combo Mixto 911 — $249\n¿Te lo preparo?',
    };
  }

  if (mode === 'SAFE_MODE') {
    return { type: 'RETRY', delayMs: 1500 };
  }

  return { type: 'NONE' };
}

export async function resetSystemHealth(): Promise<void> {
  localState = {
    error_count: 0,
    last_error_at: null,
    mode: 'NORMAL'
  };
  try {
    await dbUpdateSystemState(localState);
  } catch {}
}