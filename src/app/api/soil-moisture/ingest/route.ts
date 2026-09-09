export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for soil moisture data (last 100 readings)
// Using global to share data between API routes in development
const MAX_READINGS = 100;

// Initialize global storage
if (typeof global !== 'undefined') {
    (global as any).soilMoistureData = (global as any).soilMoistureData || [];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { value, timestamp } = body;

        // Validate input
        if (typeof value !== 'number') {
            return NextResponse.json(
                { success: false, error: 'Invalid data: value must be a number' },
                { status: 400 }
            );
        }

        // Create data entry
        const entry = {
            value,
            timestamp: timestamp || new Date().toISOString()
        };

        // Get global storage
        const dataStore = (global as any).soilMoistureData as Array<{ value: number; timestamp: string }>;

        // Add to storage (maintain max size)
        dataStore.push(entry);
        if (dataStore.length > MAX_READINGS) {
            dataStore.shift(); // Remove oldest
        }

        console.log(`📊 Soil Moisture Data Received: ${value} at ${entry.timestamp}`);

        return NextResponse.json({
            success: true,
            message: 'Data received',
            stored: dataStore.length
        });
    } catch (error) {
        console.error('Error ingesting soil moisture data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process data' },
            { status: 500 }
        );
    }
}
