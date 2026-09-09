import type { Metadata } from 'next';
import IrrigationCalculator from '@/components/IrrigationCalculator/IrrigationCalculator';

export const metadata: Metadata = {
    title: 'Irrigation Calculator - GreenGuard AI',
    description: 'Calculate daily water requirements and irrigation schedules for various crops based on area and temperature.',
    keywords: ['irrigation', 'water requirement', 'crop calculator', 'smart farming', 'agriculture'],
};

export default function CalculatorPage() {
    return (
        <main>
            <IrrigationCalculator />
        </main>
    );
}
