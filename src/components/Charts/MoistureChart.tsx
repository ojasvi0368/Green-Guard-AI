'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function MoistureChart() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPredictions();
    }, []);

    const fetchPredictions = async () => {
        try {
            const response = await fetch('/api/predictions?days=14');
            const result = await response.json();

            // Combine historical and predictions
            const chartData = [
                ...result.historical.map((d: any) => ({
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    actual: d.value,
                    type: 'historical'
                })),
                ...result.soilMoisturePrediction.map((d: any) => ({
                    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    predicted: d.predicted,
                    stress: d.stress,
                    type: 'predicted'
                }))
            ];

            setData(chartData);
        } catch (error) {
            console.error('Predictions fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="card-glass">
                <div className="skeleton" style={{ height: '300px' }} />
            </div>
        );
    }

    return (
        <div className="card-glass">
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                    Soil Moisture Trends & Predictions
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
                    AI-powered 7-day forecast
                </p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        label={{ value: 'Moisture (%)', angle: -90, position: 'insideLeft', fill: '#6B7280' }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'white',
                            border: '2px solid #10B981',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value, name) => [`${value}%`, name]}
                        labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                        type="monotone"
                        dataKey="actual"
                        stroke="#10B981"
                        strokeWidth={3}
                        fill="url(#colorActual)"
                        name="Historical"
                        dot={{ r: 3, fill: '#10B981' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="predicted"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#colorPredicted)"
                        name="Predicted"
                        dot={{ r: 3, fill: '#3B82F6' }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '2rem',
                marginTop: '1rem',
                fontSize: '0.85rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '20px',
                        height: '3px',
                        background: '#10B981',
                        borderRadius: '2px'
                    }} />
                    <span>Historical Data</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '20px',
                        height: '3px',
                        background: '#3B82F6',
                        borderRadius: '2px',
                        backgroundImage: 'repeating-linear-gradient(90deg, #3B82F6, #3B82F6 5px, transparent 5px, transparent 10px)'
                    }} />
                    <span>AI Prediction</span>
                </div>
            </div>

            {/* Insight Box */}
            <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'rgba(16, 185, 129, 0.1)',
                borderLeft: '4px solid #10B981',
                borderRadius: '4px',
                fontSize: '0.85rem'
            }}>
                <strong>📊 AI Insight:</strong>{' '}
                {data.length > 0
                    ? 'Soil moisture trends are based on real-time data and AI predictions. Monitor closely for stress thresholds.'
                    : 'No soil moisture data available yet. Add a farm and polygon to start monitoring.'
                }
            </div>
        </div>
    );
}
