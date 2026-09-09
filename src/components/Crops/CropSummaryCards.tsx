'use client';

import { Crop } from './mockCropData';
import styles from './CropSummaryCards.module.css';

interface CropSummaryCardsProps {
    crop: Crop;
}

export default function CropSummaryCards({ crop }: CropSummaryCardsProps) {
    const summaryData = [
        {
            icon: '🌾',
            label: 'Crop Type',
            value: crop.name,
            color: '#10B981'
        },
        {
            icon: '📏',
            label: 'Field Area',
            value: `${crop.area} hectares`,
            color: '#3B82F6'
        },
        {
            icon: '📅',
            label: 'Planting Date',
            value: new Date(crop.plantingDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            color: '#8B5CF6'
        },
        {
            icon: '🏆',
            label: 'Expected Harvest',
            value: new Date(crop.expectedHarvest).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            color: '#EC4899'
        },
        {
            icon: '💚',
            label: 'AI Health Score',
            value: `${crop.health}%`,
            color: crop.health >= 80 ? '#10B981' : crop.health >= 60 ? '#FBBF24' : '#EF4444'
        },
        {
            icon: '💧',
            label: 'Crop Coefficient (Kc)',
            value: `${crop.kc} (AI)`,
            color: '#10B981'
        }
    ];

    return (
        <div className={styles.summaryCards}>
            {summaryData.map((item, index) => (
                <div
                    key={index}
                    className={styles.summaryCard}
                    style={{ '--accent-color': item.color } as React.CSSProperties}
                >
                    <div className={styles.cardIcon}>{item.icon}</div>
                    <div className={styles.cardContent}>
                        <div className={styles.cardLabel}>{item.label}</div>
                        <div
                            className={styles.cardValue}
                            style={{ color: item.color }}
                        >
                            {item.value}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
