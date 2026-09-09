'use client';

import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import { LocationProvider } from '@/contexts/LocationContext';
import { FarmProvider } from '@/contexts/FarmContext';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    console.log('Auth UI Loaded');

    return (
        <html lang="en">
            <body className={inter.className}>
                <SessionProvider>
                    <LocationProvider>
                        <FarmProvider>{children}</FarmProvider>
                    </LocationProvider>
                </SessionProvider>

                {/* Global Navigation Overlay */}
                <div
                    id="nav-overlay"
                    style={{
                        position: 'fixed',
                        inset: '0',
                        zIndex: 99999,
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                    }}
                >
                    <div style={{
                        textAlign: 'center',
                        fontWeight: 600,
                        color: '#10B981'
                    }}>
                        <div className="loader"></div>
                        <p style={{ marginTop: '1rem', fontSize: '1.125rem' }}>
                            Opening your dashboard...
                        </p>
                        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: 0.7 }}>
                            Just a moment 🌾
                        </p>
                    </div>
                </div>
            </body>
        </html>
    );
}
