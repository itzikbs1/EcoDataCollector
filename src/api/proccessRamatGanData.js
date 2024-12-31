import RamatGanDataFetcher from "./cities/ramatGanFetcher.js";
import {
    insertCity,
    insertStreet,
    insertBinType,
    insertRecyclingBin
} from '../database/recyclingBins.js';
import { pool } from '../database/connection.js';


async function processAndSaveRamatGanData() {
    const ramatGanFetcher = new RamatGanDataFetcher();

    try {

        const { transformedData } = await ramatGanFetcher.process();

        const schemaFormattedData = ramatGanFetcher.getSchemaFormat(transformedData);

        for (const location of schemaFormattedData) {
            try {
                const city = await insertCity(location.city.city_name);

                const street = await insertStreet(
                    city.city_id,
                    location.street.street_name,
                    location.street.street_code
                );

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
                        console.error(`Error processing bin:`, binError);
                        // Continue with next bin even if one fails
                    }
                }
            } catch (locationError) {
                console.error(`Error processing location:`, locationError);
                // Continue with next location even if one fails
            }
        }
        
        console.log('Finished processing all Ramat Gan data');
    } catch (error) {
        console.error('Error in main process:', error);
        throw error;
    } finally {
        // Close the database connection
        await pool.end();
    }
}

await processAndSaveRamatGanData();