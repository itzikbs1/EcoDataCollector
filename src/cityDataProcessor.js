import {
    ensureConnection,
    insertData,
    clearDatabase,
    resetDatabase,
    showIndexes
} from './database/recyclingBins.js';

class CityDataProcessor {
    constructor(cityFetchers = []) {
        this.cityFetchers = cityFetchers;
    }

    async processCity(fetcher) {
        try {
            console.log(`Starting to process data for ${fetcher.cityName}`);
            await ensureConnection();

            console.log("\n--- Clearing Database ---");
            await clearDatabase();

            console.log("\n--- Resetting Indexes ---");
            await resetDatabase();
            const indexes = await showIndexes();
            console.log('Current indexes:', indexes);

            // console.log("\n--- Inserting New Data ---");
            const { transformedData } = await fetcher.process();
            const schemaFormattedData = fetcher.getSchemaFormat(transformedData);
            const result = await insertData(schemaFormattedData);
            // console.log('Insert operation results:', result);

            console.log(`Finished processing ${fetcher.cityName} data`);
        } catch (error) {
            console.error(`Error processing ${fetcher.cityName}:`, error);
        }
    }

    async processAll() {
        try {
            await ensureConnection();
            for (const fetcher of this.cityFetchers) {
                await this.processCity(fetcher);
            }
        } finally {
            console.log('Processing completed');
        }
    }
}

export default CityDataProcessor;


// // cityDataProcessor.js
// import mongoose from 'mongoose';
// import connectDB from './database/connection.js';
// import RecycleBin from './models/recycleBin.js';

// // import fs from 'fs/promises';

// class CityDataProcessor {
//     constructor(cityFetchers = []) {
//         this.cityFetchers = cityFetchers;
//         this.isConnected = false;
//     }

//     addFetcher(fetcher) {
//         this.cityFetchers.push(fetcher);
//     }

//     async ensureConnection() {
//         if (!this.isConnected) {
//             await connectDB();
//             this.isConnected = true;
//         }
//     }

//     async processCity(fetcher) {
//         try {
//             // await this.ensureConnection();
            
//             console.log(`Starting to process data for ${fetcher.cityName}`);
//             await this.ensureConnection();
        
//             // 1. First show current state
//             // console.log("\n--- Initial State ---");
//             // await this.getCount();
//             // await this.showIndexes();
            
//             // 2. Clear everything
//             console.log("\n--- Clearing Database ---");
//             await this.clearDatabase(true);
            
//             // // 3. Reset indexes
//             console.log("\n--- Resetting Indexes ---");
//             await this.resetDatabase(true);
//             await this.showIndexes();
            
//             // // 4. Insert new data
//             // console.log("\n--- Inserting New Data ---");

            
//             const { transformedData } = await fetcher.process();
//             const schemaFormattedData = fetcher.getSchemaFormat(transformedData);
//             // console.log(schemaFormattedData);
//             // fs.writeFile('./schemaformated.json', JSON.stringify(schemaFormattedData, null, 2), (err) => {
//             //     if (err) {
//             //       console.error("An error occurred while saving the data:", err);
//             //     } else {
//             //       console.log("Data successfully saved to", filePath);
//             //     }
//             //   });
            
//             await this.insertData(schemaFormattedData);
//             // // 5. Show final state
//             // console.log("\n--- Final State ---");
//             // await this.getCount();
//             // await this.showIndexes();


//             console.log(`Finished processing ${fetcher.cityName} data`);
//         } catch (error) {
//             console.error(`Error processing ${fetcher.cityName}:`, error);
//             throw error;
//         }
//     }

//     async insertData(data) {
//         try {
//             await this.ensureConnection();
            
//             const countBefore = await RecycleBin.countDocuments({});
//             console.log('Count before insertion:', countBefore);
            
//             console.log('Starting upsert operation for', data.length, 'records');
            
