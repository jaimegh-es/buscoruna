const BASE_URL = '/api/proxy';

export async function getQuery(func: number, dato: string) {
  const url = `${BASE_URL}?func=${func}&dato=${dato}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
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
