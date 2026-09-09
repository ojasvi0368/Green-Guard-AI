'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return null; // loading.tsx will show
    }

    if (!session) {
        redirect('/login');
    }

    return <DashboardClient />;
}
