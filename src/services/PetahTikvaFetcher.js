import BaseFetcher from '../core/BaseFetcher.js';
import axios from 'axios';

class PetahTikvaFetcher extends BaseFetcher {
    constructor() {
        super('Petah Tikva');
        this.baseUrl = 'https://services9.arcgis.com/tfeLX7LFVABzD11G/arcgis/rest/services/מחזור/FeatureServer';
        this.layerIds = [23, 32, 33, 35, 37, 38, 39];
    }

    async fetchLayerData(layerId) {
        try {
            const response = await axios.get(`${this.baseUrl}/${layerId}/query`, {
                params: {
                    f: 'json',
                    where: '1=1',
                    returnGeometry: true,
                    spatialRel: 'esriSpatialRelIntersects',
                    outFields: '*',
                    outSR: '4326'
                }
            });
            return response.data;
        } catch(error) {
            console.error('Error details:', error.response?.data || error.message);
            throw new Error('Error in fetching data: ' + error.message);
        }
    }

    async fetchData() {
        const result = [];
        for(const layer of this.layerIds) {
            const data = await this.fetchLayerData(layer);
            if (data) {
                result.push(data);
            }
        }
        return result;
    }

    transformData(data) {
        try {
            const transformedData = [];
            const allFeatures = data.flatMap(entry => entry.features);

            for (const feature of allFeatures) {
                // Skip if no valid coordinates
                if (!feature.geometry?.x || !feature.geometry?.y || 
                    !this.validateCoordinates(feature.geometry.y, feature.geometry.x)) {
                    continue;
                }

                const attributes = feature.attributes;
                let streetName = '';
                let houseNumber = '';
                
                if (attributes.Address) {
                    const streetParts = attributes.Address.trim().split(' ');
                    houseNumber = streetParts.pop() || '';
                    streetName = streetParts.join(' ') || '';
                }

                const types = [];
                
                if (attributes.Textile === 1) types.push('Textile');
                // if (attributes.Glass === 1) types.push('Glass');
                if (attributes.Paper === 1) types.push('Paper');
                if (attributes.Cardboard === 1) types.push('Cardboard');
                if (attributes.Electric === 1) types.push('Electronics');
                if (attributes.Packs === 1) types.push('Packaging');

                if (types.length === 0) continue; //if it is only glass. we get it from the tamir site.
                transformedData.push({
                    id: attributes.OBJECTID_1,
                    city: this.cityName,
                    street: streetName,
                    houseNumber: houseNumber,
                    containerTypes: types,
                    createdDate: attributes.created_date,
                    last_updated: attributes.last_edited_date ? new Date(attributes.last_edited_date) : null,
                    location: {
                        longitude: feature.geometry.x,
                        latitude: feature.geometry.y
                    },
                    externalId: attributes.OBJECTID_1
                });
            }
            return transformedData;
        } catch(error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
}

export default PetahTikvaFetcher;