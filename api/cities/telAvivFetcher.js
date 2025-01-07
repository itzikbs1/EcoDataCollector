// import { writeFile } from 'fs/promises';


class TelAvivDataFetcher {
    constructor() {
        this.apiUrl = 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/WM/IView2WM/MapServer/787/query';
        this.params = new URLSearchParams({
            where: '1=1', // Get all features
            outFields: '*', // Get all fields
            f: 'json', // Request JSON format
            returnGeometry: 'true'
        });
        this.cityName = 'Tel Aviv';
    }

    async fetchData() {
        try {
            const response = await fetch(`${this.apiUrl}?${this.params}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch(error) {
            console.error(`Error fetching: ${this.cityName} data: `, error.message);
            throw error;
        }
    }

    transformData(data) {
        try {
            if (!data.features || !Array.isArray(data.features)) {
                throw new Error('Invalid input data structure');
            }
        
            return data.features.map(feature => {
                // Process the container type (t_sug)
                let containerType = feature.attributes?.t_sug || '';
                
                // Remove text in parentheses
                containerType = containerType.replace(/\s*\([^)]*\)/g, '').trim();
                
                // If there's a slash, take the second part (מיכל כתום in this case)
                if (containerType.includes('/')) {
                    containerType = containerType.split('/')[1].trim();
                }
                return {
                    id: feature.attributes?.UniqueId,
                    city: this.cityName,
                    street: feature.attributes?.shem_rechov,
                    houseNumber: feature.attributes?.ms_bait?.toString(),
                    containerTypes: [containerType],
                    location: {
                        longitude: feature.attributes?.Lon,
                        latitude: feature.attributes?.Lat
                    },
                    binCount: feature.attributes?.ms_mechalim || 1,
                    externalId: feature.attributes?.oid
                }
            });
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }

      // Transform from second schema to third schema
      getSchemaFormat(transformedData) {
        const cityData = {
          city_name: this.cityName
        };
    
        return transformedData.map(item => {
            return {
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
                bin_count: item.binCount,
                status: 'active',
                unique_external_id: item.externalId
            }))
        }
        });
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

export default TelAvivDataFetcher;