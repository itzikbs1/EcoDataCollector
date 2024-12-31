import { pool } from '../database/connection.js';
import {
    insertCompleteBinLocation,
    insertCity,
    insertStreet,
    insertBinType,
    insertRecyclingBin
} from '../database/recyclingBins.js';

class CityDataProcessor {
    constructor(cityFetchers = []) {
        this.cityFetchers = cityFetchers;
    }

    addFetcher(fetcher) {
        this.cityFetchers.push(fetcher);
    }

    async processCity(fetcher) {
        try {
            console.log(`Starting to process data for ${fetcher.cityName}`);
            
            // Fetch and transform the data
            const { transformedData } = await fetcher.process();
            
            // Get data in schema format
            const schemaFormattedData = fetcher.getSchemaFormat(transformedData);
            
            // Process each location
            for (const location of schemaFormattedData) {
                try {
                    // Insert city once
                    const city = await insertCity(location.city.city_name);
                    
                    // Insert street for this city
                    const street = await insertStreet(
                        city.city_id,
                        location.street.street_name,
                        location.street.street_code
                    );
                    
                    // Process each bin at this location
                    for (const bin of location.bins) {
                        try {
                            const binType = await insertBinType(bin.bin_type_name);
                            
                            await insertRecyclingBin({
                                binTypeId: binType.bin_type_id,
                                streetId: street.street_id,
                                buildingNumber: bin.building_number,
                                latitude: bin.latitude,
                                longitude: bin.longitude,
                                binCount: bin.bin_count,
                                status: bin.status,
                                uniqueExternalId: `${bin.unique_external_id}-${bin.bin_type_name}`
                            });
                            
                            console.log(`Successfully inserted bin at ${location.street.street_name} ${bin.building_number}`);
                        } catch (binError) {
                            console.error(`Error processing bin in ${fetcher.cityName}:`, binError);
                        }
                    }
                } catch (locationError) {
                    console.error(`Error processing location in ${fetcher.cityName}:`, locationError);
                }
            }
            
            console.log(`Finished processing ${fetcher.cityName} data`);
        } catch (error) {
            console.error(`Error processing ${fetcher.cityName}:`, error);
        }
    }

    async proccesAll() {
        try {
            for (const fetcher of this.cityFetchers) {
                await this.processCity(fetcher);
            }
        } finally {
            await pool.end();
        }
    }
}

export default CityDataProcessor;