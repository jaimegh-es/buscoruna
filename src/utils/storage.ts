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
  // Custom stop nicknames ("Mi casa", "Trabajo", ...)
  // Nombres personalizados de paradas ("Mi casa", "Trabajo", ...)
  getStopNames: (): Record<string, string> => {
    const data = localStorage.getItem('buscoruna_stop_names');
    return data ? JSON.parse(data) : {};
  },
  getStopName: (stopId: number, officialName?: string): string => {
    const names = storage.getStopNames();
    return names[String(stopId)] || officialName || '';
  },
  setStopName: (stopId: number, name: string) => {
    const names = storage.getStopNames();
    const trimmed = name.trim();
    if (trimmed) {
      names[String(stopId)] = trimmed;
    } else {
      delete names[String(stopId)];
    }
    localStorage.setItem('buscoruna_stop_names', JSON.stringify(names));
    window.dispatchEvent(new CustomEvent('stop-names-updated'));
  },
  removeStopName: (stopId: number) => {
    storage.setStopName(stopId, '');
  },

  // Check if a planner route is in favorites
  // Comprobar si una ruta del planificador ya está en favoritos
  isFavoritePlannerRoute: (origin: any, destination: any): boolean => {
    if (!origin || !destination) return false;
    const favs = storage.getFavoritePlannerRoutes();
    const oKey = origin.type === 'stop' ? `stop-${origin.id}` : `place-${origin.nombre}-${origin.posy}-${origin.posx}`;
    const dKey = destination.type === 'stop' ? `stop-${destination.id}` : `place-${destination.nombre}-${destination.posx}`;
    const routeId = `${oKey}__to__${dKey}`;
    return favs.some((f: any) => f.id === routeId);
  },

  // ---------------------------------------------------------------------------
  // User Locations & Stop Walking Times (Tiempos de desplazamiento por parada)
  // ---------------------------------------------------------------------------
  getUserLocations: (): Array<{ id: string; name: string; icon: string }> => {
    const raw = localStorage.getItem('buscoruna_user_locations');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [
      { id: 'casa', name: 'Casa', icon: 'home' },
      { id: 'trabajo', name: 'Trabajo', icon: 'briefcase' }
    ];
  },

  setUserLocations: (locations: Array<{ id: string; name: string; icon: string }>) => {
    localStorage.setItem('buscoruna_user_locations', JSON.stringify(locations));
    window.dispatchEvent(new CustomEvent('user-locations-updated'));
  },

  addUserLocation: (name: string, icon = 'map-pin'): { id: string; name: string; icon: string } => {
    const locs = storage.getUserLocations();
    const id = 'loc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newLoc = { id, name: name.trim(), icon };
    locs.push(newLoc);
    storage.setUserLocations(locs);
    return newLoc;
  },

  removeUserLocation: (id: string) => {
    const locs = storage.getUserLocations().filter(l => l.id !== id);
    storage.setUserLocations(locs);
    if (storage.getActiveLocationId() === id) {
      storage.setActiveLocationId(locs[0]?.id || 'casa');
    }
  },

  getActiveLocationId: (): string => {
    const saved = localStorage.getItem('buscoruna_active_location_id');
    const locs = storage.getUserLocations();
    if (saved && locs.some(l => l.id === saved)) return saved;
    return locs[0]?.id || 'casa';
  },

  setActiveLocationId: (id: string) => {
    localStorage.setItem('buscoruna_active_location_id', id);
    window.dispatchEvent(new CustomEvent('active-location-changed', { detail: id }));
  },

  getActiveLocation: (): { id: string; name: string; icon: string } => {
    const activeId = storage.getActiveLocationId();
    const locs = storage.getUserLocations();
    return locs.find(l => l.id === activeId) || locs[0] || { id: 'casa', name: 'Casa', icon: 'home' };
  },

  // Walking times map: { [stopId]: { [locationId]: minutes } }
  getStopWalkingTime: (stopId: number | string, locationId?: string): number | null => {
    const locId = locationId || storage.getActiveLocationId();
    try {
      const raw = localStorage.getItem('buscoruna_stop_walk_times');
      if (!raw) return null;
      const data = JSON.parse(raw);
      const stopTimes = data[String(stopId)];
      if (stopTimes && typeof stopTimes[locId] === 'number') {
        return stopTimes[locId];
      }
    } catch {}
    return null;
  },

  setStopWalkingTime: (stopId: number | string, locationId: string, minutes: number | null) => {
    try {
      const raw = localStorage.getItem('buscoruna_stop_walk_times');
      const data = raw ? JSON.parse(raw) : {};
      const sId = String(stopId);
      if (!data[sId]) data[sId] = {};
      
      if (minutes === null || isNaN(minutes) || minutes <= 0) {
        delete data[sId][locationId];
        if (Object.keys(data[sId]).length === 0) delete data[sId];
      } else {
        data[sId][locationId] = Math.round(minutes);
      }
      localStorage.setItem('buscoruna_stop_walk_times', JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('stop-walk-times-updated', { detail: { stopId: sId } }));
    } catch {}
  },

  getAllStopWalkingTimes: (stopId: number | string): Record<string, number> => {
    try {
      const raw = localStorage.getItem('buscoruna_stop_walk_times');
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data[String(stopId)] || {};
    } catch {
      return {};
    }
  }
};

