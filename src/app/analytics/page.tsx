'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import AIInsightsPanel from '@/components/Dashboard/AIInsightsPanel';
import styles from '../dashboard/dashboard.module.css';
import { useFarm } from '@/contexts/FarmContext';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface FarmHistoryPoint {
    date: string;
    ndvi: number | null;
    soilMoisture: number | null;
    droughtRisk: number | null;
    temperature: number | null;
    humidity: number | null;
}

export default function AnalyticsPage() {
    const { selectedFarm } = useFarm();
    const [history, setHistory] = useState<FarmHistoryPoint[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        if (!selectedFarm?.id) {
            setHistory([]);
            setStats(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/farmData/history?farmId=${selectedFarm.id}&limit=30`);
            if (res.ok) {
                const data = await res.json();
                setHistory(data.history || []);
                setStats(data.stats || null);
            }
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedFarm?.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Format date for chart labels
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Prepare chart data with formatted dates
    const chartData = history.map(h => ({
        ...h,
        dateLabel: formatDate(h.date),
        ndviPercent: h.ndvi != null ? +(h.ndvi * 100).toFixed(1) : null,
        droughtPercent: h.droughtRisk != null ? +(h.droughtRisk * 100).toFixed(1) : null,
        tempRounded: h.temperature != null ? +h.temperature.toFixed(1) : null,
    }));

    // Compute summary stats from real data
    const latestNDVI = history.length > 0 ? history[history.length - 1].ndvi : null;
    const avgMoisture = history.length > 0
        ? history.filter(h => h.soilMoisture != null).reduce((sum, h) => sum + (h.soilMoisture || 0), 0) / Math.max(history.filter(h => h.soilMoisture != null).length, 1)
        : null;
    const latestDrought = history.length > 0 ? history[history.length - 1].droughtRisk : null;

    return (
        <div className={styles.dashboardLayout}>
            <Sidebar />
            <div className={styles.mainContent}>
                <DashboardHeader userName="Farmer" />
                <main className={styles.contentArea}>
                    <div className={styles.pageHeader}>
                        <div>
                            <h2 className={styles.pageTitle}>📈 Analytics & Insights</h2>
                            <p className={styles.pageSubtitle}>
                                {selectedFarm
                                    ? `Real-time data for ${selectedFarm.name} • ${selectedFarm.location}`
                                    : 'Select a farm to view analytics'}
                            </p>
                        </div>
                    </div>

                    {!selectedFarm ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '4rem',
                            opacity: 0.6,
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                            <p style={{ fontSize: '1.1rem' }}>Select a farm to view analytics</p>
                        </div>
                    ) : loading ? (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="skeleton" style={{ height: '120px' }} />
                            <div className="skeleton" style={{ height: '300px' }} />
                            <div className="skeleton" style={{ height: '300px' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>

                            {/* NEW: Operational Metrics (Real Data) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div className="card" style={{ borderTop: '4px solid #F59E0B' }}>
                                    <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>AI Recommendations</h4>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>
                                        {stats?.recommendationCount || 0}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#F59E0B' }}>Total crop suggestions</p>
                                </div>
                                <div className="card" style={{ borderTop: '4px solid #3B82F6' }}>
                                    <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>Irrigation Events</h4>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>
                                        {stats?.irrigationCount || 0}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#3B82F6' }}>Moisture triggered actions</p>
                                </div>
                                <div className="card" style={{ borderTop: '4px solid #10B981' }}>
                                    <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>Water Usage (Est.)</h4>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>
                                        {stats?.waterUsage ? stats.waterUsage.toFixed(0) : 0} L
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#10B981' }}>Cumulative farm supply</p>
                                </div>
                                <div className="card" style={{ borderTop: '4px solid #8B5CF6' }}>
                                    <h4 style={{ margin: 0, color: 'gray', fontSize: '0.8rem' }}>Sensor Data Points</h4>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.5rem 0' }}>
                                        {stats?.sensorCount || 0}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#8B5CF6' }}>Total DB records</p>
                                </div>
                            </div>

                            {/* Summary Stats from Real Data */}
                            <div className="card">
                                <h3 style={{ marginBottom: '1rem' }}>📊 Environmental Summary — {selectedFarm.name}</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div style={{
                                        padding: '1rem',
                                        background: 'var(--color-surface-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '3px solid #10B981'
                                    }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Latest NDVI</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0', color: '#10B981' }}>
                                            {latestNDVI != null ? latestNDVI.toFixed(3) : '—'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: latestNDVI && latestNDVI > 0.5 ? '#10B981' : '#F59E0B' }}>
                                            {latestNDVI != null
                                                ? (latestNDVI > 0.6 ? '✅ Healthy' : latestNDVI > 0.4 ? '⚠️ Moderate' : '🔴 Stressed')
                                                : 'No data'}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '1rem',
                                        background: 'var(--color-surface-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '3px solid #3B82F6'
                                    }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Avg Soil Moisture</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0', color: '#3B82F6' }}>
                                            {avgMoisture != null ? `${avgMoisture.toFixed(1)}%` : '—'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            From {history.filter(h => h.soilMoisture != null).length} readings
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '1rem',
                                        background: 'var(--color-surface-elevated)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: `3px solid ${latestDrought && latestDrought > 0.5 ? '#EF4444' : '#F59E0B'}`
                                    }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Drought Risk</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0', color: latestDrought && latestDrought > 0.5 ? '#EF4444' : '#F59E0B' }}>
                                            {latestDrought != null ? `${(latestDrought * 100).toFixed(0)}%` : '—'}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            {latestDrought != null
                                                ? (latestDrought > 0.7 ? '🔴 HIGH' : latestDrought > 0.4 ? '⚠️ MODERATE' : '✅ LOW')
                                                : 'No data'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* NDVI Trend Chart */}
                            {chartData.some(d => d.ndviPercent != null) && (
                                <div className="card-glass">
                                    <h3 style={{ marginBottom: '1rem' }}>🛰️ NDVI Trend (Vegetation Health)</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="dateLabel" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} label={{ value: 'NDVI (%)', angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                                            <Tooltip
                                                contentStyle={{ background: 'white', border: '2px solid #10B981', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                                formatter={(value: any) => [`${value}%`, 'NDVI']}
                                            />
                                            <Area type="monotone" dataKey="ndviPercent" stroke="#10B981" strokeWidth={3} fill="url(#ndviGradient)" name="NDVI" dot={{ r: 4, fill: '#10B981' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Temperature & Humidity Chart */}
                            {chartData.some(d => d.tempRounded != null) && (
                                <div className="card-glass">
                                    <h3 style={{ marginBottom: '1rem' }}>🌡️ Weather Trends</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="dateLabel" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                            <YAxis yAxisId="temp" tick={{ fill: '#6B7280', fontSize: 12 }} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                                            <YAxis yAxisId="humidity" orientation="right" tick={{ fill: '#6B7280', fontSize: 12 }} label={{ value: 'Humidity (%)', angle: 90, position: 'insideRight', fill: '#6B7280' }} />
                                            <Tooltip
                                                contentStyle={{ background: 'white', border: '2px solid #3B82F6', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend />
                                            <Line yAxisId="temp" type="monotone" dataKey="tempRounded" stroke="#EF4444" strokeWidth={2} name="Temperature (°C)" dot={{ r: 3 }} />
                                            <Line yAxisId="humidity" type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={2} name="Humidity (%)" dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Soil Moisture Trend */}
                            {chartData.some(d => d.soilMoisture != null) && (
                                <div className="card-glass">
                                    <h3 style={{ marginBottom: '1rem' }}>💧 Soil Moisture Trend</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="dateLabel" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} label={{ value: 'Moisture (%)', angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                                            <Tooltip
                                                contentStyle={{ background: 'white', border: '2px solid #3B82F6', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                                formatter={(value: any) => [`${value}%`, 'Soil Moisture']}
                                            />
                                            <Area type="monotone" dataKey="soilMoisture" stroke="#3B82F6" strokeWidth={3} fill="url(#moistureGradient)" name="Soil Moisture" dot={{ r: 4, fill: '#3B82F6' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Drought Risk Trend */}
                            {chartData.some(d => d.droughtPercent != null) && (
                                <div className="card-glass">
                                    <h3 style={{ marginBottom: '1rem' }}>🔥 Drought Risk Trend</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                            <XAxis dataKey="dateLabel" tick={{ fill: '#6B7280', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} label={{ value: 'Risk (%)', angle: -90, position: 'insideLeft', fill: '#6B7280' }} domain={[0, 100]} />
                                            <Tooltip
                                                contentStyle={{ background: 'white', border: '2px solid #EF4444', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                                formatter={(value: any) => [`${value}%`, 'Drought Risk']}
                                            />
                                            <Bar dataKey="droughtPercent" fill="#F59E0B" name="Drought Risk" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* No data message */}
                            {history.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '3rem',
                                    opacity: 0.6,
                                }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                                    <p>No historical data available for {selectedFarm.name}.</p>
                                    <p style={{ fontSize: '0.85rem' }}>Data will appear here as your farm collects NDVI, weather, and soil readings.</p>
                                </div>
                            )}

                            {/* AI Insights */}
                            <AIInsightsPanel />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
