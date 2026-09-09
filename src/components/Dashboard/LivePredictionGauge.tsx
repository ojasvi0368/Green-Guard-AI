'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface LivePredictionGaugeProps {
    moisture: number;       // 0–100
    ndvi: number | null;
    temp: number | null;    // °C
    irrigationNeeded: boolean;
    moistureHistory?: { value: number; time: string }[];  // rolling readings
    sensorConnected?: boolean;  // true if receiving live sensor data
}

export default function LivePredictionGauge({
    moisture,
    ndvi,
    temp,
    irrigationNeeded,
    moistureHistory = [],
    sensorConnected = false,
}: LivePredictionGaugeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();

    // Clamp moisture to 0-100
    const pct = Math.max(0, Math.min(100, moisture));

    // Draw the arc gauge on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H * 0.72;
        const r = W * 0.38;
        const startAngle = Math.PI;
        const endAngle = 2 * Math.PI;

        ctx.clearRect(0, 0, W, H);

        // ── Background arc (track) ──
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.stroke();

        // ── Enhanced Gradient Arc ──
        // Smoothly transitions from Dry (Red) to Wet (Blue) mapping across the arc width
        const gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        gradient.addColorStop(0, '#EF4444');    // Dry/Critical (Red)
        gradient.addColorStop(0.35, '#FBBF24'); // Low (Yellow)
        gradient.addColorStop(0.65, '#10B981'); // Optimal (Green)
        gradient.addColorStop(1, '#3B82F6');    // Wet (Blue)

        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.stroke();

        // ── Needle ──
        const needleAngle = startAngle + (pct / 100) * Math.PI;
        const nr = r * 0.85;
        const nx = cx + nr * Math.cos(needleAngle);
        const ny = cy + nr * Math.sin(needleAngle);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Needle pivot circle
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
        ctx.fillStyle = '#1F2937';
        ctx.fill();
    }, [pct]);

    // ── Derived indicator values ──
    const ndviInfo = ndvi == null
        ? { icon: '🛰️', value: 'N/A', status: 'No Data', color: '#9CA3AF', bg: '#F9FAFB', borderColor: '#E5E7EB' }
        : ndvi >= 0.6
            ? { icon: '🛰️', value: ndvi.toFixed(2), status: 'Healthy', color: '#10B981', bg: '#F0FDF4', borderColor: '#10B981' }
            : ndvi >= 0.4
                ? { icon: '🛰️', value: ndvi.toFixed(2), status: 'Moderate', color: '#FBBF24', bg: '#FFFBEB', borderColor: '#FBBF24' }
                : ndvi >= 0.2
                    ? { icon: '🛰️', value: ndvi.toFixed(2), status: 'Stressed', color: '#F97316', bg: '#FFF7ED', borderColor: '#F97316' }
                    : { icon: '🛰️', value: ndvi.toFixed(2), status: 'Critical', color: '#EF4444', bg: '#FEF2F2', borderColor: '#EF4444' };

    const tempInfo = {
        icon: '🌡️',
        value: temp !== null ? `${Math.round(temp)}°C` : 'N/A',
        status: temp !== null
            ? temp > 35 ? 'Very Hot' : temp > 28 ? 'Hot' : temp > 20 ? 'Warm' : 'Cool'
            : 'No Data',
        color: temp !== null
            ? temp > 35 ? '#EF4444' : temp > 28 ? '#F97316' : temp > 20 ? '#FBBF24' : '#3B82F6'
            : '#9CA3AF',
        bg: temp !== null
            ? temp > 35 ? '#FEF2F2' : temp > 28 ? '#FFF7ED' : temp > 20 ? '#FFFBEB' : '#EFF6FF'
            : '#F9FAFB',
        borderColor: temp !== null
            ? temp > 35 ? '#EF4444' : temp > 28 ? '#F97316' : temp > 20 ? '#FBBF24' : '#3B82F6'
            : '#E5E7EB',
    };

    const irrigInfo = irrigationNeeded
        ? { icon: '💧', value: 'Needed', status: 'Irrigate Now', color: '#EF4444', bg: '#FEF2F2', borderColor: '#EF4444' }
        : { icon: '🚿', value: 'Not Needed', status: 'Optimal', color: '#10B981', bg: '#F0FDF4', borderColor: '#10B981' };

    const moistureColor = pct < 25 ? '#EF4444'
        : pct < 45 ? '#FBBF24'
        : pct < 75 ? '#10B981'
        : '#3B82F6';

    const indicatorCardStyle = (bg: string, borderColor: string) => ({
        flex: 1,
        background: bg,
        borderRadius: '14px',
        padding: '0.65rem 0.5rem',
        textAlign: 'center' as const,
        border: `2px solid ${borderColor}`,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '0.1rem',
        minWidth: 0,
    });

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                        Live Prediction Gauge
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Real-time soil moisture
                    </div>
                </div>
                <div style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: '#10B981',
                    background: '#F0FDF4',
                    border: '1px solid #10B981',
                    borderRadius: '999px',
                    padding: '0.2rem 0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                }}>
                    <span style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#10B981', display: 'inline-block',
                        animation: 'pulse 1.5s infinite'
                    }} />
                    LIVE
                </div>
            </div>

            {/* ── 3 Indicator Icon Cards (NDVI / Temp / Irrigation) ── */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
                {/* NDVI Card */}
                <div style={indicatorCardStyle(ndviInfo.bg, ndviInfo.borderColor)}>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{ndviInfo.icon}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: ndviInfo.color, lineHeight: 1 }}>
                        {ndviInfo.value}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: ndviInfo.color, opacity: 0.9 }}>
                        NDVI
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#6B7280' }}>{ndviInfo.status}</div>
                </div>

                {/* Temperature Card */}
                <div style={indicatorCardStyle(tempInfo.bg, tempInfo.borderColor)}>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{tempInfo.icon}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: tempInfo.color, lineHeight: 1 }}>
                        {tempInfo.value}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: tempInfo.color, opacity: 0.9 }}>
                        TEMP
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#6B7280' }}>{tempInfo.status}</div>
                </div>

                {/* Irrigation Card */}
                <div style={indicatorCardStyle(irrigInfo.bg, irrigInfo.borderColor)}>
                    <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{irrigInfo.icon}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: irrigInfo.color, lineHeight: 1.1, textAlign: 'center' }}>
                        {irrigInfo.value}
                    </div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: irrigInfo.color, opacity: 0.9 }}>
                        IRRIGATION
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#6B7280' }}>{irrigInfo.status}</div>
                </div>
            </div>

            {/* ── Soil Moisture History Sparkline ── */}
            {(() => {
                const W = 400;
                const H = 60;
                const pad = { top: 6, bottom: 14, left: 28, right: 8 };
                const innerW = W - pad.left - pad.right;
                const innerH = H - pad.top - pad.bottom;

                const lineColor = moistureColor;
                const fillColor = moistureColor + '22'; // 13% opacity fill

                if (moistureHistory.length < 2) {
                    return (
                        <div style={{
                            height: `${H}px`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F9FAFB',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            color: '#9CA3AF',
                            fontStyle: 'italic',
                        }}>
                            {moistureHistory.length === 0
                                ? '📊 Collecting moisture data…'
                                : '📊 Waiting for more readings…'}
                        </div>
                    );
                }

                const vals = moistureHistory.map(d => d.value);
                const rawMin = Math.min(...vals);
                const rawMax = Math.max(...vals);
                // Give at least 10% range so a flat line is visible
                const range = rawMax - rawMin < 5 ? 5 : rawMax - rawMin;
                const minV = Math.max(0, rawMin - range * 0.15);
                const maxV = Math.min(100, rawMax + range * 0.15);

                const xScale = (i: number) => pad.left + (i / (moistureHistory.length - 1)) * innerW;
                const yScale = (v: number) => pad.top + innerH - ((v - minV) / (maxV - minV)) * innerH;

                const points = moistureHistory.map((d, i) => `${xScale(i).toFixed(1)},${yScale(d.value).toFixed(1)}`).join(' ');
                const fillPath = `M ${xScale(0).toFixed(1)},${(pad.top + innerH).toFixed(1)} ` +
                    moistureHistory.map((d, i) => `L ${xScale(i).toFixed(1)},${yScale(d.value).toFixed(1)}`).join(' ') +
                    ` L ${xScale(moistureHistory.length - 1).toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

                // Tick labels: first, middle, last times
                const half = Math.floor((moistureHistory.length - 1) / 2);
                const ticks = [0, half, moistureHistory.length - 1];

                return (
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '2px',
                        }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                Soil Moisture History
                            </span>
                            <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>
                                {moistureHistory.length} readings
                            </span>
                        </div>
                        <svg
                            viewBox={`0 0 ${W} ${H}`}
                            style={{ width: '100%', height: `${H}px`, display: 'block', borderRadius: '10px', background: '#F9FAFB' }}
                            preserveAspectRatio="none"
                        >
                            {/* Subtle grid lines */}
                            {[0.25, 0.5, 0.75].map(t => {
                                const y = pad.top + innerH * (1 - t);
                                return (
                                    <line
                                        key={t}
                                        x1={pad.left} y1={y}
                                        x2={W - pad.right} y2={y}
                                        stroke="#E5E7EB"
                                        strokeWidth="0.5"
                                        strokeDasharray="4 3"
                                    />
                                );
                            })}

                            {/* Fill area */}
                            <path d={fillPath} fill={fillColor} />

                            {/* Line */}
                            <polyline
                                points={points}
                                fill="none"
                                stroke={lineColor}
                                strokeWidth="2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />

                            {/* Last point dot */}
                            <circle
                                cx={xScale(moistureHistory.length - 1)}
                                cy={yScale(moistureHistory[moistureHistory.length - 1].value)}
                                r="3.5"
                                fill={lineColor}
                                stroke="#fff"
                                strokeWidth="1.5"
                            />

                            {/* Y-axis labels (min/max) */}
                            <text x={pad.left - 2} y={pad.top + 4} textAnchor="end" fontSize="7" fill="#9CA3AF">
                                {Math.round(maxV)}%
                            </text>
                            <text x={pad.left - 2} y={pad.top + innerH} textAnchor="end" fontSize="7" fill="#9CA3AF">
                                {Math.round(minV)}%
                            </text>

                            {/* X-axis time ticks */}
                            {ticks.map(idx => (
                                <text
                                    key={idx}
                                    x={xScale(idx)}
                                    y={H - 2}
                                    textAnchor="middle"
                                    fontSize="7"
                                    fill="#9CA3AF"
                                >
                                    {moistureHistory[idx].time}
                                </text>
                            ))}
                        </svg>
                    </div>
                );
            })()}

            {/* Gauge + ESP image row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                {/* Gauge */}
                <div style={{ position: 'relative', flex: '1 1 auto' }}>
                    <canvas
                        ref={canvasRef}
                        width={280}
                        height={160}
                        style={{ width: '100%', maxWidth: '280px', height: 'auto', display: 'block', margin: '0 auto' }}
                    />
                    {/* Centre label */}
                    <div style={{
                        position: 'absolute',
                        bottom: '14%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                    }}>
                        <div style={{
                            fontSize: '2.2rem',
                            fontWeight: 900,
                            color: moistureColor,
                            lineHeight: 1,
                        }}>
                            {pct.toFixed(1)}%
                        </div>
                    </div>
                    {/* Dry / Wet labels */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#9CA3AF',
                        paddingTop: '0.15rem',
                        maxWidth: '280px',
                        margin: '0 auto',
                    }}>
                        <span>Dry</span>
                        <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 600 }}>• LVR ESP32 DATA</span>
                        <span>Wet</span>
                    </div>
                </div>

                {/* Sensor / device graphic — shows live connection status */}
                <div style={{
                    flexShrink: 0,
                    width: '90px',
                    height: '120px',
                    background: sensorConnected
                        ? 'linear-gradient(135deg, #064E3B 0%, #065F46 60%, #047857 100%)'
                        : 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 60%, #B91C1C 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                    boxShadow: sensorConnected
                        ? '0 4px 14px rgba(16,185,129,0.35)'
                        : '0 4px 14px rgba(239,68,68,0.35)',
                    transition: 'all 0.5s ease',
                }}>
                    <div style={{ fontSize: '2rem' }}>{sensorConnected ? '📡' : '📵'}</div>
                    <div style={{
                        fontSize: '0.52rem',
                        color: sensorConnected ? '#A7F3D0' : '#FECACA',
                        fontWeight: 700,
                        textAlign: 'center',
                        letterSpacing: '0.04em',
                        lineHeight: 1.3,
                    }}>
                        ESP32<br />SENSOR
                    </div>
                    {/* Status indicator row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: sensorConnected ? '#10B981' : '#EF4444',
                            animation: sensorConnected ? 'pulse 1.2s infinite' : 'none',
                            boxShadow: sensorConnected ? '0 0 6px #10B981' : 'none',
                        }} />
                        <span style={{
                            fontSize: '0.48rem',
                            fontWeight: 800,
                            color: sensorConnected ? '#6EE7B7' : '#FCA5A5',
                            letterSpacing: '0.05em',
                        }}>
                            {sensorConnected ? 'CONNECTED' : 'OFFLINE'}
                        </span>
                    </div>
                </div>

            </div>

            {/* View Detailed Log */}
            <div style={{ textAlign: 'center' }}>
                <button
                    onClick={() => router.push('/soil-moisture')}
                    style={{
                        background: 'none',
                        border: '1px solid var(--color-primary, #10B981)',
                        color: 'var(--color-primary, #10B981)',
                        borderRadius: '8px',
                        padding: '0.4rem 1.3rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--color-primary, #10B981)';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'none';
                        e.currentTarget.style.color = 'var(--color-primary, #10B981)';
                    }}
                >
                    View Detailed Log
                </button>
            </div>
        </div>
    );
}
