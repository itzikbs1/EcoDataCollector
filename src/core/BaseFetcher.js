import { getStandardType } from '../helpers/binTypes.js';


class BaseFetcher {
    
    constructor(cityName) {
        this.cityName = cityName;
    }

    //Validation of coordinates
    validateCoordinates(latitude, longitude) {
        if (!latitude || !longitude || 
            isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
            return false;
        }
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        // Check if within Israel bounds
        if (lat < 29.5 || lat > 33.3 || lon < 34.2 || lon > 35.9) {
            return false;
        }

        if (lat === lon) {
            return false;
        }
        
        return true;
    }

    getSchemaFormat(transformedData) {
        return transformedData.map(item => {
            // If containerTypes is an array, create multiple records, one for each bin type
            if (Array.isArray(item.containerTypes)) {
                return item.containerTypes.map(binType => 
                    this.createBinEntry(item, binType)
                );
            }
            // If containerTypes is a single value, create one record
            return this.createBinEntry(item, item.containerTypes);
        }).flat(); // Flatten the array since we might have arrays of records
    }
    
    createBinEntry(item, binType) {
        return {
            city_name: item.city || this.cityName,
            street_name: item.street || '',
            building_number: item.houseNumber ? Number(item.houseNumber) : undefined,
            bin_type_name: getStandardType(binType) || binType,
            is_active: true,
            location: {
                latitude: Number(item.location?.latitude),
                longitude: Number(item.location?.longitude)
            }
        };
    }

    async process() {
        try {
            const rawData = await this.fetchData();
            const transformedData = await this.transformData(rawData);
            return { cityName: this.cityName, transformedData }
        } catch(error) {
            console.error(`Error processing ${this.cityName} data:`, error);
            throw error;
        }
    }

    // Abstract methods that must be implemented by child classes
    async fetchData() {
        throw new Error('fetchData must be implemented by child class');
    }

    async transformData(rawData) {
        throw new Error('transformData must be implemented by child class');
    }
}
    
export default BaseFetcher;