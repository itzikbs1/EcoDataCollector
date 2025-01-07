import { getStandardType } from '../helpers/binTypes.js';


class BaseFetcher {
    
    constructor(cityName) {
        // if(this.constructor === BaseFetcher) {
        //     throw new Error('BaseFetcher is an abstract class and cannot be instantiated directly');
        // }

        this.cityName = cityName;
    }

    validateCoordinates(latitude, longitude) {
        // Check if coordinates exist and are numbers
        if (!latitude || !longitude || 
            isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
            return false;
        }

        // Convert to numbers
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        // Check if within Israel bounds
        if (lat < 29.5 || lat > 33.3 || lon < 34.2 || lon > 35.9) {
            return false;
        }

        // Check if coordinates are identical (likely an error)
        if (lat === lon) {
            return false;
        }

        return true;
    }

    getSchemaFormat(transformedData) {
        const cityData = {
            city_name: this.cityName
        };

        return transformedData.map(item => ({
            city: cityData,
            street: {
                street_name: item.street
            },
            bins: Array.isArray(item.containerTypes)
            ? item.containerTypes.map(binType => this.createBinEntry(item, binType))
            : [this.createBinEntry(item, item.containerTypes)]
        }));
    }

    createBinEntry(item, binType) {
        // if ((getStandardType[binType] || binType) === 'Glass') {
        //     console.log(`city: ${this.cityName}`);
        //     console.log(`bin type: ${binType}`);    
        // }
        
        return {
            bin_type_name: getStandardType(binType) || binType,
            building_number: item.houseNumber,
            latitude: item.location?.latitude,
            longitude: item.location?.longitude,
            bin_count: item.binCount || 1,
            status: 'active',
            unique_external_id: item.externalId
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