//             const operations = data.map(record => ({
//                 updateOne: {
//                     filter: {
//                         city_name: record.city_name,
//                         street_name: record.street_name,
//                         building_number: record.building_number,
//                         bin_type_name: record.bin_type_name,
//                         'location.latitude': record.location.latitude,
//                         'location.longitude': record.location.longitude
//                     },
//                     update: {
//                         $set: {
//                             ...record,
//                             updated_at: new Date()
//                         }
//                     },
//                     upsert: true
//                 }
//             }));
    
//             const result = await RecycleBin.bulkWrite(operations, {
//                 ordered: false
//             });
//                     // Add this debugging section
//         // if (result.matchedCount > 0) {
//         //     console.log('\nInvestigating matched records...');
//         //     // Get all matched records
//         //     const matchedRecords = data.filter((record, index) => {
//         //         return !result.upsertedIds.hasOwnProperty(index);
//         //     });
            
//         //     console.log('First matched record details:');
//         //     console.log(JSON.stringify(matchedRecords[0], null, 2));
            
//             // Find any duplicates in the input data
//         //     const keyMap = new Map();
//         //     const duplicates = data.filter(record => {
//         //         const key = `${record.city_name}-${record.street_name}-${record.building_number}-${record.bin_type_name}-${record.location.latitude}-${record.location.longitude}`;
//         //         if (keyMap.has(key)) {
//         //             return true;
//         //         }
//         //         keyMap.set(key, true);
//         //         return false;
//         //     });

//         //     console.log('\nNumber of duplicates found in input data:', duplicates.length);
//         //     if (duplicates.length > 0) {
//         //         console.log('First duplicate record:');
//         //         console.log(JSON.stringify(duplicates[0], null, 2));
//         //     }
//         // }
            
//             console.log('Operation results:', {
//                 matched: result.matchedCount,
//                 modified: result.modifiedCount,
//                 upserted: result.upsertedCount,
//                 upsertedIds: Object.keys(result.upsertedIds).length
//             });
    
//             const countAfter = await RecycleBin.countDocuments({});
//             console.log('Count after insertion:', countAfter);
    
//         } catch (error) {
//             if (error.code === 11000) {
//                 console.warn('Duplicate entries detected:', error.writeErrors);
//             }
//             console.error('Error:', error);
//             throw error;
//         }
//     }

//     async clearDatabase(confirmation = false) {
//         if (!confirmation) {
//             throw new Error('Please provide confirmation parameter as true to clear the database');
//         }
        
//         try {
//             await this.ensureConnection();
//             const result = await RecycleBin.deleteMany({});
//             console.log(`Cleared database. Deleted ${result.deletedCount} records`);
//             return result.deletedCount;
//         } catch (error) {
//             console.error('Error clearing database:', error);
//             throw error;
//         }
//     }

//     async resetDatabase(confirmation = false) {
//         if (!confirmation) {
//             throw new Error('Please provide confirmation parameter as true to reset the database');
//         }
        
//         try {
//             await this.ensureConnection();
//             // This will drop the collection and all its indexes
//             await RecycleBin.collection.drop();
//             console.log('Database reset: Collection and indexes dropped');
            
//             // Recreate indexes defined in the schema
//             await RecycleBin.createIndexes();
//             console.log('Indexes recreated');
            
//             return true;
//         } catch (error) {
//             if (error.code === 26) {
//                 // Collection doesn't exist error - this is fine
//                 console.log('Collection did not exist, creating fresh');
//                 return true;
//             }
//             console.error('Error resetting database:', error);
//             throw error;
//         }
//     }

//     async showIndexes() {
//         try {
//             await this.ensureConnection();
//             const indexes = await RecycleBin.collection.indexes();
//             console.log('Current indexes:', JSON.stringify(indexes, null, 2));
//         } catch (error) {
//             console.error('Error showing indexes:', error);
//         }
//     }

