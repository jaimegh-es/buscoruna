// Non-blocking in-app alert banner.
// Replaces window.alert() which blocks the JS thread and delays sounds/vibration.
// Banner de alerta no bloqueante para sustituir a window.alert(),
// que bloquea el hilo de JS y retrasa sonidos y vibraciones.

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
    if (!container) {
        container = document.createElement('div');
        container.id = 'inapp-alert-container';
        Object.assign(container.style, {
            position: 'fixed',
            top: '12px',
            left: '12px',
            right: '12px',
            zIndex: '5000',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
        } as CSSStyleDeclaration);
        document.body.appendChild(container);
    }
    return container;
}

export interface InAppAlertOptions {
    durationMs?: number;
    onClick?: () => void;
}

export function inAppAlert(message: string, options: InAppAlertOptions = {}) {
    const { durationMs = 6000, onClick } = options;
    const host = getContainer();

    const banner = document.createElement('div');
    Object.assign(banner.style, {
        background: '#1f2937',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        fontSize: '0.9rem',
        lineHeight: '1.4',
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        opacity: '0',
        transform: 'translateY(-8px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
    } as CSSStyleDeclaration);
    banner.textContent = message;

    if (onClick) {
        banner.addEventListener('click', () => {
            onClick();
            dismiss();
        });
    }

    host.appendChild(banner);
    requestAnimationFrame(() => {
        banner.style.opacity = '1';
        banner.style.transform = 'translateY(0)';
    });

    let dismissed = false;
    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        banner.style.opacity = '0';
        banner.style.transform = 'translateY(-8px)';
        setTimeout(() => banner.remove(), 300);
    }

    setTimeout(dismiss, durationMs);
}
