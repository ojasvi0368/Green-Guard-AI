'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './government.module.css';

interface DashboardData {
    overview: {
        totalFarms: number;
        totalFarmers: number;
        avgNDVI: number | null;
        avgSoilMoisture: number | null;
        avgDroughtRisk: number | null;
    };
    riskBreakdown: {
        high: number;
        moderate: number;
        low: number;
    };
    farmsByRegion: { region: string; count: number; avgArea: number | null }[];
    recentAlerts: {
        farmName: string;
        location: string;
        riskLevel: string;
        insight: string;
        date: string;
    }[];
    timestamp: string;
}

export default function GovernmentDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'loading') return;
        if (!session || (session.user as any)?.role !== 'GOVERNMENT') {
            router.push('/dashboard');
            return;
        }

        async function fetchDashboard() {
            try {
                const res = await fetch('/api/government/dashboard');
                if (!res.ok) throw new Error('Failed to fetch dashboard');
                const data = await res.json();
                setDashboard(data);
            } catch (err) {
                setError('Could not load government dashboard');
            } finally {
                setLoading(false);
            }
        }

        fetchDashboard();
    }, [session, status, router]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading Government Dashboard...</p>
            </div>
        );
    }

    if (error || !dashboard) {
        return (
            <div className={styles.error}>
                <h2>⚠️ {error || 'Unable to load dashboard'}</h2>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    const { overview, riskBreakdown, farmsByRegion, recentAlerts } = dashboard;

    const ndviHealth = overview.avgNDVI != null
        ? overview.avgNDVI > 0.6 ? 'Healthy' : overview.avgNDVI > 0.4 ? 'Moderate' : 'Stressed'
        : 'N/A';

    const droughtLevel = overview.avgDroughtRisk != null
        ? overview.avgDroughtRisk > 0.7 ? 'HIGH' : overview.avgDroughtRisk > 0.4 ? 'MODERATE' : 'LOW'
        : 'N/A';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1>🏛️ Government Agricultural Dashboard</h1>
                    <p>Regional agricultural monitoring and risk assessment</p>
                </div>
                <span className={styles.timestamp}>
                    Updated: {new Date(dashboard.timestamp).toLocaleString()}
                </span>
            </header>

            {/* Overview Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🌾</div>
                    <div className={styles.statValue}>{overview.totalFarms}</div>
                    <div className={styles.statLabel}>Total Farms</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>👨‍🌾</div>
                    <div className={styles.statValue}>{overview.totalFarmers}</div>
                    <div className={styles.statLabel}>Registered Farmers</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>🛰️</div>
                    <div className={styles.statValue}>
                        {overview.avgNDVI != null ? overview.avgNDVI.toFixed(3) : '—'}
                    </div>
                    <div className={styles.statLabel}>Avg NDVI ({ndviHealth})</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💧</div>
                    <div className={styles.statValue}>
                        {overview.avgSoilMoisture != null ? `${overview.avgSoilMoisture.toFixed(1)}%` : '—'}
                    </div>
                    <div className={styles.statLabel}>Avg Soil Moisture</div>
                </div>
                <div className={`${styles.statCard} ${droughtLevel === 'HIGH' ? styles.danger : droughtLevel === 'MODERATE' ? styles.warning : ''}`}>
                    <div className={styles.statIcon}>🌡️</div>
                    <div className={styles.statValue}>{droughtLevel}</div>
                    <div className={styles.statLabel}>Drought Risk Level</div>
                </div>
            </div>

            {/* Risk Breakdown */}
            <section className={styles.section}>
                <h2>⚠️ Risk Distribution</h2>
                <div className={styles.riskBars}>
                    <div className={styles.riskItem}>
                        <span className={styles.riskLabel}>🔴 High Risk</span>
                        <div className={styles.barContainer}>
                            <div
                                className={`${styles.bar} ${styles.barDanger}`}
                                style={{ width: `${Math.max(5, (riskBreakdown.high / Math.max(1, riskBreakdown.high + riskBreakdown.moderate + riskBreakdown.low)) * 100)}%` }}
                            />
                        </div>
                        <span className={styles.riskCount}>{riskBreakdown.high}</span>
                    </div>
                    <div className={styles.riskItem}>
                        <span className={styles.riskLabel}>🟡 Moderate</span>
                        <div className={styles.barContainer}>
                            <div
                                className={`${styles.bar} ${styles.barWarning}`}
                                style={{ width: `${Math.max(5, (riskBreakdown.moderate / Math.max(1, riskBreakdown.high + riskBreakdown.moderate + riskBreakdown.low)) * 100)}%` }}
                            />
                        </div>
                        <span className={styles.riskCount}>{riskBreakdown.moderate}</span>
                    </div>
                    <div className={styles.riskItem}>
                        <span className={styles.riskLabel}>🟢 Low Risk</span>
                        <div className={styles.barContainer}>
                            <div
                                className={`${styles.bar} ${styles.barSafe}`}
                                style={{ width: `${Math.max(5, (riskBreakdown.low / Math.max(1, riskBreakdown.high + riskBreakdown.moderate + riskBreakdown.low)) * 100)}%` }}
                            />
                        </div>
                        <span className={styles.riskCount}>{riskBreakdown.low}</span>
                    </div>
                </div>
            </section>

            {/* Farms by Region */}
            {farmsByRegion.length > 0 && (
                <section className={styles.section}>
                    <h2>📍 Farms by Region</h2>
                    <div className={styles.regionGrid}>
                        {farmsByRegion.map((r, i) => (
                            <div key={i} className={styles.regionCard}>
                                <div className={styles.regionName}>{r.region}</div>
                                <div className={styles.regionStats}>
                                    <span>{r.count} farms</span>
                                    {r.avgArea && <span>{r.avgArea.toFixed(1)} ha avg</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Alerts */}
            {recentAlerts.length > 0 && (
                <section className={styles.section}>
                    <h2>🚨 Recent Critical Alerts</h2>
                    <div className={styles.alertsList}>
                        {recentAlerts.map((alert, i) => (
                            <div key={i} className={`${styles.alertCard} ${alert.riskLevel === 'critical' ? styles.alertCritical : styles.alertPoor}`}>
                                <div className={styles.alertHeader}>
                                    <strong>{alert.farmName}</strong>
                                    <span className={styles.alertBadge}>{alert.riskLevel?.toUpperCase()}</span>
                                </div>
                                <p className={styles.alertLocation}>{alert.location}</p>
                                <p className={styles.alertText}>{alert.insight}</p>
                                <time className={styles.alertTime}>
                                    {new Date(alert.date).toLocaleDateString()}
                                </time>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
