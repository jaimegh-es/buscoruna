// Non-blocking in-app alert banner.
// Replaces window.alert() which blocks the JS thread and delays sounds/vibration.
// Banner de alerta no bloqueante para sustituir a window.alert(),
// que desaparece a los 5 segundos y se puede arrastrar horizontalmente para descartar.

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
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'none',
            maxWidth: '480px',
            margin: '0 auto',
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
    const { durationMs = 5000, onClick } = options;
    const host = getContainer();

    const banner = document.createElement('div');
    Object.assign(banner.style, {
        background: '#1f2937',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        fontSize: '0.92rem',
        fontWeight: '500',
        lineHeight: '1.4',
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'grab',
        opacity: '0',
        transform: 'translateY(-12px)',
        transition: 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        webkitUserSelect: 'none',
        touchAction: 'pan-y',
        willChange: 'transform, opacity',
    } as CSSStyleDeclaration);
    banner.textContent = message;

    let dismissed = false;
    let timer: any = null;

    function startTimer(ms: number) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(dismiss, ms);
    }

    function dismiss(direction: 'left' | 'right' | 'up' = 'up') {
        if (dismissed) return;
        dismissed = true;
        if (timer) clearTimeout(timer);
        banner.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        banner.style.opacity = '0';
        if (direction === 'left') {
            banner.style.transform = 'translate3d(-120%, 0, 0)';
        } else if (direction === 'right') {
            banner.style.transform = 'translate3d(120%, 0, 0)';
        } else {
            banner.style.transform = 'translate3d(0, -12px, 0)';
        }
        setTimeout(() => banner.remove(), 260);
    }

    // --- Swipe / Drag to Dismiss Handlers ---
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let startTime = 0;

    function onTouchStart(e: TouchEvent) {
        if (dismissed) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        currentX = startX;
        isDragging = true;
        startTime = Date.now();
        if (timer) clearTimeout(timer);
        banner.style.transition = 'none';
    }

    function onTouchMove(e: TouchEvent) {
        if (!isDragging || dismissed) return;
        const touch = e.touches[0];
        currentX = touch.clientX;
        const deltaX = currentX - startX;
        const opacity = Math.max(0.2, 1 - Math.abs(deltaX) / 240);
        banner.style.transform = `translate3d(${deltaX}px, 0, 0)`;
        banner.style.opacity = opacity.toString();
    }

    function onTouchEnd() {
        if (!isDragging || dismissed) return;
        isDragging = false;
        const deltaX = currentX - startX;
        const elapsed = Date.now() - startTime;
        const velocity = Math.abs(deltaX) / (elapsed || 1);

        // Threshold: 60px or fast swipe
        if (Math.abs(deltaX) > 60 || velocity > 0.5) {
            dismiss(deltaX > 0 ? 'right' : 'left');
        } else {
            // Spring back
            banner.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
            banner.style.transform = 'translate3d(0, 0, 0)';
            banner.style.opacity = '1';
            startTimer(3000); // give it another 3s after cancelled swipe
        }
    }

    banner.addEventListener('touchstart', onTouchStart, { passive: true });
    banner.addEventListener('touchmove', onTouchMove, { passive: true });
    banner.addEventListener('touchend', onTouchEnd, { passive: true });
    banner.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Pointer events for desktop drag
    let isPointerDown = false;
    banner.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.pointerType === 'touch') return; // handled by touch listeners
        if (dismissed) return;
        isPointerDown = true;
        startX = e.clientX;
        currentX = startX;
        startTime = Date.now();
        banner.style.cursor = 'grabbing';
        banner.style.transition = 'none';
        if (timer) clearTimeout(timer);
        try { banner.setPointerCapture(e.pointerId); } catch {}
    });

    banner.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isPointerDown || dismissed || e.pointerType === 'touch') return;
        currentX = e.clientX;
        const deltaX = currentX - startX;
        const opacity = Math.max(0.2, 1 - Math.abs(deltaX) / 240);
        banner.style.transform = `translate3d(${deltaX}px, 0, 0)`;
        banner.style.opacity = opacity.toString();
    });

    function endPointerDrag(e: PointerEvent) {
        if (!isPointerDown || dismissed || e.pointerType === 'touch') return;
        isPointerDown = false;
        banner.style.cursor = onClick ? 'pointer' : 'grab';
        try { banner.releasePointerCapture(e.pointerId); } catch {}
        const deltaX = currentX - startX;
        const elapsed = Date.now() - startTime;
        const velocity = Math.abs(deltaX) / (elapsed || 1);

        if (Math.abs(deltaX) > 60 || velocity > 0.5) {
            dismiss(deltaX > 0 ? 'right' : 'left');
        } else {
            banner.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
            banner.style.transform = 'translate3d(0, 0, 0)';
            banner.style.opacity = '1';
            startTimer(3000);
        }
    }

    banner.addEventListener('pointerup', endPointerDrag);
    banner.addEventListener('pointercancel', endPointerDrag);

    if (onClick) {
        banner.addEventListener('click', (e) => {
            // Only trigger onClick if it wasn't a significant drag
            if (Math.abs(currentX - startX) < 10) {
                onClick();
                dismiss();
            }
        });
    }

    host.appendChild(banner);
    requestAnimationFrame(() => {
        banner.style.opacity = '1';
        banner.style.transform = 'translate3d(0, 0, 0)';
    });

    startTimer(durationMs);
}
