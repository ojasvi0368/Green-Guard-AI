export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { analyzeStress, needsIrrigation } from '@/lib/simulation/cropStressIndex';
import { getFieldParameters } from '@/lib/simulation/fieldParameters';

/**
 * Crop Water Stress Analysis API
 * 
 * GET /api/stress-analysis?moisture={value}&crop={crop}&soilType={type}
 * 
 * Returns current crop water stress index and status
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Get parameters
        const moisture = parseFloat(searchParams.get('moisture') || '');
        const crop = searchParams.get('crop') || 'wheat';
        const soilType = (searchParams.get('soilType') || 'loamy') as 'sandy' | 'loamy' | 'clay';

        // Validate
        if (isNaN(moisture)) {
            return NextResponse.json(
                { error: 'Missing or invalid required parameter: moisture' },
                { status: 400 }
            );
        }

        // Get field parameters
        const fieldParams = getFieldParameters(crop, soilType);

        // Analyze current stress
        const stressResult = analyzeStress(
            moisture,
            fieldParams.wiltingPoint,
            fieldParams.fieldCapacity
        );

        // Check if irrigation needed
        const irrigationCheck = needsIrrigation(
            moisture,
            fieldParams.stressThreshold,
            fieldParams.wiltingPoint,
            fieldParams.fieldCapacity
        );

        // Return analysis
        return NextResponse.json({
            currentStress: stressResult.currentIndex,
            status: stressResult.status,
            description: stressResult.description,
            irrigation: {
                needed: irrigationCheck.needed,
                urgency: irrigationCheck.urgency,
                reason: irrigationCheck.reason
            },
            thresholds: {
                fieldCapacity: fieldParams.fieldCapacity,
                wiltingPoint: fieldParams.wiltingPoint,
                stressThreshold: fieldParams.stressThreshold
            }
        });

    } catch (error) {
        console.error('Stress analysis API error:', error);
        return NextResponse.json(
            {
                error: 'Failed to analyze crop water stress',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
