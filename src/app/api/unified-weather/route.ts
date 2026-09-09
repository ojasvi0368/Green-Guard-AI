/**
 * Unified Weather API
 * Priority: AgroMonitoring (farm-scoped) → Open-Meteo (location fallback)
 *
 * Query params:
 *   farmId   — if provided, tries AgroMonitoring first
 *   district — location name for Open-Meteo fallback / geocoding
 *   lat, lon — direct coordinates for Open-Meteo fallback
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AgroMonitoringService } from '@/lib/agromonitoring/agroService';
import { WeatherService } from '@/lib/weather/weatherService';

export const dynamic = 'force-dynamic';

interface UnifiedWeatherResponse {
    current: {
        temp: number;
        humidity: number;
        description: string;
        windSpeed: number;
        pressure: number;
        clouds: number;
        rain: number;
    };
    forecast: any[];
    source: 'agromonitoring' | 'open-meteo';
    farmId?: string;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farmId');
        const district = searchParams.get('district')?.trim() || null;
        const latParam = searchParams.get('lat');
        const lonParam = searchParams.get('lon');

        // ── PRIORITY 1: AgroMonitoring (if farmId provided) ──
        if (farmId) {
            try {
                const agroResult = await fetchAgroMonitoringWeather(farmId);
                if (agroResult) {
                    // AgroMonitoring doesn't provide 7-day forecast,
                    // so still get that from Open-Meteo
                    let forecast: any[] = [];
                    try {
                        forecast = await getOpenMeteoForecast(district, latParam, lonParam);
                    } catch {
                        // Forecast is optional — don't fail the whole request
                    }

                    const response: UnifiedWeatherResponse = {
                        current: agroResult,
                        forecast,
                        source: 'agromonitoring',
                        farmId,
                    };
                    return NextResponse.json(response);
                }
            } catch (agroError) {
                console.warn('⚠️ AgroMonitoring weather failed, falling back to Open-Meteo:', agroError);
            }
        }

        // ── PRIORITY 2: Open-Meteo fallback ──
        const openMeteoResult = await fetchOpenMeteoWeather(district, latParam, lonParam);

        const response: UnifiedWeatherResponse = {
            current: openMeteoResult.current,
            forecast: openMeteoResult.forecast,
            source: 'open-meteo',
            farmId: farmId || undefined,
        };
        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Unified weather API error:', error?.message || error);
        return NextResponse.json(
            { error: 'Failed to fetch weather data', details: error?.message },
            { status: 500 }
        );
    }
}

// ── AgroMonitoring: farm-scoped weather ────────────────────
async function fetchAgroMonitoringWeather(farmId: string) {
    const farm = await prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm?.polygonId) return null;

    const weather = await AgroMonitoringService.getWeather(farm.polygonId);
    if (!weather) return null;

    // Convert Kelvin → Celsius and normalize shape
    return {
        temp: (weather.main?.temp ?? 273.15) - 273.15,
        humidity: weather.main?.humidity ?? 0,
        description: weather.weather?.[0]?.description ?? '',
        windSpeed: weather.wind?.speed ?? 0,
        pressure: weather.main?.pressure ?? 0,
        clouds: typeof weather.clouds === 'object' ? weather.clouds.all : (weather.clouds ?? 0),
        rain: weather.rain?.['1h'] ?? weather.rain?.['3h'] ?? 0,
    };
}

// ── Open-Meteo: location-based weather ─────────────────────
async function fetchOpenMeteoWeather(
    district: string | null,
    latParam: string | null,
    lonParam: string | null
) {
    let lat: number;
    let lon: number;

    if (district) {
        const coords = await WeatherService.geocodeLocation(district);
        if (coords) {
            lat = coords.lat;
            lon = coords.lon;
        } else if (latParam && lonParam) {
            lat = parseFloat(latParam);
            lon = parseFloat(lonParam);
        } else {
            // Return empty weather if no location found
            return {
                current: {
                    temp: 0,
                    humidity: 0,
                    description: 'Location not found',
                    windSpeed: 0,
                    pressure: 0,
                    clouds: 0,
                    rain: 0,
                },
                forecast: [],
            };
        }
    } else if (latParam && lonParam) {
        lat = parseFloat(latParam);
        lon = parseFloat(lonParam);
    } else {
        throw new Error('district or lat/lon required when no farmId available');
    }

    const [currentWeather, forecast] = await Promise.all([
        WeatherService.getCurrentWeather(lat, lon),
        WeatherService.getWeatherForecast(lat, lon),
    ]);

    const refinedForecast = WeatherService.refineForecast(forecast);

    return {
        current: {
            temp: currentWeather.temperature,
            humidity: currentWeather.humidity,
            description: currentWeather.precipitation > 0 ? 'Rain' : 'Clear',
            windSpeed: currentWeather.windSpeed,
            pressure: 0,
            clouds: 0,
            rain: currentWeather.precipitation,
        },
        forecast: refinedForecast,
    };
}

// ── Helper: get forecast only from Open-Meteo ──────────────
async function getOpenMeteoForecast(
    district: string | null,
    latParam: string | null,
    lonParam: string | null
): Promise<any[]> {
    let lat: number;
    let lon: number;

    if (district) {
        const coords = await WeatherService.geocodeLocation(district);
        if (coords) {
            lat = coords.lat;
            lon = coords.lon;
        } else if (latParam && lonParam) {
            lat = parseFloat(latParam);
            lon = parseFloat(lonParam);
        } else {
            return [];
        }
    } else if (latParam && lonParam) {
        lat = parseFloat(latParam);
        lon = parseFloat(lonParam);
    } else {
        return [];
    }

    const forecast = await WeatherService.getWeatherForecast(lat, lon);
    return WeatherService.refineForecast(forecast);
}
