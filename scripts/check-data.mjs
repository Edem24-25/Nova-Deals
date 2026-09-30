import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const products = readJson('src/data/products.json');
const categories = readJson('src/data/categories.json');
const routes = readJson('public/manus-routes.json');
if (!Array.isArray(products) || products.length < 36) throw new Error(`products.json doit contenir au moins 36 produits (trouvé ${products.length})`);
if (!Array.isArray(categories) || categories.length !== 6) throw new Error('categories.json doit contenir 6 catégories');
if (!routes.routes.every((route) => typeof route.path === 'string' && route.path.startsWith('/'))) throw new Error('manus-routes.json contient une route invalide');
for (const product of products) { if (!product.id || !product.slug || !Number.isInteger(product.price) || !product.images?.length) throw new Error(`Produit incomplet: ${product.id || 'inconnu'}`); }
console.log(`OK — ${products.length} produits, ${categories.length} catégories, ${routes.routes.length} routes.`);
