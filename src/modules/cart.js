import { read, write, remove } from './storage.js';
import { money } from './format.js';

export const cartState = { items: read('cart', []), coupon: read('coupon', null), zone: read('zone', 'cotonou') };

export function saveCart() { write('cart', cartState.items); write('coupon', cartState.coupon); write('zone', cartState.zone); window.dispatchEvent(new CustomEvent('nd:cart')); }
export function clearCart() { cartState.items = []; cartState.coupon = null; remove('cart'); remove('coupon'); saveCart(); }
export function countCart() { return cartState.items.reduce((sum, item) => sum + item.qty, 0); }
export function addToCart(product, quantity = 1) {
  const existing = cartState.items.find((item) => item.id === product.id);
  if (existing) existing.qty = Math.min(product.stock, existing.qty + quantity);
  else cartState.items.push({ id: product.id, qty: Math.min(product.stock, quantity) });
  saveCart();
}
export function updateQty(product, quantity) {
  const item = cartState.items.find((entry) => entry.id === product.id);
  if (!item) return;
  item.qty = Math.max(0, Math.min(product.stock, Number(quantity) || 0));
  if (!item.qty) cartState.items = cartState.items.filter((entry) => entry.id !== product.id);
  saveCart();
}
export function removeItem(id) { cartState.items = cartState.items.filter((item) => item.id !== id); saveCart(); }
export function hydrateItems(products) { return cartState.items.map((item) => ({ ...item, product: products.find((p) => p.id === item.id) })).filter((item) => item.product); }
export function subtotal(products) { return hydrateItems(products).reduce((sum, item) => sum + item.product.price * item.qty, 0); }
export function discountAmount(products) {
  const sub = subtotal(products); const coupon = cartState.coupon;
  if (!coupon || sub < coupon.minSubtotal) return 0;
  return coupon.type === 'percent' ? Math.round(sub * coupon.value / 100) : Math.min(coupon.value, sub);
}
export function shippingCost(products, zones, threshold) {
  return subtotal(products) - discountAmount(products) >= threshold ? 0 : (zones.find((z) => z.id === cartState.zone)?.fee || 3500);
}
export function totals(products, zones, threshold) {
  const sub = subtotal(products); const discount = discountAmount(products); const shipping = shippingCost(products, zones, threshold);
  return { sub, discount, shipping, total: Math.max(0, sub - discount + shipping), freeShipping: sub - discount >= threshold, remaining: Math.max(0, threshold - (sub - discount)), formatted: { sub: money(sub), discount: money(discount), shipping: shipping ? money(shipping) : 'Gratuite', total: money(Math.max(0, sub - discount + shipping)) } };
}
export function applyCoupon(coupon) { cartState.coupon = coupon; saveCart(); }
export function setZone(zone) { cartState.zone = zone; saveCart(); }
