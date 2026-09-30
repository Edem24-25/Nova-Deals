import config from './data/config.json';
import categories from './data/categories.json';
import products from './data/products.json';
import reviews from './data/reviews.json';
import coupons from './data/coupons.json';
import zones from './data/zones.json';
import { read, write } from './modules/storage.js';
import { normalize, escapeHTML } from './modules/format.js';
import { cartState, addToCart, updateQty, removeItem, clearCart, applyCoupon, setZone, totals } from './modules/cart.js';
import { checkoutState, saveCheckout, validateStep, orderNumber } from './modules/checkout.js';
import { route, navigate, onRoute, linkHandler, match } from './modules/router.js';
import { toast } from './modules/toast.js';
import { refreshIcons } from './modules/icons.js';
import { initAnalytics, track } from './modules/analytics.js';
import { startCountdown } from './modules/countdown.js';
import { header, footer } from './components/ui.js';
import { homePage } from './pages/home.js';
import { catalogPage } from './pages/catalog.js';
import { promotionsPage } from './pages/promotions.js';
import { productPage } from './pages/product.js';
import { cartPage, wishlistPage, checkoutPage, confirmationPage } from './pages/commerce.js';
import { staticPage, notFoundPage } from './pages/static.js';

const app = document.querySelector('#app');
const wishlist = read('wishlist', []);
const ui = { detailQty: 1, couponMessage: '', cleanupCountdowns: [] };
const staticRoutes = ['contact','faq','livraison-retours','cgv','confidentialite'];
let searchDebounceTimer;
let checkoutSubmitting = false;

initAnalytics(config);

function searchProducts(query) {
  const q = normalize(query);
  if (!q) return products;
  return products.filter((p) => normalize([p.name,p.brand,p.category,p.description,...p.tags].join(' ')).includes(q));
}

function catalogState(currentRoute, forcePromo = false) {
  const q = currentRoute.query.get('q') || '';
  const categoriesParam = currentRoute.query.get('categories') || '';
  const brandsParam = currentRoute.query.get('brands') || '';
  const state = { q, categories: categoriesParam ? categoriesParam.split(',').filter(Boolean) : [], brands: brandsParam ? brandsParam.split(',').filter(Boolean) : [], minPrice: Number(currentRoute.query.get('min') || 0), maxPrice: Number(currentRoute.query.get('max') || 500000), minRating: Number(currentRoute.query.get('rating') || 0), promo: forcePromo || currentRoute.query.get('promo') === '1', available: currentRoute.query.get('available') !== '0', sort: currentRoute.query.get('sort') || 'relevance', limit: Number(currentRoute.query.get('limit') || 24), categorySlug: null, promoOnly: forcePromo };
  return state;
}

function filteredProducts(state) {
  let list = searchProducts(state.q).filter((p) => p.price >= state.minPrice && p.price <= state.maxPrice);
  if (state.categories.length) list = list.filter((p) => state.categories.includes(p.category));
  if (state.brands.length) list = list.filter((p) => state.brands.includes(p.brand));
  if (state.minRating) list = list.filter((p) => p.rating >= state.minRating);
  if (state.available) list = list.filter((p) => p.stock > 0);
  if (state.promo) list = list.filter((p) => p.discount > 0);
  if (state.categorySlug) list = list.filter((p) => p.category === state.categorySlug);
  const sorted = [...list];
  if (state.sort === 'price-asc') sorted.sort((a,b)=>a.price-b.price);
  if (state.sort === 'price-desc') sorted.sort((a,b)=>b.price-a.price);
  if (state.sort === 'popular') sorted.sort((a,b)=>b.popularity-a.popularity);
  if (state.sort === 'new') sorted.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if (state.sort === 'discount') sorted.sort((a,b)=>b.discount-a.discount);
  if (state.q && state.sort === 'relevance') sorted.sort((a,b)=>b.popularity-a.popularity);
  state.filtered = sorted; return state;
}

