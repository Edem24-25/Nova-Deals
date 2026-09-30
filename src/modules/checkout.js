import { read, write } from './storage.js';
export const checkoutState = { ...{ firstName:'', lastName:'', phone:'', email:'', address:'', city:'Cotonou', payment:'momo', step:1 }, ...read('checkout', {}) };
export function saveCheckout() { write('checkout', checkoutState); }
export function validateStep(step) {
  const errors = {};
  if (step === 1) {
    if (!checkoutState.firstName.trim()) errors.firstName = 'Votre prénom est requis.';
    if (!checkoutState.lastName.trim()) errors.lastName = 'Votre nom est requis.';
    if (!/^\+229\d{8}$/.test(checkoutState.phone.replace(/[\s-]/g, ''))) errors.phone = 'Utilisez un numéro Bénin au format +229 97 00 11 22.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutState.email)) errors.email = 'Entrez une adresse email valide.';
    if (!checkoutState.address.trim()) errors.address = 'Votre adresse est requise.';
  }
  if (step === 2 && !checkoutState.city) errors.city = 'Choisissez une ville de livraison.';
  if (step === 3 && !['momo','moov','card','cod'].includes(checkoutState.payment)) errors.payment = 'Choisissez un mode de paiement.';
  return errors;
}
export function orderNumber() { return `ND-2026-${String(Math.floor(Math.random() * 90000) + 10000)}`; }
