export const Geocoding = {
  search: async (query: string) => {
    // Bias towards A Coruña (lat/lon) but don't hard-filter with bbox
    const url = `/api/proxy?type=photon&q=${encodeURIComponent(query)}&lat=43.3623&lon=-8.4115&limit=5`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features.map((f: any) => {
      const p = f.properties;
      const name = p.name || p.street || p.district || "Lugar desconocido";
      const full = [p.name, p.street, p.housenumber, p.district, p.city]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
        .slice(0, 3)
        .join(', ');
        
      return {
        name: name,
        full_name: full,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      };
    });
  }
};
