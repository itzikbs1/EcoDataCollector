// src/services/HerzliyaFetcher.js
import BaseFetcher from '../core/BaseFetcher.js';

class HerzliyaFetcher extends BaseFetcher {
    constructor() {
        super('Herzliya');
        this.apiUrl = 'https://services3.arcgis.com/9qGhZGtb39XMVQyR/arcgis/rest/services/survey123_7b3771dc7e724a4c8fb5e022be2110de/FeatureServer/0/query';
    }

    async fetchData() {
        try {
            const response = await fetch(`${this.apiUrl}?where=1=1&outFields=*&f=json`);
            
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
        
        // if (!feature.attributes.field_3) {
        //     errors.push('Missing street name');
        // }
        if (!feature.geometry || !feature.geometry.x || !feature.geometry.y) {
            errors.push('Missing or invalid coordinates');
            return errors;
        }
        if (!feature.attributes.field_10) {
            errors.push('Missing container types');
        }
        
        // Validate coordinates
        if (!this.validateCoordinates(feature.geometry.y, feature.geometry.x)) {
            errors.push('Coordinates outside of Israel bounds');
        }

        // Validate bin types
        if (feature.attributes.field_10) {
            const validTypes = ['פלסטיק', 'נייר', 'אריזות', 'קרטון', 'טקסטיל']; //, 'זכוכית' remove because get all the glass bins.(maybe change it later).
            const binTypes = feature.attributes.field_10.split(',');
            const invalidTypes = binTypes.filter(type => !validTypes.includes(type.trim()));
            if (invalidTypes.length > 0) {
                errors.push(`Invalid bin types: ${invalidTypes.join(', ')}`);
            }
        }

        return errors;
    }

    cleanStreetName(streetName) {
        if (!streetName) return '';
        let cleaned = streetName.replace(/\s+/g, ' ').trim();
        
        const parentheticalMatch = cleaned.match(/(.*?)\s*\((.*?)\)/);
        if (parentheticalMatch) {
            cleaned = parentheticalMatch[1].trim();
        }

        return cleaned;
    }

    extractStreetNumber(value) {
        if (!value) return null;
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
                    // console.warn(`Skipping invalid feature:`, validationErrors);
                    continue;
                }

                transformedData.push({
                    id: feature.attributes.objectid,
                    city: this.cityName,
                    street: this.cleanStreetName(feature.attributes.field_3),
                    houseNumber: this.extractStreetNumber(feature.attributes.field_11),
                    containerTypes: feature.attributes.field_10 ? 
                        feature.attributes.field_10.split(',').map(type => type.trim()) : [],
                    location: {
                        longitude: feature.geometry.x,
                        latitude: feature.geometry.y
                    },
                    externalId: feature.attributes.globalid
                });
            }

            return transformedData;
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
}

export default HerzliyaFetcher;