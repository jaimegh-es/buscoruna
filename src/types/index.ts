export interface Line {
  id: string;
  nom_comer: string;
  color_linea: string;
  orig_linea: string;
  dest_linea: string;
}

export interface Stop {
  id: number;
  nombre: string;
  posx: number;
  posy: number;
  enlaces: string[];
}

export interface Route {
  ruta: number;
  nombre_orig: string;
  nombre_dest: string;
  paradas: number[];
}

export interface Catalog {
  actualizacion: {
    fecha: string;
    lineas: Array<{
      id: number;
      lin_comer: string;
      nombre_orig: string;
      nombre_dest: string;
      color: string;
      rutas: Route[];
    }>;
  };
  paradas: Record<string, Stop>;
}

export interface Arrival {
  linea: number;
  buses: Array<{
    bus: string;
    tiempo: number;
    distancia: number;
    estado: number;
    ult_parada: number;
  }>;
}

export interface RealTimeArrivals {
  resultado: string;
  buses: {
    parada: number;
    lineas: Arrival[];
  };
}
