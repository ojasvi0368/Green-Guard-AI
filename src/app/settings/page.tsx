'use client';

import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import styles from '../dashboard/dashboard.module.css';

export default function SettingsPage() {
    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <DashboardHeader userName="Farmer" />
                <main className={styles.contentArea}>
                    <div className={styles.pageHeader}>
                        <div>
                            <h2 className={styles.pageTitle}>⚙️ Settings</h2>
                            <p className={styles.pageSubtitle}>
                                Configure your farm and system preferences
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>Farm Information</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        Farm Name
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue="Maharashtra Farm"
                                        style={{ width: '100%', maxWidth: '400px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        defaultValue="Maharashtra, India"
                                        style={{ width: '100%', maxWidth: '400px' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>Notification Preferences</h3>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {[
                                    'Email notifications',
                                    'SMS alerts for critical issues',
                                    'Daily summary reports',
                                    'Weather updates'
                                ].map((pref, i) => (
                                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                        <input type="checkbox" defaultChecked={i < 2} />
                                        <span>{pref}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>API Configuration</h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                Configure your API keys for weather and other services
                            </p>
                            <button className="btn-secondary">Manage API Keys</button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
