import { catalogPage } from './catalog.js';
export function promotionsPage(args) { return catalogPage({ ...args, title:'Toutes les promotions', description:'Les prix qui méritent un deuxième regard, avec stock et livraison affichés.', state:{ ...args.state, promoOnly:true } }); }
