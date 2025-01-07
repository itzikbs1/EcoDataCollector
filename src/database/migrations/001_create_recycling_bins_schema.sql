-- Set client encoding to UTF8
SET client_encoding = 'UTF8';

-- Cities table to store city information
CREATE TABLE IF NOT EXISTS cities (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_city_name UNIQUE (city_name)
);

-- Streets table to store street information
CREATE TABLE IF NOT EXISTS streets (
    street_id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(city_id),
    street_name VARCHAR(200) NOT NULL,
    street_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_street_city UNIQUE (city_id, street_name)
);

-- Bin types table - simplified version
CREATE TABLE IF NOT EXISTS bin_types (
    bin_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL,  -- e.g., 'מתקן טקסטיל', 'מתקן זכוכית', 'פחים כתומים'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type_name)
);

-- Recycling bins locations table - simplified version
CREATE TABLE IF NOT EXISTS recycling_bins (
    bin_id SERIAL PRIMARY KEY,
    bin_type_id INTEGER REFERENCES bin_types(bin_type_id),
    street_id INTEGER REFERENCES streets(street_id),
    building_number VARCHAR(20),
    latitude DECIMAL(12, 8),
    longitude DECIMAL(12, 8),
    bin_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    unique_external_id VARCHAR(100),  -- For rare cases of bin relocation tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_external_id UNIQUE (unique_external_id),
    -- Add constraint for valid coordinates
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN 29.5 AND 33.3 AND  -- Israel's latitude bounds
        longitude BETWEEN 34.2 AND 35.9     -- Israel's longitude bounds
    )
);

-- Create essential indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_bins_location ON recycling_bins(street_id, building_number);
CREATE INDEX IF NOT EXISTS idx_bins_coordinates ON recycling_bins(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_street_city ON streets(city_id);

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS update_cities_timestamp ON cities;
DROP TRIGGER IF EXISTS update_streets_timestamp ON streets;
DROP TRIGGER IF EXISTS update_bin_types_timestamp ON bin_types;
DROP TRIGGER IF EXISTS update_recycling_bins_timestamp ON recycling_bins;

-- Create triggers
CREATE TRIGGER update_cities_timestamp
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streets_timestamp
    BEFORE UPDATE ON streets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bin_types_timestamp
    BEFORE UPDATE ON bin_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recycling_bins_timestamp
    BEFORE UPDATE ON recycling_bins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Example of inserting a bin type
-- INSERT INTO bin_types (type_name) VALUES 
--     ('מתקן טקסטיל'),
--     ('מתקן זכוכית'),
--     ('פחים כתומים'),
--     ('קרטונים'),
--     ('נייר');

-- Example of how to query bins by city and street
/*
SELECT rb.*, s.street_name, c.city_name, bt.type_name
FROM recycling_bins rb
JOIN streets s ON rb.street_id = s.street_id
JOIN cities c ON s.city_id = c.city_id
JOIN bin_types bt ON rb.bin_type_id = bt.bin_type_id
WHERE c.city_name = 'Tel Aviv' 
AND s.street_name = 'הרצל';
*/