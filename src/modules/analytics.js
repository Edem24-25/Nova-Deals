let settings = { enabled: false };
export function initAnalytics(config) { settings = config?.analytics || settings; }
export function track(event, payload = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: `nd_${event}`, ...payload });
  if (settings.enabled) console.info('[NOVA analytics]', event, payload);
}
