'use client';

import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import AlertsPanel from '@/components/Dashboard/AlertsPanel';
import styles from '../dashboard/dashboard.module.css';

export default function AlertsPage() {
    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <DashboardHeader userName="Farmer" />
                <main className={styles.contentArea}>
                    <div className={styles.pageHeader}>
                        <div>
                            <h2 className={styles.pageTitle}>🔔 Alerts & Notifications</h2>
                            <p className={styles.pageSubtitle}>
                                Intelligent notifications prioritized by severity
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <AlertsPanel />

                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>Alert Settings</h3>
                            <p style={{ color: 'var(--color-text-muted)' }}>
                                Configure notification preferences and alert thresholds...
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
