
class HerzliyaDataFetcher {
    constructor() {
        this.apiUrl = 'https://services3.arcgis.com/9qGhZGtb39XMVQyR/arcgis/rest/services/survey123_7b3771dc7e724a4c8fb5e022be2110de/FeatureServer/0/query?where=1=1&outFields=*&f=json';
        this.cityName = 'Herzliya';
    }

    async fetchData() {
        try {
            const response = await fetch(this.apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${this.cityName} data:`, error.message);
            throw error;
        }
    }

    validateFeature(feature) {
        const errors = [];
        
        // Check required fields
        if (!feature.attributes.field_3) {
            errors.push('Missing street name');
        }
        if (!feature.geometry || !feature.geometry.x || !feature.geometry.y) {
            errors.push('Missing or invalid coordinates');
            return errors; // Return early if no location
        }
        if (!feature.attributes.field_10) {
            errors.push('Missing container types');
        }
        
        // Validate coordinates are within Israel bounds
        const { x: longitude, y: latitude } = feature.geometry;
        if (latitude < 29.5 || latitude > 33.3 || longitude < 34.2 || longitude > 35.9) {
            errors.push('Coordinates outside of Israel bounds');
        }

        // Validate bin types
        if (feature.attributes.field_10) {
            const validTypes = ['פלסטיק', 'נייר', 'אריזות', 'זכוכית', 'קרטון', 'טקסטיל', 'other'];
            const binTypes = feature.attributes.field_10.split(',');
            const invalidTypes = binTypes.filter(type => !validTypes.includes(type.trim()));
            if (invalidTypes.length > 0 || feature.attributes.field_10.includes('נסיון')) {
                errors.push(`Invalid bin types: ${invalidTypes.join(', ')}`);
            }
        }

        return errors;
    }

    cleanStreetName(streetName) {
        // Remove multiple spaces
        let cleaned = streetName.replace(/\s+/g, ' ').trim();
        
        // Handle parenthetical notes
        const parentheticalMatch = cleaned.match(/(.*?)\s*\((.*?)\)/);
        if (parentheticalMatch) {
            cleaned = parentheticalMatch[1].trim();
        }

        return cleaned;
    }

    extractStreetNumber(value) {
        if (!value) return null;
        // Extract first number sequence from the string
        const match = value.match(/\d+/);
        return match ? match[0] : null;
    }

    transformData(rawData) {
        try {
            const transformedData = [];

            for (const feature of rawData.features) {
                // Validate feature
                const validationErrors = this.validateFeature(feature);
                if (validationErrors.length > 0) {
                    console.warn(`Skipping invalid feature (ID: ${feature.attributes.objectid}):`, validationErrors);
                    continue;
                }

                const rawDate = feature.attributes.field_6;
                const dateObj = rawDate ? new Date(rawDate) : null;
                
                transformedData.push({
                    id: feature.attributes.objectid,
                    city: this.cityName,
                    street: this.cleanStreetName(feature.attributes.field_3),
                    houseNumber: this.extractStreetNumber(feature.attributes.field_11),
                    containerTypes: feature.attributes.field_10 ? 
                        feature.attributes.field_10.split(',').map(type => type.trim()) : [],
                    rawDate: rawDate,
                    date: dateObj ? dateObj.toISOString() : null,
                    location: feature.geometry ? {
                        longitude: feature.geometry.x,
                        latitude: feature.geometry.y
                    } : null,
                    externalId: feature.attributes.globalid
                });
            }

            return transformedData;
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }

    getSchemaFormat(transformedData) {
        const cityData = {
            city_name: this.cityName
        };

        return transformedData.map(item => {
            // Handle street data
            const streetData = {
                street_name: item.street,
                street_code: null // We can add this if needed in the future
            };

            // Handle bin data - note that we'll need one entry per bin type
            const binEntries = item.containerTypes.map(binType => ({
                bin_type_name: binType,
                building_number: item.houseNumber,
                latitude: item.location?.latitude,
                longitude: item.location?.longitude,
                bin_count: 1,
                status: 'active',
                unique_external_id: item.externalId
            }));

            return {
                city: cityData,
                street: streetData,
                bins: binEntries
            };
        });
    }

    async process() {
        try {
            const rawData = await this.fetchData();
            const transformedData = this.transformData(rawData);
            return { cityName: this.cityName, transformedData };
        } catch (error) {
            console.error(`Error processing ${this.cityName} data:`, error);
            throw error;
        }
    }
}

export default HerzliyaDataFetcher;