import { escapeHTML } from './format.js';

export function toast(message, tone = 'dark') {
  const region = document.querySelector('#toast-region');
  if (!region) return;
  const colors = { dark: 'bg-ink text-white', success: 'bg-success text-white', danger: 'bg-promo text-white', accent: 'bg-accent text-ink' };
  const node = document.createElement('div');
  node.className = `toast ${colors[tone] || colors.dark} rounded-2xl px-4 py-3 text-sm font-bold shadow-dark flex items-center gap-3`;
  node.innerHTML = `<span class="grid h-8 w-8 place-items-center rounded-xl bg-white/15"><i data-lucide="${tone === 'danger' ? 'triangle-alert' : tone === 'success' ? 'check' : 'sparkles'}" class="h-4 w-4"></i></span><span>${escapeHTML(message)}</span>`;
  region.appendChild(node);
  window.lucide?.createIcons();
  window.setTimeout(() => node.classList.add('out'), 2800);
  window.setTimeout(() => node.remove(), 3150);
}
