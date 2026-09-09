'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, FarmContext } from '@/types';
import { useFarm } from '@/contexts/FarmContext';

export default function KrishiSahayak() {
    const { selectedFarm } = useFarm();
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            role: 'assistant',
            content: '🙏 Namaste! I am Krishi Sahayak (कृषि सहायक), your AI farming assistant. How can I help you today with your crops?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Build farmContext from real selected farm data
    const farmContext: FarmContext = {
        cropType: selectedFarm?.name || 'unknown',
        growthStage: 'Development',
        currentSoilMoisture: 0,
        weatherConditions: 'data from AgroMonitoring',
        recentAlerts: []
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            id: String(Date.now()),
            role: 'user',
            content: input,
            timestamp: new Date(),
            context: farmContext
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    context: farmContext,
                    sessionId,
                    farmId: selectedFarm?.id || null  // Pass farmId for RAG
                })
            });

            console.log('📥 [Frontend] Response received:', response.status);
            const data = await response.json();
            console.log('📦 [Frontend] Response data:', data);

            if (!response.ok) {
                console.error('❌ [Frontend] API error:', data);
                throw new Error(data.error || 'Failed to send message');
            }

            console.log('✅ [Frontend] Bot response:', data.response?.substring(0, 100));
            const assistantMessage: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: data.response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('❌ [Frontend] Chat error:', error);
            if (error instanceof Error) {
                console.error('   Error message:', error.message);
            }
            const errorMessage: ChatMessage = {
                id: String(Date.now() + 1),
                role: 'assistant',
                content: '🙏 Namaste! I am experiencing technical difficulties connecting to the AI service. Please check your internet connection and try again in a moment. If the problem persists, the Gemini API might be temporarily unavailable.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = async () => {
        try {
            // Reset conversation on backend
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    reset: true
                })
            });

            // Clear local messages
            setMessages([{
                id: '1',
                role: 'assistant',
                content: '🙏 Namaste! I am Krishi Sahayak (कृषि सहायक), your AI farming assistant. How can I help you today with your crops?',
                timestamp: new Date()
            }]);
        } catch (error) {
            console.error('Error resetting chat:', error);
        }
    };

    // Quick suggestions
    const suggestions = [
        'When should I irrigate?',
        'My leaves are yellowing',
        'Weather impact on crops',
        'Best fertilizer timing'
    ];

    if (!isOpen) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                    zIndex: 1000,
                    transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                }}
            >
                <img src="/assets/icons/chatbot-icon.png" alt="Krishi Sahayak" style={{ width: '40px', height: '40px' }} />
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '400px',
            height: '600px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                background: 'var(--gradient-primary)',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem'
                    }}>
                        👨‍🌾
                    </div>
                    <div>
                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
                            Krishi Sahayak
                        </h3>
                        <p style={{ margin: 0, color: '#D1FAE5', fontSize: '0.75rem' }}>
                            AI Farming Assistant
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleNewChat}
                        title="Start new conversation"
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: 'white',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    >
                        🔄
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            background: 'rgba(255, 255, 255, 0.2)',
                            border: 'none',
                            color: 'white',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'var(--color-background)'
            }}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div style={{
                            maxWidth: '75%',
                            padding: '0.75rem 1rem',
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: msg.role === 'user'
                                ? 'var(--gradient-primary)'
                                : 'white',
                            color: msg.role === 'user' ? 'white' : 'var(--color-text-primary)',
                            boxShadow: 'var(--shadow-sm)',
                            fontSize: '0.9rem',
                            lineHeight: 1.6
                        }}>
                            {msg.content}
                            <div style={{
                                fontSize: '0.7rem',
                                opacity: 0.7,
                                marginTop: '0.25rem'
                            }}>
                                {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '16px 16px 16px 4px',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: 'white',
                            boxShadow: 'var(--shadow-sm)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="pulse" style={{ display: 'flex', gap: '0.25rem' }}>
                                    <span>●</span><span>●</span><span>●</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', opacity: 0.95 }}>
                                    Krishi Sevak is thinking...
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length === 1 && (
                <div style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    borderTop: '1px solid #E5E7EB'
                }}>
                    {suggestions.map((sug, i) => (
                        <button
                            key={i}
                            onClick={() => setInput(sug)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                background: 'var(--color-surface-elevated)',
                                border: '1px solid var(--color-primary-light)',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--color-surface-elevated)'}
                        >
                            {sug}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div style={{
                padding: '1rem',
                borderTop: '1px solid #E5E7EB',
                background: 'white'
            }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask me anything about your crops..."
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: '2px solid var(--color-primary-light)',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        className="btn-primary"
                        style={{
                            padding: '0.75rem 1.25rem',
                            fontSize: '1.2rem',
                            opacity: !input.trim() || loading ? 0.5 : 1
                        }}
                    >
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}
