export type TrackingPhase = 'toStop' | 'toDest';

export interface TrackingInfo {
  busId: string;
  lineId: number;
  destinationStopId: number;
  originStopId: number;
  lastEta: number | null;
  arrivalTime: string | null;
  /**
   * Unified tracking is two-phase:
   * - 'toStop': the bus has NOT reached the boarding/origin stop yet. The app
   *   counts down until the bus arrives there (this integrates the old ETA /
   *   arrival-alert button, including the walking head-start from the active
   *   saved location).
   * - 'toDest': the bus reached the boarding stop, the user is on board and the
   *   app counts down the real-time remaining time until the destination stop.
   *
   * Fase única de seguimiento en dos etapas:
   * - 'toStop': el bus aún no ha llegado a la parada de origen; se cuenta el
   *   tiempo hasta que llegue (integra el antiguo botón de aviso de llegada,
   *   incluida la antelación de caminata desde la ubicación activa guardada).
   * - 'toDest': el bus llegó a la parada, el usuario va a bordo y se cuenta el
   *   tiempo restante en tiempo real hasta la parada de destino.
   */
  phase?: TrackingPhase;
  /** Walking head-start in minutes from the active saved location (0 = none). */
  walkMinutes?: number;
  /** Name of the active saved location used for the head-start, if any. */
  locationName?: string;
  /** Cached name of the destination stop (avoid re-looking it up every tick). */
  destinationName?: string;
}

// Legacy stored journeys missing `phase` always start counting until the bus
// reaches the boarding stop, which keeps old behaviour consistent with the
// new unified flow.
function normalize(info: TrackingInfo | null): TrackingInfo | null {
  if (!info) return null;
  return { ...info, phase: info.phase || 'toStop' };
}

const TRACKING_KEY = 'buscoruna_tracking';
const TARGET_DEST_KEY = 'buscoruna_target_dest';

export const tracking = {
  get: (): TrackingInfo | null => {
    const data = localStorage.getItem(TRACKING_KEY);
    return normalize(data ? JSON.parse(data) : null);
  },
  set: (info: TrackingInfo) => {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(info));
    window.dispatchEvent(new CustomEvent('tracking-updated', { detail: info }));
  },
  // Update only some fields of the current tracking info (keeps `phase` etc.)
  patch: (patch: Partial<TrackingInfo>) => {
    const current = tracking.get();
    if (!current) return;
    tracking.set({ ...current, ...patch });
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