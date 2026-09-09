'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFarm } from '@/contexts/FarmContext';

interface InsightData {
    problems: string[];
    recommendations: string[];
    futureRisks: string[];
    overallHealth: string;
    summary: string;
}

interface SavedInsight {
    id: string;
    farmId: string;
    createdAt: string;
    riskLevel: string;
    data: InsightData | { summary: string };
    recommendations: string[];
}

export default function AIInsightsPanel() {
    const { selectedFarm } = useFarm();
    const [insights, setInsights] = useState<SavedInsight | null>(null);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch existing insights when farm changes
    const fetchInsights = useCallback(async () => {
        if (!selectedFarm?.id) {
            setInsights(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/insights/generate?farmId=${selectedFarm.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.insights && data.insights.length > 0) {
                    setInsights(data.insights[0]); // Latest insight
                } else {
                    setInsights(null);
                }
            }
        } catch (err) {
            console.error('Error fetching insights:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedFarm?.id]);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    // Generate new insights
    const handleGenerate = async () => {
        if (!selectedFarm?.id) return;

        setGenerating(true);
        setError('');

        try {
            const res = await fetch('/api/insights/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ farmId: selectedFarm.id }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to generate insights');
            }

            const data = await res.json();

            // Convert API response to SavedInsight format
            setInsights({
                id: data.savedId,
                farmId: data.farmId,
                createdAt: data.timestamp,
                riskLevel: data.insights.overallHealth,
                data: data.insights,
                recommendations: data.insights.recommendations || [],
            });
        } catch (err: any) {
            setError(err.message || 'Failed to generate insights');
        } finally {
            setGenerating(false);
        }
    };

    const getHealthColor = (health: string) => {
        switch (health) {
            case 'good': return '#10B981';
            case 'moderate': return '#FBBF24';
            case 'poor': return '#F97316';
            case 'critical': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getHealthEmoji = (health: string) => {
        switch (health) {
            case 'good': return '✅';
            case 'moderate': return '⚠️';
            case 'poor': return '🔶';
            case 'critical': return '🔴';
            default: return '📊';
        }
    };

    // No farm selected
    if (!selectedFarm) {
        return (
            <div className="card-glass">
                <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.1rem' }}>🤖 AI Insights</h3>
                <p style={{ opacity: 0.6, fontSize: '0.875rem' }}>Select a farm to generate AI insights</p>
            </div>
        );
    }

    const insightData = insights?.data as any;
    const isML = insightData?.isML === true;
    const healthStatus = insightData?.overallHealth || insights?.riskLevel || '';

    return (
        <div className="card-glass">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                        {isML ? '🎯 ML Crop Recommendation' : '🤖 AI Insights'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                        🌾 {selectedFarm.name}
                        {insights?.createdAt && ` • ${new Date(insights.createdAt).toLocaleDateString()}`}
                    </p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                        padding: '0.6rem 1.2rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: generating ? '#9CA3AF' : 'var(--gradient-primary, linear-gradient(135deg, #10B981, #059669))',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: generating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.3s ease',
                        boxShadow: generating ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}
                >
                    {generating ? (
                        <>
                            <span className="pulse">⏳</span>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            ✨ {isML ? 'Refresh recommendation' : 'Generate AI Insights'}
                        </>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '8px',
                    color: '#DC2626',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div className="skeleton" style={{ height: '120px' }} />
            ) : !insights ? (
                /* No insights yet */
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    opacity: 0.6,
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧠</div>
                    <p style={{ fontSize: '0.9rem' }}>No insights generated yet</p>
                    <p style={{ fontSize: '0.8rem' }}>Click "Generate AI Insights" to analyze your farm data</p>
                </div>
            ) : (
                /* Display insights */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Health Badge */}
                    {!isML && healthStatus && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '999px',
                            background: `${getHealthColor(healthStatus)}15`,
                            color: getHealthColor(healthStatus),
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            alignSelf: 'flex-start',
                            textTransform: 'capitalize',
                        }}>
                            {getHealthEmoji(healthStatus)} Farm Health: {healthStatus}
                        </div>
                    )}

                    {isML && insightData.predictedCrop && (
                        <div style={{
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                            borderRadius: '16px',
                            textAlign: 'center',
                            border: '1px solid #10B981',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
                            <div style={{ fontSize: '0.8rem', color: '#065F46', fontWeight: 600 }}>RECOMMENDED CROP</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#064E3B', margin: '0.25rem 0' }}>
                                {insightData.predictedCrop.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#047857' }}>
                                Based on ML soil & climate analysis
                            </div>
                        </div>
                    )}

                    {/* Summary / Analysis */}
                    {(insightData?.summary || insightData?.analysis) && (
                        <div style={{
                            padding: '1rem',
                            background: 'var(--gradient-subtle, rgba(16, 185, 129, 0.05))',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            lineHeight: 1.6,
                        }}>
                            {insightData.summary || insightData.analysis}
                        </div>
                    )}

                    {/* Problems */}
                    {insightData?.problems && insightData.problems.length > 0 && (
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#F97316' }}>
                                ⚠️ Issues Detected
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
                                {insightData.problems.map((p: string, i: number) => (
                                    <li key={i}>{p}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {(insights.recommendations?.length > 0 || (insightData?.recommendations && insightData.recommendations.length > 0)) && (
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#10B981' }}>
                                💡 {isML ? 'Guidance' : 'Recommendations'}
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
                                {(insightData?.recommendations || insights.recommendations || []).map((r: string, i: number) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Future Risks */}
                    {insightData?.futureRisks && insightData.futureRisks.length > 0 && (
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#EF4444' }}>
                                🔮 Future Risks
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', lineHeight: 1.8 }}>
                                {insightData.futureRisks.map((r: string, i: number) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
