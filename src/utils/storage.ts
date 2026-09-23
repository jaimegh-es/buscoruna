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
  toggleFavoriteRoute: (originId: number, destId: number, lineId: number, lineName: string, plannerMode?: string, targetTime?: string | null) => {
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
        // Optional planning metadata saved when the favorite comes from the
        // planner: the bus to board is chosen live against this goal.
        plannerMode: plannerMode || 'now',
        targetTime: targetTime || null,
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
  getUserLocations: (): Array<{ id: string; name: string; icon: string; lat?: number; lon?: number; radiusMeters?: number }> => {
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

  setUserLocations: (locations: Array<{ id: string; name: string; icon: string; lat?: number; lon?: number; radiusMeters?: number }>) => {
    localStorage.setItem('buscoruna_user_locations', JSON.stringify(locations));
    window.dispatchEvent(new CustomEvent('user-locations-updated'));
  },

  addUserLocation: (name: string, icon = 'map-pin', lat?: number, lon?: number): { id: string; name: string; icon: string; lat?: number; lon?: number } => {
    const locs = storage.getUserLocations();
    const id = 'loc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    const newLoc: { id: string; name: string; icon: string; lat?: number; lon?: number } = { id, name: name.trim(), icon };
    if (lat !== undefined && lon !== undefined) {
      newLoc.lat = lat;
      newLoc.lon = lon;
    }
    locs.push(newLoc);
    storage.setUserLocations(locs);
    return newLoc;
  },

  updateUserLocation: (id: string, updates: Partial<{ name: string; icon: string; lat: number | null; lon: number | null }>) => {
    const locs = storage.getUserLocations();
    const index = locs.findIndex(l => l.id === id);
    if (index !== -1) {
      const loc = { ...locs[index] };
      if (updates.name !== undefined) loc.name = updates.name.trim();
      if (updates.icon !== undefined) loc.icon = updates.icon;
      if (updates.lat !== undefined) {
        if (updates.lat === null) delete loc.lat;
        else loc.lat = updates.lat;
      }
      if (updates.lon !== undefined) {
        if (updates.lon === null) delete loc.lon;
        else loc.lon = updates.lon;
      }
      locs[index] = loc;
      storage.setUserLocations(locs);
    }
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
    // Empty value means the user explicitly deselected the current place.
    if (saved === '' || saved === 'none') return '';
    if (saved && locs.some(l => l.id === saved)) return saved;
    return locs[0]?.id || 'casa';
  },

  setActiveLocationId: (id: string) => {
    localStorage.setItem('buscoruna_active_location_id', id);
    // A non-empty selection made by the user (or GPS) — record how it came to be
    // so the walk-times selector can tell geo-detected from manual places.
    localStorage.setItem('buscoruna_active_location_source', id ? 'manual' : 'none');
    window.dispatchEvent(new CustomEvent('active-location-changed', { detail: id }));
  },

  // How the current active location was selected:
  // 'geo' (auto-detected by geolocation), 'manual' (user picked it) or 'none'.
  getActiveLocationSource: (): 'geo' | 'manual' | 'none' => {
    if (!storage.getActiveLocationId()) return 'none';
    const src = localStorage.getItem('buscoruna_active_location_source') || 'manual';
    return src === 'geo' ? 'geo' : (src === 'none' ? 'none' : 'manual');
  },

  getActiveLocation: (): { id: string; name: string; icon: string; lat?: number; lon?: number } | null => {
    const activeId = storage.getActiveLocationId();
    if (!activeId) return null;
    const locs = storage.getUserLocations();
    return locs.find(l => l.id === activeId) || null;
  },

  // Auto-detect if user is close to one of their configured locations
  autoSelectLocationFromGPS: (lat: number, lon: number): { id: string; name: string } | null => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    const locs = storage.getUserLocations();
    
    // Find closest location with coordinates within 300m
    let closestLoc: any = null;
    let minDistance = Infinity;

    for (const loc of locs) {
      if (typeof loc.lat === 'number' && typeof loc.lon === 'number') {
        // Haversine distance in meters
        const R = 6371e3;
        const φ1 = (lat * Math.PI) / 180;
        const φ2 = (loc.lat * Math.PI) / 180;
        const Δφ = ((loc.lat - lat) * Math.PI) / 180;
        const Δλ = ((loc.lon - lon) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const radius = loc.radiusMeters || 300;
        if (distance <= radius && distance < minDistance) {
          minDistance = distance;
          closestLoc = loc;
        }
      }
    }

    if (closestLoc) {
      if (storage.getActiveLocationId() !== closestLoc.id) {
        storage.setActiveLocationId(closestLoc.id);
      }
      // Mark this selection as GPS-detected so the UI can show it.
      localStorage.setItem('buscoruna_active_location_source', 'geo');
      return closestLoc;
    }
    return null;
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
  },

  // ---------------------------------------------------------------------------
  // Data Backup & Migration (Exportar / Importar entre PWA y APK)
  // ---------------------------------------------------------------------------
  exportAllUserData: (): string => {
    const keys = [
      'favorites',
      'favorite_routes',
      'favorite_planner_routes',
      'buscoruna_stop_names',
      'buscoruna_user_locations',
      'buscoruna_stop_walk_times',
      'buscoruna_active_location_id',
      'buscoruna_active_location_source',
      'buscoruna_gps_alert_enabled',
      'buscoruna_eta_alert_enabled',
      'buscoruna_eta_alert_threshold',
      'buscoruna_bg_notification_enabled',
      'buscoruna_lang',
      'buscoruna_news_images'
    ];
    const dump: Record<string, string> = {};
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v !== null) dump[k] = v;
    }
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: dump }, null, 2);
  },

  importUserData: (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      if (typeof data !== 'object' || data === null) return false;

      let importedCount = 0;
      for (const [k, v] of Object.entries(data)) {
        if (typeof v === 'string') {
          localStorage.setItem(k, v);
          importedCount++;
        } else if (typeof v === 'object' || typeof v === 'number' || typeof v === 'boolean') {
          localStorage.setItem(k, JSON.stringify(v));
          importedCount++;
        }
      }

      if (importedCount > 0) {
        window.dispatchEvent(new CustomEvent('user-locations-updated'));
        window.dispatchEvent(new CustomEvent('stop-names-updated'));
        window.dispatchEvent(new CustomEvent('catalog-loaded'));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Import failed', err);
      return false;
    }
  }
};

