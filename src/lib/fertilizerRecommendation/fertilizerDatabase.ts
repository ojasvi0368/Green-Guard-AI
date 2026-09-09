/**
 * Fertilizer Database
 * Standard fertilizers with nutrient composition
 */

export interface Fertilizer {
    name: string;
    displayName: string;
    nitrogenPercent: number; // % N
    phosphorusPercent: number; // % P₂O₅
    potassiumPercent: number; // % K₂O
    type: 'nitrogen' | 'phosphorus' | 'potassium' | 'balanced';
}

/**
 * Standard fertilizer database
 */
export const FERTILIZER_DATABASE: Fertilizer[] = [
    {
        name: 'urea',
        displayName: 'Urea',
        nitrogenPercent: 46,
        phosphorusPercent: 0,
        potassiumPercent: 0,
        type: 'nitrogen'
    },
    {
        name: 'dap',
        displayName: 'DAP (Diammonium Phosphate)',
        nitrogenPercent: 18,
        phosphorusPercent: 46,
        potassiumPercent: 0,
        type: 'phosphorus'
    },
    {
        name: 'mop',
        displayName: 'MOP (Muriate of Potash)',
        nitrogenPercent: 0,
        phosphorusPercent: 0,
        potassiumPercent: 60,
        type: 'potassium'
    },
    {
        name: 'npk_10_26_26',
        displayName: 'NPK 10-26-26',
        nitrogenPercent: 10,
        phosphorusPercent: 26,
        potassiumPercent: 26,
        type: 'balanced'
    },
    {
        name: 'npk_20_20_0',
        displayName: 'NPK 20-20-0',
        nitrogenPercent: 20,
        phosphorusPercent: 20,
        potassiumPercent: 0,
        type: 'balanced'
    },
    {
        name: 'npk_12_32_16',
        displayName: 'NPK 12-32-16',
        nitrogenPercent: 12,
        phosphorusPercent: 32,
        potassiumPercent: 16,
        type: 'balanced'
    }
];

/**
 * Get fertilizer by name
 */
export function getFertilizer(name: string): Fertilizer | null {
    return FERTILIZER_DATABASE.find(f => f.name === name) || null;
}
