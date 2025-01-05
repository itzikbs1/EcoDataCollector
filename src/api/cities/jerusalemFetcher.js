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
            // return locations.map(location => {
            //     const [street, city] = String(location.Address).split(',');
            //      // Split street part and get the last item as the number
            //     const streetParts = street.trim().split(' ');
            //     const houseNumber = streetParts.pop(); // Gets the last element (number)
            //     const streetName = streetParts.join(' '); // Joins the remaining parts (street name)
            //     if (once) {
            //         console.log('streetName: ', streetName);
            //         console.log('houseNumber: ', houseNumber);
            //         once = false;
            //     }
            //     return {
            //         id: location.Id,
            //         city: this.cityName,
            //         street: streetName,
            //         houseNumber: houseNumber,
            //         containerTypes: location.CatName,
            //         location: {
            //             longitude: location.Long,
            //             latitude: location.Lat
            //         },
            //         externalId: location.Id    
            //     }
            // });
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
    async saveToJson(data, filename = 'recycling_bins.json') {
        try {
            await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
            console.log(`✓ Data saved to ${filename}`);
        } catch (error) {
            console.error(`× Error saving to JSON: ${error.message}`);
            throw error;
        }
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
// async function main() {
//     const fetcher = new JerusalemDataFetcher();
//     const data = await fetcher.fetchData();
//     const locations = fetcher.transformData(data);
//     const schema = fetcher.getSchemaFormat(locations);
//     await fetcher.saveToJson(schema);
// }
// await main()

export default JerusalemDataFetcher;




// import fs from 'fs/promises';


// class RecyclingBinScraper {
//     constructor() {
//         this.baseUrl = 'https://www.jerusalem.muni.il/he/residents/clean-city/improvingcity/recycling-map/';
//         this.data = [];
//     }

//     async initialize() {
//         this.browser = await puppeteer.launch({
//             headless: false, // Set to true in production
//             args: [
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--disable-web-security',
//                 '--disable-features=IsolateOrigins'
//             ]
//         });

//         this.page = await this.browser.newPage();

//         // Set a more realistic user agent
//         await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

//         // Set extra headers to mimic a real browser
//         await this.page.setExtraHTTPHeaders({
//             'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
//             'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
//             'Connection': 'keep-alive',
//             'Upgrade-Insecure-Requests': '1'
//         });

//         // Enable request interception
//         await this.page.setRequestInterception(true);

//         // Monitor network requests
//         this.page.on('request', request => {
//             if (request.url().includes('GetMapNew')) {
//                 console.log('Found map data request:', request.url());
//                 this.mapDataUrl = request.url();
//             }
//             request.continue();
//         });

//         // Monitor network responses
//         this.page.on('response', async response => {
//             if (response.url().includes('GetMapNew')) {
//                 try {
//                     const data = await response.json();
//                     this.mapData = data;
//                     console.log('Captured map data:', data.length, 'locations');
//                 } catch (e) {
//                     console.log('Error parsing response:', e);
//                 }
//             }
//         });
//     }

//     async scrapeData() {
//         try {
//             console.log('Accessing webpage...');
//             await this.page.goto(this.baseUrl, {
//                 waitUntil: 'networkidle0',
//                 timeout: 60000
//             });

//             // Wait for the map to load
//             await this.page.waitForFunction(() => {
//                 return window.map !== undefined;
//             }, { timeout: 30000 });

//             // Extract the data that was loaded into this.mapData
//             if (this.mapData) {
//                 this.data = this.mapData.map(location => ({
//                     id: location.Id,
//                     name: location.Name,
//                     address: location.Address,
//                     category: location.Cat,
//                     categoryName: location.CatName,
//                     latitude: location.Lat,
//                     longitude: location.Long,
//                     link: location.Link || ''
//                 }));
//             }

//             console.log(`Extracted ${this.data.length} recycling bin locations`);
//             return this.data;

//         } catch (error) {
//             console.error('Error during scraping:', error);
//             throw error;
//         }
//     }

//     async saveToJson(filename = 'recycling_bins.json') {
//         try {
//             if (this.data.length > 0) {
//                 await fs.writeFile(
//                     filename,
//                     JSON.stringify(this.data, null, 2),
//                     'utf8'
//                 );
//                 console.log(`Data saved to ${filename}`);
//             } else {
//                 console.log('No data to save');
//             }
//         } catch (error) {
//             console.error('Error saving to JSON:', error);
//             throw error;
//         }
//     }
//     async close() {
//         if (this.browser) {
//             await this.browser.close();
//         }
//     }
// }

// async function main() {
//     const scraper = new RecyclingBinScraper();
    
//     try {
//         await scraper.initialize();
//         const data = await scraper.scrapeData();
//         await scraper.saveToJson();
//         // await scraper.saveToCsv();
//         console.log('Scraping completed successfully');
//     } catch (error) {
//         console.error('An error occurred:', error);
//     } finally {
//         await scraper.close();
//     }
// }

// main();