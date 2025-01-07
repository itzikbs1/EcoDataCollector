import { pool, query } from './connection.js';


export async function insertCity(cityName) {
    const quertText = `
        INSERT INTO cities (city_name)
        VALUES($1)
        ON CONFLICT (city_name) DO UPDATE
        SET updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    try {
        const result = await query(quertText, [cityName]);
        return result.rows[0];
    } catch(err) {
        console.error('Error inserting city: ', err);
        throw err;
    }
}

export async function insertStreet(cityId, streetName, streetCode = null) {
    const queryText = `
        INSERT INTO streets (city_id, street_name, street_code)
        VALUES($1, $2, $3)
        ON CONFLICT (city_id, street_name) 
        DO UPDATE
        SET street_code = COALESCE(EXCLUDED.street_code, streets.street_code),
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;

    try {
        const result = await query(queryText, [cityId, streetName, streetCode]);
        return result.rows[0];
    } catch(err) {
        console.error('Error inserting street: ', err);
        throw err;
    }
}

// Bin type operations
export async function insertBinType(typeName) {
    const queryText = `
      INSERT INTO bin_types (type_name)
      VALUES ($1)
      ON CONFLICT (type_name) DO UPDATE 
      SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
  
    try {      
      const result = await query(queryText, [typeName]);
      return result.rows[0];
    } catch (err) {
      console.log(`typeName: ${typeName}`);
      console.error('Error inserting bin type:', err);
      throw err;
    }
  }
  
  // Recycling bin operations
  export async function insertRecyclingBin({
    binTypeId,
    streetId,
    buildingNumber,
    latitude,
    longitude,
    binCount = 1,
    status = 'active',
    uniqueExternalId = null
  }) {
    const queryText = `
      INSERT INTO recycling_bins (
        bin_type_id, street_id, building_number, 
        latitude, longitude, bin_count, 
        status, unique_external_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (unique_external_id) 
      DO UPDATE SET
        bin_type_id = EXCLUDED.bin_type_id,
        street_id = EXCLUDED.street_id,
        building_number = EXCLUDED.building_number,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        bin_count = EXCLUDED.bin_count,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
  
    const values = [
      binTypeId, streetId, buildingNumber,
      latitude, longitude, binCount,
      status, uniqueExternalId
    ];
  
    try {
      const result = await query(queryText, values);
      return result.rows[0];
    } catch (err) {
      console.error('Error inserting recycling bin:', err);
      throw err;
    }
  }
  
  // Helper function to insert complete bin location with all relations
  export async function insertCompleteBinLocation({
    cityName,
    streetName,
    streetCode,
    binTypeName,
    buildingNumber,
    latitude,
    longitude,
    binCount,
    uniqueExternalId
  }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
  
      // Insert or get city
      const city = await client.query(
        'INSERT INTO cities (city_name) VALUES ($1) ON CONFLICT (city_name) DO UPDATE SET city_name = EXCLUDED.city_name RETURNING *',
        [cityName]
      );
      const cityId = city.rows[0].city_id;
  
      // Insert or get street
      const street = await client.query(
        'INSERT INTO streets (city_id, street_name, street_code) VALUES ($1, $2, $3) ON CONFLICT (city_id, street_name) DO UPDATE SET street_code = EXCLUDED.street_code RETURNING *',
        [cityId, streetName, streetCode]
      );
      const streetId = street.rows[0].street_id;
  
      // Insert or get bin type
      const binType = await client.query(
        'INSERT INTO bin_types (type_name) VALUES ($1) ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name RETURNING *',
        [binTypeName]
      );
      const binTypeId = binType.rows[0].bin_type_id;
  
      // Insert recycling bin
      const bin = await client.query(
        `INSERT INTO recycling_bins (
          bin_type_id, street_id, building_number,
          latitude, longitude, bin_count, unique_external_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (unique_external_id) 
        DO UPDATE SET
          bin_type_id = EXCLUDED.bin_type_id,
          street_id = EXCLUDED.street_id,
          building_number = EXCLUDED.building_number,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          bin_count = EXCLUDED.bin_count,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [binTypeId, streetId, buildingNumber, latitude, longitude, binCount, uniqueExternalId]
      );
  
      await client.query('COMMIT');
      return {
        city: city.rows[0],
        street: street.rows[0],
        binType: binType.rows[0],
        bin: bin.rows[0]
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in transaction:', err);
      throw err;
    } finally {
      client.release();
    }
  }

