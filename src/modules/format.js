export const money = (value) => `${new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(Number(value) || 0)))} FCFA`;
export const compactMoney = (value) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
export const normalize = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const stars = (rating = 0) => Array.from({ length: 5 }, (_, i) => i < Math.round(rating) ? '★' : '☆').join('');
export const percentOff = (price, oldPrice) => oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
export const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
export const dateLabel = (date) => new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'long', year:'numeric' }).format(new Date(date));
export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
