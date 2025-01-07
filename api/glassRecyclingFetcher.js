import axios from 'axios';
import proj4 from 'proj4';
// import fs from 'fs';


class GlassRecyclingFetcher {
    constructor() {
        this.initializeProjection();
        this.initializeAxios();
        this.setupSearchParameters();

        // this.once = true; //temporary to dave in json
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
                'Origin': 'https://www.govmap.gov.il',
                // 'Connection': 'keep-alive',
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
            // Major cities from North to South
            { x: 179000, y: 768000, name: 'Metula' },
            { x: 186000, y: 745000, name: 'Tzfat' },
            { x: 209000, y: 742000, name: 'Katzrin' },
            { x: 154000, y: 743000, name: 'Nahariya' },
            { x: 158000, y: 725000, name: 'Karmiel' },
            { x: 201000, y: 733000, name: 'Tiberias' },
            { x: 154000, y: 714000, name: 'Haifa' },
            { x: 187000, y: 712000, name: 'Nazareth' },
            { x: 172000, y: 700000, name: 'Hadera' },
            { x: 186026, y: 692504, name: 'Netanya' },
            { x: 195000, y: 683000, name: 'Kfar Saba' },
            { x: 182000, y: 668000, name: 'Tel Aviv' },
            { x: 220000, y: 670000, name: 'Ariel' },
            { x: 201000, y: 657000, name: 'Jerusalem' },
            { x: 176000, y: 662000, name: 'Rishon LeZion' },
            { x: 171000, y: 645000, name: 'Ashdod' },
            { x: 162000, y: 622000, name: 'Ashkelon' },
            { x: 194000, y: 574000, name: 'Beer Sheva' },
            { x: 178000, y: 543000, name: 'Mitzpe Ramon' },
            { x: 195000, y: 485000, name: 'Dimona' },
            { x: 147000, y: 456000, name: 'Nitzana' },
            { x: 193000, y: 385000, name: 'Eilat' }
        ];

        const gridCoordinates = this.generateGridPoints();
        return [...baseCoordinates, ...gridCoordinates];
    }

    generateGridPoints() {
        const gridPoints = [];
        const gridSize = 10000;
        const bounds = {
            minX: 125000, maxX: 270000,
            minY: 375000, maxY: 790000   // Extended Y range to cover south to north
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
                // outSR: '4326',  // Request coordinates in WGS84 (lat/long) format
                layers: [{
                    LayerType: 0,
                    LayerName: "glass_recylce_stands",
                    LayerFilter: ""
                }]
            });
            // if (this.once) {
            //     fs.writeFileSync('./glass_recycling_stands_transformed.json', 
            //         JSON.stringify(response.data, null, 2));
            //         this.once = false;    
            // }
            return response.data?.data?.[0]?.Result || [];
        } catch (error) {
            console.error(`Error searching ${location.name} with ${strategy.name}:`, error.message);
            return [];
        }
    }

    transformStandData(result) {
        if (!result.centroid || !result.tabs?.[0]?.fields) return null;

        const [longitude, latitude] = proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]);
        // const longitude = result.centroid.x;
        // const latitude = result.centroid.y;

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

    getSchemaFormat(transformedData) {

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
            const chunkSize = 5; // Increased from 10 to 20
            let totalProcessed = 0;
    
            // Convert coordinates array to chunks
            const chunks = [];
            for (let i = 0; i < this.searchCoordinates.length; i += chunkSize) {
                chunks.push(this.searchCoordinates.slice(i, i + chunkSize));
            }
    
            console.log(`Total chunks to process: ${chunks.length}`);
    
            // Process each chunk
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    
                // Process locations in chunk simultaneously
                const chunkPromises = chunk.map(async (location) => {
                    const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
                    if (processedLocations.has(locationKey)) return;
    
                    try {
                        const results = await this.fetchLocationData(location, {
                            name: 'Single Search',
                            tolerance: 6000
                        });
                        // console.log(`get the results after the fetch.`);
                        
                        
                        results.forEach(result => {
                            const standData = this.transformStandData(result);
                            if (standData) allStands.add(JSON.stringify(standData));
                        });
    
                        processedLocations.add(locationKey);
                        totalProcessed++;
                    } catch (error) {
                        console.error(`Failed to process location ${location.name}:`, error.message);
                    }
                });
    
                // Wait for all locations in chunk to complete
                await Promise.all(chunkPromises);
                
                // Progress update
                console.log(`Processed ${totalProcessed} locations. Found ${allStands.size} unique stands.`);
                
                // // Adaptive delay based on success rate
                // const delay = allStands.size > 0 ? 200 : 400; // Longer delay if no results
                // await new Promise(resolve => setTimeout(resolve, delay));

                // Fixed delay between chunks to maintain stability
                await new Promise(resolve => setTimeout(resolve, 500));
            }
    
            const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
            
            console.log(`Completed processing. Found ${uniqueStands.length} total stands.`);
            
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
//     async process() {
//         try {
//             const allStands = new Set();
//             const processedLocations = new Set();
//             const chunkSize = 10; // Process 10 locations in parallel
            
