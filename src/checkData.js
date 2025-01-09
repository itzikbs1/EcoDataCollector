import mongoose from 'mongoose';
import connectDB from './database/connection.js';
import RecycleBin from './models/recycleBin.js';

async function checkData() {
    try {
        await connectDB();
        
        // Total count
        const totalCount = await RecycleBin.countDocuments();
        console.log(`Total records: ${totalCount}`);

        const bins = await RecycleBin.find();
        bins.forEach(item => {
            console.log(item.location.latitude);
            console.log(item.location.longitude);
        })
        // Distribution by street
        const streetDistribution = await RecycleBin.aggregate([
            {
                $group: {
                    _id: {
                        street: "$street_name",
                        building: "$building_number"
                    },
                    binCount: { $sum: 1 },
                    binTypes: { $push: "$bin_type_name" }
                }
            },
            { $limit: 10 }
        ]);

        console.log("\nSample distribution by street (first 10):");
        streetDistribution.forEach(item => {
            console.log(`${item._id.street} ${item._id.building}: ${item.binCount} bins (Types: ${item.binTypes.join(', ')})`);
        });

        // Check for any potential data inconsistencies
        const inconsistencies = await RecycleBin.aggregate([
            {
                $group: {
                    _id: {
                        street: "$street_name",
                        building: "$building_number",
                        lat: "$location.latitude",
                        lng: "$location.longitude"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 3 } // Locations with more than 3 bins
                }
            }
        ]);

        if (inconsistencies.length > 0) {
            console.log("\nLocations with unusually high bin counts:");
            inconsistencies.forEach(inc => {
                console.log(`${inc._id.street} ${inc._id.building}: ${inc.count} bins`);
                
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

checkData();