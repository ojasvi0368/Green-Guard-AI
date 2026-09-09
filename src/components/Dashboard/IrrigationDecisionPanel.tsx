'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface IrrigationDecisionPanelProps {
    irrigationNeeded: boolean;
    hoursUntilIrrigation: number | null;   // e.g. 6.75 → "06h 45m"
    onEditSchedule?: () => void;
}

function formatHours(h: number): string {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

const TIME_SLOTS = ['6AM', '1PM', '6PM'];

export default function IrrigationDecisionPanel({
    irrigationNeeded,
    hoursUntilIrrigation,
    onEditSchedule,
}: IrrigationDecisionPanelProps) {
    const router = useRouter();
    const [selectedTime, setSelectedTime] = useState('6AM');
    const [duration, setDuration] = useState(30); // minutes
    const [showHistory, setShowHistory] = useState(false);

    const countdownLabel = hoursUntilIrrigation !== null
        ? formatHours(hoursUntilIrrigation)
        : '—';

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%',
        }}>
            {/* Title */}
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                Irrigation Decision &amp; Schedule
            </div>

            {/* Predicted next irrigation */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
            }}>
                {/* Countdown */}
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        Predicted Next Irrigation
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: 900,
                        color: irrigationNeeded ? '#EF4444' : '#10B981',
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                    }}>
                        {countdownLabel}
                    </div>
                    <button
                        onClick={() => {
                            if (onEditSchedule) onEditSchedule();
                            else router.push('/calculator');
                        }}
                        style={{
                            marginTop: '0.5rem',
                            background: 'var(--color-primary, #10B981)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.35rem 0.9rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        Edit Schedule
                    </button>
                </div>

                {/* NO IRRIGATION / IRRIGATE badge */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '16px',
                    background: irrigationNeeded
                        ? 'linear-gradient(135deg, #FEF2F2, #FCA5A5)'
                        : 'linear-gradient(135deg, #ECFDF5, #A7F3D0)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                    <span style={{ fontSize: '2rem' }}>{irrigationNeeded ? '💧' : '🌱'}</span>
                    <span style={{
                        fontSize: '0.52rem',
                        fontWeight: 800,
                        color: irrigationNeeded ? '#DC2626' : '#065F46',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        letterSpacing: '0.03em',
                    }}>
                        {irrigationNeeded ? 'IRRIGATE\nSOON' : 'NO\nIRRIGATION'}
                    </span>
                </div>
            </div>

            {/* Time of day selector */}
            <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Time of day
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {TIME_SLOTS.map(slot => (
                        <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            style={{
                                flex: 1,
                                padding: '0.35rem 0',
                                borderRadius: '8px',
                                border: selectedTime === slot
                                    ? '2px solid var(--color-primary, #10B981)'
                                    : '2px solid #E5E7EB',
                                background: selectedTime === slot
                                    ? 'var(--color-primary, #10B981)'
                                    : 'var(--color-surface-elevated, #F9FAFB)',
                                color: selectedTime === slot ? '#fff' : 'var(--color-text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {slot}
                        </button>
                    ))}
                </div>
            </div>

            {/* Duration slider */}
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                }}>
                    <span>Duration</span>
                    <span style={{ color: 'var(--color-primary, #10B981)' }}>{duration} min</span>
                </div>
                <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    style={{
                        width: '100%',
                        accentColor: 'var(--color-primary, #10B981)',
                        cursor: 'pointer',
                    }}
                />
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.65rem',
                    color: '#D1D5DB',
                    marginTop: '0.1rem',
                }}>
                    <span>5 min</span>
                    <span>120 min</span>
                </div>
            </div>

            {/* History toggle */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.75rem' }}>
                <button
                    onClick={() => setShowHistory(v => !v)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        padding: 0,
                    }}
                >
                    <span>History</span>
                    <span style={{ color: 'var(--color-primary, #10B981)', fontSize: '1rem' }}>
                        {showHistory ? '⌃' : '›'}
                    </span>
                </button>
                {showHistory && (
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                    }}>
                        {[
                            { label: 'Yesterday', value: '6AM – 25 min' },
                            { label: '2 days ago', value: '1PM – 30 min' },
                            { label: '3 days ago', value: '6AM – 20 min' },
                        ].map(({ label, value }) => (
                            <div key={label} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.3rem 0.5rem',
                                background: '#F9FAFB',
                                borderRadius: '6px',
                            }}>
                                <span>{label}</span>
                                <span style={{ color: 'var(--color-primary, #10B981)', fontWeight: 600 }}>{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
