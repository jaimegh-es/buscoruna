import type { Catalog } from '../types';

const CATALOG_KEY = 'buscoruna_catalog';

export const storage = {
  getCatalog: (): Catalog | null => {
    const data = localStorage.getItem(CATALOG_KEY);
    return data ? JSON.parse(data) : null;
  },
  setCatalog: (catalog: Catalog) => {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  },
  getFavorites: (): number[] => {
    const data = localStorage.getItem('favorites');
    return data ? JSON.parse(data) : [];
  },
  toggleFavorite: (stopId: number) => {
    const favs = storage.getFavorites();
    const index = favs.indexOf(stopId);
    if (index > -1) {
      favs.splice(index, 1);
    } else {
      favs.push(stopId);
    }
    localStorage.setItem('favorites', JSON.stringify(favs));
    return favs;
  },
  getFavoriteRoutes: (): any[] => {
    const data = localStorage.getItem('favorite_routes');
    return data ? JSON.parse(data) : [];
  },
  toggleFavoriteRoute: (originId: number, destId: number, lineId: number, lineName: string) => {
    const favs = storage.getFavoriteRoutes();
    const routeId = `${originId}-${destId}-${lineId}`;
    const index = favs.findIndex((f: any) => f.routeId === routeId);
    
    if (index > -1) {
      favs.splice(index, 1);
    } else {
      favs.push({
        routeId,
        originId,
        destId,
        lineId,
        lineName,
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem('favorite_routes', JSON.stringify(favs));
    return favs;
  },
  setTargetDestination: (stopId: number) => {
    localStorage.setItem('buscoruna_target_dest', stopId.toString());
  }
};
