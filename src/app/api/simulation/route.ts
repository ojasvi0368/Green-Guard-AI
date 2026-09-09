export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { WeatherService } from '@/lib/weather/weatherService';
import { simulateSoilMoisture } from '@/lib/simulation/soilSimulation';
import { getFieldParameters } from '@/lib/simulation/fieldParameters';
import { getCropCoefficient, GrowthStage } from '@/lib/cropwat/cropCoefficients';
import { analyzeStressTrend } from '@/lib/simulation/cropStressIndex';
import { scheduleIrrigation } from '@/lib/simulation/irrigationScheduler';

/**
 * Soil Moisture Simulation API
 * 
 * GET /api/simulation?lat={lat}&lon={lon}&crop={crop}&currentMoisture={value}&stage={stage}&soilType={type}
 * 
 * Returns 7-day soil moisture prediction with stress analysis and irrigation recommendations
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

        // Validate required parameters
        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json(
                { error: 'Missing or invalid required parameters: lat, lon' },
                { status: 400 }
            );
        }

        // Get field parameters for the crop and soil type
        const fieldParams = getFieldParameters(crop, soilType);

        // Get crop coefficient for growth stage
        const cropKc = getCropCoefficient(crop, growthStage);

        // Fetch 7-day weather forecast
        const weatherForecast = await WeatherService.getWeatherForecast(lat, lon);

        if (!weatherForecast || weatherForecast.length === 0) {
            return NextResponse.json(
                { error: 'Failed to fetch weather forecast' },
                { status: 500 }
            );
        }

        // Run soil moisture simulation
        const simulationResults = simulateSoilMoisture({
            currentMoisture,
            fieldCapacity: fieldParams.fieldCapacity,
            wiltingPoint: fieldParams.wiltingPoint,
            rootDepth: fieldParams.rootDepth,
            weatherForecast,
            cropKc,
            soilType
        });

        // Analyze stress trend
        const stressAnalysis = analyzeStressTrend(
            simulationResults.predictions.map(p => ({
                date: p.date,
                moisture: p.moisture
            })),
            fieldParams.wiltingPoint,
            fieldParams.fieldCapacity
        );

        // Get irrigation recommendation
        const irrigationRecommendation = scheduleIrrigation({
            simulationResults,
            stressThreshold: fieldParams.stressThreshold,
            fieldCapacity: fieldParams.fieldCapacity,
            wiltingPoint: fieldParams.wiltingPoint,
            rootDepth: fieldParams.rootDepth
        });

        // Format response
        const response = {
            predicted: simulationResults.predictions.map(p => ({
                date: p.date,
                moisture: p.moisture,
                et: p.et,
                rainfall: p.rainfall,
                isHistorical: false,
                hasIrrigation: p.irrigation > 0
            })),
            stressAnalysis: {
                stressIndex: stressAnalysis.currentIndex,
                status: stressAnalysis.status,
                description: stressAnalysis.description,
                predictedTrend: stressAnalysis.predictedIndices,
                criticalDate: simulationResults.criticalDate
            },
            irrigationRecommendation: {
                isNeeded: irrigationRecommendation.isNeeded,
                scheduledDate: irrigationRecommendation.scheduledDate,
                amount: irrigationRecommendation.amount,
                amountLiters: irrigationRecommendation.amountLiters,
                reason: irrigationRecommendation.reason,
                urgency: irrigationRecommendation.urgency,
                daysUntilStress: irrigationRecommendation.daysUntilStress,
                confidence: irrigationRecommendation.confidence
            },
            summary: simulationResults.summary,
            fieldParameters: {
                crop,
                growthStage,
                soilType,
                fieldCapacity: fieldParams.fieldCapacity,
                wiltingPoint: fieldParams.wiltingPoint,
                stressThreshold: fieldParams.stressThreshold,
                rootDepth: fieldParams.rootDepth,
                cropKc
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error('Simulation API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate soil moisture simulation',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
