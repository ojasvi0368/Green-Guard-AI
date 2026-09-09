'use client';

import { Crop } from './mockCropData';
import CropSummaryCards from './CropSummaryCards';
import GrowthStageTimeline from './GrowthStageTimeline';
import styles from './CropDetailsPanel.module.css';

interface CropDetailsPanelProps {
    crop: Crop | null;
}

export default function CropDetailsPanel({ crop }: CropDetailsPanelProps) {
    if (!crop) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🌾</div>
                <h3 className={styles.emptyTitle}>Select a Crop</h3>
                <p className={styles.emptyText}>
                    Choose a crop from the left panel to view its detailed growth timeline and AI insights
                </p>
            </div>
        );
    }

    return (
        <div className={styles.detailsPanel}>
            <div className={styles.panelHeader}>
                <div>
                    <h2 className={styles.cropTitle}>
                        {crop.name === 'Wheat' && '🌾'}
                        {crop.name === 'Rice' && '🌾'}
                        {crop.name === 'Cotton' && '🌿'}
                        {crop.name === 'Maize' && '🌽'}
                        {crop.name === 'Tomato' && '🍅'}
                        {' '}{crop.name} - {crop.fieldId}
                    </h2>
                    <p className={styles.cropSubtitle}>
                        Day {crop.daysSincePlanting} of growth • {crop.currentStage} stage
                    </p>
                </div>
                <div className={styles.healthBadge}>
                    <span className={styles.healthLabel}>AI Health</span>
                    <span
                        className={styles.healthValue}
                        style={{
                            color: crop.health >= 80 ? '#10B981' : crop.health >= 60 ? '#FBBF24' : '#EF4444'
                        }}
                    >
                        {crop.health}%
                    </span>
                </div>
            </div>

            <CropSummaryCards crop={crop} />

            <GrowthStageTimeline crop={crop} />

            {/* Additional Insights */}
            <div className={styles.insightsSection}>
                <h3 className={styles.insightsTitle}>🤖 AI Insights</h3>
                <div className={styles.insightsList}>
                    <div className={styles.insightCard}>
                        <span className={styles.insightIcon}>💧</span>
                        <div className={styles.insightContent}>
                            <div className={styles.insightLabel}>Water Management</div>
                            <div className={styles.insightText}>
                                Current water requirements are optimal. Maintain irrigation schedule based on soil moisture readings.
                            </div>
                        </div>
                    </div>
                    <div className={styles.insightCard}>
                        <span className={styles.insightIcon}>🌡️</span>
                        <div className={styles.insightContent}>
                            <div className={styles.insightLabel}>Weather Impact</div>
                            <div className={styles.insightText}>
                                Favorable conditions predicted for the next 7 days. No stress expected.
                            </div>
                        </div>
                    </div>
                    <div className={styles.insightCard}>
                        <span className={styles.insightIcon}>📈</span>
                        <div className={styles.insightContent}>
                            <div className={styles.insightLabel}>Yield Prediction</div>
                            <div className={styles.insightText}>
                                Based on current growth patterns, expected yield is above average for this season.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
