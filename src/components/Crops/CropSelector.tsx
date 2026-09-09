'use client';

import { Crop } from './mockCropData';
import styles from './CropSelector.module.css';

interface CropSelectorProps {
    crops: Crop[];
    selectedCrop: Crop | null;
    onSelectCrop: (crop: Crop) => void;
}

export default function CropSelector({ crops, selectedCrop, onSelectCrop }: CropSelectorProps) {
    const getHealthColor = (health: number) => {
        if (health >= 80) return '#10B981'; // Green
        if (health >= 60) return '#FBBF24'; // Yellow
        return '#EF4444'; // Red
    };

    const getHealthLabel = (health: number) => {
        if (health >= 80) return 'Excellent';
        if (health >= 60) return 'Good';
        return 'Needs Attention';
    };

    return (
        <div className={styles.cropSelector}>
            <div className={styles.selectorHeader}>
                <h3 className={styles.selectorTitle}>🌱 My Crops</h3>
                <span className={styles.cropCount}>{crops.length} Fields</span>
            </div>

            <div className={styles.cropList}>
                {crops.map((crop) => (
                    <div
                        key={crop.id}
                        className={`${styles.cropCard} ${selectedCrop?.id === crop.id ? styles.active : ''}`}
                        onClick={() => onSelectCrop(crop)}
                    >
                        <div className={styles.cropCardHeader}>
                            <div className={styles.cropName}>
                                <span className={styles.cropIcon}>
                                    {crop.name === 'Wheat' && '🌾'}
                                    {crop.name === 'Rice' && '🌾'}
                                    {crop.name === 'Cotton' && '🌿'}
                                    {crop.name === 'Maize' && '🌽'}
                                    {crop.name === 'Tomato' && '🍅'}
                                </span>
                                <span className={styles.cropTitle}>{crop.name}</span>
                            </div>
                            <span className={styles.fieldId}>{crop.fieldId}</span>
                        </div>

                        <div className={styles.cropStats}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Area</span>
                                <span className={styles.statValue}>{crop.area} ha</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Health</span>
                                <span
                                    className={styles.statValue}
                                    style={{ color: getHealthColor(crop.health) }}
                                >
                                    {crop.health}%
                                </span>
                            </div>
                        </div>

                        <div className={styles.cropStage}>
                            <span
                                className={styles.stageBadge}
                                style={{
                                    backgroundColor: `${getHealthColor(crop.health)}20`,
                                    color: getHealthColor(crop.health)
                                }}
                            >
                                {crop.currentStage}
                            </span>
                            <span className={styles.daysCount}>{crop.daysSincePlanting} days</span>
                        </div>

                        {selectedCrop?.id === crop.id && (
                            <div className={styles.activeIndicator} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
