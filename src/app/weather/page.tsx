'use client';

import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import WeatherWidget from '@/components/Dashboard/WeatherWidget';
import SmartLocationSelector from '@/components/Weather/SmartLocationSelector';
import styles from '../dashboard/dashboard.module.css';

export default function WeatherPage() {
    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <DashboardHeader userName="Farmer" />
                <main className={styles.contentArea}>
                    <div className={styles.pageHeader}>
                        <div>
                            <h2 className={styles.pageTitle}>🌤️ Weather Forecast</h2>
                            <p className={styles.pageSubtitle}>
                                Real-time weather data and AI-refined forecasts
                            </p>
                        </div>
                    </div>

                    {/* Weather Widget - uses header location */}
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <SmartLocationSelector />
                        <WeatherWidget />

                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>📊 Weather Insights</h3>
                            <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                                Get detailed weather analysis for better agricultural planning.
                            </p>
                            <div style={{
                                padding: '1rem',
                                background: 'var(--gradient-subtle)',
                                borderRadius: '8px'
                            }}>
                                <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                                    <strong>🌾 Agricultural Recommendations:</strong>
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                        <li>Check 7-day forecast before planning irrigation</li>
                                        <li>Monitor rainfall predictions for water management</li>
                                        <li>Adjust crop schedules based on temperature trends</li>
                                        <li>Use location selector in header to change region</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
