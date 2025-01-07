import axios from 'axios';
import fs from 'fs/promises';


class PetahTikvaDataFetcher {
    constructor() {
        this.baseUrl = 'https://services9.arcgis.com/tfeLX7LFVABzD11G/arcgis/rest/services/מחזור/FeatureServer';
        this.layerIds = [23, 32, 33, 35, 37, 38, 39];
        this.cityName = 'Petah Tikva';
    }

    async fetchLayerData(layerId) {
        try {
            const response = await axios.get(`${this.baseUrl}/${layerId}/query`, {
                params: {
                    f: 'json',
                    where: '1=1',  // This will return all features
                    returnGeometry: true,  // We want the actual coordinates
                    spatialRel: 'esriSpatialRelIntersects',
                    outFields: '*',
                    outSR: '4326'  // Request coordinates in standard lat/long format
                }
            });
            return response.data;
        } catch(error) {
            console.error('Error details:', error.response?.data || error.message);
            throw new Error('Error in fetching data: ' + error.message);
        }
    }

    async fetchAllLayers() {
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

                const attributes = feature.attributes;
                let streetName = '';
                let houseNumber = '';
                
                if (attributes.Address) {
                    const streetParts = attributes.Address.trim().split(' ');
                    houseNumber = streetParts.pop() || ''; // Gets the last element (number)
                    streetName = streetParts.join(' ') || ''; // Joins the remaining parts (street name)
                }
                const types = [];
                
                if (attributes.Textile === 1) types.push('Textile');
                if (attributes.Glass === 1) types.push('Glass');
                if (attributes.Paper === 1) types.push('Paper');
                if (attributes.Cardboard === 1) types.push('Cardboard');
                if (attributes.Electric === 1) types.push('Electronics');
                if (attributes.Packs === 1) types.push('Packaging');

                const last_edit = attributes.last_edited_date;
                const last_updated = last_edit ? new Date(last_edit) : null;

                transformedData.push({
                    id: attributes.OBJECTID_1,
                    city: this.cityName,
                    street: streetName,
                    houseNumber: houseNumber,
                    containerTypes: types,
                    createdDate: attributes.created_date,
                    last_updated: last_updated,
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

    getSchemaFormat(transformedData) {
        const cityData = {
            city_name: this.cityName
        };

        return transformedData.map(item => {
            const streetData = {
                street_name: item.street
            };

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
            const data = await this.fetchAllLayers();
            const transformedData = this.transformData(data);
            return { cityName: this.cityName, transformedData };

        } catch(error) {
            console.error(`Error processing ${this.cityName} data:`, error);
            throw error;        
        }
    }
}
export default PetahTikvaDataFetcher;