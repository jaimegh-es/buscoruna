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
  },
  // Get all saved favorite planner routes (Origin -> Destination queries)
  // Obtener todas las rutas favoritas guardadas del planificador (consultas de Origen -> Destino)
  getFavoritePlannerRoutes: (): any[] => {
    const data = localStorage.getItem('favorite_planner_routes');
    return data ? JSON.parse(data) : [];
  },
  toggleFavoritePlannerRoute: (origin: any, destination: any, plannerMode?: string, targetTime?: string | null) => {
    const favs = storage.getFavoritePlannerRoutes();
    const oKey = origin.type === 'stop' ? `stop-${origin.id}` : `place-${origin.nombre}-${origin.posy}-${origin.posx}`;
    const dKey = destination.type === 'stop' ? `stop-${destination.id}` : `place-${destination.nombre}-${destination.posy}-${destination.posx}`;
    const routeId = `${oKey}__to__${dKey}`;
    
    const index = favs.findIndex((f: any) => f.id === routeId);
    if (index > -1) {
      favs.splice(index, 1);
    } else {
      favs.push({
        id: routeId,
        origin,
        destination,
        plannerMode: plannerMode || 'now',
        targetTime: targetTime || null,
        createdAt: new Date().toISOString()
      });
    }
    localStorage.setItem('favorite_planner_routes', JSON.stringify(favs));
    return favs;
  },
  // Check if a planner route is in favorites
  // Comprobar si una ruta del planificador ya está en favoritos
  isFavoritePlannerRoute: (origin: any, destination: any): boolean => {
    if (!origin || !destination) return false;
    const favs = storage.getFavoritePlannerRoutes();
    const oKey = origin.type === 'stop' ? `stop-${origin.id}` : `place-${origin.nombre}-${origin.posy}-${origin.posx}`;
    const dKey = destination.type === 'stop' ? `stop-${destination.id}` : `place-${destination.nombre}-${destination.posy}-${destination.posx}`;
    const routeId = `${oKey}__to__${dKey}`;
    return favs.some((f: any) => f.id === routeId);
  }
};

