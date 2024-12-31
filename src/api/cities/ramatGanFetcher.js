
class RamatGanDataFetcher {
  constructor() {
    this.apiUrl = 'https://rgsec.ramat-gan.muni.il/__svws__/SvService.asmx/GetCategoriesCoordinates';
    this.cityName = 'Ramat Gan';
  }

  async fetchData() {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          category: 'מתקני מיחזור'
        })
      });

      if(!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      return rawData.d;
    } catch(error) {
      console.error(`Error fetching: ${this.cityName} data: `, error.message);
      throw error;
    }
  }

  validateFeature(item) {
    const errors = [];

    if (!item.StreetName) {
      errors.push('Missing street name');
    } 
    if (!item.Latitude || !item.Longtitude) {
      errors.push('Missing or invalid coordinates');
      return errors;
    }
    if (!item.Title) {
        errors.push('Missing container type');
    }

    // Validate coordinates are within Israel bounds
    if (item.Latitude < 29.5 || item.Latitude > 33.3 || 
        item.Longtitude < 34.2 || item.Longtitude > 35.9) {
        errors.push('Coordinates outside of Israel bounds');
    }

    return errors;
  }

  transformData(rawData) {
    try {
      
      return rawData.map(item => ({
        id: item.Id,
        city: this.cityName,
        street: item.SteetName,
        houseNumber: item.BuildingNumber?.toString(),
        containerTypes: [
          item.Title?.replace(/<[^>]*>/g, '')  // Remove HTML tags
              .replace(/\s*\[[^\]]*\]/g, '')  // Remove square brackets and their content
              .trim() || ''
        ],
        location: {
            longitude: item.Longtitude,
            latitude: item.Latitude
        },
        externalId: item.Id
      }));
    } catch (error) {
      console.error(`Error transforming ${this.cityName} data:`, error.message);
      throw error;
  }
}

  getSchemaFormat(transformedData) {
    const cityData = {
      city_name: this.cityName
    };

    return transformedData.map(item => ({
      city: cityData,
      street: {
        street_name: item.street,
        street_code: null
      },
      bins: item.containerTypes.map(binType => ({
        bin_type_name: binType,
        building_number: item.houseNumber,
        latitude: item.location?.latitude,
        longitude: item.location?.longitude,
        bin_count: 1,
        status: 'active',
        unique_external_id: item.externalId
      }))
    }));
  }

  async process() {
    try {
        const rawData = await this.fetchData();
        const transformedData = this.transformData(rawData);
        return { cityName: this.cityName, transformedData };
    } catch (error) {
        console.error(`Error processing ${this.cityName} data:`, error);
        throw error;
    }
  }
}

export default RamatGanDataFetcher;