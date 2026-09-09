"use client";

interface NavigationOverlayProps {
    show: boolean;
}

export default function NavigationOverlay({ show }: NavigationOverlayProps) {
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)'
        }}>
            <div className="loader" />
            <p style={{
                marginTop: '1.5rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                textAlign: 'center'
            }}>
                Opening your dashboard...
            </p>
            <p style={{
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)'
            }}>
                Just a moment 🌾
            </p>
        </div>
    );
}
