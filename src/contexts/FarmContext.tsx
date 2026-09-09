'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { FarmRecord } from '@/types';

interface FarmContextType {
    farms: FarmRecord[];
    selectedFarm: FarmRecord | null;
    selectFarm: (farmId: string) => void;
    refreshFarms: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

const SELECTED_FARM_KEY = 'greenguard_selected_farm';

export function FarmProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const [farms, setFarms] = useState<FarmRecord[]>([]);
    const [selectedFarm, setSelectedFarm] = useState<FarmRecord | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFarms = useCallback(async () => {
        if (!session?.user) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/farms');
            if (!res.ok) throw new Error('Failed to fetch farms');
            const data = await res.json();
            setFarms(data.farms || []);

            // Restore selected farm from localStorage
            const savedId = localStorage.getItem(SELECTED_FARM_KEY);
            const farmList = data.farms || [];
            if (savedId && farmList.find((f: FarmRecord) => f.id === savedId)) {
                setSelectedFarm(farmList.find((f: FarmRecord) => f.id === savedId)!);
            } else if (farmList.length > 0) {
                setSelectedFarm(farmList[0]);
            }
        } catch (err) {
            console.error('Error fetching farms:', err);
            setError('Could not load farms');
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchFarms();
    }, [fetchFarms]);

    const selectFarm = (farmId: string) => {
        const farm = farms.find((f) => f.id === farmId);
        if (farm) {
            setSelectedFarm(farm);
            localStorage.setItem(SELECTED_FARM_KEY, farmId);
        }
    };

    const refreshFarms = async () => {
        await fetchFarms();
    };

    return (
        <FarmContext.Provider
            value={{ farms, selectedFarm, selectFarm, refreshFarms, loading, error }}
        >
            {children}
        </FarmContext.Provider>
    );
}

export function useFarm() {
    const context = useContext(FarmContext);
    if (context === undefined) {
        throw new Error('useFarm must be used within a FarmProvider');
    }
    return context;
}
