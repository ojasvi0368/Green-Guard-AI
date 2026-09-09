'use client';

import styles from './DashboardHeader.module.css';
import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useFarm } from '@/contexts/FarmContext';

interface DashboardHeaderProps {
    userName?: string;
    notifications?: Array<{ id: number; message: string; type: string; time: string }>;
}

export default function DashboardHeader({ userName = 'Farmer', notifications = [] }: DashboardHeaderProps) {
    const { selectedFarm } = useFarm();

    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const notificationRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const toggleNotifications = () => {
        setShowNotifications(prev => !prev);
    };

    const toggleProfileDropdown = () => {
        setShowProfileDropdown(prev => !prev);
    };

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch('/api/user/me');
                if (response.ok) {
                    const data = await response.json();
                    setUserData(data);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    const handleLoginWithAnother = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to delete your account? This action cannot be undone.'
        );

        if (confirmed) {
            try {
                const response = await fetch('/api/user/delete', {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('Account deleted successfully');
                    await signOut({ callbackUrl: '/' });
                } else {
                    const data = await response.json();
                    alert(data.error || 'Failed to delete account');
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('An error occurred while deleting your account');
            }
        }
    };

    // Click outside handler to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileDropdown(false);
            }
        };

        if (showNotifications || showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications, showProfileDropdown]);

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'warning': return '#FBBF24';
            case 'success': return '#10B981';
            case 'info': return '#3B82F6';
            default: return '#6B7280';
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.headerContent}>
                <div className={styles.headerLeft}>
                    <button className={styles.menuBtn} title="Toggle menu">
                        ☰
                    </button>
                    <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {selectedFarm ? (
                            <span style={{
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                🌾 {selectedFarm.name}
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 400,
                                    color: 'var(--color-text-muted)'
                                }}>
                                    • {selectedFarm.location}
                                </span>
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                No farm selected — add a farm to get started
                            </span>
                        )}
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div style={{ position: 'relative' }} ref={notificationRef}>
                        <button className={styles.iconBtn} title="Notifications" onClick={toggleNotifications}>
                            <span className={styles.icon}>🔔</span>
                            {notifications.length > 0 && (
                                <span className={styles.badge}>{notifications.length}</span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 0.5rem)',
                                width: '320px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                                padding: '1rem',
                                zIndex: 1000
                            }}>
                                <h4 style={{
                                    margin: '0 0 1rem 0',
                                    fontSize: '1rem',
                                    color: 'var(--color-text-primary)',
                                    fontWeight: 600
                                }}>
                                    Notifications
                                </h4>
                                {notifications.length === 0 ? (
                                    <p style={{
                                        textAlign: 'center',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.875rem',
                                        padding: '2rem 0'
                                    }}>
                                        No new alerts
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {notifications.map(n => (
                                            <div key={n.id} style={{
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                background: 'var(--color-surface-elevated)',
                                                borderLeft: `4px solid ${getNotificationColor(n.type)}`
                                            }}>
                                                <p style={{
                                                    margin: '0 0 0.25rem 0',
                                                    fontSize: '0.875rem',
                                                    color: 'var(--color-text-primary)',
                                                    lineHeight: 1.5
                                                }}>
                                                    {n.message}
                                                </p>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--color-text-muted)'
                                                }}>
                                                    {n.time}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'relative' }} ref={profileRef}>
                        <div className={styles.userProfile} onClick={toggleProfileDropdown} style={{ cursor: 'pointer' }}>
                            <div className={styles.avatar}>
                                {(userData?.name || userName).charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.userName}>{userData?.name || userName}</span>
                        </div>

                        {/* Profile Dropdown */}
                        {showProfileDropdown && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 0.5rem)',
                                width: '280px',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                                padding: '0',
                                zIndex: 1000,
                                overflow: 'hidden'
                            }}>
                                {/* User Info */}
                                <div style={{
                                    padding: '1.25rem',
                                    borderBottom: '1px solid #E5E7EB',
                                    background: 'var(--gradient-subtle)'
                                }}>
                                    {loading ? (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                            Loading...
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{
                                                fontWeight: 600,
                                                fontSize: '1rem',
                                                color: 'var(--color-text-primary)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {userData?.name || userName}
                                            </div>
                                            <div style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--color-text-muted)'
                                            }}>
                                                {userData?.email || 'No email'}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Menu Items */}
                                <div style={{ padding: '0.5rem 0' }}>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1.25rem',
                                            border: 'none',
                                            background: 'none',
                                            textAlign: 'left',
                                            fontSize: '0.95rem',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'background 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <span>🚪</span>
                                        <span>Logout</span>
                                    </button>

                                    <button
                                        onClick={handleLoginWithAnother}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1.25rem',
                                            border: 'none',
                                            background: 'none',
                                            textAlign: 'left',
                                            fontSize: '0.95rem',
                                            color: 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'background 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <span>🔄</span>
                                        <span>Login with Another Account</span>
                                    </button>

                                    <div style={{
                                        height: '1px',
                                        background: '#E5E7EB',
                                        margin: '0.5rem 0'
                                    }} />

                                    <button
                                        onClick={handleDeleteAccount}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1.25rem',
                                            border: 'none',
                                            background: 'none',
                                            textAlign: 'left',
                                            fontSize: '0.95rem',
                                            color: '#DC2626',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'background 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        <span>🗑️</span>
                                        <span>Delete Account</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
