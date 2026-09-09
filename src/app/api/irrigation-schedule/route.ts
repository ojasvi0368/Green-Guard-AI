export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { WeatherService } from '@/lib/weather/weatherService';
import { simulateSoilMoisture } from '@/lib/simulation/soilSimulation';
import { getFieldParameters } from '@/lib/simulation/fieldParameters';
import { getCropCoefficient, GrowthStage } from '@/lib/cropwat/cropCoefficients';
import { scheduleIrrigation } from '@/lib/simulation/irrigationScheduler';

/**
 * Adaptive Irrigation Schedule API
 * 
 * GET /api/irrigation-schedule?lat={lat}&lon={lon}&crop={crop}&currentMoisture={value}&stage={stage}
 * 
 * Returns when and how much to irrigate based on predictive analysis
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Get parameters
        const lat = parseFloat(searchParams.get('lat') || '');
        const lon = parseFloat(searchParams.get('lon') || '');
        const crop = searchParams.get('crop') || 'wheat';
        const currentMoisture = parseFloat(searchParams.get('currentMoisture') || '30');
        const growthStage = (searchParams.get('stage') || 'midSeason') as GrowthStage;
        const soilType = (searchParams.get('soilType') || 'loamy') as 'sandy' | 'loamy' | 'clay';
        const fieldArea = parseFloat(searchParams.get('area') || '0');

        // Validate required parameters
        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json(
                { error: 'Missing or invalid required parameters: lat, lon' },
                { status: 400 }
            );
        }

        // Get field parameters
        const fieldParams = getFieldParameters(crop, soilType);
        const cropKc = getCropCoefficient(crop, growthStage);

        // Fetch weather forecast
        const weatherForecast = await WeatherService.getWeatherForecast(lat, lon);

        if (!weatherForecast || weatherForecast.length === 0) {
            return NextResponse.json(
                { error: 'Failed to fetch weather forecast' },
                { status: 500 }
            );
        }

        // Run simulation
        const simulationResults = simulateSoilMoisture({
            currentMoisture,
            fieldCapacity: fieldParams.fieldCapacity,
            wiltingPoint: fieldParams.wiltingPoint,
            rootDepth: fieldParams.rootDepth,
            weatherForecast,
            cropKc,
            soilType
        });

        // Get irrigation recommendation
        const recommendation = scheduleIrrigation({
            simulationResults,
            stressThreshold: fieldParams.stressThreshold,
            fieldCapacity: fieldParams.fieldCapacity,
            wiltingPoint: fieldParams.wiltingPoint,
            rootDepth: fieldParams.rootDepth,
            fieldArea: fieldArea > 0 ? fieldArea : undefined
        });

        // Return recommendation
        return NextResponse.json(recommendation);

    } catch (error) {
        console.error('Irrigation schedule API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate irrigation schedule',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
