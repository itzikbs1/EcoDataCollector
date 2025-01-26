import RecycleBin from '../models/recycleBin.js';
import connectDB from '../database/connection.js';


export async function ensureConnection() {
    if (!global.dbConnection) {
        await connectDB();
        global.dbConnection = true;
    }
}

export const getRecycleBins = async (req, res) => {
    try {        
        const coordintaes = req.body.coords;
        const binTypes = req.body.binTypes;

        const recycleBins = await RecycleBin.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [coordintaes.longitude, coordintaes.latitude]
                    },
                    $maxDistance: 500 //for now its 500 meters
                }
            },
            bin_type_name: {
                $in: binTypes
            }
        });
        res.status(200).json(recycleBins);
    } catch(error) {
        res.status(500).json({ message: error.message });
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

            // Create a unique identifier filter
            const filter = {
                city_name: record.city_name,
                street_name: record.street_name,
                building_number: record.building_number,
                bin_type_name: record.bin_type_name,
                'location.coordinates': [record.location.longitude, record.location.latitude]
            };

            // Create the document to insert/update
            const documentToUpdate = {
                ...record,
                location: geoJSONLocation,
                is_active: record.is_active ?? true,
                updated_at: new Date()
            };

            return {
                updateOne: {
                    filter,
                    update: { $set: documentToUpdate },
                    upsert: true
                }
            };
        });
        
        const result = await RecycleBin.bulkWrite(operations, { ordered: false });
        console.log(`Processed ${result.modifiedCount} updates and ${result.upsertedCount} inserts`);
        return result;
    } catch (error) {
        console.error('Error in insertData:', error);
        throw error;
    }
}