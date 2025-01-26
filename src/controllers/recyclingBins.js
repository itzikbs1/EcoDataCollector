import RecycleBin from '../models/recycleBin.js';
import connectDB from '../database/connection.js';

export async function ensureConnection() {
    if (!global.dbConnection) {
        await connectDB();
        global.dbConnection = true;
    }
}

export async function insertData(data) {
    try {
        await ensureConnection();
        const operations = data.map(record => {
            // Transform the location to GeoJSON format
            const geoJSONLocation = {
                type: 'Point',
                coordinates: [record.location.longitude, record.location.latitude]
            };

            return {
                updateOne: {
                    filter: {
                        city_name: record.city_name,
                        street_name: record.street_name,
                        building_number: record.building_number,
                        bin_type_name: record.bin_type_name,
                        // Update filter to use GeoJSON coordinates
                        'location.coordinates': [record.location.longitude, record.location.latitude]
                    },
                    update: { 
                        $set: { 
                            ...record,
                            location: geoJSONLocation, // Replace the old location format with GeoJSON
                            updated_at: new Date() 
                        }
                    },
                    upsert: true
                }
            };
        });
        
        const result = await RecycleBin.bulkWrite(operations, { ordered: false });
        return result;
    } catch (error) {
        throw error;
    }
}

export async function clearDatabase() {
    try {
        await ensureConnection();
        const result = await RecycleBin.deleteMany({});
        return result.deletedCount;
    } catch (error) {
        throw error;
    }
}

export async function resetDatabase() {
    try {
        await ensureConnection();
        await RecycleBin.collection.drop();
        await RecycleBin.createIndexes();
    } catch (error) {
        if (error.code !== 26) throw error;
    }
}

export async function showIndexes() {
    try {
        await ensureConnection();
        return await RecycleBin.collection.indexes();
    } catch (error) {
        throw error;
    }
}

export async function getCount() {
    try {
        await ensureConnection();
        return await RecycleBin.countDocuments({});
    } catch (error) {
        throw error;
    }
}
