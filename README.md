# NOVA DEALS — Cyber Monday 2026

Boutique e-commerce frontend complète en français, pensée pour le Bénin et l’Afrique de l’Ouest. La V1 est autonome : elle utilise HTML5, Tailwind CSS via CDN, JavaScript ES6+ modulaire, JSON local et `localStorage`.

## Démarrer

Prérequis : `Node.js 18+` (vérifier avec `node --version`). Aucun autre outil n'est requis.


```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000` (le serveur écoute aussi sur le réseau local, port `3000`).

> Cela lance `vite --host 0.0.0.0 --port 3000`. Avec npm, ne pas oublier `run` (`npm dev` seul ne fonctionne pas). (Le projet accepte aussi pnpm : `pnpm install` puis `pnpm dev`.)

Le site utilise un fallback SPA : l’hébergement doit rediriger les routes applicatives vers `index.html` tout en laissant les assets et les fichiers système accessibles directement.

## Personnaliser en quelques minutes

La marque, le logo, les coordonnées, WhatsApp, le seuil de livraison et la date du Cyber Monday se trouvent dans `src/data/config.json`. Les couleurs du thème sont dans `tailwind.config` (`index.html`) et `src/styles.css`. Les produits sont dans `src/data/products.json`, les catégories dans `src/data/categories.json`, les avis dans `src/data/reviews.json`, les codes dans `src/data/coupons.json` et les zones dans `src/data/zones.json`.

Pour une nouvelle boutique, remplacez le logo dans `public/assets/brand/`, mettez à jour `config.json`, puis remplacez les URLs d’images de démonstration par les photos du commerçant.

## Parcours inclus

- Accueil avec hero Cyber Monday, compte à rebours, offres flash, catégories, best-sellers, avis et newsletter.
- Boutique, recherche accent-insensitive, suggestions, recherches récentes, filtres multi-critères, tri, pagination « Charger plus » et catégories indexables.
- Fiche produit avec galerie, quantité, favoris, aperçu rapide, WhatsApp, caractéristiques, avis et recommandations.
- Panier persistant, mini-panier, barre de livraison gratuite dès 75 000 FCFA, codes `CYBER10` et `BIENVENUE`.
- Checkout simulé en 4 étapes avec zones Bénin, paiements Mobile Money/carte/à la livraison simulés, validation du téléphone `+229` et brouillon persistant.
- Confirmation `ND-2026-XXXXX`, historique local, bouton WhatsApp, pages FAQ/contact/livraison/CGV/confidentialité et 404.
- Manifest PWA, service worker léger, `robots.txt`, `sitemap.xml`, `manus-routes.json`, JSON-LD et couche analytics désactivée par défaut.

## Limites V1

Aucun backend, compte utilisateur, paiement réel ou stock temps réel n’est branché. Les données panier, favoris, brouillon et commandes restent sur l’appareil du visiteur. Les images sont des photos publiques de démonstration avec fallback local.

## Contrôle rapide

```bash
npm run check
# ou, avec pnpm :
pnpm check
```

Le script `scripts/check-data.mjs` vérifie que les JSON se chargent, qu'il y a au moins 36 produits complets (id, slug, prix, images), exactement 6 catégories, et que chaque route de `public/manus-routes.json` commence par `/`.

## Build de production

```bash
npm run build
# ou, avec pnpm : pnpm build
```

Le site statique est généré dans `dist/` (voir `netlify.toml` pour le fallback SPA : toute route non-fichier est réécrite vers `/index.html`).
