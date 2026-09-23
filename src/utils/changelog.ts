// Per-version changelog.
// Add an entry (highest first) whenever you ship a new version; users will
// see it once after updating (tracked in localStorage).
//
// Changelog por versión.
// Añade una entrada (la más nueva arriba) cada vez que sacas versión; los
// usuarios la verán una sola vez tras actualizar (se registra en localStorage).

export interface ChangelogEntry {
    version: string;
    title: string;
    items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '0.0.3',
        title: '🛡️ Detección de bloqueos y mejoras',
        items: [
            'Detección inteligente de bloqueos de operadoras a Cloudflare durante partidos.',
            'Información clara y transparente con enlace a comprobador en tiempo real (hayahora.futbol).',
            'Acceso rápido a Proton VPN gratuita para saltar bloqueos de operadoras.',
            'Enlace directo a GitHub para auditar el código abierto.',
        ],
    },
    {
        version: '0.0.2',
        title: '🚀 Novedades de esta versión',
        items: [
            'App Android con avisos de llegada en segundo plano (elige los minutos de antelación).',
            'Notificaciones nativas en la bandeja del sistema.',
            'Nombres personalizados para tus paradas favoritas.',
            'Actualización de la app desde Ajustes, con changelog como este.',
            'Búsqueda de bus por número mucho más rápida.',
            'Avisos no bloqueantes: el aviso sonora al instante.',
        ],
    },
];

export function getChangelogFor(version: string): ChangelogEntry | null {
    return CHANGELOG.find(e => e.version === version) ?? null;
}

// Semantic version helpers, tolerant with prefixes/suffixes (v1.2, 1.2.3,
// "1.0.28", ...). The changelog must work even when the native build numbers
// the APK differently from the changelog entries (e.g. APK "1.0.28" vs
// entries "0.0.3"), so exact string equality is not enough.
// Comparación semántica tolerante: el changelog funciona aunque el APK lleve
// una numeración distinta a la de las entradas (p. ej. APK "1.0.28" frente a
// entradas "0.0.3"), así que la igualdad exacta no basta.
export function parseVersion(v: string): number[] {
    return String(v)
        .trim()
        .replace(/^v/i, '')
        .split('.')
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n));
}

export function compareVersions(a: string, b: string): number {
    const av = parseVersion(a);
    const bv = parseVersion(b);
    const len = Math.max(av.length, bv.length);
    for (let i = 0; i < len; i++) {
        const x = av[i] || 0;
        const y = bv[i] || 0;
        if (x !== y) return x - y;
    }
    return 0;
}

// Show-once bookkeeping: remembers the last version whose changelog the user saw
// Control de "mostrar una vez": recuerda la última versión cuyo changelog vio el usuario
const SEEN_KEY = 'buscoruna_changelog_seen';

export function hasSeenChangelog(version: string): boolean {
    return localStorage.getItem(SEEN_KEY) === version;
}

export function markChangelogSeen(version: string) {
    localStorage.setItem(SEEN_KEY, version);
}

// Entry to show: the newest changelog entry that is <= the running app version
// and newer than the last one the user saw. With nothing seen yet (fresh
// install, or APK version that never matched before) it shows the newest
// available entry.
// Entrada a mostrar: la más reciente que sea <= a la versión actual de la app y
// más nueva que la última vista. Sin registro previo, muestra la más reciente.
export function getPendingChangelog(currentVersion: string): ChangelogEntry | null {
    const sorted = [...CHANGELOG].sort((a, b) => compareVersions(b.version, a.version));
    if (sorted.length === 0) return null;
    const lastSeen = localStorage.getItem(SEEN_KEY);
    if (!lastSeen) return sorted[0];
    for (const e of sorted) {
        if (compareVersions(e.version, currentVersion) <= 0 && compareVersions(e.version, lastSeen) > 0) {
            return e;
        }
    }
    return null;
}
