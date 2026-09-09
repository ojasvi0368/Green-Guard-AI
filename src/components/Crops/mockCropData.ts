// Mock crop data for the crop management system
export interface GrowthStage {
    name: string;
    duration: number; // days
    waterNeed: number; // mm/day
    nutrient: string;
    status: 'completed' | 'current' | 'upcoming';
}

export interface Crop {
    id: string;
    name: string;
    fieldId: string;
    area: number; // hectares
    health: number; // percentage
    currentStage: string;
    daysSincePlanting: number;
    plantingDate: string;
    expectedHarvest: string;
    kc: number; // Crop coefficient
}

// Growth stages for different crops
export const growthStagesByCrop: Record<string, GrowthStage[]> = {
    wheat: [
        { name: 'Germination', duration: 20, waterNeed: 3, nutrient: 'Phosphorus', status: 'completed' },
        { name: 'Vegetative', duration: 40, waterNeed: 5, nutrient: 'Nitrogen', status: 'current' },
        { name: 'Flowering', duration: 30, waterNeed: 6, nutrient: 'Potassium', status: 'upcoming' },
        { name: 'Grain Filling', duration: 35, waterNeed: 5, nutrient: 'Balanced', status: 'upcoming' },
        { name: 'Maturity', duration: 15, waterNeed: 2, nutrient: 'Minimal', status: 'upcoming' }
    ],
    rice: [
        { name: 'Germination', duration: 15, waterNeed: 4, nutrient: 'Phosphorus', status: 'completed' },
        { name: 'Vegetative', duration: 35, waterNeed: 6, nutrient: 'Nitrogen', status: 'completed' },
        { name: 'Flowering', duration: 25, waterNeed: 7, nutrient: 'Potassium', status: 'current' },
        { name: 'Grain Filling', duration: 30, waterNeed: 6, nutrient: 'Balanced', status: 'upcoming' },
        { name: 'Maturity', duration: 20, waterNeed: 3, nutrient: 'Minimal', status: 'upcoming' }
    ],
    cotton: [
        { name: 'Germination', duration: 10, waterNeed: 3, nutrient: 'Phosphorus', status: 'completed' },
        { name: 'Vegetative', duration: 50, waterNeed: 5, nutrient: 'Nitrogen', status: 'completed' },
        { name: 'Flowering', duration: 40, waterNeed: 7, nutrient: 'Potassium', status: 'completed' },
        { name: 'Boll Development', duration: 45, waterNeed: 6, nutrient: 'Balanced', status: 'current' },
        { name: 'Maturity', duration: 25, waterNeed: 2, nutrient: 'Minimal', status: 'upcoming' }
    ],
    maize: [
        { name: 'Germination', duration: 10, waterNeed: 3, nutrient: 'Phosphorus', status: 'completed' },
        { name: 'Vegetative', duration: 35, waterNeed: 5, nutrient: 'Nitrogen', status: 'current' },
        { name: 'Flowering', duration: 20, waterNeed: 7, nutrient: 'Potassium', status: 'upcoming' },
        { name: 'Grain Filling', duration: 40, waterNeed: 6, nutrient: 'Balanced', status: 'upcoming' },
        { name: 'Maturity', duration: 15, waterNeed: 3, nutrient: 'Minimal', status: 'upcoming' }
    ],
    tomato: [
        { name: 'Germination', duration: 10, waterNeed: 2, nutrient: 'Phosphorus', status: 'completed' },
        { name: 'Vegetative', duration: 30, waterNeed: 4, nutrient: 'Nitrogen', status: 'current' },
        { name: 'Flowering', duration: 15, waterNeed: 5, nutrient: 'Potassium', status: 'upcoming' },
        { name: 'Fruiting', duration: 40, waterNeed: 6, nutrient: 'Balanced', status: 'upcoming' },
        { name: 'Maturity', duration: 20, waterNeed: 3, nutrient: 'Minimal', status: 'upcoming' }
    ]
};

// Mock crop data
export const mockCrops: Crop[] = [
    {
        id: 'field-001',
        name: 'Wheat',
        fieldId: 'F-001',
        area: 2.5,
        health: 88,
        currentStage: 'Vegetative',
        daysSincePlanting: 45,
        plantingDate: '2025-12-12',
        expectedHarvest: '2026-04-15',
        kc: 0.85
    },
    {
        id: 'field-002',
        name: 'Rice',
        fieldId: 'F-002',
        area: 1.8,
        health: 75,
        currentStage: 'Flowering',
        daysSincePlanting: 62,
        plantingDate: '2025-11-20',
        expectedHarvest: '2026-03-30',
        kc: 1.05
    },
    {
        id: 'field-003',
        name: 'Cotton',
        fieldId: 'F-003',
        area: 3.2,
        health: 92,
        currentStage: 'Boll Development',
        daysSincePlanting: 125,
        plantingDate: '2025-09-15',
        expectedHarvest: '2026-02-28',
        kc: 1.15
    },
    {
        id: 'field-004',
        name: 'Maize',
        fieldId: 'F-004',
        area: 2.0,
        health: 81,
        currentStage: 'Vegetative',
        daysSincePlanting: 32,
        plantingDate: '2025-12-28',
        expectedHarvest: '2026-04-20',
        kc: 0.75
    },
    {
        id: 'field-005',
        name: 'Tomato',
        fieldId: 'F-005',
        area: 0.8,
        health: 86,
        currentStage: 'Vegetative',
        daysSincePlanting: 28,
        plantingDate: '2026-01-01',
        expectedHarvest: '2026-04-10',
        kc: 0.65
    }
];
