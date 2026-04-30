import { supabase } from '@/lib/supabase';

export const TELEMETRY_EVENT_NAME = 'checkout_telemetry_v1' as const;

export type EngineType = 'MODULAR' | 'LEGACY';
export type PlatformType = 'web' | 'ios' | 'android';
export type EnvironmentType = 'prod' | 'staging';

export type TelemetryLifecycleEvent =
  | 'session_start'
  | 'nlu_inference_completed'
  | 'execution_completed'
  | 'upsell_presented'
  | 'upsell_accepted'
  | 'checkout_completed'
  | 'handoff_triggered'
  | 'session_end';

export interface TelemetryBase {
  timestamp?: string;
  session_id: string;
  user_id?: string | null;
  order_id?: string | null;
  engine_type: EngineType;
  locale: string;
  platform: PlatformType;
  environment: EnvironmentType;
}

export interface TelemetryEventPayload extends TelemetryBase {
  event_name?: typeof TELEMETRY_EVENT_NAME;
  lifecycle_event: TelemetryLifecycleEvent;
  fields?: Record<string, unknown>;
}

export async function emitTelemetryEvent(event: TelemetryEventPayload): Promise<void> {
  const payload = {
    event_name: TELEMETRY_EVENT_NAME,
    timestamp: event.timestamp ?? new Date().toISOString(),
    session_id: event.session_id,
    user_id: event.user_id ?? null,
    order_id: event.order_id ?? null,
    engine_type: event.engine_type,
    locale: event.locale,
    platform: event.platform,
    environment: event.environment,
    lifecycle_event: event.lifecycle_event,
    fields: event.fields ?? {}
  };

  const { error } = await supabase.from('event_logs').insert({
    tenant_id: 'main',
    event_type: TELEMETRY_EVENT_NAME,
    actor: 'system',
    channel: event.platform,
    order_id: event.order_id ?? undefined,
    session_id: event.session_id,
    payload_json: payload
  });

  if (error) {
    console.error('TelemetryEmitter: failed to log telemetry event:', error.message);
  }
}
