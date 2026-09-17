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

// Show-once bookkeeping: remembers the last version whose changelog the user saw
// Control de "mostrar una vez": recuerda la última versión cuyo changelog vio el usuario
const SEEN_KEY = 'buscoruna_changelog_seen';

export function hasSeenChangelog(version: string): boolean {
    return localStorage.getItem(SEEN_KEY) === version;
}

export function markChangelogSeen(version: string) {
    localStorage.setItem(SEEN_KEY, version);
}
