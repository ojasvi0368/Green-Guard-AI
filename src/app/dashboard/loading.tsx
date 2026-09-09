export default function Loading() {
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--gradient-subtle)'
        }}>
            <div className="loader" />
            <p style={{
                marginTop: '1.5rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                textAlign: 'center'
            }}>
                Loading your dashboard...
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
