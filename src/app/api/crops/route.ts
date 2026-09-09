import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Crop, growthStagesByCrop } from '@/components/Crops/mockCropData';
import prisma from '@/lib/prisma';

/**
 * Crops API — reads real farms from PostgreSQL, maps them to crop management view.
 * Growth stage reference data (growthStagesByCrop) is kept as it's agronomic reference,
 * not mock user data.
 */

export async function GET(request: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        // Get crops from real database farms
        const crops: Crop[] = [];

        if (userId) {
            const farms = await prisma.farm.findMany({
                where: { userId },
            });

            for (const farm of farms) {
                const plantingDate = farm.createdAt;
                const now = new Date();
                const daysSincePlanting = Math.floor(
                    (now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Determine crop type and growth stage
                const cropName = farm.name || 'wheat'; // Farm name is used as crop indicator
                const cropKey = cropName.toLowerCase();
                const stages = growthStagesByCrop[cropKey] || growthStagesByCrop['wheat'];

                // Determine current stage based on days since planting
                let currentStage = 'Germination';
                let accumulatedDays = 0;
                for (const stage of stages) {
                    accumulatedDays += stage.duration;
                    if (daysSincePlanting <= accumulatedDays) {
                        currentStage = stage.name;
                        break;
                    }
                    currentStage = stage.name; // Last stage if past all durations
                }

                // Calculate expected harvest
                const totalGrowthDays = stages.reduce((sum, s) => sum + s.duration, 0);
                const expectedHarvest = new Date(plantingDate);
                expectedHarvest.setDate(expectedHarvest.getDate() + totalGrowthDays);

                crops.push({
                    id: farm.id,
                    name: cropName.charAt(0).toUpperCase() + cropName.slice(1),
                    fieldId: farm.id.slice(0, 5).toUpperCase(),
                    area: farm.areaHa || 1.0,
                    health: 85, // Would come from NDVI in production
                    currentStage,
                    daysSincePlanting: Math.max(0, daysSincePlanting),
                    plantingDate: plantingDate.toISOString().split('T')[0],
                    expectedHarvest: expectedHarvest.toISOString().split('T')[0],
                    kc: 0.85, // Would be calculated from growth stage
                });
            }
        }

        return NextResponse.json({
            success: true,
            crops,
            count: crops.length,
        });
    } catch (error) {
        console.error('Crops GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch crops' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: 'Database not available' }, { status: 503 });
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.name) {
            return NextResponse.json({ error: 'Crop name is required' }, { status: 400 });
        }

        // Create a farm record in the real database
        const planting = new Date(data.plantingDate || new Date());
        const growthDays = parseInt(data.growthDuration) || 120;
        const harvestDate = new Date(planting);
        harvestDate.setDate(harvestDate.getDate() + growthDays);

        const newFarm = await prisma.farm.create({
            data: {
                name: `${data.name} Field`,
                location: data.location || 'Not specified',
                areaHa: parseFloat(data.area) || 1.0,
                userId,
            },
        });

        const daysSincePlanting = Math.max(
            0,
            Math.floor((new Date().getTime() - planting.getTime()) / (1000 * 60 * 60 * 24))
        );

        const newCrop: Crop = {
            id: newFarm.id,
            name: data.name,
            fieldId: newFarm.id.slice(0, 5).toUpperCase(),
            area: parseFloat(data.area) || 1.0,
            health: 100,
            currentStage: 'Germination',
            daysSincePlanting,
            plantingDate: planting.toISOString().split('T')[0],
            expectedHarvest: harvestDate.toISOString().split('T')[0],
            kc: 0.5,
        };

        return NextResponse.json(
            { success: true, crop: newCrop, message: 'Crop added successfully' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Crops POST error:', error);
        return NextResponse.json({ error: 'Failed to create crop' }, { status: 500 });
    }
}
