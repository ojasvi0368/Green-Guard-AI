/**
 * AgroMonitoring API Service
 * Handles polygon CRUD, weather, and NDVI satellite data
 * API docs: https://agromonitoring.com/api
 */

import axios from 'axios';

const AGRO_BASE_URL = 'https://api.agromonitoring.com/agro/1.0';

function getApiKey(): string {
    const key = process.env.AGROMONITORING_API_KEY;
    if (!key || key === 'your_agromonitoring_api_key_here') {
        throw new Error(
            'AGROMONITORING_API_KEY is not configured. Get a free key from https://agromonitoring.com/ and set it in .env.local'
        );
    }
    return key;
}

export interface AgroPolygon {
    id: string;
    name: string;
    center: [number, number];
    area: number;
    geo_json: {
        type: string;
        properties: Record<string, any>;
        geometry: {
            type: string;
            coordinates: number[][][];
        };
    };
}

export interface AgroWeatherResponse {
    dt: number;
    weather: { id: number; main: string; description: string; icon: string }[];
    main: {
        temp: number;
        feels_like: number;
        pressure: number;
        humidity: number;
        temp_min: number;
        temp_max: number;
    };
    wind: { speed: number; deg: number };
    clouds: { all: number };
    rain?: { '1h'?: number; '3h'?: number };
}

export interface AgroNDVIResponse {
    dt: number;
    type: string;
    dc: number;
    cl: number;
    data: {
        std: number;
        p75: number;
        min: number;
        max: number;
        median: number;
        p25: number;
        num: number;
        mean: number;
    };
    image: {
        truecolor: string;
        falsecolor: string;
        ndvi: string;
        evi: string;
    };
}

