import axios from 'axios';
import * as cheerio from 'cheerio';

import AddressHandler from '../addressHandler.js'

class RishonLezionDataFetcher {
    constructor() {
        this.urls = [
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/PlasticRecycling.aspx',
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/TextileRecycling.aspx',
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/RecyclingElectronics.aspx',
            'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/boxesRecycling.aspx'
        ];
        this.cityName = 'Rishon Lezion';
        this.coordinatesCache = new Map(); // Cache for geocoding results
        this.retryDelay = 1100; // Nominatim rate limit
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
            // Try with full address
            const formattedAddress = AddressHandler.formatForGeocoding(address, city);
            let coordinates = await this.geocodeAddress(formattedAddress);

            // If failed and address has a number, try without the number
            if (!coordinates && /\d/.test(address)) {
                const streetOnly = AddressHandler.cleanAddress(address).replace(/\d+/, '').trim();
                const formattedStreetOnly = `${streetOnly}, ${city}, Israel`;
                coordinates = await this.geocodeAddress(formattedStreetOnly);
            }

            if (coordinates) {
                this.coordinatesCache.set(cacheKey, coordinates);
                console.log(`✓ Found coordinates for ${address}: ${JSON.stringify(coordinates)}`);
            } else {
                console.log(`✗ No coordinates found for ${address}`);
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
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon)
            };
        }

        return null;
    }

    async transformData(data) {
        try {
            const transformedData = [];
            let successCount = 0;
            let failureCount = 0;

            for (let i = 0; i < data.length; i++) {
                const feature = data[i];
                
                // Clean up address
                const { street, houseNumber } = AddressHandler.cleanAddress(feature.address);

                // Clean up bin type
                let binType = feature.binType;
                if (binType.endsWith('.aspx')) {
                    binType = binType.replace('.aspx', '');
                }

                // Get coordinates with better formatted address
                const coordinates = await this.getCoordinates(feature.address, this.cityName);

                if (coordinates) {
                    successCount++;
                } else {
                    failureCount++;
                }

                transformedData.push({
                    id: `RL-${i}`,
                    city: this.cityName,
                    street: street,
                    houseNumber: houseNumber?.toString() || null,
                    containerTypes: [binType],
                    location: coordinates || {
                        longitude: null,
                        latitude: null
                    },
                    binCount: 1,
                    externalId: i,
                    neighborhood: feature.neighborhood
                });

                 // Log progress
                 if ((i + 1) % 10 === 0) {
                    console.log(`Processed ${i + 1}/${data.length} addresses`);
                    console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
                }
            }
            console.log('\nFinal Statistics:');
            console.log(`Total addresses processed: ${data.length}`);
            console.log(`Successful geocoding: ${successCount}`);
            console.log(`Failed geocoding: ${failureCount}`);
            console.log(`Success rate: ${((successCount / data.length) * 100).toFixed(1)}%`);


            return transformedData;
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
                bin_count: item.binCount,
                status: 'active',
                unique_external_id: item.externalId
            }))
        }));
    }

    async process() {
        try {
            const rawData = await this.fetchData();
            const transformedData = await this.transformData(rawData);
            return { cityName: this.cityName, transformedData };
        } catch (error) {
            console.error(`Error processing ${this.cityName} data:`, error);
            throw error;
        }
    }
}

export default RishonLezionDataFetcher;









// import axios from 'axios';
// import * as cheerio from 'cheerio';

// import AddressHandler from '../addressHandler.js'

// class RishonLezionDataFetcher {
//     constructor() {
//         this.urls = [
//             'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/PlasticRecycling.aspx',
//             'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/TextileRecycling.aspx',
//             'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/RecyclingElectronics.aspx',
//             'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/boxesRecycling.aspx'
//         ];
//         this.cityName = 'Rishon Lezion';
//         this.coordinatesCache = new Map(); // Cache for geocoding results
//         this.retryDelay = 1100; // Nominatim rate limit
//     }

//     async fetchData() {
//         try {
//             const allLocations = [];

//             for (const url of this.urls) {
//                 const response = await axios.get(url, {
//                     headers: {
//                         'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//                         'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
//                         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//                     }
//                 });

//                 const binType = url.split('/').pop().replace('Recycling.aspx', '');
//                 const $ = cheerio.load(response.data);

//                 $('.ms-listviewtable tbody tr').each((index, element) => {
//                     let location = {};
                    
