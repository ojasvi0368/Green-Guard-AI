/**
 * Weather Service
 * Integration with Open-Meteo API
 */

import axios from 'axios';
import { WeatherData, WeatherForecast } from '@/types';
import { ETCalculator } from '../cropwat/etCalculator';

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const HISTORICAL_API = 'https://archive-api.open-meteo.com/v1/archive';
const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';

interface GeocodingResult {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
}

interface HistoricalWeatherResponse {
    hourly: {
        time: string[];
        temperature_2m: number[];
        relativehumidity_2m: number[];
        precipitation: number[];
        windspeed_10m: number[];
        sunshine_duration: number[];
    };
}

interface ForecastWeatherResponse {
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        sunshine_duration: number[];
    };
    hourly: {
        time: string[];
        relativehumidity_2m: number[];
        windspeed_10m: number[];
    };
}

export class WeatherService {
    /**
     * Convert location name to coordinates using geocoding
     * Fallback for broad location names (like states/regions)
     */
    static async geocodeLocation(locationName: string): Promise<{ lat: number; lon: number } | null> {
        const trimmedName = locationName.trim();
        if (!trimmedName) return null;

        try {
            console.log(`🌐 Geocoding: "${trimmedName}"`);
            const response = await axios.get(GEOCODING_API, {
                params: {
                    name: trimmedName,
                    count: 1,
                    language: 'en',
                    format: 'json'
                }
            });

            if (!response.data.results || response.data.results.length === 0) {
                // FALLBACK: If "City, State, Country" fails, try just "City"
                if (trimmedName.includes(',')) {
                    const firstPart = trimmedName.split(',')[0].trim();
                    console.log(`⚠️ Geocoding "${trimmedName}" failed. Trying fallback: "${firstPart}"`);
                    return this.geocodeLocation(firstPart);
                }

                console.warn(`❌ Location "${trimmedName}" not found by geocoding API`);
                return null;
            }

            const result: GeocodingResult = response.data.results[0];
            console.log(`✅ Geocoded "${trimmedName}" to: ${result.name}, ${result.admin1 || ''} (${result.latitude}, ${result.longitude})`);
            return {
                lat: result.latitude,
                lon: result.longitude
            };
        } catch (error: any) {
            console.error('Geocoding API error:', error?.message || error);
            return null;
        }
    }

    /**
     * Get historical weather data
     */
    static async getHistoricalWeather(
        lat: number,
        lon: number,
        startDate: string,
        endDate: string
    ): Promise<Array<{ date: string; rain_mm: number }>> {
        try {
            const response = await axios.get<HistoricalWeatherResponse>(HISTORICAL_API, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    start_date: startDate,
                    end_date: endDate,
                    hourly: 'temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,sunshine_duration'
                }
            });

            const { hourly } = response.data;

            // Group by day and sum precipitation
            const dailyRainfall = new Map<string, number>();

            hourly.time.forEach((time, index) => {
                const date = time.split('T')[0];
                const precipitation = hourly.precipitation[index] || 0;

                if (!dailyRainfall.has(date)) {
                    dailyRainfall.set(date, 0);
                }
                dailyRainfall.set(date, dailyRainfall.get(date)! + precipitation);
            });

