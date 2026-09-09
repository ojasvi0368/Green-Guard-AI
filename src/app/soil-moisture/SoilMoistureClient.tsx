'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './SoilMoisture.module.css';
import { arduinoCode } from '@/lib/arduinoCode';

interface SoilMoistureData {
    value: number;
    timestamp: string;
}

interface LogEntry {
    value: number;
    timestamp: string;
    displayTime: string;
}

export default function SoilMoistureClient() {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const logContainerRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll to bottom when new entries added
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logEntries]);

    // Polling logic
    useEffect(() => {
        if (isMonitoring) {
            // Start polling
            fetchLatestData();
            pollIntervalRef.current = setInterval(fetchLatestData, 1500); // Poll every 1.5 seconds
        } else {
            // Stop polling
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [isMonitoring]);

    const fetchLatestData = async () => {
        try {
            const response = await fetch('/api/soil-moisture/latest');
            const result = await response.json();

            if (result.connected && result.data) {
                setIsConnected(true);
                setErrorMessage('');

                // Add new entry to log
                const newEntry: LogEntry = {
                    value: result.data.value,
                    timestamp: result.data.timestamp,
                    displayTime: formatTime(result.data.timestamp)
                };

                setLogEntries(prev => {
                    // Check if this is a duplicate (same timestamp)
                    const isDuplicate = prev.some(entry => entry.timestamp === newEntry.timestamp);
                    if (isDuplicate) return prev;

                    // Keep last 50 entries
                    const updated = [...prev, newEntry];
                    return updated.slice(-50);
                });
            } else {
                setIsConnected(false);
                setErrorMessage(result.message || '⚠️ Real-time data not available. Please check device or network.');
            }
        } catch (error) {
            console.error('Error fetching soil moisture data:', error);
            setIsConnected(false);
            setErrorMessage('⚠️ Failed to connect to server. Please try again.');
        }
    };

    const formatTime = (timestamp: string): string => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    const handleToggleMonitoring = () => {
        setIsMonitoring(!isMonitoring);
        if (!isMonitoring) {
            // Clear previous logs when starting fresh
            setLogEntries([]);
            setErrorMessage('');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Soil Moisture Real-Time Data</h1>
                <p className={styles.subtitle}>
                    Live monitoring from ESP32 + Soil Moisture Sensor
                </p>
            </div>

            <div className={styles.panels}>
                {/* Left Panel - Real-Time Monitor */}
                <div className={styles.leftPanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>Real-Time Monitor</h2>
                        <div className={styles.controls}>
                            <div className={styles.statusIndicator}>
                                <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
                                <span className={styles.statusText}>
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <button
                                className={`${styles.toggleButton} ${isMonitoring ? styles.active : ''}`}
                                onClick={handleToggleMonitoring}
                            >
                                {isMonitoring ? '⏸ Stop Monitoring' : '▶ Start Monitoring'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.logContainer} ref={logContainerRef}>
                        {!isMonitoring && logEntries.length === 0 && (
                            <div className={styles.placeholder}>
                                <p>Click "Start Monitoring" to begin receiving real-time data</p>
                                <p className={styles.placeholderNote}>
                                    Note: ESP32 must be connected and sending data to localhost
                                </p>
                            </div>
                        )}

                        {isMonitoring && logEntries.length === 0 && !errorMessage && (
                            <div className={styles.placeholder}>
                                <p>Waiting for data from ESP32...</p>
                            </div>
                        )}

                        {errorMessage && (
                            <div className={styles.errorMessage}>
                                {errorMessage}
                            </div>
                        )}

                        {logEntries.map((entry, index) => (
                            <div key={`${entry.timestamp}-${index}`} className={styles.logEntry}>
                                <span className={styles.logTime}>[{entry.displayTime}]</span>
                                <span className={styles.logText}>
                                    Soil Moisture Raw Value: <span className={styles.logValue}>{entry.value}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Arduino Code Viewer */}
                <div className={styles.rightPanel}>
                    <div className={styles.panelHeader}>
                        <h2 className={styles.panelTitle}>ESP32 Arduino Code</h2>
                        <span className={styles.codeLabel}>Read-Only</span>
                    </div>

                    <div className={styles.codeContainer}>
                        <pre className={styles.codeBlock}>
                            <code>{arduinoCode}</code>
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}
