import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import KrishiSahayakChatbot, { GeminiMessage } from '@/lib/ai/chatbot';
import { FarmContext } from '@/types';
import { buildFarmContext, buildMultiFarmContext, formatContextForPrompt } from '@/lib/ai/ragContext';

// In-memory conversation storage (per session)
const conversationStore = new Map<string, GeminiMessage[]>();

// Clean up old sessions after 1 hour
const SESSION_EXPIRY = 60 * 60 * 1000;
const sessionTimestamps = new Map<string, number>();

export async function POST(request: NextRequest) {
    console.log('\n🌐 [API] /api/chat request received');
    try {
        const { message, context, sessionId, reset, farmId, userId } = await request.json();
        console.log('📦 [API] Request body:');
        console.log('   - message:', message ? message.substring(0, 50) + '...' : 'none');
        console.log('   - sessionId:', sessionId);
        console.log('   - farmId:', farmId || 'none');
        console.log('   - reset:', reset);

        if (!sessionId) {
            console.error('❌ [API] Missing sessionId');
            return NextResponse.json(
                { error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Handle reset
        if (reset) {
            console.log('🔄 [API] Resetting conversation for session:', sessionId);
            conversationStore.delete(sessionId);
            sessionTimestamps.delete(sessionId);
            return NextResponse.json({
                message: 'Conversation reset successfully',
                sessionId,
            });
        }

        if (!message) {
            console.error('❌ [API] Missing message');
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Clean up expired sessions
        const now = Date.now();
        for (const [sid, timestamp] of sessionTimestamps.entries()) {
            if (now - timestamp > SESSION_EXPIRY) {
                conversationStore.delete(sid);
                sessionTimestamps.delete(sid);
            }
        }

        // Get or initialize conversation history
        let chatHistory = conversationStore.get(sessionId) || [];

        // Default context if not provided by frontend
        const farmContext: FarmContext = context || {
            cropType: 'unknown',
            growthStage: 'unknown',
            currentSoilMoisture: 0,
            weatherConditions: 'no data available',
            recentAlerts: [],
        };

        // Build RAG context from real farm data if farmId is provided
        let ragData: string | undefined;
        if (farmId) {
            try {
                const farmRAGContext = await buildFarmContext(farmId);
                if (farmRAGContext) {
                    ragData = formatContextForPrompt(farmRAGContext);
                    console.log('📊 [API] RAG context built for farm:', farmId);
                }

                // Also include multi-farm data if userId available
                if (userId) {
                    const multiFarmContexts = await buildMultiFarmContext(userId);
                    if (multiFarmContexts.length > 1) {
                        const otherFarms = multiFarmContexts
                            .filter((c) => c.farmName !== farmRAGContext?.farmName)
                            .map((c) => formatContextForPrompt(c))
                            .join('\n---\n');
                        if (otherFarms) {
                            ragData += `\n\nOTHER FARMS DATA (for cross-farm learning):\n${otherFarms}`;
                        }
                    }
                }
            } catch (ragError) {
                console.warn('⚠️ [API] RAG context build failed:', ragError);
                // Continue without RAG - graceful degradation
            }
        }

        console.log('🤖 [API] Creating chatbot instance...');
        const chatbot = new KrishiSahayakChatbot();

        console.log('🚀 ===== USING GEMINI API WITH RAG =====');

        const { response, updatedHistory } = await chatbot.generateResponse(
            message,
            farmContext,
            chatHistory,
            ragData
        );

        console.log('✅ [API] Response received from chatbot');
        console.log('   Response length:', response.length);
        console.log('🎯 ===== RESPONSE SOURCE: GEMINI AI + RAG =====');

        // Store updated history
        conversationStore.set(sessionId, updatedHistory);
        sessionTimestamps.set(sessionId, now);

        return NextResponse.json({
            response,
            sessionId,
            timestamp: new Date().toISOString(),
            hasRAG: !!ragData,
        });
    } catch (error) {
        console.error('❌ [API] Chat API error:', error);
        if (error instanceof Error) {
            console.error('   Error message:', error.message);

            if (error.message.includes('not authorized') || error.message.includes('403')) {
                return NextResponse.json(
                    { error: '🔑 API key error. Please verify your Gemini API key.' },
                    { status: 403 }
                );
            }

            if (error.message.includes('API Key')) {
                return NextResponse.json(
                    { error: 'AI service configuration error.' },
                    { status: 500 }
                );
            }

            if (error.message.includes('fetch') || error.message.includes('network')) {
                return NextResponse.json(
                    { error: 'Network error. Please check your connection.' },
                    { status: 503 }
                );
            }
        }

        return NextResponse.json(
            { error: 'Krishi Sevak is temporarily unavailable. Please try again.' },
            { status: 500 }
        );
    }
}
