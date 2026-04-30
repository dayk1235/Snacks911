# Telemetry Spec v1

## Event Contract

- `event_name`: `checkout_telemetry_v1`
- `timestamp`: ISO-8601
- `session_id`: string
- `user_id`: string | null
- `order_id`: string | null

### Dimensions

- `engine_type`: enum(`MODULAR`, `LEGACY`)
- `locale`: string
- `platform`: enum(`web`, `ios`, `android`)
- `environment`: enum(`prod`, `staging`)

### Metric Dictionary

- `conversion_velocity` (conversions/hour): `completed_orders / elapsed_hours`
- `aov` (currency): `revenue / completed_orders`
- `upsell_hit_rate` (0..1): `orders_with_upsell / orders_offered_upsell`
- `nlu_accuracy` (0..1): `correct_nlu_predictions / total_nlu_predictions`
- `execution_latency_ms` (ms): `p95(end_to_end_execution_time_ms)`
- `handoff_frequency` (handoffs/session): `total_handoffs / total_sessions`

## Lifecycle

1. `session_start`
2. `nlu_inference_completed`
3. `execution_completed`
4. `upsell_presented`
5. `checkout_completed`
6. `handoff_triggered`
7. `session_end`

### Emission Rules

- `session_start`: emit dimensions (`engine_type`, `locale`, `platform`, `environment`)
- `nlu_inference_completed`:
  - fields: `nlu_predicted_intent` (string), `nlu_ground_truth_intent` (string|null), `nlu_is_correct` (boolean|null), `nlu_latency_ms` (integer)
- `execution_completed`:
  - fields: `execution_time_ms` (integer), `flow_type` (string)
- `upsell_presented`:
  - fields: `upsell_offer_id` (string), `accepted` (boolean)
- `checkout_completed`:
  - fields: `order_id` (string), `order_total` (number), `currency` (string), `included_upsell` (boolean)
- `handoff_triggered`:
  - fields: `handoff_type` enum(`human`,`legacy_fallback`,`other`), `reason_code` (string)
- `session_end`:
  - fields: `session_duration_ms` (integer)

## KPI Definitions

- `conversion_velocity`
  - numerator: `count(checkout_completed)`
  - denominator: `sum(session_duration_ms)/3600000`
  - output: conversions/hour
- `aov`
  - numerator: `sum(order_total where checkout_completed)`
  - denominator: `count(checkout_completed)`
  - output: currency
- `upsell_hit_rate`
  - numerator: `count(upsell_presented where accepted=true)`
  - denominator: `count(upsell_presented)`
  - output: 0..1
- `nlu_accuracy`
  - numerator: `count(nlu_inference_completed where nlu_is_correct=true)`
  - denominator: `count(nlu_inference_completed where nlu_is_correct in [true,false])`
  - output: 0..1
- `execution_latency_ms`
  - source: `execution_time_ms (+ nlu_latency_ms for split analysis)`
  - output: `p50`, `p95`, `p99`
- `handoff_frequency`
  - numerator: `count(handoff_triggered)`
  - denominator: `count(distinct session_id)`
  - output: handoffs/session

## Validation Rules

### Required Fields

- `timestamp`
- `session_id`
- `engine_type`
- `environment`

### Enum Validation

- `engine_type` in (`MODULAR`, `LEGACY`)
- `platform` in (`web`, `ios`, `android`)
- `environment` in (`prod`, `staging`)

### Numeric Bounds

- `order_total >= 0`
- `execution_time_ms >= 0`
- `nlu_latency_ms >= 0`
- `session_duration_ms >= 0`
- ratio metrics within `0..1`

### Deduplication

- key: (`event_name`, `session_id`, `timestamp`, `order_id`)
- strategy: drop duplicates

### Late Events

- watermark: `24h`
- policy: upsert aggregates

### Null Handling

- `nlu_is_correct = null` excluded from NLU accuracy denominator
- `user_id` may be null

## Aggregation Model

- realtime windows: `5m`, `1h`
- batch window: `daily`
- group by: `engine_type`, `locale`, `platform`, `environment`

## Alerts

- `missing_engine_type`: null rate(`engine_type`) > `0.5%`
- `latency_regression`: p95(`execution_time_ms`) day-over-day increase > `20%`
- `handoff_spike`: `handoff_frequency` > `1.3x` trailing 7-day baseline

## Ownership

- product_analytics: spec and KPI acceptance
- backend: emitter instrumentation and schema versioning
- data_engineering: pipelines, aggregates, backfill jobs
- ml_nlu: ground-truth labeling and NLU accuracy validation
- sre: telemetry SLO/alert operations

## Rollout Plan

1. shadow mode (`7 days`): staging + `10%` prod, validate schema and loss rates
2. dual run (`14 days`): `100%` prod, compare `MODULAR` vs `LEGACY`
3. enforce: block breaking changes without version bump, enable full alerts

## Success Criteria

- coverage: start+end lifecycle events on `>=99%` sessions
- tagging: `engine_type` present on `>=99.9%` events
- quality: schema valid rate `>=99.5%`, duplicate rate `<=0.5%`
- reliability: KPI recompute drift `<=1%`, 14-day parity within `+/-2%`

## Definition Of Done

- spec merged and approved
- backfill + parity checks passed
- dashboard and alerts live
