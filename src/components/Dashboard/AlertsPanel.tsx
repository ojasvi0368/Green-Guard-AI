'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/types';

export default function AlertsPanel() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const response = await fetch('/api/alerts');
            const data = await response.json();
            setAlerts(data.alerts);
        } catch (error) {
            console.error('Alerts fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (alertId: string) => {
        try {
            await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'markAsRead', alertId })
            });
            setAlerts(alerts.map(a => a.id === alertId ? { ...a, read: true } : a));
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const getSeverityColor = (severity: string) => {
        const colors = {
            low: '#10B981',
            medium: '#FBBF24',
            high: '#F97316',
            critical: '#EF4444'
        };
        return colors[severity as keyof typeof colors] || colors.low;
    };

    const getSeverityIcon = (severity: string) => {
        const icons = {
            low: '💚',
            medium: '⚠️',
            high: '🔶',
            critical: '🚨'
        };
        return icons[severity as keyof typeof icons] || '💚';
    };

    const getTypeIcon = (type: string) => {
        const icons = {
            water_stress: '💧',
            irrigation_due: '🚿',
            weather_warning: '🌤️',
            anomaly: '📊',
            sensor_malfunction: '🔧'
        };
        return icons[type as keyof typeof icons] || '🔔';
    };

    const displayedAlerts = showAll ? alerts : alerts.slice(0, 3);
    const unreadCount = alerts.filter(a => !a.read).length;

    return (
        <div className="card-glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                        Alerts & Notifications
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
                        {unreadCount} unread
                    </p>
                </div>
                {unreadCount > 0 && (
                    <div className="badge" style={{
                        background: '#EF4444',
                        color: 'white',
                        fontSize: '0.75rem'
                    }}>
                        {unreadCount}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="skeleton" style={{ height: '200px' }} />
            ) : alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <p>No alerts - All systems normal</p>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {displayedAlerts.map((alert) => (
                            <div
                                key={alert.id}
                                style={{
                                    padding: '1rem',
                                    background: alert.read ? 'var(--color-surface-elevated)' : 'rgba(16, 185, 129, 0.05)',
                                    borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                                    borderRadius: '8px',
                                    opacity: alert.read ? 0.7 : 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => !alert.read && markAsRead(alert.id)}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                            >
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                                    {/* Icons */}
                                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>
                                        {getTypeIcon(alert.type)}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'start',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div style={{
                                                fontSize: '0.95rem',
                                                fontWeight: 600,
                                                color: 'var(--color-text-primary)'
                                            }}>
                                                {getSeverityIcon(alert.severity)} {alert.title}
                                            </div>
                                            {!alert.read && (
                                                <div style={{
                                                    width: '8px',
                                                    height: '8px',
                                                    borderRadius: '50%',
                                                    background: 'var(--color-primary)',
                                                    flexShrink: 0
                                                }} />
                                            )}
                                        </div>

                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.85rem',
                                            color: 'var(--color-text-secondary)',
                                            marginBottom: '0.5rem',
                                            lineHeight: 1.5
                                        }}>
                                            {alert.message}
                                        </p>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.75rem',
                                            opacity: 0.7
                                        }}>
                                            <span>
                                                {new Date(alert.timestamp).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                            {alert.actionRequired && (
                                                <span style={{
                                                    color: '#F97316',
                                                    fontWeight: 600
                                                }}>
                                                    Action Required
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Show More Button */}
                    {alerts.length > 3 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            style={{
                                width: '100%',
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'var(--color-surface-elevated)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'var(--color-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-elevated)'}
                        >
                            {showAll ? 'Show Less' : `Show All (${alerts.length - 3} more)`}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
