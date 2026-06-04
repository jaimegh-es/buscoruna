const BASE_URL = '/api/proxy';

let activeRequests = 0;

export function isApiLoading() {
  return activeRequests > 0;
}

function updateLoadingState(delta: number) {
  activeRequests += delta;
  if (activeRequests === 1 && delta === 1) {
    window.dispatchEvent(new CustomEvent('api-loading-start'));
  } else if (activeRequests === 0) {
    window.dispatchEvent(new CustomEvent('api-loading-end'));
  }
}

export async function getQuery(func: number, dato: string) {
  const url = `${BASE_URL}?func=${func}&dato=${dato}`;
  
  updateLoadingState(1);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } finally {
    updateLoadingState(-1);
  }
}

export const API = {
  // Real-time arrivals for a stop
  getStopArrivals: (stopId: number) => getQuery(0, stopId.toString()),

  // List of lines (basic info)
  getLines: () => getQuery(1, '1'),

  // Detailed info for a line (stops, current buses)
  getLineInfo: (lineId: number) => getQuery(2, lineId.toString()),

  // Find nearby stops
  getNearbyStops: (lat: number, lng: number, radius: number = 5000, max: number = 5) => 
    getQuery(3, `${lat}_${lng}_${radius}_${max}`),

  // Full catalog
  getCatalog: (date = '20160101T000000', lang = 'es') => 
    getQuery(7, `${date}_${lang}_0_20160101T000000`),

  // Schedules for a line
  getSchedules: (lineId: number, date: string) => 
    getQuery(8, `${lineId}&fecha=${date}`),

  // Map data
  getMapData: (lineId: number, show: 'B' | 'PRB') => 
    getQuery(99, `${lineId}&mostrar=${show}`),
};