//                     if (binType === 'boxes') {
//                         location = {
//                             address: $(element).find('td:nth-child(1)').text().trim(),
//                             neighborhood: $(element).find('td:nth-child(2)').text().trim(),
//                             description: $(element).find('td:nth-child(3)').text().trim(),
//                             binType
//                         };
//                     } else {
//                         location = {
//                             address: $(element).find('td:nth-child(2)').text().trim(),
//                             neighborhood: $(element).find('td:nth-child(1)').text().trim(),
//                             binType
//                         };
//                     }
//                     allLocations.push(location);
//                 });
//             }
//             return allLocations;
//         } catch (error) {
//             console.error(`Error fetching ${this.cityName} data:`, error.message);
//             throw error;
//         }
//     }

// //     async getCoordinates(address, city) {
// //         const apiKey = 'AIzaSyAWSXefsakzxeIMLwMhl-r5RluKrSwiNi4'; //process.env.GOOGLE_MAPS_API_KEY;
// //         const cacheKey = `${address}-${city}`;
        
// //         // Check cache first
// //         if (this.coordinatesCache.has(cacheKey)) {
// //             return this.coordinatesCache.get(cacheKey);
// //         }
    
// //         try {
// //             const fullAddress = `${address}, ${city}, Israel`;
// //             const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}&language=iw`;  // 'iw' for Hebrew
    
// //             const response = await fetch(url);
// //             const data = await response.json();
// //             // console.log('************************************');
// //             // console.log(data);
// //             // console.log('************************************');
            
// //         // Handle various Google API status codes
// //         switch (data.status) {
// //             case 'OK':
// //                 console.log('data.results[0].: ', data.results[0]);
                
// //                 if (data.results && data.results[0]) {
// //                     const coordinates = {
// //                         latitude: data.results[0].geometry.location.lat,
// //                         longitude: data.results[0].geometry.location.lng
// //                     };
// //                     this.coordinatesCache.set(cacheKey, coordinates);
// //                     return coordinates;
// //                 }
// //                 break;
                
// //             case 'ZERO_RESULTS':
// //                 console.warn(`No results found for address: ${fullAddress}`);
// //                 break;
                
// //             case 'OVER_QUERY_LIMIT':
// //                 // Wait and retry
// //                 await new Promise(resolve => setTimeout(resolve, 2000));
// //                 return this.getCoordinates(address, city);
                
// //             case 'REQUEST_DENIED':
// //                 console.error('Google Maps API key is invalid or request was denied');
// //                 break;
                
// //             case 'INVALID_REQUEST':
// //                 console.error('Invalid request parameters');
// //                 break;
                
// //             default:
// //                 console.error(`Unexpected status: ${data.status}`);
// //         }
        
// //         return null;
// //     } catch (error) {
// //         console.error(`Error getting coordinates for ${address}:`, error);
        
// //         // Retry on network errors
// //         if (error.name === 'TypeError' || error.name === 'NetworkError') {
// //             await new Promise(resolve => setTimeout(resolve, 2000));
// //             return this.getCoordinates(address, city);
// //         }
        
// //         return null;
// //     }
// // }

//     // async getCoordinates(address, city) {
//     //     const cacheKey = `${address}-${city}`;
        
//     //     // Check cache first
//     //     if (this.coordinatesCache.has(cacheKey)) {
//     //         return this.coordinatesCache.get(cacheKey);
//     //     }

//     //     try {
//     //         // Add delay to respect rate limits
//     //         await new Promise(resolve => setTimeout(resolve, 1100));

//     //         // const fullAddress = `${address}, ${city}, Israel`;
//     //         // const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`;

//     //         const { street, houseNumber } = AddressHandler.parseAddress(address);
//     //         const formattedAddress = AddressHandler.formatForGeocoding(street, houseNumber, city);

//     //         const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedAddress)}`;

//     //         console.log(`Geocoding address: ${formattedAddress}`);

//     //         const response = await fetch(url, {
//     //             headers: {
//     //                 'User-Agent': 'RecyclingBinsApp/1.0'
//     //             }
//     //         });

//     //         const data = await response.json();

