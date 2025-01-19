import BaseFetcher from '../core/BaseFetcher.js';
import axios from 'axios';

class JerusalemFetcher extends BaseFetcher {
    constructor() {
        super('Jerusalem');
        this.api = axios.create({
            baseURL: 'https://www.jerusalem.muni.il',
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

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
        try {
            return locations
                .filter(location => {
                    const longitude = parseFloat(String(location.Long).replace(',', ''));
                    const latitude = parseFloat(String(location.Lat).replace(',', ''));
                    
                    if (isNaN(longitude) || isNaN(latitude) ||
                        longitude === latitude ||
                        !this.validateCoordinates(latitude, longitude)) {
                        console.warn(`Skipping location ID ${location.Id} due to invalid coordinates:`, 
                            { long: location.Long, lat: location.Lat });
                        return false;
                    }
                    if ((location.CatName || '') === 'מיחזור זכוכית') {
                        return false;
                    }
                    return true;
                })
                .map(location => {
                    const addressParts = String(location.Address || '').split(',');
                    let streetName = '';
                    let houseNumber = '';
                    
                    if (addressParts[0]) {
                        const streetParts = addressParts[0].trim().split(' ');
                        houseNumber = streetParts.pop() || '';
                        streetName = streetParts.join(' ') || '';
                    }

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
                    };
                });
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
}

export default JerusalemFetcher;