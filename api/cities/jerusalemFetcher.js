import axios from 'axios';
import fs from 'fs/promises';

class JerusalemDataFetcher {
    constructor() {
        this.api = axios.create({
            baseURL: 'https://www.jerusalem.muni.il',
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        this.cityName = 'Jerusalem';

        this.api.interceptors.response.use(null, async (error) => {
            if (error.config && error.config.__retryCount < 3) {
                error.config.__retryCount = error.config.__retryCount || 0;
                error.config.__retryCount += 1;
                await new Promise(resolve => setTimeout(resolve, 1000 * error.config.__retryCount));
                return this.api(error.config);
            }
            return Promise.reject(error);
        });
    }

    async fetchData() {
        try {
            console.log('Fetching recycling bin locations...');
            const response = await this.api.post('/Umbraco/Surface/Int/GetMapNew', {
                culture: 'he-IL',
                ms: 168571
            });
            
            const locations = response.data;
            console.log(`Found ${locations.length} locations`);
            return locations;
        } catch(error) {
            if (error.response) {
                console.error('Server responded with error:', error.response.status);
                console.error('Error details:', error.response.data);
            } else if (error.request) {
                console.error('No response received:', error.message);
            } else {
                console.error('Error during request setup:', error.message);
            }
            throw error;
        }
    }
    transformData(locations) {
        // let once = true;
        try {
            return locations
            .filter(location => {
                 // Clean and validate coordinates
                 const longitude = parseFloat(String(location.Long).replace(',', ''));
                 const latitude = parseFloat(String(location.Lat).replace(',', ''));
                 
                 // Check for invalid coordinates
                 if (isNaN(longitude) || isNaN(latitude) ||
                     longitude === latitude ||  // Check if lat and long are identical
                     longitude < 34 || longitude > 36 ||  // Rough bounds for Jerusalem longitude
                     latitude < 31 || latitude > 32) {    // Rough bounds for Jerusalem latitude
                    //  skippedCount++;
                     console.warn(`Skipping location ID ${location.Id} due to invalid coordinates:`, 
                         { long: location.Long, lat: location.Lat });
                     return false;
                 }
                 return true;
            })
            .map(location => {
                // Handle address parsing with validation
                const addressParts = String(location.Address || '').split(',');
                let streetName = '';
                let houseNumber = '';
                
                if (addressParts[0]) {
                    const streetParts = addressParts[0].trim().split(' ');
                    houseNumber = streetParts.pop() || ''; // Gets the last element (number)
                    streetName = streetParts.join(' ') || ''; // Joins the remaining parts (street name)
                }

                // Clean coordinates by replacing comma with period and converting to float
                const longitude = parseFloat(String(location.Long).replace(',', ''));
                const latitude = parseFloat(String(location.Lat).replace(',', ''));
                return {
                    id: location.Id || null,
                    city: this.cityName,
                    street: streetName || '',
                    houseNumber: houseNumber || '',
                    containerTypes: location.CatName || '',
                    location: {
                        longitude: longitude,
                        latitude: latitude
                    },
                    externalId: location.Id || null    
                }
            });
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
    getSchemaFormat(transformData) {
        const cityData = {
            city_name: this.cityName
        };

        return transformData.map(item => ({
            city: cityData,
            street:  {
                street_name: item.street,
                street_code: null // We can add this if needed in the future
            },
            bins: [{  // Since containerTypes is a single value, not an array, we wrap it in an array
                bin_type_name: item.containerTypes,
                building_number: item.houseNumber,
                latitude: item.location?.latitude,
                longitude: item.location?.longitude,
                bin_count: 1,
                status: 'active',
                unique_external_id: item.externalId
            }]
        }))
    }

    async process() {
        try {
            const data = await this.fetchData();
            const transformedData = this.transformData(data);
            return { cityName: this.cityName, transformedData };
        } catch (error) {
            console.error(`Error processing ${this.cityName} data:`, error);
            throw error;
        }
    }
}

export default JerusalemDataFetcher;