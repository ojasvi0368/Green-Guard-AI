export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { WeatherService } from '@/lib/weather/weatherService';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const location = searchParams.get('location');
        const district = searchParams.get('district');

        // If district is provided, geocode it to get coordinates
        if (district) {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━");
            console.log("📍 GEOCODING REQUEST:");
            console.log("District:", district);

            try {
                const { lat, lon } = await WeatherService.geocodeLocation(district);

                console.log("✅ Geocoded Lat:", lat);
                console.log("✅ Geocoded Lon:", lon);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━");

                const [currentWeather, forecast] = await Promise.all([
                    WeatherService.getCurrentWeather(lat, lon),
                    WeatherService.getWeatherForecast(lat, lon)
                ]);

                const refinedForecast = WeatherService.refineForecast(forecast);

                return NextResponse.json({
                    current: currentWeather,
                    forecast: refinedForecast,
                    location: { lat, lon }
                });
            } catch (geocodeError) {
                console.error("❌ Geocoding failed:", geocodeError);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━");

                if (geocodeError instanceof Error && geocodeError.message.includes('not found')) {
                    return NextResponse.json(
                        { error: `Location "${district}" not found. Please check the district name.` },
                        { status: 404 }
                    );
                }
                throw geocodeError;
            }
        }

        // If location is provided, use the new Open-Meteo API
        if (location) {
            const weatherData = await WeatherService.getWeatherByLocation(location);
            return NextResponse.json(weatherData);
        }

        // Legacy support: if lat/lon are provided, use them directly
        const latParam = searchParams.get('lat');
        const lonParam = searchParams.get('lon');

        if (!latParam || !lonParam) {
            return NextResponse.json(
                { error: 'Missing required parameters: district, location, or lat/lon' },
                { status: 400 }
            );
        }

        const lat = parseFloat(latParam);
        const lon = parseFloat(lonParam);

        // DIAGNOSTIC LOGGING
        console.log("━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📍 Direct Coordinates Request:");
        console.log("Latitude:", lat);
        console.log("Longitude:", lon);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━");

        const [currentWeather, forecast] = await Promise.all([
            WeatherService.getCurrentWeather(lat, lon),
            WeatherService.getWeatherForecast(lat, lon)
        ]);

        const refinedForecast = WeatherService.refineForecast(forecast);

        return NextResponse.json({
            current: currentWeather,
            forecast: refinedForecast,
            location: { lat, lon }
        });
    } catch (error) {
        console.error('Weather API error:', error);

        // Check if it's a geocoding error
        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { error: error.message },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
}