//     //         let coordinates = null;
//     //         if (data && data[0]) {
//     //             coordinates = {
//     //                 latitude: parseFloat(data[0].lat),
//     //                 longitude: parseFloat(data[0].lon)
//     //             };
//     //             // Save to cache
//     //             this.coordinatesCache.set(cacheKey, coordinates);
//     //             console.log(`✓ Found coordinates for ${formattedAddress}: ${JSON.stringify(coordinates)}`);
//     //         } else {
//     //             console.log(`✗ No coordinates found for ${formattedAddress}`);
//     //         }
//     //         return coordinates;
//     //     } catch (error) {
//     //         console.error(`Error getting coordinates for ${address}:`, error);
//     //         return null;
//     //     }
//     // }
//     async getCoordinates(address, city) {
//         const cacheKey = `${address}-${city}`;
        
//         if (this.coordinatesCache.has(cacheKey)) {
//             return this.coordinatesCache.get(cacheKey);
//         }

//         try {
//             // Try with full address
//             const formattedAddress = AddressHandler.formatForGeocoding(address, city);
//             let coordinates = await this.geocodeAddress(formattedAddress);

//             // If failed and address has a number, try without the number
//             if (!coordinates && /\d/.test(address)) {
//                 const streetOnly = AddressHandler.cleanAddress(address).replace(/\d+/, '').trim();
//                 const formattedStreetOnly = `${streetOnly}, ${city}, Israel`;
//                 coordinates = await this.geocodeAddress(formattedStreetOnly);
//             }

//             if (coordinates) {
//                 this.coordinatesCache.set(cacheKey, coordinates);
//                 console.log(`✓ Found coordinates for ${address}: ${JSON.stringify(coordinates)}`);
//             } else {
//                 console.log(`✗ No coordinates found for ${address}`);
//             }

//             return coordinates;
//         } catch (error) {
//             console.error(`Error geocoding ${address}:`, error);
//             return null;
//         }
//     }

//     async geocodeAddress(formattedAddress) {
//         await new Promise(resolve => setTimeout(resolve, this.retryDelay));

//         const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formattedAddress)}`;
//         const response = await fetch(url, {
//             headers: {
//                 'User-Agent': 'RecyclingBinsApp/1.0'
//             }
//         });

//         const data = await response.json();
        
//         if (data && data[0]) {
//             return {
//                 latitude: parseFloat(data[0].lat),
//                 longitude: parseFloat(data[0].lon)
//             };
//         }

//         return null;
//     }

//     async transformData(data) {
//         try {
//             const transformedData = [];
//             let successCount = 0;
//             let failureCount = 0;

//             for (let i = 0; i < data.length; i++) {
//                 const feature = data[i];
                
//                 // Clean up address
//                 // let address = feature.address.replace('ראשון לציון', '').trim();
//                 const { street, houseNumber } = AddressHandler.cleanAddress(feature.address);
//                 // let street = address;
//                 // let houseNumber = null;

//                 // Process different address patterns
//                 // if (address.includes('פינת')) {
//                 //     [street] = address.split('פינת').map(s => s.trim());
//                 // } else if (address.includes('\\')) {
//                 //     [street] = address.split('\\').map(s => s.trim());
//                 // } else if (address.includes('מול')) {
//                 //     [street, houseNumber] = address.split('מול').map(s => s.trim());
//                 //     if (houseNumber) {
//                 //         houseNumber = houseNumber.replace(/[^\d]/g, '');
//                 //     }
//                 // } else {
//                 //     const match = address.match(/^(.*?)\s*(\d+)?$/);
//                 //     if (match) {
//                 //         [, street, houseNumber] = match;
//                 //     }
//                 // }

//                 // Clean up street name
//                 // street = street
//                 //     .replace(/,.*$/, '')
//                 //     .replace(/\s+/g, ' ')
//                 //     .replace(/\s*\(.*?\)\s*/g, '')
//                 //     .replace(/\.$/, '')
//                 //     .trim();

//                 // Clean up bin type
//                 let binType = feature.binType;
//                 if (binType.endsWith('.aspx')) {
//                     binType = binType.replace('.aspx', '');
//                 }

//                 // Get coordinates
//                 // const fullAddress = houseNumber ? `${street} ${houseNumber}` : street;
//                 // const coordinates = await this.getCoordinates(fullAddress, this.cityName);

//                 // Get coordinates with better formatted address
//                 const coordinates = await this.getCoordinates(feature.address, this.cityName);

//                 if (coordinates) {
//                     successCount++;
//                 } else {
//                     failureCount++;
//                 }

