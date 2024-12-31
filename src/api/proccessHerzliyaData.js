import HerzliyaDataFetcher from './cities/herzliyaFetcher.js';
import RamatGanDataFetcher from "./cities/ramatGanFetcher.js";

import {
    insertCompleteBinLocation,
    insertCity,
    insertStreet,
    insertBinType,
    insertRecyclingBin
} from '../database/recyclingBins.js';
import { pool } from '../database/connection.js';

async function processAndSaveHerzliyaData() {
    const herzliyaFetcher = new HerzliyaDataFetcher();
    
    try {
        // Fetch and transform the data
        const { transformedData } = await herzliyaFetcher.process();
        
        // Get data in schema format
        const schemaFormattedData = herzliyaFetcher.getSchemaFormat(transformedData);
        
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
                        // Insert or get bin type
                        const binType = await insertBinType(bin.bin_type_name);
                        
                        // Insert the recycling bin
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
                        console.error(`Error processing bin:`, binError);
                        // Continue with next bin even if one fails
                    }
                }
            } catch (locationError) {
                console.error(`Error processing location:`, locationError);
                // Continue with next location even if one fails
            }
        }
        
        console.log('Finished processing all Herzliya data');
    } catch (error) {
        console.error('Error in main process:', error);
        throw error;
    } finally {
        // Close the database connection
        await pool.end();
    }
}


await processAndSaveHerzliyaData();