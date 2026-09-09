'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import SoilMoistureClient from './SoilMoistureClient';

export default function SoilMoisturePage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return null;
    }

    if (!session) {
        redirect('/login');
    }

    return <SoilMoistureClient />;
}
