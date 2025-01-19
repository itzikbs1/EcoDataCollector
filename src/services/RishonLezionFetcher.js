import BaseFetcher from '../core/BaseFetcher.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import AddressHandler from '../helpers/addressHandler.js';


class RishonLezionFetcher extends BaseFetcher {
    constructor() {
        super('Rishon Lezion');
        this.urls = [
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/PlasticRecycling.aspx',
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/TextileRecycling.aspx',
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/RecyclingElectronics.aspx',
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/boxesRecycling.aspx'
        ];
        this.coordinatesCache = new Map();
        this.retryDelay = 1100;
    }

    async fetchData() {
        try {
            const allLocations = [];

            for (const url of this.urls) {
                const response = await axios.get(url, {
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                const binType = url.split('/').pop().replace('Recycling.aspx', '');
                const $ = cheerio.load(response.data);

                $('.ms-listviewtable tbody tr').each((index, element) => {
                    let location = {};
                    
                    if (binType === 'boxes') {
                        location = {
                            address: $(element).find('td:nth-child(1)').text().trim(),
                            neighborhood: $(element).find('td:nth-child(2)').text().trim(),
                            description: $(element).find('td:nth-child(3)').text().trim(),
                            binType
                        };
                    } else {
                        location = {
                            address: $(element).find('td:nth-child(2)').text().trim(),
                            neighborhood: $(element).find('td:nth-child(1)').text().trim(),
                            binType
                        };
                    }
                    allLocations.push(location);
                });
            }
            return allLocations;
        } catch (error) {
            console.error(`Error fetching ${this.cityName} data:`, error.message);
            throw error;
        }
    }

    async getCoordinates(address, city) {
        const cacheKey = `${address}-${city}`;
        
        if (this.coordinatesCache.has(cacheKey)) {
            return this.coordinatesCache.get(cacheKey);
        }

        try {
            const formattedAddress = AddressHandler.formatForGeocoding(address, city);
            let coordinates = await this.geocodeAddress(formattedAddress);

            if (!coordinates && /\d/.test(address)) {
                const streetOnly = AddressHandler.cleanAddress(address).replace(/\d+/, '').trim();
                const formattedStreetOnly = `${streetOnly}, ${city}, Israel`;
                coordinates = await this.geocodeAddress(formattedStreetOnly);
            }

            if (coordinates) {
                this.coordinatesCache.set(cacheKey, coordinates);
            }

            return coordinates;
        } catch (error) {
            console.error(`Error geocoding ${address}:`, error);
            return null;
        }
    }

    async geocodeAddress(formattedAddress) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedAddress)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'RecyclingBinsApp/1.0'
            }
        });

        const data = await response.json();
        
        if (data && data[0]) {
            const coordinates = {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
            return this.validateCoordinates(coordinates.latitude, coordinates.longitude) ? coordinates : null;
        }

        return null;
    }

    async transformData(data) {
        try {
            const transformedData = [];


            for (let i = 0; i < data.length; i++) {
                const feature = data[i];
                
                const { street, houseNumber } = AddressHandler.cleanAddress(feature.address);

                let binType = feature.binType;
                if (binType.endsWith('.aspx')) {
                    binType = binType.replace('.aspx', '');
                }

                const coordinates = await this.getCoordinates(feature.address, this.cityName);

                if (!coordinates) {
                    continue;
                }

                transformedData.push({
                    id: `RL-${i}`,
                    city: this.cityName,
                    street: street,
                    houseNumber: houseNumber?.toString() || null,
                    containerTypes: [binType],
                    location: coordinates,
                    binCount: 1,
                    externalId: i,
                    neighborhood: feature.neighborhood
                });
            }

            return transformedData;
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
}

export default RishonLezionFetcher;