/**
 * Ultra-minimal analytics — no SDKs, no SDK overhead.
 * Fires events to Google Analytics (gtag) if available,
 * and logs to localStorage for fallback reporting.
 */

const EVENT_KEY = 'snacks911_events';

function logLocal(event: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    const events = JSON.parse(localStorage.getItem(EVENT_KEY) || '[]');
    events.push({ event, params, ts: Date.now() });
    // Keep last 200 only
    if (events.length > 200) events.splice(0, events.length - 200);
    localStorage.setItem(EVENT_KEY, JSON.stringify(events));
  } catch {}
}

export function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  // gtag / GA4
  if ((window as any).gtag) {
    (window as any).gtag('event', event, params);
  }
  // Universal fallback
  if ((window as any).dataLayer) {
    (window as any).dataLayer.push({ event, ...params });
  }
  logLocal(event, params || {});
}