export class AgroMonitoringService {
    /**
     * Create a polygon on AgroMonitoring
     * @param name - Polygon name
     * @param coordinates - Array of [lng, lat] coordinates forming the polygon
     */
    static async createPolygon(
        name: string,
        coordinates: [number, number][][]
    ): Promise<AgroPolygon> {
        const apiKey = getApiKey();

        // Server-side area validation before calling AgroMonitoring
        const ring = coordinates[0];
        if (ring && ring.length >= 3) {
            const estimatedArea = this.estimatePolygonAreaHectares(ring);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📐 SERVER: Polygon area estimate:', estimatedArea.toFixed(2), 'hectares');
            console.log('📍 SERVER: Polygon coordinates:', JSON.stringify(ring.slice(0, 5)), ring.length > 5 ? `... (${ring.length} total)` : '');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━');

            if (estimatedArea > 3000) {
                throw new Error(
                    `Polygon area (~${estimatedArea.toFixed(0)} hectares) exceeds maximum of 3,000 hectares. Draw a smaller farm boundary.`
                );
            }
            if (estimatedArea < 0.5) {
                throw new Error(
                    `Polygon area (~${estimatedArea.toFixed(2)} hectares) is too small. Minimum is 1 hectare.`
                );
            }
        }

        const payload = {
            name,
            geo_json: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Polygon',
                    coordinates,
                },
            },
        };

        console.log('📍 Creating AgroMonitoring polygon:', name);

        const response = await axios.post(
            `${AGRO_BASE_URL}/polygons?appid=${apiKey}`,
            payload,
            { headers: { 'Content-Type': 'application/json' } }
        );

        console.log('✅ Polygon created:', response.data.id);
        console.log('✅ Polygon area (from API):', response.data.area, 'm²', '=', ((response.data.area || 0) / 10000).toFixed(2), 'ha');
        return response.data;
    }

    /**
     * Estimate polygon area in hectares using the Shoelace formula on geographic coordinates.
     * Uses a simplified spherical earth model (good enough for validation).
     */
    private static estimatePolygonAreaHectares(ring: [number, number][]): number {
        // ring is [[lng, lat], [lng, lat], ...]
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371000; // Earth radius in meters

        // Shoelace formula on projected coordinates
        let area = 0;
        for (let i = 0; i < ring.length; i++) {
            const j = (i + 1) % ring.length;
            const [lng1, lat1] = ring[i];
            const [lng2, lat2] = ring[j];

            // Convert to radians
            const phi1 = toRad(lat1);
            const phi2 = toRad(lat2);
            const dLng = toRad(lng2 - lng1);

            // Spherical excess formula
            area += dLng * (2 + Math.sin(phi1) + Math.sin(phi2));
        }
        area = Math.abs((area * R * R) / 2);

        return area / 10000; // m² to hectares
    }

    /**
     * Get all polygons
     */
    static async getPolygons(): Promise<AgroPolygon[]> {
        const apiKey = getApiKey();

        const response = await axios.get(
            `${AGRO_BASE_URL}/polygons?appid=${apiKey}`
        );

        return response.data;
    }

    /**
     * Get a specific polygon by ID
     */
    static async getPolygon(polygonId: string): Promise<AgroPolygon> {
        const apiKey = getApiKey();

        const response = await axios.get(
            `${AGRO_BASE_URL}/polygons/${polygonId}?appid=${apiKey}`
        );

        return response.data;
    }

    /**
     * Delete a polygon
     */
    static async deletePolygon(polygonId: string): Promise<void> {
        const apiKey = getApiKey();

        await axios.delete(
            `${AGRO_BASE_URL}/polygons/${polygonId}?appid=${apiKey}`
        );

        console.log('🗑️ Polygon deleted:', polygonId);
    }

    /**
     * Get current weather for a polygon
     */
    static async getWeather(polygonId: string): Promise<AgroWeatherResponse | null> {
        const apiKey = getApiKey();

        try {
            const response = await axios.get(
                `${AGRO_BASE_URL}/weather?polyid=${polygonId}&appid=${apiKey}`
            );

            // Handle both array and object responses
            const data = response.data;
            return Array.isArray(data) ? data[0] : data;
        } catch (error: any) {
            console.error('AgroMonitoring Weather API error:', error?.message || error);
            return null;
        }
    }

    /**
     * Get NDVI satellite data for a polygon
     * @param polygonId - Polygon ID
     * @param start - Start timestamp (Unix)
     * @param end - End timestamp (Unix)
     */
    static async getNDVI(
        polygonId: string,
        start?: number,
        end?: number
    ): Promise<AgroNDVIResponse[]> {
        const apiKey = getApiKey();

        const now = Math.floor(Date.now() / 1000);
        const defaultStart = now - 30 * 24 * 60 * 60; // 30 days ago

        const response = await axios.get(
            `${AGRO_BASE_URL}/ndvi/history?polyid=${polygonId}&start=${start || defaultStart}&end=${end || now}&appid=${apiKey}`
        );

        return response.data;
    }

    /**
     * Get soil data for a polygon
     */
    static async getSoilData(polygonId: string): Promise<any> {
        const apiKey = getApiKey();

        const response = await axios.get(
            `${AGRO_BASE_URL}/soil?polyid=${polygonId}&appid=${apiKey}`
        );

        return response.data;
    }

    /**
     * Get weather forecast for a polygon
     */
    static async getWeatherForecast(polygonId: string): Promise<any[]> {
        const apiKey = getApiKey();

        const response = await axios.get(
            `${AGRO_BASE_URL}/weather/forecast?polyid=${polygonId}&appid=${apiKey}`
        );

        return response.data;
    }

    /**
     * Convert Leaflet LatLng coordinates to AgroMonitoring format
     * Leaflet uses [lat, lng], AgroMonitoring/GeoJSON uses [lng, lat]
     */
    static latLngToGeoJSON(
        latLngs: { lat: number; lng: number }[]
    ): [number, number][][] {
        const coords = latLngs.map(
            (ll) => [ll.lng, ll.lat] as [number, number]
        );
        // GeoJSON polygons must be closed
        if (
            coords.length > 0 &&
            (coords[0][0] !== coords[coords.length - 1][0] ||
                coords[0][1] !== coords[coords.length - 1][1])
        ) {
            coords.push(coords[0]);
        }
        return [coords];
    }
}
