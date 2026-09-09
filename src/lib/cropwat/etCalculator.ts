/**
 * ET₀ (Reference Evapotranspiration) Calculator
 * Using FAO Penman-Monteith equation
 */

export interface ETInputs {
    tempMin: number; // °C
    tempMax: number; // °C
    humidity: number; // %
    windSpeed: number; // m/s (measured at 2m height)
    sunshineHours?: number; // hours/day
    solarRadiation?: number; // MJ/m²/day
    latitude?: number; // degrees
    date?: Date;
}

export class ETCalculator {
    /**
     * Calculate ET₀ using FAO Penman-Monteith equation
     * Based on the formulas provided in the images
     */
    static calculateET0(inputs: ETInputs): number {
        const { tempMin, tempMax, humidity, windSpeed, sunshineHours = 8 } = inputs;

        // Step 1: Calculate mean temperature (Tmean)
        const tempMean = (tempMin + tempMax) / 2;

        // Step 2: Calculate saturation vapor pressure at Tmax and Tmin
        // Formula: e⁰(T) = 0.6108 × exp(17.27T / (T + 237.3))
        const esTmax = 0.6108 * Math.exp((17.27 * tempMax) / (tempMax + 237.3));
        const esTmin = 0.6108 * Math.exp((17.27 * tempMin) / (tempMin + 237.3));

        // Step 3: Calculate mean saturation vapor pressure (es)
        // es = (es(Tmax) + es(Tmin)) / 2
        const es = (esTmax + esTmin) / 2;

        // Step 4: Calculate actual vapor pressure (ea)
        // ea = 0.6 × es (using relative humidity assumption)
        // More accurate: ea = (RH/100) × es, but formula shows 0.6 × es
        const ea = (humidity / 100) * es;

        // Step 5: Calculate slope of vapor pressure curve (Δ) (Delta)
        // Δ = 4098 × es / (Tmean + 237.3)²
        const delta = (4098 * es) / Math.pow(tempMean + 237.3, 2);

        // Step 6: Psychrometric constant (γ) (gamma)
        // γ = 0.066 kPa/°C (standard value at sea level)
        const gamma = 0.066;

        // Step 7: Net Radiation (Rn)
        // Rn ≈ 1.5 × Sunshine hours
        const Rn = 1.5 * sunshineHours;

        // Step 8: Soil Heat Flux (G)
        // For daily calculation: G = 0
        const G = 0;

        // Step 9: Wind speed (u2) - already provided at 2m height
        const u2 = windSpeed;

        // Step 10: Calculate ET₀ using FAO Penman-Monteith equation
        // ET₀ = [0.408Δ(Rn - G) + γ(900/(T+273))u₂(es - ea)] / [Δ + γ(1 + 0.34u₂)]

        const numerator =
            0.408 * delta * (Rn - G) +
            gamma * (900 / (tempMean + 273)) * u2 * (es - ea);

        const denominator =
            delta + gamma * (1 + 0.34 * u2);

        const et0 = numerator / denominator;

        return Math.max(0, et0);
    }

    /**
     * Calculate extraterrestrial radiation (Ra)
     * Kept for potential future use
     */
    private static calculateRa(latitude: number, dayOfYear: number): number {
        const latRad = (latitude * Math.PI) / 180;

        // Solar declination
        const delta = 0.409 * Math.sin((2 * Math.PI * dayOfYear / 365) - 1.39);

        // Sunset hour angle
        const ws = Math.acos(-Math.tan(latRad) * Math.tan(delta));

        // Inverse relative distance Earth-Sun
        const dr = 1 + 0.033 * Math.cos(2 * Math.PI * dayOfYear / 365);

        // Solar constant
        const Gsc = 0.0820; // MJ/m²/min

        // Ra calculation
        const ra = (24 * 60 / Math.PI) * Gsc * dr * (
            ws * Math.sin(latRad) * Math.sin(delta) +
            Math.cos(latRad) * Math.cos(delta) * Math.sin(ws)
        );

        return ra;
    }

    /**
     * Get day of year (1-365)
     */
    private static getDayOfYear(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    /**
     * Calculate ET₀ for multiple days
     */
    static calculateET0Series(inputs: ETInputs[]): number[] {
        return inputs.map(input => this.calculateET0(input));
    }

    /**
     * Get average ET₀ for a period
     */
    static getAverageET0(et0Values: number[]): number {
        if (et0Values.length === 0) return 0;
        return et0Values.reduce((sum, val) => sum + val, 0) / et0Values.length;
    }
}
