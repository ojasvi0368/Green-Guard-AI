'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDistrictCoordinates } from '@/lib/locationData';

interface WeatherCache {
    locationKey: string;
    data: any;
}

interface LocationContextType {
    state: string;
    district: string;
    lat: number;
    lon: number;
    setLocation: (state: string, district: string) => void;
    weatherCache: WeatherCache | null;
    setWeatherCache: (cache: WeatherCache | null) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'greenguard_location';

export function LocationProvider({ children }: { children: ReactNode }) {
    // Default to Pune, Maharashtra
    const [state, setState] = useState('Maharashtra');
    const [district, setDistrict] = useState('Pune');
    const [lat, setLat] = useState(18.5204);
    const [lon, setLon] = useState(73.8567);
    const [weatherCache, setWeatherCache] = useState<WeatherCache | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const { state: savedState, district: savedDistrict } = JSON.parse(saved);
                if (savedState && savedDistrict) {
                    const coords = getDistrictCoordinates(savedState, savedDistrict);
                    if (coords) {
                        setState(savedState);
                        setDistrict(savedDistrict);
                        setLat(coords.latitude);
                        setLon(coords.longitude);
                    }
                }
            } catch (error) {
                console.error('Error loading saved location:', error);
            }
        }
    }, []);

    const setLocation = (newState: string, newDistrict: string) => {
        if (!newState || !newDistrict) return;

        const coords = getDistrictCoordinates(newState, newDistrict);
        if (coords) {
            setState(newState);
            setDistrict(newDistrict);
            setLat(coords.latitude);
            setLon(coords.longitude);

            // Persist to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                state: newState,
                district: newDistrict,
                latitude: coords.latitude,
                longitude: coords.longitude
            }));

            // Clear weather cache when location changes
            setWeatherCache(null);
        }
    };

    return (
        <LocationContext.Provider value={{ state, district, lat, lon, setLocation, weatherCache, setWeatherCache }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