function buildCatalogUrl(state) {
  const params = new URLSearchParams(); if (state.q) params.set('q', state.q); if (state.categories.length) params.set('categories', state.categories.join(',')); if (state.brands.length) params.set('brands', state.brands.join(',')); if (state.minPrice) params.set('min', state.minPrice); if (state.maxPrice < 500000) params.set('max', state.maxPrice); if (state.minRating) params.set('rating', state.minRating); if (state.promo) params.set('promo', '1'); if (!state.available) params.set('available', '0'); if (state.sort !== 'relevance') params.set('sort', state.sort); if (state.limit > 24) params.set('limit', state.limit); return `${state.promoOnly ? '/promotions' : '/boutique'}${params.toString() ? `?${params}` : ''}`;
}

function meta(title, description, product) {
  document.title = `${title} · ${config.name}`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  const origin = config.publicOrigin?.trim();
  let canonical = document.querySelector('link[data-nd-canonical]');
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (origin) {
    const url = `${origin}${window.location.pathname}`;
    if (!canonical) { canonical = document.createElement('link'); canonical.dataset.ndCanonical = 'true'; canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = url;
    if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property','og:url'); document.head.appendChild(ogUrl); }
    ogUrl.content = url;
  } else { canonical?.remove(); ogUrl?.remove(); }
  let jsonld = document.querySelector('#nd-jsonld'); if (jsonld) jsonld.remove();
  const productData = product ? { '@type':'Product', name:product.name, description:product.description, image:product.images, brand:{ '@type':'Brand', name:product.brand }, offers:{ '@type':'Offer', priceCurrency:'XOF', price:product.price, availability:product.stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' }, aggregateRating:{ '@type':'AggregateRating', ratingValue:product.rating, reviewCount:product.reviewCount } } : null;
  const data = product ? { '@context':'https://schema.org', '@graph':[productData, { '@type':'BreadcrumbList', itemListElement:[{ '@type':'ListItem', position:1, name:'Accueil', item:origin ? `${origin}/` : '/' }, { '@type':'ListItem', position:2, name:product.category, item:origin ? `${origin}/categorie/${product.category}` : `/categorie/${product.category}` }, { '@type':'ListItem', position:3, name:product.name }] }] } : { '@context':'https://schema.org', '@type':'Organization', name:config.name, url:origin || window.location.origin, logo:`${origin || window.location.origin}${config.logo}`, contactPoint:{ '@type':'ContactPoint', telephone:config.contact.phone, contactType:'customer service' } };
  jsonld = document.createElement('script'); jsonld.id='nd-jsonld'; jsonld.type='application/ld+json'; jsonld.textContent=JSON.stringify(data); document.head.appendChild(jsonld);
}

function updateHeaderCounts() { const cartCount = document.querySelector('[data-count="cart"]'); const wishCount = document.querySelector('[data-count="wishlist"]'); const count = cartState.items.reduce((sum,item)=>sum+item.qty,0); if (cartCount) { cartCount.textContent=count; cartCount.classList.toggle('hidden', !count); } if (wishCount) { wishCount.textContent=wishlist.length; wishCount.classList.toggle('hidden', !wishlist.length); } }

function renderCartDrawer() { const items = cartState.items.map((item)=>({ ...item, product:products.find((p)=>p.id===item.id) })).filter((item)=>item.product); const t=totals(products,zones,config.freeShippingThreshold); const root=document.querySelector('#drawer-root'); root.innerHTML=`<div class="drawer-backdrop" data-action="close-cart"></div><aside class="drawer open p-5" role="dialog" aria-modal="true" aria-label="Votre panier"><div class="flex items-center justify-between"><div><p class="text-xs font-bold uppercase tracking-wide text-black/45">NOVA DEALS</p><h2 class="font-display text-2xl font-extrabold">Votre panier</h2></div><button data-action="close-cart" class="rounded-xl p-2 hover:bg-mist" aria-label="Fermer le panier">${'<i data-lucide="x" class="h-5 w-5"></i>'}</button></div><div class="mt-6 divide-y divide-black/10">${items.length?items.map(({product,qty})=>`<div class="flex gap-3 py-4"><img src="${product.images[0]}" alt="" width="72" height="72" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholders/product-fallback.svg'" class="h-16 w-16 rounded-xl bg-[#f0f0f3] object-cover"/><div class="min-w-0 flex-1"><p class="line-clamp-2 text-sm font-extrabold">${escapeHTML(product.name)}</p><p class="mt-1 text-sm font-bold">${qty} × ${new Intl.NumberFormat('fr-FR').format(product.price)} FCFA</p><button data-action="remove-cart" data-id="${product.id}" class="mt-2 text-xs font-bold text-promo">Supprimer</button></div></div>`).join(''):`<div class="py-16 text-center"><i data-lucide="shopping-bag" class="mx-auto h-8 w-8 text-black/30"></i><p class="mt-4 text-sm font-extrabold">Votre panier est vide.</p><a href="/boutique" data-action="close-cart" class="mt-4 inline-flex rounded-xl bg-ink px-4 py-3 text-sm font-extrabold text-white">Voir les offres</a></div>`}</div>${items.length?`<div class="mt-auto border-t border-black/10 pt-5"><div class="flex justify-between text-sm"><span class="text-black/55">Total estimé</span><b class="price">${t.formatted.total}</b></div><a href="/panier" data-action="close-cart" class="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-black/10 px-4 py-3 text-sm font-extrabold">Voir le panier</a><a href="/commande" data-action="close-cart" class="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-promo px-4 py-3 text-sm font-extrabold text-white">Passer commande</a></div>`:''}</aside>`; refreshIcons(); }

function render() {
  const current = route(); ui.couponMessage = ui.couponMessage || ''; ui.cleanupCountdowns.forEach((fn)=>{try{fn()}catch{}}); ui.cleanupCountdowns = [];
  let body = ''; let title = config.name; let desc = 'Les meilleures offres tech, maison et lifestyle livrées partout au Bénin.'; let productForSeo;
  const categoryMatch = match(current.path, '/categorie/:slug'); const productMatch = match(current.path, '/produit/:slug'); const confirmationMatch = match(current.path, '/confirmation/:id');
  if (current.path === '/') { body=homePage({config,categories,products,reviews,wishlist}); title='Les prix chutent. Pas vos envies.'; }
  else if (current.path === '/boutique') { const state=filteredProducts(catalogState(current)); body=catalogPage({config,categories,products,wishlist,state}); title='La boutique'; }
  else if (current.path === '/promotions') { const state=filteredProducts(catalogState(current,true)); body=promotionsPage({config,categories,products,wishlist,state}); title='Promotions'; }
  else if (categoryMatch) { const category=categories.find((c)=>c.slug===categoryMatch.slug); if (!category) body=notFoundPage({products}); else { const state=filteredProducts(catalogState(current)); state.categorySlug=category.slug; state.filtered=filteredProducts(state).filtered; body=catalogPage({config,categories,products,wishlist,state,title:category.name,description:category.description}); title=category.name; } }
  else if (productMatch) { const product=products.find((p)=>p.slug===productMatch.slug); if (!product) body=notFoundPage({products}); else { body=productPage({config,product,products,reviews,wishlist,zones}); productForSeo=product; title=product.name; desc=product.description; track('view_product',{id:product.id,name:product.name}); } }
  else if (current.path === '/panier') body=cartPage({config,products,zones,wishlist,couponMessage:ui.couponMessage});
  else if (current.path === '/favoris') body=wishlistPage({config,products,wishlist});
  else if (current.path === '/commande') { body=checkoutPage({config,products,zones,state:checkoutState}); title='Finaliser la commande'; track('begin_checkout'); }
  else if (confirmationMatch) { const orders=read('orders',[]); const order=orders.find((o)=>o.id===confirmationMatch.id); body=order?confirmationPage({config,order}):notFoundPage({products}); title=order?'Commande confirmée':'Commande introuvable'; }
  else if (current.path === '/404') { body=notFoundPage({products}); title='Page introuvable'; }
  else if (staticRoutes.includes(current.path.slice(1))) { const type=current.path.slice(1); body=staticPage({type,config}); title=type==='faq'?'FAQ':type.replaceAll('-',' '); }
  else body=notFoundPage({products});
  app.innerHTML = `${header(config,wishlist.length)}${body}${footer(config)}`;
  meta(title,desc,productForSeo); refreshIcons(); updateHeaderCounts();
  const countdownNodes=document.querySelectorAll('[data-countdown]'); countdownNodes.forEach((node)=>{ui.cleanupCountdowns.push(startCountdown(node,config.cyberMondayEndsAt));});
  showCookieBanner();
}

function showCookieBanner() { if (read('cookies', false) || document.querySelector('.cookie-banner')) return; const root=document.querySelector('#cookie-root'); root.innerHTML=`<div class="cookie-banner"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-sm font-extrabold">Votre confort avant tout</p><p class="mt-1 max-w-xl text-xs leading-5 text-white/60">Ce site utilise le stockage local pour votre panier. Les analytics sont désactivées par défaut.</p></div><div class="flex gap-2"><button data-action="cookies-refuse" class="rounded-xl border border-white/15 px-4 py-2 text-xs font-extrabold">Refuser</button><button data-action="cookies-accept" class="rounded-xl bg-accent px-4 py-2 text-xs font-extrabold text-ink">J’accepte</button></div></div></div>`; }

function rememberSearch(value) {
  const query = value.trim(); if (!query) return;
  const recent = [query, ...read('recent-searches', []).filter((item) => normalize(item) !== normalize(query))].slice(0, 5);
  write('recent-searches', recent);
}

function showSearchSuggestions(input) {
  const box=document.querySelector('#search-suggestions'); if (!box) return;
  const value=input.value.trim(); const recent=read('recent-searches', []);
  if (!value && recent.length) { box.innerHTML=`<p class="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-wider text-black/40">Recherches récentes</p>${recent.map((item)=>`<a href="/boutique?q=${encodeURIComponent(item)}" class="block rounded-xl px-3 py-2 text-sm font-bold hover:bg-mist">${escapeHTML(item)}</a>`).join('')}`; box.classList.remove('hidden'); return; }
  if (value.length<2) { box.classList.add('hidden'); return; }
  const found=searchProducts(value).slice(0,5); box.innerHTML=found.length?found.map((p)=>`<a href="/produit/${p.slug}" class="flex items-center gap-3 rounded-xl p-2 hover:bg-mist"><img src="${p.images[0]}" alt="" width="40" height="40" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholders/product-fallback.svg'" class="h-10 w-10 rounded-lg bg-[#f0f0f3] object-cover"/><span class="min-w-0"><b class="block truncate text-sm">${escapeHTML(p.name)}</b><small class="text-xs text-black/45">${new Intl.NumberFormat('fr-FR').format(p.price)} FCFA</small></span></a>`).join(''):`<p class="p-3 text-sm text-black/50">Aucun produit trouvé.</p>`; box.classList.remove('hidden'); refreshIcons();
}

function collectCheckout(form) { for (const [key,value] of new FormData(form).entries()) { if (key in checkoutState) checkoutState[key]=String(value); } const zone=zones.find((entry)=>entry.name===checkoutState.city); setZone(zone?.id || 'other'); saveCheckout(); }
function showErrors(errors) { Object.entries(errors).forEach(([key,message])=>{ const field=document.querySelector(`[name="${key}"]`); const error=document.querySelector(`[data-error="${key}"]`); field?.classList.add('field-invalid'); if(error){error.textContent=message;error.classList.remove('hidden');} }); const first=document.querySelector('.field-invalid'); first?.focus(); }

function handleAction(action, target) {
  const id=target.dataset.id; const product=products.find((p)=>p.id===id);
  if (action==='toggle-mobile-nav') document.querySelector('#mobile-nav')?.classList.toggle('hidden');
  if (action==='open-cart') renderCartDrawer();
  if (action==='close-cart') document.querySelector('#drawer-root').innerHTML='';
  if (action==='add-cart' && product) { addToCart(product); track('add_to_cart',{id}); toast('Ajouté au panier','success'); render(); }
  if (action==='add-cart-detail' && product) { const quantity=ui.detailQty; addToCart(product,quantity); ui.detailQty=1; track('add_to_cart',{id,quantity}); toast('Ajouté au panier','success'); render(); }
  if (action==='toggle-wishlist' && product) { const index=wishlist.indexOf(id); if(index>=0){wishlist.splice(index,1);toast('Retiré des favoris','dark')}else{wishlist.push(id);toast('Ajouté aux favoris','success')} write('wishlist',wishlist); render(); }
  if (action==='quick-view' && product) { const root=document.querySelector('#modal-root'); root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"></div><div class="modal-panel p-5 md:p-7" role="dialog" aria-modal="true" aria-label="Aperçu de ${escapeHTML(product.name)}"><div class="flex items-start justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-wide text-black/45">Aperçu rapide</p><h2 class="mt-1 text-2xl font-extrabold">${escapeHTML(product.name)}</h2></div><button data-action="close-modal" class="rounded-xl p-2" aria-label="Fermer">${'<i data-lucide="x" class="h-5 w-5"></i>'}</button></div><div class="mt-5 grid gap-5 sm:grid-cols-2"><img src="${product.images[0]}" alt="${escapeHTML(product.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/assets/placeholders/product-fallback.svg'" class="aspect-square w-full rounded-2xl bg-[#f0f0f3] object-cover"/><div><p class="text-sm leading-6 text-black/60">${escapeHTML(product.description)}</p><p class="price mt-5 text-3xl">${new Intl.NumberFormat('fr-FR').format(product.price)} FCFA</p><button data-action="add-cart" data-id="${product.id}" class="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-extrabold text-white">${'<i data-lucide="shopping-bag" class="h-4 w-4"></i>'} Ajouter au panier</button><a href="/produit/${product.slug}" data-action="close-modal" class="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-black/10 px-4 py-3 text-sm font-extrabold">Voir la fiche complète</a></div></div></div>`; refreshIcons(); }
  if (action==='close-modal') document.querySelector('#modal-root').innerHTML='';
  if (action==='clear-cart') { clearCart(); toast('Panier vidé','dark'); render(); }
  if (action==='remove-cart' && id) { removeItem(id); toast('Produit retiré','dark'); document.querySelector('#drawer-root').innerHTML ? renderCartDrawer() : render(); render(); }
  if (action==='cart-qty' && product) { const item=cartState.items.find((x)=>x.id===id); updateQty(product,(item?.qty||1)+Number(target.dataset.delta)); render(); }
  if (action==='product-qty') { ui.detailQty=Math.max(1,Math.min(product?.stock||99,ui.detailQty+Number(target.dataset.delta))); const out=document.querySelector('[data-product-qty]'); if(out) out.textContent=ui.detailQty; }
  if (action==='load-more') { const current=route(); const state=filteredProducts(catalogState(current,current.path==='/promotions')); state.limit+=24; navigate(buildCatalogUrl(state)); }
  if (action==='reset-filters') navigate(route().path === '/promotions' ? '/promotions' : '/boutique');
  if (action==='open-filters') document.querySelector('#filter-drawer')?.classList.remove('hidden');
  if (action==='close-filters') document.querySelector('#filter-drawer')?.classList.add('hidden');
  if (action==='price-preset') { const current=route(); const state=catalogState(current,current.path==='/promotions'); state.minPrice=Number(target.dataset.min);state.maxPrice=Number(target.dataset.max); navigate(buildCatalogUrl(state)); }
  if (action==='rating-filter') { const current=route(); const state=catalogState(current,current.path==='/promotions'); state.minRating=Number(target.dataset.rating); navigate(buildCatalogUrl(state)); }
  if (action==='checkout-prev') { checkoutState.step=Math.max(1,checkoutState.step-1); saveCheckout(); render(); }
  if (action==='change-image') { const img=document.querySelector('#product-main-image'); if(img) img.src=target.dataset.src; document.querySelectorAll('[data-action="change-image"]').forEach((b)=>b.classList.remove('border-ink'));target.classList.add('border-ink'); }
  if (action==='open-lightbox' && product) { const root=document.querySelector('#modal-root'); root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"></div><div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="${escapeHTML(product.name)}"><img src="${product.images[0]}" alt="${escapeHTML(product.name)}" class="lightbox-img" onerror="this.onerror=null;this.src='/assets/placeholders/product-fallback.svg'"/><div class="lightbox-bar"><span class="line-clamp-2 text-sm font-extrabold">${escapeHTML(product.name)}</span><button data-action="close-modal" class="lightbox-close" aria-label="Fermer l’aperçu">${'<i data-lucide="x" class="h-5 w-5"></i>'}</button></div></div>`; refreshIcons(); }
  if (action==='toggle-faq') target.closest('.faq-item')?.classList.toggle('open');
  if (action==='cookies-accept' || action==='cookies-refuse') { write('cookies',true);document.querySelector('#cookie-root').innerHTML='';toast(action==='cookies-accept'?'Préférences enregistrées':'D’accord, aucun analytics activé','dark'); }
}

document.addEventListener('click', (event) => { linkHandler(event); const target=event.target.closest('[data-action]'); if(target){ event.preventDefault(); handleAction(target.dataset.action,target); } const tab=event.target.closest('[data-tab]'); if(tab){document.querySelectorAll('[data-tab-panel]').forEach((panel)=>panel.classList.toggle('hidden',panel.dataset.tabPanel!==tab.dataset.tab));document.querySelectorAll('[data-tab]').forEach((button)=>button.classList.toggle('bg-ink',button===tab));document.querySelectorAll('[data-tab]').forEach((button)=>button.classList.toggle('text-white',button===tab));} });
document.addEventListener('input',(event)=>{if(event.target.matches('[data-filter="max-price"]')){const label=document.querySelector('[data-max-label]');if(label)label.textContent=`${new Intl.NumberFormat('fr-FR').format(event.target.value)} FCFA`;} if(event.target.matches('[data-form="search"] input')){clearTimeout(searchDebounceTimer);searchDebounceTimer=setTimeout(()=>showSearchSuggestions(event.target),150);}});
document.addEventListener('change',(event)=>{ const el=event.target; if(el.matches('[data-filter="sort"], [data-filter="promo"], [data-filter="available"], [data-filter="max-price"], input[name="category"], input[name="brand"]')){ const current=route(); const state=catalogState(current,current.path==='/promotions'); state.sort=document.querySelector('[data-filter="sort"]')?.value||state.sort; state.maxPrice=Number(document.querySelector('[data-filter="max-price"]')?.value||state.maxPrice); state.promo=Boolean(document.querySelector('[data-filter="promo"]')?.checked)||state.promoOnly; state.available=document.querySelector('[data-filter="available"]')?.checked ?? state.available; state.categories=[...document.querySelectorAll('input[name="category"]:checked')].map((input)=>input.value); state.brands=[...document.querySelectorAll('input[name="brand"]:checked')].map((input)=>input.value); navigate(buildCatalogUrl(state)); } });
document.addEventListener('submit',(event)=>{
  const form=event.target;
  if(form.matches('[data-form="search"]')){event.preventDefault();const query=new FormData(form).get('q')?.toString().trim();if(query){rememberSearch(query);navigate(`/boutique?q=${encodeURIComponent(query)}`);}return;}
  if(form.matches('[data-form="newsletter"]')){event.preventDefault();const welcome=coupons.find((c)=>c.code==='BIENVENUE');const panel=document.createElement('div');panel.className='w-full max-w-md rounded-2xl bg-white p-4 shadow-soft';panel.innerHTML=`<p class="text-sm font-extrabold text-ink">C’est noté ! Voici vos −5 000 FCFA.</p><p class="mt-1 text-xs leading-5 text-black/55">Valable dès ${new Intl.NumberFormat('fr-FR').format(welcome?.minSubtotal || 25000)} FCFA d’achat avec le code :</p><div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"><code class="flex-1 rounded-xl border border-dashed border-promo bg-red-50 px-4 py-3 text-center text-sm font-extrabold tracking-widest text-promo">BIENVENUE</code><a href="/boutique" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-ink px-5 py-3 text-sm font-extrabold text-white hover:bg-promo">J’en profite</a></div>`;form.replaceWith(panel);track('newsletter_signup');toast('Code BIENVENUE débloqué : −5 000 FCFA','success');}
  if(form.matches('[data-form="contact"]')){event.preventDefault();toast('Message envoyé. Nous revenons vers vous rapidement.','success');form.reset();}
  if(form.matches('[data-form="coupon"]')){event.preventDefault();const code=new FormData(form).get('code')?.toString().trim().toUpperCase();const coupon=coupons.find((c)=>c.code===code);const currentSubtotal=totals(products,zones,config.freeShippingThreshold).sub;if(!coupon)ui.couponMessage='Code promo invalide.';else if(currentSubtotal<coupon.minSubtotal)ui.couponMessage=`Code valide dès ${new Intl.NumberFormat('fr-FR').format(coupon.minSubtotal)} FCFA.`;else{applyCoupon(coupon);ui.couponMessage=`Code ${coupon.code} appliqué : ${coupon.label}.`;toast('Code promo appliqué','success');}render();}
  if(form.matches('[data-form="checkout"]')){event.preventDefault();if(checkoutSubmitting)return;collectCheckout(form);const step=Number(form.dataset.step);const errors=validateStep(step);form.querySelectorAll('.field-invalid').forEach((field)=>field.classList.remove('field-invalid'));form.querySelectorAll('[data-error]').forEach((node)=>node.classList.add('hidden'));if(Object.keys(errors).length){showErrors(errors);return;}if(step<4){checkoutState.step=step+1;saveCheckout();render();}else{checkoutSubmitting=true;const t=totals(products,zones,config.freeShippingThreshold);const order={id:orderNumber(),createdAt:new Date().toISOString(),customer:{firstName:checkoutState.firstName,lastName:checkoutState.lastName,phone:checkoutState.phone,email:checkoutState.email,address:checkoutState.address,city:checkoutState.city},payment:checkoutState.payment,paymentLabel:checkoutState.payment==='cod'?'À la livraison':checkoutState.payment==='card'?'Carte bancaire':checkoutState.payment==='moov'?'Moov Money':'MTN MoMo',total:t.total,items:cartState.items};const orders=read('orders',[]);orders.push(order);write('orders',orders);track('purchase',{id:order.id,value:order.total});clearCart();write('checkout',{...checkoutState,step:1});navigate(`/confirmation/${order.id}`);checkoutSubmitting=false;}}
});
window.addEventListener('popstate',render); onRoute(render); window.addEventListener('nd:cart',updateHeaderCounts);
// Filet de sécurité global : toute image cassée bascule sur le placeholder local.
document.addEventListener('error', (event) => {
  const el = event.target;
  if (el instanceof HTMLImageElement && !el.dataset.fbk) {
    el.dataset.fbk = '1';
    el.src = '/assets/placeholders/product-fallback.svg';
  }
}, true);
render();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
