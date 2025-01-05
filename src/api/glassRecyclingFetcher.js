import axios from 'axios';
import proj4 from 'proj4';


import fs from 'fs';

class GlassRecyclingFetcher {
    constructor() {
        this.initializeProjection();
        this.initializeAxios();
        this.setupSearchParameters();

        this.once = true; //temporary to dave in json
    }

    initializeProjection() {
        proj4.defs("ITM", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");
    }

    initializeAxios() {
        this.axiosInstance = axios.create({
            baseURL: 'https://ags.govmap.gov.il',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Referer': 'https://www.govmap.gov.il/',
                'Origin': 'https://www.govmap.gov.il'
            }
        });
    }

    setupSearchParameters() {
        this.searchCoordinates = this.getSearchCoordinates();
        this.searchStrategies = [
            { name: 'Standard Search', tolerance: 3000 },
            { name: 'Extended Search', tolerance: 6000 }
        ];
    }

    getSearchCoordinates() {
        const baseCoordinates = [
            // North Israel
            { x: 186026, y: 692504, name: 'Netanya' },
            // ... other coordinates
        ];

        const gridCoordinates = this.generateGridPoints();
        return [...baseCoordinates, ...gridCoordinates];
    }

    generateGridPoints() {
        const gridPoints = [];
        const gridSize = 5000;
        const bounds = {
            minX: 170000, maxX: 225000,
            minY: 540000, maxY: 755000
        };

        for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
            for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
                gridPoints.push({
                    x, y,
                    name: `Grid_${x}_${y}`
                });
            }
        }
        return gridPoints;
    }

    parseAddress(addressString) {
        const cleanAddress = addressString.replace(/, ישראל$/, '').trim();
        const components = cleanAddress.split(',').map(comp => comp.trim());
        const city = components.length > 1 ? components[components.length - 1] : 'לא ידוע';
        
        const fullStreetAddress = components[0];
        const streetMatch = fullStreetAddress.match(/(.*?)\s*(\d+)\s*$/);
        
        return {
            streetAddress: streetMatch ? streetMatch[1].trim() : 'לא ידוע',
            houseNumber: streetMatch ? streetMatch[2] : 'לא ידוע',
            city
        };
    }

    async fetchLocationData(location, strategy) {
        try {
            const response = await this.axiosInstance.post('/Identify/IdentifyByXY', {
                x: location.x,
                y: location.y,
                mapTolerance: strategy.tolerance,
                IsPersonalSite: false,
                layers: [{
                    LayerType: 0,
                    LayerName: "glass_recylce_stands",
                    LayerFilter: ""
                }]
            });
            if (this.once) {
                fs.writeFileSync('./glass_recycling_stands_transformed.json', 
                    JSON.stringify(response.data, null, 2));
                    this.once = false;    
            }
            return response.data?.data?.[0]?.Result || [];
        } catch (error) {
            console.error(`Error searching ${location.name} with ${strategy.name}:`, error.message);
            return [];
        }
    }

    transformStandData(result) {
        if (!result.centroid || !result.tabs?.[0]?.fields) return null;

        const [longitude, latitude] = proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]);
        
        let address = '';
        let rawDate = '';
        result.tabs[0].fields.forEach(field => {
            if (field.FieldName === 'כתובת') address = field.FieldValue;
            if (field.FieldName === 'תאריך עדכון') rawDate = field.FieldValue;
        });

        const parsedAddress = this.parseAddress(address);
        const dateObj = rawDate ? new Date(rawDate) : null;

        return {
            id: result.objectId,
            city: parsedAddress.city,
            street: parsedAddress.streetAddress,
            houseNumber: parsedAddress.houseNumber,
            containerTypes: ['glass'],
            rawDate: rawDate || null,
            date: dateObj ? dateObj.toISOString() : null,
            location: { longitude, latitude },
            externalId: result.objectId
        };
    }

    getSchemaFormat(transformedData, cityName) {
        // const cityData = { city_name: cityName };

        return transformedData.map(item => ({
            city: { city_name: item.city },
            street: {
                street_name: item.street,
                street_code: null
            },
            bins: item.containerTypes.map(binType => ({
                bin_type_name: binType,
                building_number: item.houseNumber,
                latitude: item.location?.latitude,
                longitude: item.location?.longitude,
                bin_count: 1,
                status: 'active',
                unique_external_id: item.externalId
            }))
        }));
    }

    async process() {
        try {
            const allStands = new Set();
            const processedLocations = new Set();

            for (const location of this.searchCoordinates) {
                const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
                if (processedLocations.has(locationKey)) continue;

                for (const strategy of this.searchStrategies) {
                    const results = await this.fetchLocationData(location, strategy);
                    
                    results.forEach(result => {
                        const standData = this.transformStandData(result);
                        if (standData) allStands.add(JSON.stringify(standData));
                    });

                    processedLocations.add(locationKey);
                    if (results.length > 0) break;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
            
            return {
                cityName: 'Israel Glass Recycling',
                transformedData: uniqueStands
            };
        } catch (error) {
            console.error('Error processing glass recycling data:', error);
            throw error;
        }
    }
}

export default GlassRecyclingFetcher;