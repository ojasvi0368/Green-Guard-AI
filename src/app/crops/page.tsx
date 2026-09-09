'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Dashboard/Sidebar';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import CropSelector from '@/components/Crops/CropSelector';
import CropDetailsPanel from '@/components/Crops/CropDetailsPanel';
import AddCropModal from '@/components/Crops/AddCropModal';
import { Crop } from '@/components/Crops/mockCropData';
import dashboardStyles from '../dashboard/dashboard.module.css';
import styles from './crops.module.css';

export default function CropsPage() {
    const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
    const [crops, setCrops] = useState<Crop[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Fetch crops from API on mount
    useEffect(() => {
        fetchAllCrops();
    }, []);

    // Fetch crop data when selectedCrop changes
    useEffect(() => {
        if (selectedCrop) {
            fetchCropData(selectedCrop.id);
        }
    }, [selectedCrop]);

    const fetchCropData = async (cropId: string) => {
        setLoading(true);
        try {
            // In a real application, this would fetch crop-specific data from API
            // For now, we're using mock data which is already loaded
            console.log('Fetching data for crop:', cropId);
        } catch (error) {
            console.error('Error fetching crop data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCrops = async () => {
        try {
            const response = await fetch('/api/crops');
            if (response.ok) {
                const data = await response.json();
                setCrops(data.crops || []);
                // Set first crop as selected if none selected
                if (!selectedCrop && data.crops.length > 0) {
                    setSelectedCrop(data.crops[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching crops:', error);
        }
    };

    const handleAddCropClick = () => {
        setShowAddModal(true);
    };

    const handleModalSuccess = () => {
        // Refresh crop list after successful add
        fetchAllCrops();
    };

    return (
        <div className={dashboardStyles.dashboardLayout}>
            <Sidebar />
            <div className={dashboardStyles.mainContent}>
                <DashboardHeader userName="Farmer" />
                <main className={dashboardStyles.contentArea}>
                    <div className={dashboardStyles.pageHeader}>
                        <div>
                            <h2 className={dashboardStyles.pageTitle}>🌾 Crop Management</h2>
                            <p className={dashboardStyles.pageSubtitle}>
                                AI-powered crop monitoring with growth stage insights
                            </p>
                        </div>
                        <button className="btn-primary" onClick={handleAddCropClick}>+ Add New Crop</button>
                    </div>

                    <div className={styles.cropManagementLayout}>
                        <div className={styles.cropSelectorPanel}>
                            <CropSelector
                                crops={crops}
                                selectedCrop={selectedCrop}
                                onSelectCrop={setSelectedCrop}
                            />
                        </div>
                        <div className={styles.cropDetailsPanel}>
                            {loading ? (
                                <div>Loading crop data...</div>
                            ) : (
                                <CropDetailsPanel crop={selectedCrop} />
                            )}
                        </div>
                    </div>
                </main>

                {/* Add Crop Modal */}
                <AddCropModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleModalSuccess}
                />
            </div>
        </div>
    );
}