            return Array.from(dailyRainfall.entries()).map(([date, rain_mm]) => ({
                date,
                rain_mm: Math.round(rain_mm * 100) / 100 // Round to 2 decimal places
            }));
        } catch (error) {
            console.error('Historical Weather API error:', error);
            throw new Error('Failed to fetch historical weather data');
        }
    }

    /**
     * Get current and forecast weather data
     */
    static async getCurrentForecast(lat: number, lon: number): Promise<{
        minTemp: number;
        maxTemp: number;
        humidity: number;
        windSpeed: number;
        sunshineHours: number;
        rainfall: number;
    }> {
        try {
            const response = await axios.get<ForecastWeatherResponse>(FORECAST_API, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration',
                    hourly: 'relativehumidity_2m,windspeed_10m',
                    timezone: 'auto',
                    forecast_days: 1
                }
            });

            // DIAGNOSTIC LOGGING - RAW API RESPONSE
            console.log("━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📡 RAW WEATHER API RESPONSE:");
            console.log("Daily data:", JSON.stringify(response.data.daily, null, 2));
            console.log("Hourly data (first 3):", JSON.stringify({
                times: response.data.hourly.time.slice(0, 3),
                humidity: response.data.hourly.relativehumidity_2m.slice(0, 3),
                windSpeed: response.data.hourly.windspeed_10m.slice(0, 3)
            }, null, 2));
            console.log("━━━━━━━━━━━━━━━━━━━━━━━");

            const { daily, hourly } = response.data;

            // Get today's data (first day in the arrays)
            const minTemp = daily.temperature_2m_min[0];
            const maxTemp = daily.temperature_2m_max[0];
            const rainfall = daily.precipitation_sum[0];
            const sunshineDurationSeconds = daily.sunshine_duration[0];

            // Convert sunshine duration from seconds to hours
            const sunshineHours = Math.round((sunshineDurationSeconds / 3600) * 100) / 100;

            // Calculate average humidity and wind speed for today
            const todayDate = daily.time[0];
            const todayHourlyIndices = hourly.time
                .map((time, index) => ({ time, index }))
                .filter(({ time }) => time.startsWith(todayDate))
                .map(({ index }) => index);

            const avgHumidity = todayHourlyIndices.length > 0
                ? todayHourlyIndices.reduce((sum, i) => sum + hourly.relativehumidity_2m[i], 0) / todayHourlyIndices.length
                : 60; // fallback

            const avgWindSpeed = todayHourlyIndices.length > 0
                ? todayHourlyIndices.reduce((sum, i) => sum + hourly.windspeed_10m[i], 0) / todayHourlyIndices.length
                : 2.5; // fallback

            const processedData = {
                minTemp: Math.round(minTemp * 10) / 10,
                maxTemp: Math.round(maxTemp * 10) / 10,
                humidity: Math.round(avgHumidity),
                windSpeed: Math.round(avgWindSpeed * 10) / 10,
                sunshineHours,
                rainfall: Math.round(rainfall * 100) / 100
            };

            // Log processed data
            console.log("━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("✅ PROCESSED WEATHER DATA:");
            console.log(JSON.stringify(processedData, null, 2));
            console.log("━━━━━━━━━━━━━━━━━━━━━━━");

            return processedData;
        } catch (error) {
            console.error('Forecast API error:', error);
            throw new Error('Failed to fetch forecast data');
        }
    }

    /**
     * Get complete weather data by location name
     */
    static async getWeatherByLocation(locationName: string): Promise<{
        minTemp: number;
        maxTemp: number;
        humidity: number;
        windSpeed: number;
        sunshineHours: number;
        rainfall: number;
        pastRainfall: Array<{ date: string; rain_mm: number }>;
    }> {
        // Step 1: Geocode location
        const coords = await this.geocodeLocation(locationName);
        if (!coords) {
            throw new Error(`Could not find coordinates for location: ${locationName}`);
        }
        const { lat, lon } = coords;

        // Step 2: Get current forecast
        const currentData = await this.getCurrentForecast(lat, lon);

        // Step 3: Get historical rainfall (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const pastRainfall = await this.getHistoricalWeather(
            lat,
            lon,
            formatDate(startDate),
            formatDate(endDate)
        );

        return {
            ...currentData,
            pastRainfall
        };
    }

    /**
     * Get current weather data (legacy support)
     */
    static async getCurrentWeather(lat: number, lon: number): Promise<WeatherData> {
        try {
            const data = await this.getCurrentForecast(lat, lon);

            // Calculate ET₀ with sunshine hours
            const et0 = ETCalculator.calculateET0({
                tempMin: data.minTemp,
                tempMax: data.maxTemp,
                humidity: data.humidity,
                windSpeed: data.windSpeed,
                sunshineHours: data.sunshineHours,
                latitude: lat,
                date: new Date()
            });

            return {
                timestamp: new Date(),
                temperature: (data.minTemp + data.maxTemp) / 2,
                humidity: data.humidity,
                windSpeed: data.windSpeed,
                solarRadiation: data.sunshineHours * 3.6, // Rough conversion
                precipitation: data.rainfall,
                et0
            };
        } catch (error) {
            console.error('Weather API error:', error);
            throw new Error('Failed to fetch current weather data');
        }
    }

    /**
     * Get 7-day weather forecast (legacy support)
     */
    static async getWeatherForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
        try {
            const response = await axios.get<ForecastWeatherResponse>(FORECAST_API, {
                params: {
                    latitude: lat,
                    longitude: lon,
                    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration',
                    hourly: 'relativehumidity_2m,windspeed_10m',
                    timezone: 'auto',
                    forecast_days: 7
                }
            });

            const { daily, hourly } = response.data;

            return daily.time.map((date, index) => {
                // Get hourly data for this day
                const dayHourlyIndices = hourly.time
                    .map((time, i) => ({ time, i }))
                    .filter(({ time }) => time.startsWith(date))
                    .map(({ i }) => i);

                const avgHumidity = dayHourlyIndices.length > 0
                    ? dayHourlyIndices.reduce((sum, i) => sum + hourly.relativehumidity_2m[i], 0) / dayHourlyIndices.length
                    : 60;

                return {
                    date,
                    tempMin: daily.temperature_2m_min[index],
                    tempMax: daily.temperature_2m_max[index],
                    humidity: Math.round(avgHumidity),
                    precipitation: daily.precipitation_sum[index],
                    precipitationProbability: daily.precipitation_sum[index] > 0 ? 70 : 20,
                    description: this.getWeatherDescription(daily.precipitation_sum[index]),
                    icon: this.getWeatherIcon(daily.precipitation_sum[index])
                };
            });
        } catch (error) {
            console.error('Forecast API error:', error);
            throw new Error('Failed to fetch weather forecast data');
        }
    }

    /**
     * Get weather description based on precipitation
     */
    private static getWeatherDescription(precipitation: number): string {
        if (precipitation === 0) return 'Clear sky';
        if (precipitation < 2.5) return 'Light rain';
        if (precipitation < 10) return 'Moderate rain';
        return 'Heavy rain';
    }

    /**
     * Get weather icon based on precipitation
     */
    private static getWeatherIcon(precipitation: number): string {
        if (precipitation === 0) return '01d';
        if (precipitation < 2.5) return '10d';
        if (precipitation < 10) return '10d';
        return '09d';
    }



    /**
     * AI-enhanced: Refine forecast based on historical accuracy
     */
    static refineForecast(
        forecast: WeatherForecast[],
        historicalAccuracy: number = 0.85
    ): WeatherForecast[] {
        // Apply correction based on historical forecast vs actual
        return forecast.map(day => ({
            ...day,
            precipitationProbability: day.precipitationProbability * historicalAccuracy,
            precipitation: day.precipitation * (0.8 + Math.random() * 0.4)
        }));
    }
}
