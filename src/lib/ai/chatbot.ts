/**
 * Krishi Sahayak - AI Chatbot using Google Gemini REST API
 * Context-aware agricultural assistant
 */

import { FarmContext } from '@/types';

// Gemini-specific message format
export interface GeminiMessage {
    role: 'user' | 'model';
    parts: string;
}

export class KrishiSahayakChatbot {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        console.log('🔑 [Chatbot] Initializing with API key:', this.apiKey ? '✅ Present (length: ' + this.apiKey.length + ')' : '❌ MISSING');

        if (!this.apiKey) {
            console.error('❌ [Chatbot] GEMINI_API_KEY not found in environment variables!');
        } else {
            console.log('✅ [Chatbot] Chatbot initialized with Gemini REST API');
        }
    }

    /**
     * Generate response with farm context and conversation history
     * @param ragData - Optional real farm data from PostgreSQL (NDVI, weather, etc.)
     */
    async generateResponse(
        userMessage: string,
        context: FarmContext,
        chatHistory: GeminiMessage[] = [],
        ragData?: string
    ): Promise<{ response: string; updatedHistory: GeminiMessage[] }> {
        console.log('📨 [Chatbot] generateResponse called');
        console.log('   User message:', userMessage);
        console.log('   History length:', chatHistory.length);
        console.log('   API Key available:', !!this.apiKey);

        if (!this.apiKey) {
            console.error('❌ [Chatbot] CRITICAL: API Key not available!');
            throw new Error('Gemini API is not configured. Please add GEMINI_API_KEY to .env.local and restart the server.');
        }

        // Limit history to last 15 messages
        const limitedHistory = chatHistory.slice(-15);

        // Build context-aware system prompt (with optional RAG data)
        const systemPrompt = this.buildSystemPrompt(context, ragData);
        console.log('   System prompt length:', systemPrompt.length);

        try {
            console.log('🤖 [Chatbot] Using Gemini REST API (gemini-2.5-flash)');
            console.log('   Limited history items:', limitedHistory.length);

            // Build contents array for Gemini API
            const contents = [];

            // Add system context as first user message if no history
            if (limitedHistory.length === 0) {
                contents.push({
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }]
                });
            } else {
                // Add history
                for (const msg of limitedHistory) {
                    contents.push({
                        role: msg.role,
                        parts: [{ text: msg.parts }]
                    });
                }
                // Add current message
                contents.push({
                    role: 'user',
                    parts: [{ text: userMessage }]
                });
            }

            // Call Gemini API directly using REST
            const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

            console.log('   Calling Gemini REST API (v1 - gemini-2.5-flash)...');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.9,
                        maxOutputTokens: 1024,
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [Chatbot] Gemini API HTTP error:', response.status);
                console.error('   Error response:', errorText);

                // Specific handling for 403 errors
                if (response.status === 403) {
                    console.error('   🚨 403 FORBIDDEN - API Key issue!');
                    console.error('   Possible causes:');
                    console.error('   1. API key is invalid or expired');
                    console.error('   2. API key not authorized for gemini-pro model');
                    console.error('   3. Billing not enabled or quota exceeded');
                    console.error('   4. API key restrictions (IP/referrer) blocking request');
                    throw new Error('Gemini API key is not authorized. Please check your API key at https://makersuite.google.com/app/apikey');
                }

                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ [Chatbot] Gemini API response received');

            // Extract response text
            const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                console.error('❌ [Chatbot] No text in response');
                console.error('   Full response:', JSON.stringify(data).substring(0, 500));
                throw new Error('No response text from Gemini');
            }

            console.log('✅ [Chatbot] Response text extracted, length:', responseText.length);
            console.log('🚀 [Chatbot] ✅ CHATBOT RESPONSE SOURCE: GEMINI AI');

            // Update history with new exchange
            const updatedHistory: GeminiMessage[] = [
                ...limitedHistory,
                { role: 'user', parts: userMessage },
                { role: 'model', parts: responseText }
            ];

            return { response: responseText, updatedHistory };

        } catch (error) {
            console.error('❌ [Chatbot] Gemini API error:', error);
            if (error instanceof Error) {
                console.error('   Error message:', error.message);
            }

            // Simple error message - NO RULE-BASED FALLBACK
            const errorMessage = 'Krishi Sevak AI is temporarily unavailable. Please try again in a moment.';
            console.log('⚠️ [Chatbot] Returning error message');

            return {
                response: errorMessage,
                updatedHistory: [...limitedHistory,
                { role: 'user', parts: userMessage },
                { role: 'model', parts: errorMessage }
                ]
            };
        }
    }

    /**
     * Build context-aware system prompt with optional RAG data
     */
    private buildSystemPrompt(context: FarmContext, ragData?: string): string {
        let prompt = `You are Krishi Sahayak (कृषि सहायक), an intelligent agricultural assistant for GreenGuard AI.
You specialize in irrigation management, crop health, and sustainable farming practices.

CURRENT FARM CONTEXT:
- Crop: ${context.cropType}
- Growth Stage: ${context.growthStage}
- Soil Moisture: ${context.currentSoilMoisture.toFixed(1)}%
- Next Irrigation: ${context.nextIrrigation ? new Date(context.nextIrrigation).toLocaleString() : 'Not scheduled'}
- Weather: ${context.weatherConditions}
- Recent Alerts: ${context.recentAlerts.length > 0 ? context.recentAlerts.map(a => a.title).join(', ') : 'None'}`;

        // Inject real satellite/weather data from PostgreSQL if available
        if (ragData) {
            prompt += `\n\nREAL-TIME SATELLITE & WEATHER DATA (from AgroMonitoring):\n${ragData}\n\nIMPORTANT: Use the REAL data above to provide specific, data-driven answers. Do NOT give generic advice — reference the actual NDVI, weather, soil moisture, and drought risk values.`;
        }

        prompt += `\n\nINSTRUCTIONS:
1. Provide practical, actionable advice for farmers
2. Reference the REAL farm data (NDVI, weather, soil moisture) in your responses
3. Be concise and use simple language
4. If discussing crop diseases, provide symptoms, causes, and remedies
5. Promote water conservation and sustainable practices
6. Support both English and Hindi (when user writes in Hindi, respond in Hindi)
7. Use specific numbers from the context when relevant
8. If real satellite data is available, prioritize it over generic knowledge

Answer the following question:`;

        return prompt;
    }

    /**
     * Diagnose crop disease based on symptoms
     */
    async diagnoseCropDisease(symptoms: string, cropType: string): Promise<string> {
        const prompt = `As an agricultural expert, diagnose potential crop disease for ${cropType} with these symptoms: ${symptoms}.
    
Provide:
1. Most likely disease/problem
2. Symptoms to confirm diagnosis
3. Treatment/remedy
4. Prevention measures

Keep response practical and concise.`;

        try {
            if (this.apiKey) {
                const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    })
                });

                const data = await response.json();
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to diagnose at this time.';
            }
        } catch (error) {
            console.error('Disease diagnosis error:', error);
        }

        // Fallback
        return `Based on the symptoms for ${cropType}, I recommend:\n\n1. Inspect leaves for fungal spots or pest damage\n2. Check soil drainage and moisture levels\n3. Consult local agricultural extension office\n4. Consider applying organic neem oil as preventive measure`;
    }

    /**
     * Get best practices for crop
     */
    getBestPractices(cropType: string, growthStage: string): string {
        const practices: Record<string, Record<string, string[]>> = {
            wheat: {
                Initial: [
                    'Ensure uniform seed spacing',
                    'Apply pre-emergent herbicides',
                    'Light irrigation to support germination'
                ],
                Development: [
                    'Apply nitrogen fertilizer',
                    'Monitor for aphids and army worms',
                    'Irrigate when soil moisture drops to 50%'
                ],
                'Mid-Season': [
                    'Apply second nitrogen dose',
                    'Monitor for rust diseases',
                    'Maintain consistent soil moisture'
                ],
                'Late Season': [
                    'Reduce irrigation frequency',
                    'Watch for grain filling',
                    'Prepare for harvest'
                ]
            }
        };

        const cropPractices = practices[cropType.toLowerCase()];
        if (!cropPractices) return 'General crop care: Monitor regularly and maintain optimal conditions.';

        const stagePractices = cropPractices[growthStage] || Object.values(cropPractices)[0];
        return stagePractices.join('\n• ');
    }
}

export default KrishiSahayakChatbot;
