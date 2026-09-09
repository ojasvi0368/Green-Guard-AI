'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import styles from './farms.module.css';

const FarmMap = dynamic(() => import('@/components/Map/FarmMap'), { ssr: false });

interface Farm {
    id: string;
    name: string;
    location: string;
    polygonId: string | null;
    areaHa: number | null;
    createdAt: string;
}

interface FarmAgroData {
    ndvi: number | null;
    weather: any | null;
    soilMoisture: number | null;
    droughtRisk: number | null;
}

interface FarmInsight {
    id: string;
    createdAt: string;
    riskLevel: string | null;
    data: {
        problems?: string[];
        recommendations?: string[];
        futureRisks?: string[];
        overallHealth?: string;
        summary?: string;
    };
    recommendations: string[];
}

export default function FarmsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [farms, setFarms] = useState<Farm[]>([]);
    const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
    const [agroData, setAgroData] = useState<FarmAgroData | null>(null);
    const [insights, setInsights] = useState<FarmInsight[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [fetchingData, setFetchingData] = useState(false);
    const [generatingInsights, setGeneratingInsights] = useState(false);
    const [activeTab, setActiveTab] = useState<'data' | 'insights' | 'map'>('data');

    // Form state
    const [formName, setFormName] = useState('');
    const [formLocation, setFormLocation] = useState('');
    const [formArea, setFormArea] = useState('');
    const [drawnCoords, setDrawnCoords] = useState<{ lat: number; lng: number }[] | null>(null);

    // Auth guard
    useEffect(() => {
        if (status === 'loading') return;
        if (!session) { router.push('/login'); return; }
    }, [session, status, router]);

    // Fetch farms
    const fetchFarms = useCallback(async () => {
        try {
            const res = await fetch('/api/farms');
            if (res.ok) {
                const data = await res.json();
                setFarms(data.farms || []);
            }
        } catch (err) {
            console.error('Error fetching farms:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFarms(); }, [fetchFarms]);

    // Fetch agro data for selected farm
    const fetchAgroData = async (farm: Farm) => {
        if (!farm.polygonId) {
            setAgroData(null);
            return;
        }
        setFetchingData(true);
        try {
            const [weatherRes, ndviRes, soilRes] = await Promise.all([
                fetch(`/api/agro?farmId=${farm.id}&type=weather`),
                fetch(`/api/agro?farmId=${farm.id}&type=ndvi`),
                fetch(`/api/agro?farmId=${farm.id}&type=soil`),
            ]);

            let weather = null;
            let ndvi = null;
            let soilMoisture = null;
            let droughtRisk = null;

            if (weatherRes.ok) {
                const wd = await weatherRes.json();
                weather = wd.data;
            }

            if (soilRes.ok) {
                const sd = await soilRes.json();
                const soil = sd.data;
                if (soil) {
                    soilMoisture = Math.round((soil.moisture || 0) * 100);
                    // Drought risk based on soil moisture: below 30% is high risk
                    droughtRisk = Math.max(0, 1 - (soilMoisture / 40));
                }
            } else if (weather?.main?.humidity) {
                // Fallback to humidity-based estimate if soil data fails
                soilMoisture = Math.round(weather.main.humidity * 0.6);
                const temp = weather?.main?.temp || 0;
                const rain = weather?.rain?.['1h'] || 0;
                droughtRisk = Math.min(1, Math.max(0, (temp - 273.15 - 25) / 20 - rain / 10));
            }

            if (ndviRes.ok) {
                const nd = await ndviRes.json();
                if (Array.isArray(nd.data) && nd.data.length > 0) {
                    ndvi = nd.data[nd.data.length - 1]?.data?.mean || null;
                }
            }

            // Normalize weather shape
            let normalizedWeather = null;
            if (weather) {
                normalizedWeather = {
                    main: {
                        temp: weather.main?.temp ?? weather.temp ?? 273.15,
                        humidity: weather.main?.humidity ?? weather.humidity ?? 0,
                        pressure: weather.main?.pressure ?? weather.pressure ?? 0,
                    },
                    weather: weather.weather || [],
                    wind: { speed: weather.wind?.speed ?? weather.wind_speed ?? 0 },
                    rain: weather.rain || {},
                };
            }

            setAgroData({
                ndvi,
                weather: normalizedWeather,
                soilMoisture,
                droughtRisk
            });
        } catch (err) {
            console.error('Error fetching agro data:', err);
        } finally {
            setFetchingData(false);
        }
    };

    // Fetch insights
    const fetchInsights = async (farmId: string) => {
        try {
            const res = await fetch(`/api/insights/generate?farmId=${farmId}`);
            if (res.ok) {
                const data = await res.json();
                setInsights(data.insights || []);
            }
        } catch (err) {
            console.error('Error fetching insights:', err);
        }
    };

    // Select farm
    const handleSelectFarm = (farm: Farm) => {
        setSelectedFarm(farm);
        setActiveTab('data');
        fetchAgroData(farm);
        fetchInsights(farm.id);
    };

    // Create farm
    const handleCreateFarm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName || !formLocation) return;
        setCreating(true);

        try {
            const body: any = {
                name: formName.trim(),
                location: formLocation.trim(),
                areaHa: formArea ? parseFloat(formArea) : undefined,
            };

            if (drawnCoords && drawnCoords.length >= 3) {
                body.coordinates = drawnCoords;
            }

            const res = await fetch('/api/farms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.farm) {
                    setFarms(prev => [...prev, data.farm]);
                    setShowCreateModal(false);
                    setFormName('');
                    setFormLocation('');
                    setFormArea('');
                    setDrawnCoords(null);
                    handleSelectFarm(data.farm);
                } else {
                    console.error('❌ [Farms] Server returned success but no farm data');
                    alert('Farm was created but data could not be loaded. Please refresh.');
                }
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create farm');
            }
        } catch (err) {
            console.error('Error creating farm:', err);
            alert('Error creating farm');
        } finally {
            setCreating(false);
        }
    };

    // Generate insights
    const handleGenerateInsights = async () => {
        if (!selectedFarm) return;
        setGeneratingInsights(true);
        try {
            const res = await fetch('/api/insights/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ farmId: selectedFarm.id }),
            });
            if (res.ok) {
                const data = await res.json();
                // Refresh insights list
                fetchInsights(selectedFarm.id);
                setActiveTab('insights');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to generate insights');
            }
        } catch (err) {
            console.error('Error generating insights:', err);
        } finally {
            setGeneratingInsights(false);
        }
    };

    // Delete farm
    const handleDeleteFarm = async (farmId: string) => {
        if (!confirm('Are you sure you want to delete this farm?')) return;
        try {
            const res = await fetch(`/api/farms/${farmId}`, { method: 'DELETE' });
            if (res.ok) {
                setFarms(prev => prev.filter(f => f.id !== farmId));
                if (selectedFarm?.id === farmId) {
                    setSelectedFarm(null);
                    setAgroData(null);
                    setInsights([]);
                }
            }
        } catch (err) {
            console.error('Error deleting farm:', err);
        }
    };

    // Helper: format NDVI
    const ndviLabel = (val: number | null) => {
        if (val == null) return { text: 'N/A', color: '#6B7280' };
        if (val > 0.6) return { text: `${val.toFixed(3)} (Healthy)`, color: '#10B981' };
        if (val > 0.4) return { text: `${val.toFixed(3)} (Moderate)`, color: '#FBBF24' };
        if (val > 0.2) return { text: `${val.toFixed(3)} (Stressed)`, color: '#F97316' };
        return { text: `${val.toFixed(3)} (Critical)`, color: '#EF4444' };
    };

    const droughtLabel = (val: number | null) => {
        if (val == null) return { text: 'N/A', color: '#6B7280' };
        if (val > 0.7) return { text: `${(val * 100).toFixed(0)}% HIGH`, color: '#EF4444' };
        if (val > 0.4) return { text: `${(val * 100).toFixed(0)}% MODERATE`, color: '#F97316' };
        return { text: `${(val * 100).toFixed(0)}% LOW`, color: '#10B981' };
    };

    if (status === 'loading' || loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>Loading your farms...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Link href="/dashboard" className={styles.backLink}>← Back to Dashboard</Link>

            <div className={styles.header}>
                <div>
                    <h1>🌾 My Farms</h1>
                    <p>Manage your farms, view satellite data, and generate AI insights</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Add Farm
                </button>
            </div>

            {/* Farm Grid */}
            {farms.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🌱</div>
                    <h2>No farms yet</h2>
                    <p>
                        Add your first farm by drawing its boundary on the map.
                        We&apos;ll automatically start tracking NDVI, weather, and soil data.
                    </p>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        + Create Your First Farm
                    </button>
                </div>
            ) : (
                <div className={styles.farmGrid}>
                    {farms.map(farm => {
                        if (!farm) return null; // Safety guard for null items
                        const isSelected = selectedFarm?.id === farm.id;
                        return (
                            <div
                                key={farm.id}
                                className={`${styles.farmCard} ${isSelected ? styles.selected : ''}`}
                                onClick={() => handleSelectFarm(farm)}
                            >
                                <div className={styles.farmCardHeader}>
                                    <div>
                                        <div className={styles.farmName}>{farm.name}</div>
                                        <div className={styles.farmLocation}>📍 {farm.location}</div>
                                    </div>
                                    <span className={`${styles.farmBadge} ${!farm.polygonId ? styles.noPolygon : ''}`}>
                                        {farm.polygonId ? '🛰️ Tracked' : '⚠️ No polygon'}
                                    </span>
                                </div>
                                <div className={styles.farmStats}>
                                    <div className={styles.farmStat}>
                                        <div className={styles.farmStatValue}>
                                            {farm.areaHa ? `${farm.areaHa} ha` : '—'}
                                        </div>
                                        <div className={styles.farmStatLabel}>Area</div>
                                    </div>
                                    <div className={styles.farmStat}>
                                        <div className={styles.farmStatValue}>
                                            {new Date(farm.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className={styles.farmStatLabel}>Added</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Selected Farm Detail Panel */}
            {selectedFarm && (
                <div className={styles.detailPanel}>
                    <div className={styles.detailHeader}>
                        <div>
                            <h2>📊 {selectedFarm.name}</h2>
                            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                                📍 {selectedFarm.location}
                                {selectedFarm.areaHa ? ` • ${selectedFarm.areaHa} hectares` : ''}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                className="btn-primary"
                                onClick={handleGenerateInsights}
                                disabled={generatingInsights || !selectedFarm.polygonId}
                                style={{ fontSize: '0.85rem' }}
                            >
                                {generatingInsights ? '⏳ Generating...' : '🤖 Generate AI Insights'}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => handleDeleteFarm(selectedFarm.id)}
                                style={{ fontSize: '0.85rem', color: '#EF4444' }}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.detailTabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'data' ? styles.active : ''}`}
                            onClick={() => setActiveTab('data')}
                        >
                            📊 Live Data
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'insights' ? styles.active : ''}`}
                            onClick={() => setActiveTab('insights')}
                        >
                            🧠 AI Insights
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'map' ? styles.active : ''}`}
                            onClick={() => setActiveTab('map')}
                        >
                            🗺️ Map View
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'data' && (
                        <div style={{ marginTop: '1.5rem' }}>
                            {fetchingData ? (
                                <div className={styles.loading} style={{ minHeight: '200px' }}>
                                    <div className={styles.spinner} />
                                    <p>Fetching satellite data...</p>
                                </div>
                            ) : !selectedFarm.polygonId ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    <p>⚠️ This farm has no polygon. Re-create it with a map boundary to enable data tracking.</p>
                                </div>
                            ) : agroData ? (
                                <div className={styles.dataGrid}>
                                    <div className={styles.dataCard}>
                                        <div className={styles.dataCardValue} style={{ color: ndviLabel(agroData.ndvi).color }}>
                                            {ndviLabel(agroData.ndvi).text}
                                        </div>
                                        <div className={styles.dataCardLabel}>🛰️ NDVI Index</div>
                                    </div>
                                    <div className={`${styles.dataCard} ${styles.weather}`}>
                                        <div className={styles.dataCardValue}>
                                            {agroData.weather?.main?.temp
                                                ? `${(agroData.weather.main.temp - 273.15).toFixed(1)}°C`
                                                : 'N/A'}
                                        </div>
                                        <div className={styles.dataCardLabel}>🌡️ Temperature</div>
                                    </div>
                                    <div className={`${styles.dataCard} ${styles.weather}`}>
                                        <div className={styles.dataCardValue}>
                                            {agroData.weather?.main?.humidity
                                                ? `${agroData.weather.main.humidity}%`
                                                : 'N/A'}
                                        </div>
                                        <div className={styles.dataCardLabel}>💧 Humidity</div>
                                    </div>
                                    <div className={styles.dataCard}>
                                        <div className={styles.dataCardValue}>
                                            {agroData.soilMoisture != null ? `${agroData.soilMoisture}%` : 'N/A'}
                                        </div>
                                        <div className={styles.dataCardLabel}>🌱 Soil Moisture (est.)</div>
                                    </div>
                                    <div className={`${styles.dataCard} ${styles.drought}`}>
                                        <div className={styles.dataCardValue} style={{ color: droughtLabel(agroData.droughtRisk).color }}>
                                            {droughtLabel(agroData.droughtRisk).text}
                                        </div>
                                        <div className={styles.dataCardLabel}>🔥 Drought Risk</div>
                                    </div>
                                    <div className={`${styles.dataCard} ${styles.weather}`}>
                                        <div className={styles.dataCardValue}>
                                            {agroData.weather?.wind?.speed
                                                ? `${agroData.weather.wind.speed} m/s`
                                                : 'N/A'}
                                        </div>
                                        <div className={styles.dataCardLabel}>💨 Wind Speed</div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#6b7280' }}>
                                    No data available yet. Click &quot;Generate AI Insights&quot; to fetch fresh data.
                                </p>
                            )}
                        </div>
                    )}

                    {activeTab === 'insights' && (
                        <div className={styles.insightsSection}>
                            {insights.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    <p>No insights generated yet. Click &quot;Generate AI Insights&quot; to get started.</p>
                                </div>
                            ) : (
                                insights.map(insight => (
                                    <div key={insight.id}>
                                        {insight.data?.summary && (
                                            <div className={styles.insightCard}>
                                                <h4>📋 Summary ({insight.data?.overallHealth?.toUpperCase() || 'N/A'})</h4>
                                                <p style={{ fontSize: '0.9rem' }}>{insight.data.summary}</p>
                                                <small style={{ color: '#9CA3AF' }}>
                                                    {new Date(insight.createdAt).toLocaleString()}
                                                </small>
                                            </div>
                                        )}
                                        {insight.data?.problems && insight.data.problems.length > 0 && (
                                            <div className={`${styles.insightCard} ${styles.risk}`}>
                                                <h4>⚠️ Problems</h4>
                                                <ul>
                                                    {insight.data.problems.map((p, i) => <li key={i}>{p}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {insight.recommendations && insight.recommendations.length > 0 && (
                                            <div className={styles.insightCard}>
                                                <h4>✅ Recommendations</h4>
                                                <ul>
                                                    {insight.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'map' && (
                        <div style={{ marginTop: '1rem' }}>
                            <FarmMap
                                editable={false}
                                height="400px"
                                existingPolygons={selectedFarm.polygonId ? [{
                                    id: selectedFarm.id,
                                    name: selectedFarm.name,
                                    coordinates: [], // Polygon coords stored on AgroMonitoring side
                                }] : []}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Create Farm Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>🌾 Add New Farm</h2>
                        <form onSubmit={handleCreateFarm}>
                            <div className={styles.formGroup}>
                                <label>Farm Name *</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g., North Field"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Location *</label>
                                <input
                                    type="text"
                                    value={formLocation}
                                    onChange={e => setFormLocation(e.target.value)}
                                    placeholder="e.g., Punjab, India"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Area (hectares)</label>
                                <input
                                    type="number"
                                    value={formArea}
                                    onChange={e => setFormArea(e.target.value)}
                                    placeholder="e.g., 2.5"
                                    step="0.1"
                                />
                            </div>

                            <div className={styles.mapSection}>
                                <h3>🗺️ Draw Farm Boundary (Optional)</h3>
                                <p className={styles.mapHint}>
                                    Use the polygon tool in the top-right corner of the map to draw your farm boundary.
                                    This enables satellite NDVI tracking via AgroMonitoring.
                                </p>
                                <FarmMap
                                    editable={true}
                                    height="300px"
                                    zoom={6}
                                    onPolygonCreated={(coords, areaHa) => {
                                        setDrawnCoords(coords);
                                        if (areaHa) {
                                            setFormArea(areaHa.toString());
                                        }
                                    }}
                                />
                                {drawnCoords && (
                                    <p style={{ color: '#10B981', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                        ✅ Polygon drawn with {drawnCoords.length} points
                                        {formArea ? ` • Area: ${formArea} hectares` : ''}
                                    </p>
                                )}
                            </div>

                            <div className={styles.formActions}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={creating}
                                >
                                    {creating ? '⏳ Creating...' : '✅ Create Farm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
