/**
 * Location Database - Indian States and Districts
 * Uses static JSON data for browser compatibility
 */

import indiaData from '@/data/indiaStatesDistricts.json';

export interface District {
    name: string;
    latitude: number;
    longitude: number;
}

export interface StateData {
    name: string;
    districts: District[];
}

// Approximate coordinates for major districts (for weather API)
const DISTRICT_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
    // Uttar Pradesh
    "Lucknow": { latitude: 26.8467, longitude: 80.9462 },
    "Kanpur Nagar": { latitude: 26.4499, longitude: 80.3319 },
    "Ghaziabad": { latitude: 28.6692, longitude: 77.4538 },
    "Agra": { latitude: 27.1767, longitude: 78.0081 },
    "Varanasi": { latitude: 25.3176, longitude: 82.9739 },
    "Meerut": { latitude: 28.9845, longitude: 77.7064 },
    "Prayagraj": { latitude: 25.4358, longitude: 81.8463 },

    // Maharashtra
    "Mumbai City": { latitude: 19.0760, longitude: 72.8777 },
    "Mumbai Suburban": { latitude: 19.0760, longitude: 72.8777 },
    "Pune": { latitude: 18.5204, longitude: 73.8567 },
    "Nagpur": { latitude: 21.1458, longitude: 79.0882 },
    "Nashik": { latitude: 19.9975, longitude: 73.7898 },
    "Aurangabad": { latitude: 19.8762, longitude: 75.3433 },

    // Delhi
    "Central Delhi": { latitude: 28.7041, longitude: 77.1025 },
    "New Delhi": { latitude: 28.6139, longitude: 77.2090 },

    // Karnataka
    "Bengaluru Urban": { latitude: 12.9716, longitude: 77.5946 },
    "Mysuru": { latitude: 12.2958, longitude: 76.6394 },

    // Tamil Nadu
    "Chennai": { latitude: 13.0827, longitude: 80.2707 },
    "Coimbatore": { latitude: 11.0168, longitude: 76.9558 },
    "Madurai": { latitude: 9.9252, longitude: 78.1198 },

    // West Bengal
    "Kolkata": { latitude: 22.5726, longitude: 88.3639 },
    "Howrah": { latitude: 22.5958, longitude: 88.2636 },

    // Gujarat
    "Ahmedabad": { latitude: 23.0225, longitude: 72.5714 },
    "Surat": { latitude: 21.1702, longitude: 72.8311 },

    // Rajasthan
    "Jaipur": { latitude: 26.9124, longitude: 75.7873 },
    "Jodhpur": { latitude: 26.2389, longitude: 73.0243 },

    // Punjab
    "Ludhiana": { latitude: 30.9010, longitude: 75.8573 },
    "Amritsar": { latitude: 31.6340, longitude: 74.8723 },

    // Telangana
    "Hyderabad": { latitude: 17.3850, longitude: 78.4867 },

    // Haryana
    "Gurugram": { latitude: 28.4595, longitude: 77.0266 },
    "Faridabad": { latitude: 28.4089, longitude: 77.3178 },

    // Default fallback for unknown districts
    "_default": { latitude: 20.5937, longitude: 78.9629 }
};

/**
 * Get all available states and union territories
 */
export function getAvailableStates(): string[] {
    const allStates = [
        ...indiaData.states.map(s => s.name),
        ...indiaData.union_territories.map(ut => ut.name)
    ];
    // Return states sorted alphabetically
    return allStates.sort();
}

/**
 * Get districts for a specific state
 */
export function getDistrictsByState(state: string): District[] {
    // Find state in states array
    let stateData = indiaData.states.find(s => s.name === state);

    // If not found, check union territories
    if (!stateData) {
        stateData = indiaData.union_territories.find(ut => ut.name === state);
    }

    if (!stateData) {
        return [];
    }

    // Convert district names to District objects with coordinates
    const districts = stateData.districts.map((name: string) => ({
        name,
        latitude: DISTRICT_COORDINATES[name]?.latitude || DISTRICT_COORDINATES._default.latitude,
        longitude: DISTRICT_COORDINATES[name]?.longitude || DISTRICT_COORDINATES._default.longitude
    }));

    // Sort districts alphabetically
    return districts.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get coordinates for a specific district
 */
export function getDistrictCoordinates(state: string, district: string): { latitude: number; longitude: number } | null {
    const districts = getDistrictsByState(state);
    const districtData = districts.find(d => d.name === district);

    if (!districtData) {
        // Return default coordinates if district not found
        return DISTRICT_COORDINATES._default;
    }

    return {
        latitude: districtData.latitude,
        longitude: districtData.longitude
    };
}

/**
 * Find nearest district to given coordinates (helper function)
 */
export function findNearestDistrict(latitude: number, longitude: number): { state: string; district: string } | null {
    let minDistance = Infinity;
    let nearest: { state: string; district: string } | null = null;

    const states = getAvailableStates();

    for (const state of states) {
        const districts = getDistrictsByState(state);
        for (const district of districts) {
            const distance = Math.sqrt(
                Math.pow(district.latitude - latitude, 2) +
                Math.pow(district.longitude - longitude, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearest = { state, district: district.name };
            }
        }
    }

    return nearest;
}
