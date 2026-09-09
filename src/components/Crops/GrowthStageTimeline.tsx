'use client';

import { motion } from 'framer-motion';
import { Crop, GrowthStage, growthStagesByCrop } from './mockCropData';
import styles from './GrowthStageTimeline.module.css';

interface GrowthStageTimelineProps {
    crop: Crop;
}

export default function GrowthStageTimeline({ crop }: GrowthStageTimelineProps) {
    const cropKey = crop.name.toLowerCase() as keyof typeof growthStagesByCrop;
    const stages = growthStagesByCrop[cropKey] || growthStagesByCrop.wheat;

    const getStageIcon = (stageName: string) => {
        if (stageName.toLowerCase().includes('germin')) return '🌱';
        if (stageName.toLowerCase().includes('vegetative')) return '🌿';
        if (stageName.toLowerCase().includes('flower')) return '🌸';
        if (stageName.toLowerCase().includes('grain') || stageName.toLowerCase().includes('fruit') || stageName.toLowerCase().includes('boll')) return '🌾';
        if (stageName.toLowerCase().includes('matur')) return '✨';
        return '🌾';
    };

    const getStatusColor = (status: string) => {
        if (status === 'completed') return '#10B981'; // Green
        if (status === 'current') return '#3B82F6'; // Blue
        return '#9CA3AF'; // Gray
    };

    const completedStages = stages.filter(s => s.status === 'completed').length;
    const totalStages = stages.length;
    const progressPercentage = (completedStages / totalStages) * 100;

    return (
        <div className={styles.timelineContainer}>
            <div className={styles.timelineHeader}>
                <div>
                    <h3 className={styles.timelineTitle}>🌱 Growth Stage Intelligence</h3>
                    <p className={styles.timelineSubtitle}>
                        Track your crop's development journey with AI-powered insights
                    </p>
                </div>
                <div className={styles.progressInfo}>
                    <div className={styles.progressLabel}>Overall Progress</div>
                    <div className={styles.progressValue}>{Math.round(progressPercentage)}%</div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressBarContainer}>
                <div className={styles.progressBarTrack}>
                    <motion.div
                        className={styles.progressBarFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Timeline */}
            <div className={styles.timeline}>
                {stages.map((stage, index) => (
                    <motion.div
                        key={index}
                        className={styles.stageWrapper}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                        {/* Stage Node */}
                        <div className={styles.stageNode}>
                            <motion.div
                                className={`${styles.nodeCircle} ${styles[stage.status]}`}
                                style={{
                                    borderColor: getStatusColor(stage.status),
                                    backgroundColor: stage.status === 'current'
                                        ? `${getStatusColor(stage.status)}20`
                                        : stage.status === 'completed'
                                            ? getStatusColor(stage.status)
                                            : 'transparent'
                                }}
                                whileHover={{ scale: 1.1 }}
                                animate={stage.status === 'current' ? {
                                    boxShadow: [
                                        '0 0 0 0 rgba(59, 130, 246, 0.4)',
                                        '0 0 0 10px rgba(59, 130, 246, 0)',
                                    ]
                                } : {}}
                                transition={stage.status === 'current' ? {
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: 'loop'
                                } : {}}
                            >
                                <span className={styles.nodeIcon}>
                                    {stage.status === 'completed' ? '✓' : getStageIcon(stage.name)}
                                </span>
                            </motion.div>

                            {/* Connecting Line */}
                            {index < stages.length - 1 && (
                                <div
                                    className={styles.connectingLine}
                                    style={{
                                        backgroundColor: stage.status === 'completed'
                                            ? '#10B981'
                                            : '#E5E7EB'
                                    }}
                                />
                            )}
                        </div>

                        {/* Stage Info */}
                        <motion.div
                            className={styles.stageInfo}
                            whileHover={{ y: -4 }}
                        >
                            <div className={styles.stageName}>
                                {stage.name}
                                {stage.status === 'current' && (
                                    <span className={styles.currentBadge}>Current</span>
                                )}
                            </div>

                            <div className={styles.stageDetails}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailIcon}>⏱️</span>
                                    <span className={styles.detailText}>{stage.duration} days</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailIcon}>💧</span>
                                    <span className={styles.detailText}>{stage.waterNeed} mm/day</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailIcon}>🌿</span>
                                    <span className={styles.detailText}>{stage.nutrient}</span>
                                </div>
                            </div>

                            {stage.status === 'current' && (
                                <div className={styles.currentIndicator}>
                                    <div className={styles.pulseRing} />
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* Summary Stats */}
            <div className={styles.timelineFooter}>
                <div className={styles.footerStat}>
                    <span className={styles.footerIcon}>✅</span>
                    <span className={styles.footerText}>{completedStages} Completed</span>
                </div>
                <div className={styles.footerStat}>
                    <span className={styles.footerIcon}>🔵</span>
                    <span className={styles.footerText}>1 In Progress</span>
                </div>
                <div className={styles.footerStat}>
                    <span className={styles.footerIcon}>⏳</span>
                    <span className={styles.footerText}>{totalStages - completedStages - 1} Upcoming</span>
                </div>
            </div>
        </div>
    );
}
