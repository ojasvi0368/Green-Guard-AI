/**
 * Evapotranspiration (ET) Calculation Module
 * Provides simplified ET calculation methods for simulation
 */

/**
 * Calculate Reference Evapotranspiration (ETo) using simplified Hargreaves equation
 * 
 * Hargreaves Formula (simplified):
 * ETo = 0.0023 × (Tmean + 17.8) × (Tmax - Tmin)^0.5
 * 
 * This is a temperature-based method suitable when only temperature data is available
 * More accurate than using full Penman-Monteith when solar radiation data is limited
 */
export function estimateETo(tempMin: number, tempMax: number): number {
    const tempMean = (tempMin + tempMax) / 2;
    const tempRange = tempMax - tempMin;

    // Hargreaves equation
    const eto = 0.0023 * (tempMean + 17.8) * Math.pow(tempRange, 0.5);

    // Ensure non-negative
    return Math.max(0, eto);
}

/**
 * Calculate Crop Evapotranspiration (ETc)
 * 
 * Formula: ETc = ETo × Kc
 * 
 * Where:
 *   ETo = Reference evapotranspiration
 *   Kc = Crop coefficient
 */
export function calculateETc(eto: number, cropKc: number): number {
    return eto * cropKc;
}

/**
 * Calculate daily ET from weather forecast data
 * 
 * @param params Weather parameters and crop coefficient
 * @returns Daily ET in mm/day
 */
export function calculateDailyET(params: {
    tempMin: number;
    tempMax: number;
    humidity?: number;
    cropKc: number;
}): number {
    const { tempMin, tempMax, humidity, cropKc } = params;

    // Calculate ETo using Hargreaves
    let eto = estimateETo(tempMin, tempMax);

    // Adjust for humidity if available (empirical adjustment)
    if (humidity !== undefined) {
        // Higher humidity reduces ET slightly
        const humidityFactor = 1 - (humidity - 50) * 0.001;
        eto *= Math.max(0.8, Math.min(1.2, humidityFactor));
    }

    // Calculate crop ET
    const etc = calculateETc(eto, cropKc);

    return Math.round(etc * 100) / 100;
}

/**
 * Calculate ET for multiple days from forecast data
 */
export function calculateETSeries(
    forecasts: Array<{
        tempMin: number;
        tempMax: number;
        humidity?: number;
    }>,
    cropKc: number
): number[] {
    return forecasts.map(forecast =>
        calculateDailyET({
            ...forecast,
            cropKc
        })
    );
}

/**
 * Alternative: Calculate ETo using Blaney-Criddle method
 * (Temperature and daylight hours based)
 * 
 * ETo = p × (0.46 × Tmean + 8)
 * 
 * Where p = mean daily percentage of annual daytime hours
 * This method is kept for potential future use
 */
export function calculateEToBlanyCriddle(
    tempMean: number,
    daytimeHoursPercent: number = 0.27  // Approximate for tropical regions
): number {
    const eto = daytimeHoursPercent * (0.46 * tempMean + 8);
    return Math.max(0, eto);
}

/**
 * Estimate daily ET using simplified FAO-56 method
 * Uses existing ETCalculator for more accurate results if weather data is rich
 */
export function estimateDailyETFromWeather(params: {
    tempMin: number;
    tempMax: number;
    humidity: number;
    windSpeed?: number;
    sunshineHours?: number;
    cropKc: number;
}): number {
    const { tempMin, tempMax, humidity, windSpeed, sunshineHours, cropKc } = params;

    // If we have full weather data, use it
    if (windSpeed !== undefined && sunshineHours !== undefined) {
        // Import ET Calculator for accurate calculation
        try {
            const { ETCalculator } = require('../cropwat/etCalculator');
            const eto = ETCalculator.calculateET0({
                tempMin,
                tempMax,
                humidity,
                windSpeed,
                sunshineHours
            });
            return Math.round(eto * cropKc * 100) / 100;
        } catch (error) {
            // Fallback to Hargreaves if ETCalculator unavailable
            console.warn('ETCalculator not available, using Hargreaves method');
        }
    }

    // Otherwise use simplified Hargreaves
    return calculateDailyET({ tempMin, tempMax, humidity, cropKc });
}

/**
 * Get typical ET range for validation
 */
export function getTypicalETRange(climate: 'arid' | 'semi-arid' | 'humid' | 'tropical'): {
    min: number;
    max: number;
    typical: number;
} {
    const ranges = {
        arid: { min: 5, max: 10, typical: 7 },
        'semi-arid': { min: 4, max: 8, typical: 6 },
        humid: { min: 2, max: 6, typical: 4 },
        tropical: { min: 3, max: 7, typical: 5 }
    };

    return ranges[climate];
}

/**
 * Validate ET calculation result
 */
export function validateET(et: number, climate: 'arid' | 'semi-arid' | 'humid' | 'tropical' = 'semi-arid'): {
    valid: boolean;
    warning?: string;
} {
    const range = getTypicalETRange(climate);

    if (et < 0) {
        return {
            valid: false,
            warning: 'ET cannot be negative'
        };
    }

    if (et > range.max * 2) {
        return {
            valid: true,
            warning: `ET value (${et.toFixed(2)} mm/day) is unusually high for ${climate} climate`
        };
    }

    if (et < range.min / 2) {
        return {
            valid: true,
            warning: `ET value (${et.toFixed(2)} mm/day) is unusually low for ${climate} climate`
        };
    }

    return { valid: true };
}