//     async getCount() {
//         try {
//             await this.ensureConnection();
//             const count = await RecycleBin.countDocuments({});
//             console.log(`Total records in database: ${count}`);
//             return count;
//         } catch (error) {
//             console.error('Error getting count:', error);
//             throw error;
//         }
//     }

//     async getCountByCity(cityName) {
//         try {
//             await this.ensureConnection();
//             const count = await RecycleBin.countDocuments({ city_name: cityName });
//             console.log(`Records for ${cityName}: ${count}`);
//             return count;
//         } catch (error) {
//             console.error(`Error getting count for ${cityName}:`, error);
//             throw error;
//         }
//     }

//     async getCountByBinType(binType) {
//         try {
//             await this.ensureConnection();
//             const count = await RecycleBin.countDocuments({ bin_type_name: binType });
//             console.log(`Records for ${binType} bins: ${count}`);
//             return count;
//         } catch (error) {
//             console.error(`Error getting count for ${binType} bins:`, error);
//             throw error;
//         }
//     }

//     async processAll() {
//         try {
//             await this.ensureConnection();
//             for (const fetcher of this.cityFetchers) {
//                 await this.processCity(fetcher);
//             }
//         } finally {
//             if (this.isConnected) {
//                 await mongoose.connection.close();
//                 this.isConnected = false;
//                 console.log('MongoDB connection closed');
//             }
//         }
//     }
// }

// export default CityDataProcessor;



// // import mongoose from 'mongoose';

// // import connectDB from './database/connection.js';
// // import RecycleBin from './models/recycleBin.js';


// // class CityDataProcessor {
// //     constructor(cityFetchers = []) {
// //         this.cityFetchers = cityFetchers;
// //     }

// //     addFetcher(fetcher) {
// //         this.cityFetchers.push(fetcher);
// //     }

// //     async processCity(fetcher) {
// //         try {
// //             console.log(`Starting to process data for ${fetcher.cityName}`);
            
// //             // Fetch and transform the data
// //             const { transformedData } = await fetcher.process();
            
// //             // Get data in schema format
// //             const schemaFormattedData = fetcher.getSchemaFormat(transformedData);
// //             // console.log(schemaFormattedData);
            
// //             await this.insertData(schemaFormattedData);

// //             console.log(`Finished processing ${fetcher.cityName} data`);
// //         } catch (error) {
// //             console.error(`Error processing ${fetcher.cityName}:`, error);
// //         }
// //     }

// //     async insertData(data) {
// //         try {
// //             await connectDB();
// //             // const result = await RecycleBin.deleteMany({});
// //             // console.log(`Cleared database. Deleted ${result.deletedCount} records`);

// //             console.log('Starting upsert operation for', data.length, 'records');
            
// //             const operations = data.map(record => ({
// //                 updateOne: {
// //                     filter: {
// //                         city_name: record.city_name,
// //                         street_name: record.street_name,
// //                         building_number: record.building_number,
// //                         bin_type_name: record.bin_type_name,
// //                         'location.latitude': record.location.latitude,
// //                         'location.longitude': record.location.longitude
// //                     },
// //                     update: { 
// //                         $set: {
// //                         ...record,
// //                         updated_at: new Date()  // Force update timestamp only when data changes
// //                         }
// //                     },
// //                     upsert: true
// //                 }
// //             }));

// //             const result = await RecycleBin.bulkWrite(operations);
            
// //             console.log('Operation results:', {
// //                 matched: result.matchedCount,    // existing records found
// //                 modified: result.modifiedCount,  // existing records updated
// //                 upserted: result.upsertedCount  // new records inserted
// //             });

// //         } catch (error) {
// //             console.error('Error:', error);
// //         }
// //     };
// //     async proccesAll() {
// //         try {
// //             for (const fetcher of this.cityFetchers) {
// //                 await this.processCity(fetcher);
// //             }
// //         } finally {
// //             // await pool.end();
// //             await mongoose.connection.close();
// //             console.log('MongoDB connection closed');
// //         }
// //     }
// // }

// // export default CityDataProcessor;