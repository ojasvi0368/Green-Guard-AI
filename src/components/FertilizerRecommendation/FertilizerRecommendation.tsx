'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../IrrigationCalculator/IrrigationCalculator.module.css';
import { getAvailableCrops, getCropNutrientRequirement, type CropNutrientRequirement } from '@/lib/fertilizerRecommendation/cropNutrients';
import { getFertilizerRecommendation, type FertilizerResult } from '@/lib/fertilizerRecommendation/recommendationEngine';
import { getSoilProperties } from '@/lib/cropRecommendation/soilDatabase';
import { getAvailableStates, getDistrictsByState } from '@/lib/locationData';


export default function FertilizerRecommendation() {
    // Location
    const [state, setState] = useState<string>('');
    const [district, setDistrict] = useState<string>('');

    // Soil type and properties
    const [soilType, setSoilType] = useState<string>('');
    const [pH, setPH] = useState<string>('');
    const [organicCarbon, setOrganicCarbon] = useState<string>('');
    const [nitrogen, setNitrogen] = useState<string>('');
    const [phosphorus, setPhosphorus] = useState<string>('');
    const [potassium, setPotassium] = useState<string>('');
    const [ec, setEC] = useState<string>('');

    // Crop and field
    const [selectedCrop, setSelectedCrop] = useState<string>('');
    const [cropStage, setCropStage] = useState<string>('');
    const [season, setSeason] = useState<string>('');
    const [fieldArea, setFieldArea] = useState<string>('');

    // Results
    const [showResults, setShowResults] = useState<boolean>(false);
    const [results, setResults] = useState<FertilizerResult | null>(null);
    const [cropRequirement, setCropRequirement] = useState<CropNutrientRequirement | null>(null);

    const availableStates = getAvailableStates();
    const districtsList = state ? getDistrictsByState(state) : [];
    const availableCrops = getAvailableCrops();

    // Auto-fill soil properties when soil type is selected
    useEffect(() => {
        if (soilType) {
            const props = getSoilProperties(soilType);
            if (props) {
                setPH(props.pH.toString());
                setOrganicCarbon(props.organicCarbon.toString());
                setNitrogen(props.nitrogen.toString());
                setPhosphorus(props.phosphorus.toString());
                setPotassium(props.potassium.toString());
                setEC(props.ec.toString());
            }
        }
    }, [soilType]);

    // Update crop requirement display when crop is selected
    useEffect(() => {
        if (selectedCrop) {
            const requirement = getCropNutrientRequirement(selectedCrop);
            setCropRequirement(requirement);
        } else {
            setCropRequirement(null);
        }
    }, [selectedCrop]);

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate inputs
        if (!state || !district || !soilType || !selectedCrop || !cropStage || !season || !fieldArea) {
            alert('Please fill in all required fields');
            return;
        }

        if (!nitrogen || !phosphorus || !potassium) {
            alert('Please ensure soil nutrient values are filled');
            return;
        }

        const cropReq = getCropNutrientRequirement(selectedCrop);
        if (!cropReq) {
            alert('Invalid crop selected');
            return;
        }

        // Calculate fertilizer recommendation
        const recommendation = getFertilizerRecommendation({
            cropRequirement: cropReq,
            soilNutrients: {
                nitrogen: parseFloat(nitrogen),
                phosphorus: parseFloat(phosphorus),
                potassium: parseFloat(potassium)
            },
            fieldArea: parseFloat(fieldArea)
        });

        setResults(recommendation);
        setShowResults(true);

        // Scroll to results
        setTimeout(() => {
            document.getElementById('resultsSection')?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }, 100);
    };

    return (
        <div className={styles.calculatorContainer}>
            <Link href="/dashboard" className={styles.backButton}>
                ← Back to Dashboard
            </Link>

            {/* HEADER */}
            <header className={styles.header}>
                <div className={styles.headerIcon}>🌾</div>
                <h1>Fertilizer Recommendation System</h1>
                <p className={styles.subtitle}>
                    Get precise fertilizer recommendations based on soil test and crop requirements
                </p>
            </header>

            {/* INPUT FORM */}
            <div className={styles.calculatorCard}>
                <form onSubmit={handleCalculate} className={styles.calculatorForm}>
                    {/* LOCATION SECTION */}
                    <div className={styles.sectionHeader}>
                        <h3>📍 Location Information</h3>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="stateSelect" className={styles.formLabel}>
                                <span className={styles.labelIcon}>🗺️</span>
                                State *
                            </label>
                            <select
                                id="stateSelect"
                                className={styles.formInput}
                                value={state}
                                onChange={(e) => {
                                    setState(e.target.value);
                                    setDistrict('');
                                }}
                                required
                            >
                                <option value="">Select State...</option>
                                {availableStates.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="districtSelect" className={styles.formLabel}>
                                <span className={styles.labelIcon}>📍</span>
                                District *
                            </label>
                            <select
                                id="districtSelect"
                                className={styles.formInput}
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                disabled={!state}
                                required
                            >
                                <option value="">Select District...</option>
                                {districtsList.map(d => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* SOIL SECTION */}
                    <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
                        <h3>🏜️ Soil Properties</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                            Select soil type to auto-fill properties (editable)
                        </p>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="soilTypeSelect" className={styles.formLabel}>
                                <span className={styles.labelIcon}>�</span>
                                Soil Type *
                            </label>
                            <select
                                id="soilTypeSelect"
                                className={styles.formInput}
                                value={soilType}
                                onChange={(e) => setSoilType(e.target.value)}
                                required
                            >
                                <option value="">Select Soil Type...</option>
                                <option value="sandy">Sandy</option>
                                <option value="loamy">Loamy</option>
                                <option value="clay">Clay</option>
                                <option value="silty">Silty</option>
                            </select>
                        </div>
                    </div>

                    {soilType && (
                        <div style={{
                            padding: '1.25rem',
                            backgroundColor: 'var(--color-surface-elevated)',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '1rem'
                        }}>
                            <h4 style={{ margin: 0, marginBottom: '1rem', fontSize: '0.95rem' }}>
                                Soil Parameters (Editable)
                            </h4>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="phInput" className={styles.formLabel}>
                                        pH Level
                                    </label>
                                    <input
                                        type="number"
                                        id="phInput"
                                        className={styles.formInput}
                                        step="0.1"
                                        min="0"
                                        max="14"
                                        value={pH}
                                        onChange={(e) => setPH(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="ocInput" className={styles.formLabel}>
                                        Organic Carbon (%)
                                    </label>
                                    <input
                                        type="number"
                                        id="ocInput"
                                        className={styles.formInput}
                                        step="0.1"
                                        min="0"
                                        value={organicCarbon}
                                        onChange={(e) => setOrganicCarbon(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="nInput" className={styles.formLabel}>
                                        Nitrogen (kg/ha)
                                    </label>
                                    <input
                                        type="number"
                                        id="nInput"
                                        className={styles.formInput}
                                        step="1"
                                        min="0"
                                        value={nitrogen}
                                        onChange={(e) => setNitrogen(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="pInput" className={styles.formLabel}>
                                        Phosphorus (kg/ha)
                                    </label>
                                    <input
                                        type="number"
                                        id="pInput"
                                        className={styles.formInput}
                                        step="1"
                                        min="0"
                                        value={phosphorus}
                                        onChange={(e) => setPhosphorus(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="kInput" className={styles.formLabel}>
                                        Potassium (kg/ha)
                                    </label>
                                    <input
                                        type="number"
                                        id="kInput"
                                        className={styles.formInput}
                                        step="1"
                                        min="0"
                                        value={potassium}
                                        onChange={(e) => setPotassium(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="ecInput" className={styles.formLabel}>
                                        EC (dS/m)
                                    </label>
                                    <input
                                        type="number"
                                        id="ecInput"
                                        className={styles.formInput}
                                        step="0.1"
                                        min="0"
                                        value={ec}
                                        onChange={(e) => setEC(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CROP DETAILS SECTION */}
                    <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
                        <h3>🌾 Crop Details</h3>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="cropSelect" className={styles.formLabel}>
                                <span className={styles.labelIcon}>�</span>
                                Select Crop *
                            </label>
                            <select
                                id="cropSelect"
                                className={styles.formInput}
                                value={selectedCrop}
                                onChange={(e) => setSelectedCrop(e.target.value)}
                                required
                            >
                                <option value="">Select Crop...</option>
                                {availableCrops.map(crop => (
                                    <option key={crop.name} value={crop.name}>{crop.displayName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {cropRequirement && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '1rem',
                            backgroundColor: '#F0FDF4',
                            borderRadius: '8px',
                            border: '1px solid #BBF7D0'
                        }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#166534' }}>
                                Standard Nutrient Requirement for {cropRequirement.displayName}:
                            </p>
                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                                <div>
                                    <strong>N:</strong> {cropRequirement.nitrogen} kg/ha
                                </div>
                                <div>
                                    <strong>P₂O₅:</strong> {cropRequirement.phosphorus} kg/ha
                                </div>
                                <div>
                                    <strong>K₂O:</strong> {cropRequirement.potassium} kg/ha
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FIELD DETAILS SECTION */}
                    <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
                        <h3>📋 Field Details</h3>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="cropStageSelect" className={styles.formLabel}>
                                <span className={styles.labelIcon}>🌿</span>
                                Crop Stage *
                            </label>
                            <select
                                id="cropStageSelect"
                                className={styles.formInput}
                                value={cropStage}
                                onChange={(e) => setCropStage(e.target.value)}
                                required
                            >
                                <option value="">Select Stage...</option>
                                <option value="initial">Initial</option>
                                <option value="development">Development</option>
                                <option value="midSeason">Mid-Season</option>
                                <option value="lateSeason">Late-Season</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="seasonSelect" className={styles.formLabel}>
                                <span className={styles.labelIcon}>📅</span>
                                Season *
                            </label>
                            <select
                                id="seasonSelect"
                                className={styles.formInput}
                                value={season}
                                onChange={(e) => setSeason(e.target.value)}
                                required
                            >
                                <option value="">Select Season...</option>
                                <option value="rabi">Rabi (Winter)</option>
                                <option value="kharif">Kharif (Rainy)</option>
                                <option value="zaid">Zaid (Summer)</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="fieldAreaInput" className={styles.formLabel}>
                                <span className={styles.labelIcon}>📏</span>
                                Field Area (hectares) *
                            </label>
                            <input
                                type="number"
                                id="fieldAreaInput"
                                className={styles.formInput}
                                step="0.1"
                                min="0"
                                value={fieldArea}
                                onChange={(e) => setFieldArea(e.target.value)}
                                placeholder="Enter field area"
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.calculateBtn}>
                        <span className={styles.btnIcon}>🧪</span>
                        Calculate Fertilizer Recommendation
                    </button>
                </form>
            </div>

            {/* RESULTS SECTION */}
            {showResults && results && cropRequirement && (
                <div id="resultsSection" className={styles.resultsSection}>
                    <div className={styles.resultsHeader}>
                        <h2>📊 Fertilizer Recommendation</h2>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                            Based on soil analysis and {cropRequirement.displayName} requirements for {fieldArea} hectares
                        </p>
                    </div>

                    {/* Adjusted Nutrient Requirements - Card Style */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                            🎯 Adjusted Nutrient Requirements
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                            {/* Nitrogen Card */}
                            <div style={{
                                padding: '1.5rem',
                                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                border: '2px solid var(--color-primary)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#065F46' }}>Nitrogen (N)</h4>
                                    <div style={{
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        {results.adjustedNutrients.nitrogenFactor}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#065F46' }}>
                                    <p style={{ margin: '0.25rem 0' }}>Crop Need: <strong>{cropRequirement.nitrogen} kg/ha</strong></p>
                                    <p style={{ margin: '0.25rem 0' }}>Soil Level: <strong>{nitrogen} kg/ha</strong></p>
                                    <p style={{ margin: '0.25rem 0' }}>Required: <strong>{results.adjustedNutrients.nitrogen.toFixed(1)} kg/ha</strong></p>
                                    <div style={{
                                        marginTop: '0.75rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#BBF7D0',
                                        borderRadius: '6px',
                                        fontWeight: 600
                                    }}>
                                        Total for Field: {results.totalNutrients.nitrogen.toFixed(1)} kg
                                    </div>
                                </div>
                            </div>

                            {/* Phosphorus Card */}
                            <div style={{
                                padding: '1.5rem',
                                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                border: '2px solid var(--color-primary)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#065F46' }}>Phosphorus (P₂O₅)</h4>
                                    <div style={{
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        {results.adjustedNutrients.phosphorusFactor}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#065F46' }}>
                                    <p style={{ margin: '0.25rem 0' }}>Crop Need: <strong>{cropRequirement.phosphorus} kg/ha</strong></p>
                                    <p style={{ margin: '0.25rem 0' }}>Soil Level: <strong>{phosphorus} kg/ha</strong></p>
                                    <p style={{ margin: '0.25rem 0' }}>Required: <strong>{results.adjustedNutrients.phosphorus.toFixed(1)} kg/ha</strong></p>
                                    <div style={{
                                        marginTop: '0.75rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#BBF7D0',
                                        borderRadius: '6px',
                                        fontWeight: 600
                                    }}>
                                        Total for Field: {results.totalNutrients.phosphorus.toFixed(1)} kg
                                    </div>
                                </div>
                            </div>

                            {/* Potassium Card */}
                            <div style={{
                                padding: '1.5rem',
                                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                                border: '2px solid var(--color-primary)',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#065F46' }}>Potassium (K₂O)</h4>
                                    <div style={{
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600
                                    }}>
                                        {results.adjustedNutrients.potassiumFactor}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#065F46' }}>
                                    <p style={{ margin: '0.25rem 0' }}>Crop Need: <strong>{cropRequirement.potassium} kg/ha</strong></p>
                                    <p style={{ margin: '0.25rem 0' }}>Soil Level: <strong>{potassium} kg/ha</strong></p>
                                    <p style={{ margin: '0.25rem 0' }}>Required: <strong>{results.adjustedNutrients.potassium.toFixed(1)} kg/ha</strong></p>
                                    <div style={{
                                        marginTop: '0.75rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#BBF7D0',
                                        borderRadius: '6px',
                                        fontWeight: 600
                                    }}>
                                        Total for Field: {results.totalNutrients.potassium.toFixed(1)} kg
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommended Fertilizers */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                            💊 Recommended Fertilizers
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {results.recommendations.map((rec, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: '1.5rem',
                                        background: '#F0FDF4',
                                        border: '1px solid #BBF7D0',
                                        borderRadius: 'var(--radius-lg)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#166534' }}>
                                            {rec.fertilizer.displayName}
                                        </h4>
                                        <div style={{
                                            padding: '0.25rem 0.75rem',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            borderRadius: '20px',
                                            fontSize: '0.875rem',
                                            fontWeight: 600
                                        }}>
                                            {rec.quantity} kg
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#166534' }}>
                                        {rec.purpose}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Application Guide */}
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--color-surface-elevated)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                            📖 Application Guide
                        </h3>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                            {results.applicationGuide.map((guide, idx) => (
                                <li key={idx} style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{guide}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            <footer className={styles.footer}>
                <p>🌱 Science-based fertilizer recommendations for sustainable farming</p>
            </footer>
        </div>
    );
}
