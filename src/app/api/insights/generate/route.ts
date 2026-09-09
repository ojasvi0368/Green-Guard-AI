/**
 * Insights Generation API
 * Uses Gemini to generate AI insights from real farm data
 */

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildFarmContext, formatContextForPrompt } from '@/lib/ai/ragContext';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { farmId } = await request.json();

        if (!farmId) {
            return NextResponse.json(
                { error: 'farmId is required' },
                { status: 400 }
            );
        }

        // Verify farm ownership
        const farm = await prisma.farm.findUnique({
            where: { id: farmId },
        });

        if (!farm) {
            return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
        }

        if (farm.userId !== (session.user as any).id && (session.user as any).role !== 'GOVERNMENT') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Build RAG context
        const ragContext = await buildFarmContext(farmId);
        if (!ragContext) {
            return NextResponse.json(
                { error: 'No data available for this farm yet' },
                { status: 400 }
            );
        }

        const contextStr = formatContextForPrompt(ragContext);

        // Generate insights using Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Gemini API not configured' },
                { status: 500 }
            );
        }

        const prompt = `You are an expert agricultural analyst. Based on the following REAL satellite and weather data from AgroMonitoring, generate actionable insights for this farm.

FARM DATA:
${contextStr}

Generate a JSON response with EXACTLY this structure (no markdown, no code blocks, just pure JSON):
{
  "problems": ["problem1", "problem2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "futureRisks": ["risk1", "risk2"],
  "overallHealth": "good|moderate|poor|critical",
  "summary": "One paragraph summary of the farm's current state"
}

Be specific and data-driven. Reference actual NDVI values, weather conditions, and moisture levels. Do not give generic advice.`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('No response from Gemini');
        }

        // Parse Gemini response
        let insights;
        try {
            // Remove possible markdown code blocks
            const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            insights = JSON.parse(cleanText);
        } catch {
            insights = {
                problems: ['Unable to parse detailed insights'],
                recommendations: [responseText.substring(0, 500)],
                futureRisks: [],
                overallHealth: 'moderate',
                summary: responseText.substring(0, 300),
            };
        }

        // Save insights to database
        const savedInsight = await prisma.insight.create({
            data: {
                farmId,
                insight: JSON.stringify({
                    problems: insights.problems,
                    futureRisks: insights.futureRisks,
                    overallHealth: insights.overallHealth,
                    summary: insights.summary,
                }),
                recommendation: JSON.stringify(insights.recommendations),
                riskLevel: insights.overallHealth,
            },
        });

        return NextResponse.json({
            insights,
            savedId: savedInsight.id,
            farmId,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Insights generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate insights' },
            { status: 500 }
        );
    }
}

/**
 * GET: Fetch existing insights for a farm
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const farmId = searchParams.get('farmId');

        if (!farmId) {
            return NextResponse.json(
                { error: 'farmId is required' },
                { status: 400 }
            );
        }

        const insights = await prisma.insight.findMany({
            where: { farmId },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        // Parse stored JSON strings
        const parsed = insights.map((i: any) => ({
            id: i.id,
            farmId: i.farmId,
            createdAt: i.createdAt,
            riskLevel: i.riskLevel,
            data: (() => {
                try {
                    return JSON.parse(i.insight);
                } catch {
                    return { summary: i.insight };
                }
            })(),
            recommendations: (() => {
                try {
                    return JSON.parse(i.recommendation);
                } catch {
                    return [i.recommendation];
                }
            })(),
        }));

        return NextResponse.json({ insights: parsed });
    } catch (error) {
        console.error('Error fetching insights:', error);
        return NextResponse.json(
            { error: 'Failed to fetch insights' },
            { status: 500 }
        );
    }
}