//                 transformedData.push({
//                     id: `RL-${i}`,
//                     city: this.cityName,
//                     street: street,
//                     houseNumber: houseNumber?.toString() || null,
//                     containerTypes: [binType],
//                     location: coordinates || {
//                         longitude: null,
//                         latitude: null
//                     },
//                     binCount: 1,
//                     externalId: i,
//                     neighborhood: feature.neighborhood
//                 });

//                  // Log progress
//                  if ((i + 1) % 10 === 0) {
//                     console.log(`Processed ${i + 1}/${data.length} addresses`);
//                     console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
//                 }
//             }
//             console.log('\nFinal Statistics:');
//             console.log(`Total addresses processed: ${data.length}`);
//             console.log(`Successful geocoding: ${successCount}`);
//             console.log(`Failed geocoding: ${failureCount}`);
//             console.log(`Success rate: ${((successCount / data.length) * 100).toFixed(1)}%`);


//             return transformedData;
//         } catch (error) {
//             console.error(`Error transforming ${this.cityName} data:`, error.message);
//             throw error;
//         }
//     }

//     getSchemaFormat(transformedData) {
//         const cityData = {
//             city_name: this.cityName
//         };

//         return transformedData.map(item => ({
//             city: cityData,
//             street: {
//                 street_name: item.street,
//                 street_code: null
//             },
//             bins: item.containerTypes.map(binType => ({
//                 bin_type_name: binType,
//                 building_number: item.houseNumber,
//                 latitude: item.location?.latitude,
//                 longitude: item.location?.longitude,
//                 bin_count: item.binCount,
//                 status: 'active',
//                 unique_external_id: item.externalId
//             }))
//         }));
//     }

//     async process() {
//         try {
//             const rawData = await this.fetchData();
//             const transformedData = await this.transformData(rawData);
//             return { cityName: this.cityName, transformedData };
//         } catch (error) {
//             console.error(`Error processing ${this.cityName} data:`, error);
//             throw error;
//         }
//     }
// }

// export default RishonLezionDataFetcher;
// // async function main() {
// //     console.log('Starting to process data for Rishon Lezion');
    
// //     const fetcher = new RishonLezionDataFetcher();
    
// //     try {
// //         const result = await fetcher.process();
// //         console.log('Finished processing Rishon Lezion data');
// //     } catch (error) {
// //         console.error('Error processing data:', error);
// //     }
// // }

// // await main();

// // import axios from 'axios';
// // import * as cheerio from 'cheerio';
// // import { writeFile } from 'fs/promises';


// // const urls = [
// //     'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/PlasticRecycling.aspx',
// //     'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/TextileRecycling.aspx',
// //     'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/RecyclingElectronics.aspx',
// //     'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/boxesRecycling.aspx'
// // ];


// // async function fetchRecyclingLocations() {
// //     try {
// //         const allLocations = [];

// //         for(const url of urls) {
// //             const response = await axios.get(url, {
// //                 headers: {
// //                     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
// //                     'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
// //                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
// //                 }
// //             });
// //             const binType = url.split('/').pop().replace('Recycling.aspx', '');
        
        
// //             // Load the HTML into cheerio
// //             const $ = cheerio.load(response.data);

// //             $('.ms-listviewtable tbody tr').each((index, element) => {
// //                 if(binType === 'boxes') {
// //                     const address = $(element).find('td:nth-child(1)').text().trim();
// //                     const neighborhood  = $(element).find('td:nth-child(2)').text().trim();
// //                     const description = $(element).find('td:nth-child(3)').text().trim();
                    
// //                     allLocations.push({
// //                         address,
// //                         neighborhood ,
// //                         description,
// //                         binType
// //                     });
// //                 } else {
// //                     const neighborhood = $(element).find('td:nth-child(1)').text().trim();
// //                     const address = $(element).find('td:nth-child(2)').text().trim();
                    
// //                     allLocations.push({
// //                         address,
// //                         neighborhood ,
// //                         binType
// //                     });
// //                 }
// //             });
// //         }
// //         // Write all locations to a single file
// //         await writeFile('json/all_recycling_locations_rishon_lezion.json', JSON.stringify(allLocations, null, 2), 'utf8');
// //         return allLocations;
// //     } catch (error) {
// //         console.error('Error fetching recycling locations:', error.message);
// //         throw error;
// //     }
// // }
// // fetchRecyclingLocations()
// // .then(locations => {
// //     console.log('Recycling bin locations:', locations.length);
// //   })
// //   .catch(error => {
// //     console.error('Failed to fetch recycling bin locations:', error);
// //   });