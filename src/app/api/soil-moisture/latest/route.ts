export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';

// Import the shared data storage from ingest route
// Note: In production, this should use a proper database or Redis
// For this demo/hackathon, in-memory storage is acceptable
let soilMoistureData: Array<{ value: number; timestamp: string }> = [];

// Allow ingest route to share data
if (typeof global !== 'undefined') {
    (global as any).soilMoistureData = (global as any).soilMoistureData || [];
    soilMoistureData = (global as any).soilMoistureData;
}

const DISCONNECT_THRESHOLD_MS = 10000; // 10 seconds

export async function GET(request: NextRequest) {
    try {
        // Get data from shared global storage
        const data = (global as any).soilMoistureData || [];

        if (data.length === 0) {
            return NextResponse.json({
                connected: false,
                message: 'No data received yet. Waiting for ESP32...'
            });
        }

        // Get latest entry
        const latest = data[data.length - 1];
        const lastUpdateTime = new Date(latest.timestamp).getTime();
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTime;

        // Check if device is disconnected (no data for > 10 seconds)
        const isConnected = timeSinceLastUpdate < DISCONNECT_THRESHOLD_MS;

        if (!isConnected) {
            return NextResponse.json({
                connected: false,
                message: '⚠️ Real-time data not available. Please check device or network.',
                lastUpdate: latest.timestamp,
                secondsSinceLastUpdate: Math.floor(timeSinceLastUpdate / 1000)
            });
        }

        // Return latest data
        return NextResponse.json({
            connected: true,
            data: latest,
            totalReadings: data.length
        });
    } catch (error) {
        console.error('Error fetching latest soil moisture data:', error);
        return NextResponse.json(
            {
                connected: false,
                error: 'Failed to fetch data',
                message: 'Server error occurred'
            },
            { status: 500 }
        );
    }
}

// Also provide endpoint to get all recent data
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { limit = 50 } = body;

        const data = (global as any).soilMoistureData || [];
        const recentData = data.slice(-limit);

        return NextResponse.json({
            success: true,
            data: recentData,
            total: data.length
        });
    } catch (error) {
        console.error('Error fetching soil moisture history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch data' },
            { status: 500 }
        );
    }
}
