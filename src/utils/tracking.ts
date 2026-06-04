export interface TrackingInfo {
  busId: string;
  lineId: number;
  destinationStopId: number;
  originStopId: number;
  lastEta: number | null;
  arrivalTime: string | null;
}

const TRACKING_KEY = 'buscoruna_tracking';
const TARGET_DEST_KEY = 'buscoruna_target_dest';

export const tracking = {
  get: (): TrackingInfo | null => {
    const data = localStorage.getItem(TRACKING_KEY);
    return data ? JSON.parse(data) : null;
  },
  set: (info: TrackingInfo) => {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(info));
    window.dispatchEvent(new CustomEvent('tracking-updated', { detail: info }));
  },
  clear: () => {
    localStorage.removeItem(TRACKING_KEY);
    window.dispatchEvent(new CustomEvent('tracking-updated', { detail: null }));
  },
  setTargetDestination: (stopId: number) => {
    localStorage.setItem(TARGET_DEST_KEY, stopId.toString());
  },
  getTargetDestination: (): number | null => {
    const id = localStorage.getItem(TARGET_DEST_KEY);
    return id ? parseInt(id) : null;
  },
  clearTargetDestination: () => {
    localStorage.removeItem(TARGET_DEST_KEY);
  }
};
