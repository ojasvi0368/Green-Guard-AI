'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFarm } from '@/contexts/FarmContext';

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const FAVORITES_KEY = 'weather_favorite_locations';

interface GeoResult {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
}

interface LocationWeather {
    name: string;
    lat: number;
    lon: number;
    tempC: number;
    humidity: number;
    description: string;
}

const NEARBY_DEFAULTS = [
    'Agra City Center',
    'Mathura',
    'Aligarh',
    'Firozabad',
    'Etah',
];

export default function SmartLocationSelector() {
    const router = useRouter();
    const { farms, selectedFarm, selectFarm } = useFarm();

    const [query, setQuery] = useState('');
    const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
    const [geocoding, setGeocoding] = useState(false);
    const [favorites, setFavorites] = useState<{ name: string; lat: number; lon: number }[]>([]);
    const [showFavDropdown, setShowFavDropdown] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationWeather | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const queryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const favRef = useRef<HTMLDivElement>(null);

    // Load favorites from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(FAVORITES_KEY);
        if (saved) {
            try { setFavorites(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, []);

    // Close favorites dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (favRef.current && !favRef.current.contains(e.target as Node)) {
                setShowFavDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced geocoding search
    useEffect(() => {
        if (queryRef.current) clearTimeout(queryRef.current);
        if (!query.trim() || query.length < 2) {
            setGeoResults([]);
            return;
        }
        queryRef.current = setTimeout(async () => {
            setGeocoding(true);
            try {
                const res = await fetch(
                    `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
                );
                const data = await res.json();
                setGeoResults(data.results || []);
            } catch {
                setGeoResults([]);
            } finally {
                setGeocoding(false);
            }
        }, 400);
        return () => { if (queryRef.current) clearTimeout(queryRef.current); };
    }, [query]);

    // Fetch weather for a lat/lon via Open-Meteo
    const fetchLocationWeather = useCallback(async (name: string, lat: number, lon: number) => {
        setWeatherLoading(true);
        setSelectedLocation(null);
        try {
            const res = await fetch(
                `${FORECAST_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=auto`
            );
            const data = await res.json();
            const c = data.current;
            const wcode = c?.weather_code ?? 0;
            const desc =
                wcode === 0 ? 'Clear sky' :
                wcode <= 3 ? 'Partly cloudy' :
                wcode <= 49 ? 'Foggy' :
                wcode <= 69 ? 'Drizzle' :
                wcode <= 79 ? 'Rain' :
                wcode <= 99 ? 'Thunderstorm' : 'Cloudy';

            setSelectedLocation({
                name,
                lat,
                lon,
                tempC: Math.round(c?.temperature_2m ?? 0),
                humidity: c?.relative_humidity_2m ?? 0,
                description: desc,
            });
        } catch {
            setSelectedLocation(null);
        } finally {
            setWeatherLoading(false);
        }
    }, []);

    const handleSelectGeoResult = (r: GeoResult) => {
        const name = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
        setQuery('');
        setGeoResults([]);
        fetchLocationWeather(name, r.latitude, r.longitude);
    };

    const handleSelectNearby = async (locationName: string) => {
        setWeatherLoading(true);
        setSelectedLocation(null);
        try {
            const res = await fetch(
                `${GEOCODING_API}?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`
            );
            const data = await res.json();
            const r: GeoResult | undefined = data.results?.[0];
            if (r) {
                await fetchLocationWeather(locationName, r.latitude, r.longitude);
            }
        } catch {
            setWeatherLoading(false);
        }
    };

    const saveFavorite = (name: string, lat: number, lon: number) => {
        const next = [...favorites.filter(f => f.name !== name), { name, lat, lon }];
        setFavorites(next);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    };

    const removeFavorite = (name: string) => {
        const next = favorites.filter(f => f.name !== name);
        setFavorites(next);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    };

    const getWeatherIcon = (desc: string) => {
        const d = desc.toLowerCase();
        if (d.includes('clear')) return '☀️';
        if (d.includes('cloud')) return '⛅';
        if (d.includes('rain')) return '🌧️';
        if (d.includes('thunder')) return '⛈️';
        if (d.includes('fog')) return '🌫️';
        return '🌤️';
    };

    // Filtered farms by search query
    const filteredFarms = farms.filter(f =>
        !query ||
        f.name.toLowerCase().includes(query.toLowerCase()) ||
        f.location.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div style={{
            background: 'var(--color-surface)',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    📍 Smart Location Selector
                </h3>
            </div>

            {/* Search + Action Buttons Row */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap', position: 'relative' }}>
                {/* Search input with dropdown */}
                <div style={{ flex: '1 1 260px', position: 'relative' }}>
                    <span style={{
                        position: 'absolute', left: '0.75rem', top: '50%',
                        transform: 'translateY(-50%)', fontSize: '0.9rem', opacity: 0.5,
                    }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search for a city or location..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem 0.55rem 2.1rem',
                            borderRadius: '10px',
                            border: '1.5px solid var(--color-border)',
                            background: 'var(--color-surface-elevated)',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                    {/* Geocoding dropdown results */}
                    {(geocoding || geoResults.length > 0) && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            zIndex: 100,
                            overflow: 'hidden',
                        }}>
                            {geocoding && (
                                <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
                                    🔍 Searching...
                                </div>
                            )}
                            {geoResults.map((r, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelectGeoResult(r)}
                                    style={{
                                        padding: '0.6rem 1rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        borderBottom: i < geoResults.length - 1 ? '1px solid var(--color-border)' : 'none',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                                    <span style={{ color: '#9CA3AF', fontSize: '0.78rem', marginLeft: '0.4rem' }}>
                                        {[r.admin1, r.country].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Select from Map — navigates to /my-farms */}
                <button
                    onClick={() => router.push('/farms')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.55rem 1rem',
                        borderRadius: '10px',
                        border: '1.5px solid #10B981',
                        background: 'rgba(16,185,129,0.08)',
                        color: '#059669',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    🗺️ Select from Map
                </button>

                {/* Favorites */}
                <div style={{ position: 'relative' }} ref={favRef}>
                    <button
                        onClick={() => setShowFavDropdown(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.55rem 1rem',
                            borderRadius: '10px',
                            border: '1.5px solid #F59E0B',
                            background: 'rgba(245,158,11,0.08)',
                            color: '#D97706',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ⭐ Favorites
                        {favorites.length > 0 && (
                            <span style={{
                                background: '#F59E0B', color: 'white', borderRadius: '999px',
                                fontSize: '0.65rem', fontWeight: 700,
                                padding: '0.05rem 0.4rem', lineHeight: 1.5,
                            }}>{favorites.length}</span>
                        )}
                    </button>

                    {showFavDropdown && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                            minWidth: '230px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            zIndex: 50,
                            padding: '0.5rem 0',
                        }}>
                            {favorites.length === 0 ? (
                                <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
                                    No saved locations yet
                                </div>
                            ) : favorites.map(fav => (
                                <div key={fav.name} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            fetchLocationWeather(fav.name, fav.lat, fav.lon);
                                            setShowFavDropdown(false);
                                        }}
                                    >
                                        📍 {fav.name}
                                    </span>
                                    <button
                                        onClick={() => removeFavorite(fav.name)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.75rem' }}
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Current active farm badge */}
            {selectedFarm && !selectedLocation && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.85rem',
                    background: 'rgba(16,185,129,0.08)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: '#059669',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    border: '1px solid rgba(16,185,129,0.2)',
                }}>
                    <span>📡</span>
                    <span style={{ flex: 1 }}>Showing weather for: {selectedFarm.name} — {selectedFarm.location}</span>
                </div>
            )}

            {/* Non-farm location weather preview */}
            {(selectedLocation || weatherLoading) && (
                <div style={{
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.08))',
                    border: '1.5px solid rgba(59,130,246,0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                }}>
                    {weatherLoading ? (
                        <div style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>⏳ Fetching weather…</div>
                    ) : selectedLocation && (
                        <>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>Weather Preview</div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                                    📍 {selectedLocation.name}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                    {selectedLocation.description} · 💧 {selectedLocation.humidity}%
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '2rem' }}>{getWeatherIcon(selectedLocation.description)}</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3B82F6' }}>
                                    {selectedLocation.tempC}°C
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
                                <button
                                    onClick={() => saveFavorite(selectedLocation.name, selectedLocation.lat, selectedLocation.lon)}
                                    style={{
                                        background: 'rgba(245,158,11,0.1)', border: '1px solid #F59E0B',
                                        borderRadius: '6px', padding: '0.25rem 0.6rem', cursor: 'pointer',
                                        fontSize: '0.72rem', color: '#D97706', fontWeight: 600,
                                    }}
                                >⭐ Save</button>
                                <button
                                    onClick={() => setSelectedLocation(null)}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        fontSize: '0.72rem', color: '#9CA3AF',
                                    }}
                                >✕ Clear</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* My Farms + Nearby in 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                {/* My Farms */}
                <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                        My Farms
                    </div>
                    {filteredFarms.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontStyle: 'italic' }}>No farms found</div>
                    ) : filteredFarms.map(farm => (
                        <div
                            key={farm.id}
                            onClick={() => { selectFarm(farm.id); setSelectedLocation(null); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                marginBottom: '0.35rem',
                                cursor: 'pointer',
                                background: selectedFarm?.id === farm.id && !selectedLocation
                                    ? 'rgba(16,185,129,0.12)'
                                    : 'var(--color-surface-elevated)',
                                border: selectedFarm?.id === farm.id && !selectedLocation
                                    ? '1.5px solid #10B981'
                                    : '1.5px solid transparent',
                                fontSize: '0.84rem',
                                fontWeight: selectedFarm?.id === farm.id ? 700 : 400,
                                color: selectedFarm?.id === farm.id && !selectedLocation ? '#059669' : 'var(--color-text-primary)',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (selectedFarm?.id !== farm.id) e.currentTarget.style.background = 'rgba(16,185,129,0.05)'; }}
                            onMouseLeave={e => { if (selectedFarm?.id !== farm.id) e.currentTarget.style.background = 'var(--color-surface-elevated)'; }}
                        >
                            <span>🌾</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{farm.name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{farm.location}</div>
                            </div>
                            {selectedFarm?.id === farm.id && !selectedLocation && (
                                <span style={{ fontSize: '0.7rem', color: '#10B981' }}>✓</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Nearby Locations */}
                <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                        Nearby Locations
                    </div>
                    {NEARBY_DEFAULTS.filter(l => !query || l.toLowerCase().includes(query.toLowerCase())).map(loc => (
                        <div
                            key={loc}
                            onClick={() => handleSelectNearby(loc)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                marginBottom: '0.35rem',
                                cursor: 'pointer',
                                background: selectedLocation?.name === loc
                                    ? 'rgba(59,130,246,0.1)'
                                    : 'var(--color-surface-elevated)',
                                border: selectedLocation?.name === loc
                                    ? '1.5px solid #3B82F6'
                                    : '1.5px solid transparent',
                                fontSize: '0.84rem',
                                color: 'var(--color-text-primary)',
                                transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => { if (selectedLocation?.name !== loc) e.currentTarget.style.background = 'rgba(59,130,246,0.07)'; }}
                            onMouseLeave={e => { if (selectedLocation?.name !== loc) e.currentTarget.style.background = 'var(--color-surface-elevated)'; }}
                        >
                            <span style={{ fontSize: '0.8rem' }}>📍</span>
                            <span style={{ flex: 1 }}>{loc}</span>
                            <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>→</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
