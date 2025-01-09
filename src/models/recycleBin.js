import mongoose from "mongoose";
const { Schema } = mongoose;

const recycleBinSchema = new Schema({
    city_name: {
        type: String,
        required: [true, 'City name is required'],
        trim: true
    },
    street_name: {
        type: String,
        trim: true
    },
    building_number: {
        type: Number
    },
    bin_type_name: {
        type: String,
        required: [true, 'Bin type is required'],
        trim: true,
        enum: {
            values: [
                'Plastic',
                'Paper', 
                'Glass', 
                'Electronic', 
                'Textile', 
                'Packaging', 
                'Cardboard'
            ],
            message: '{VALUE} is not a supported bin type'
        }
    },
    is_active: {
        type: Boolean,
        default: true
    },
    location: {
        type: {
            latitude: {
                type: Number,
                required: [true, 'Latitude is required'],
                min: [29.5, 'Latitude must be at least 29.5°N (Southern Israel)'],
                max: [33.3, 'Latitude must be at most 33.3°N (Northern Israel)']    
            },
            longitude: {
                type: Number,
                required: [true, 'Longitude is required'],
                min: [34.3, 'Longitude must be at least 34.3°E (Western Israel)'],
                max: [35.9, 'Longitude must be at most 35.9°E (Eastern Israel)']    
            }
        },
        required: true,
        index: '2d'
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});



// Adding compound index for common queries
recycleBinSchema.index({ city_name: 1 });

recycleBinSchema.index({
    city_name: 1,
    street_name: 1,
    building_number: 1,
    bin_type_name: 1,
    'location.latitude': 1,
    'location.longitude': 1
}, { unique: true });

const RecycleBin = mongoose.model('RecycleBin', recycleBinSchema);

export default RecycleBin;