//             // Convert coordinates array to chunks
//             const chunks = [];
//             for (let i = 0; i < this.searchCoordinates.length; i += chunkSize) {
//                 chunks.push(this.searchCoordinates.slice(i, i + chunkSize));
//             }
    
//             // Process each chunk
//             for (const chunk of chunks) {
//                 // Process locations in chunk simultaneously
//                 const chunkPromises = chunk.map(async (location) => {
//                     const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
//                     if (processedLocations.has(locationKey)) return;
    
//                     const results = await this.fetchLocationData(location, {
//                         name: 'Single Search',
//                         tolerance: 6000
//                     });
                    
//                     results.forEach(result => {
//                         const standData = this.transformStandData(result);
//                         if (standData) allStands.add(JSON.stringify(standData));
//                     });
    
//                     processedLocations.add(locationKey);
//                 });
    
//                 // Wait for all locations in chunk to complete
//                 await Promise.all(chunkPromises);
                
//                 // Small delay between chunks to avoid rate limiting
//                 await new Promise(resolve => setTimeout(resolve, 300));
//             }
    
//             const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
            
//             return {
//                 cityName: 'Israel Glass Recycling',
//                 transformedData: uniqueStands
//             };
//         } catch (error) {
//             console.error('Error processing glass recycling data:', error);
//             throw error;
//         }
//     }
// }
//     async process() {
//         try {
//             const allStands = new Set();
//             const processedLocations = new Set();

//             for (const location of this.searchCoordinates) {
//                 const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
//                 if (processedLocations.has(locationKey)) continue;

//                 // for (const strategy of this.searchStrategies) {
//                 //     const results = await this.fetchLocationData(location, strategy);
                    
//                 // Use single search with 6000 radius
//                 const results = await this.fetchLocationData(location, {
//                     name: 'Single Search',
//                     tolerance: 6000
//                 });
//                 results.forEach(result => {
//                     const standData = this.transformStandData(result);
//                     if (standData) allStands.add(JSON.stringify(standData));
//                 });

//                 processedLocations.add(locationKey);
//                 // if (results.length > 0) break;
//                 await new Promise(resolve => setTimeout(resolve, 1000));
//             }
//             // }

//             const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
            
//             return {
//                 cityName: 'Israel Glass Recycling',
//                 transformedData: uniqueStands
//             };
//         } catch (error) {
//             console.error('Error processing glass recycling data:', error);
//             throw error;
//         }
//     }
// }
    // async process() {
    //     try {
    //         const allStands = new Set();
    //         const processedLocations = new Set();
    //         const chunkSize = 5; // Process 5 locations in parallel

    //         // Convert coordinates array to chunks
    //         const chunks = [];
    //         for (let i = 0; i < this.searchCoordinates.length; i += chunkSize) {
    //             chunks.push(this.searchCoordinates.slice(i, i + chunkSize));
    //         }

    //         // Process each chunk
    //         for (const chunk of chunks) {
    //             // Process locations in chunk simultaneously
    //             const chunkPromises = chunk.map(async (location) => {
    //                 const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
    //                 if (processedLocations.has(locationKey)) return;

    //                 // Start with larger radius only
    //                 const results = await this.fetchLocationData(location, { 
    //                     name: 'Single Search', 
    //                     tolerance: 6000 
    //                 });
                    
    //                 results.forEach(result => {
    //                     const standData = this.transformStandData(result);
    //                     if (standData) allStands.add(JSON.stringify(standData));
    //                 });

    //                 processedLocations.add(locationKey);
    //             });

    //             // Wait for all locations in chunk to complete
    //             await Promise.all(chunkPromises);
                
    //             // Small delay between chunks to avoid rate limiting
    //             await new Promise(resolve => setTimeout(resolve, 500));
    //         }

    //         const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
            
    //         return {
    //             cityName: 'Israel Glass Recycling',
    //             transformedData: uniqueStands
    //         };
    //     } catch (error) {
    //         console.error('Error processing glass recycling data:', error);
    //         throw error;
    //     }
    // }

    // async process() {
    //     try {
    //         const allStands = new Set();
    //         const processedLocations = new Set();

    //         for (const location of this.searchCoordinates) {
    //             const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
    //             if (processedLocations.has(locationKey)) continue;

    //             for (const strategy of this.searchStrategies) {
    //                 const results = await this.fetchLocationData(location, strategy);
                    
    //                 results.forEach(result => {
    //                     const standData = this.transformStandData(result);
    //                     if (standData) allStands.add(JSON.stringify(standData));
    //                 });

    //                 processedLocations.add(locationKey);
    //                 if (results.length > 0) break;
    //                 await new Promise(resolve => setTimeout(resolve, 1000));
    //             }
    //         }

    //         const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
            
    //         return {
    //             cityName: 'Israel Glass Recycling',
    //             transformedData: uniqueStands
    //         };
    //     } catch (error) {
    //         console.error('Error processing glass recycling data:', error);
    //         throw error;
    //     }
    // }
// }

export default GlassRecyclingFetcher;