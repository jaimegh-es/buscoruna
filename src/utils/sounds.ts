// Configurable alert melodies.
// Melodías configurables para los avisos de la app.
//
// Two events:
// - 'bus'  → the bus-arrival alert at the boarding stop ("llegada de bus").
// - 'stop' → the get-off / destination-approach alert ("avisar de parada").
// Each one has a built-in default (.mp3 shipped in /public) and an optional
// custom sound uploaded from Settings, stored as a base64 data URI so it
// survives without extra native storage (also used by the native tracker,
// which receives the data URI in the plugin extras).

export type AlertEvent = 'bus' | 'stop';

const KEY_BUS = 'buscoruna_sound_custom_bus';
const KEY_STOP = 'buscoruna_sound_custom_stop';

const DEFAULT_SOUNDS: Record<AlertEvent, string> = {
    bus: '/avisobus.mp3',
    stop: '/avisoparada.mp3',
};

const MAX_CUSTOM_SIZE = 3 * 1024 * 1024; // 3 MB

export function getCustomSound(event: AlertEvent): string | null {
    const key = event === 'bus' ? KEY_BUS : KEY_STOP;
    return localStorage.getItem(key);
}

export function isCustomSoundSet(event: AlertEvent): boolean {
    return !!getCustomSound(event);
}

export function setCustomSound(event: AlertEvent, dataUri: string | null) {
    const key = event === 'bus' ? KEY_BUS : KEY_STOP;
    if (dataUri) {
        localStorage.setItem(key, dataUri);
    } else {
        localStorage.removeItem(key);
    }
}

export function getSoundSource(event: AlertEvent): { custom: boolean; src: string } {
    const custom = getCustomSound(event);
    return custom ? { custom: true, src: custom } : { custom: false, src: DEFAULT_SOUNDS[event] };
}

/**
 * Play the configured melody for an event.
 * Reproduce la melodía configurada para el evento.
 * Falls back to a soft WebAudio note if the default mp3 file is missing (e.g.
 * before the user adds them to /public) or the audio cannot be played.
 */
export function playEventSound(event: AlertEvent) {
    const { src } = getSoundSource(event);
    try {
        const audio = new Audio(src);
        audio.volume = 1;
        audio.play().catch(() => fallbackBeep(event));
    } catch {
        fallbackBeep(event);
    }
}

function fallbackBeep(event: AlertEvent) {
    try {
        const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        const context: AudioContext = new Ctx();
        if (context.state === 'suspended') context.resume().catch(() => {});
        const osc = context.createOscillator();
        osc.type = 'sine';
        // Distinctive tones so both events remain recognizable without the mp3s.
        osc.frequency.setValueAtTime(event === 'bus' ? 880 : 660, context.currentTime);
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.25, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.7);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.7);
    } catch {
        /* audio unavailable */
    }
}

export { MAX_CUSTOM_SIZE };