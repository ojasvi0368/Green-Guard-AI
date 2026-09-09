'use client';

import { useState } from 'react';
import styles from './AddCropModal.module.css';

interface AddCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddCropModal({ isOpen, onClose, onSuccess }: AddCropModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        soilType: '',
        waterRequirement: '',
        growthDuration: '',
        fertilizer: '',
        area: '',
        plantingDate: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate required field
        if (!formData.name.trim()) {
            setError('Crop name is required');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/crops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Reset form
                setFormData({
                    name: '',
                    type: '',
                    soilType: '',
                    waterRequirement: '',
                    growthDuration: '',
                    fertilizer: '',
                    area: '',
                    plantingDate: new Date().toISOString().split('T')[0]
                });
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to add crop');
            }
        } catch (err) {
            console.error('Error adding crop:', err);
            setError('An error occurred while adding crop');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: '',
            type: '',
            soilType: '',
            waterRequirement: '',
            growthDuration: '',
            fertilizer: '',
            area: '',
            plantingDate: new Date().toISOString().split('T')[0]
        });
        setError('');
        onClose();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2 className={styles.title}>🌱 Add New Crop</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={handleCancel}
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                Crop Name <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g., Wheat, Rice, Cotton"
                                className={styles.input}
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Crop Type</label>
                            <input
                                type="text"
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                placeholder="e.g., Cereal, Legume, Cash Crop"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Soil Type</label>
                            <input
                                type="text"
                                name="soilType"
                                value={formData.soilType}
                                onChange={handleChange}
                                placeholder="e.g., Loamy, Clay, Sandy"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Water Requirement</label>
                            <input
                                type="text"
                                name="waterRequirement"
                                value={formData.waterRequirement}
                                onChange={handleChange}
                                placeholder="e.g., 500mm per season"
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Growth Duration (days)</label>
                            <input
                                type="number"
                                name="growthDuration"
                                value={formData.growthDuration}
                                onChange={handleChange}
                                placeholder="e.g., 120"
                                className={styles.input}
                                min="1"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Area (hectares)</label>
                            <input
                                type="number"
                                name="area"
                                value={formData.area}
                                onChange={handleChange}
                                placeholder="e.g., 2.5"
                                className={styles.input}
                                step="0.1"
                                min="0.1"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Planting Date</label>
                            <input
                                type="date"
                                name="plantingDate"
                                value={formData.plantingDate}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroupFull}>
                            <label className={styles.label}>Fertilizer Information</label>
                            <textarea
                                name="fertilizer"
                                value={formData.fertilizer}
                                onChange={handleChange}
                                placeholder="e.g., NPK 20-20-20, Urea, etc."
                                className={styles.textarea}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className={styles.cancelBtn}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={loading}
                        >
                            {loading ? 'Adding Crop...' : '+ Add Crop'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
