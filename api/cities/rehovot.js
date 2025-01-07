import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFile } from 'fs/promises';

const urls = [
    'https://www.rehovot.muni.il/314/', 
    'https://www.rehovot.muni.il/863/',
    'https://www.rehovot.muni.il/317/'
];

async function fetchRecyclingLocations() {
    try {
        const allLocations = [];

        for(const url of urls) {
            const response = await axios.get(url, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const number = url.replace(/\/$/, '').split('/').pop();
            console.log(`number: ${number}`);
            
            let binType = "";
            if (number === '314')
                binType = "פחים כתומים";
            else if(number === '863') {
                binType = "פחים כחולים";
            } else if(number === '317') {
                binType = "קרטונים";
            }
            
            const $ = cheerio.load(response.data);
            console.log(`Processing bin type: ${binType}`);

            if(binType === "פחים כתומים") {                
                $('.table.table-bordered tbody tr').each((index, element) => {
                    const address = $(element).find('td:nth-child(1)').text().trim();
                    const volume = $(element).find('td:nth-child(2)').text().trim();
                    
                    if(address) {
                        allLocations.push({
                            address,
                            volume,
                            binType
                        });
                    }
                });
            } else if(binType === "פחים כחולים") {
                $('table tbody tr').each((index, element) => {
                    if(index > 0) { // Skip header row
                        const address = $(element).find('td').text().trim();
                        
                        if(address) {
                            allLocations.push({
                                address,
                                binType
                            });
                        }
                    }
                });
            } else if(binType === "קרטונים") {
                $('table tbody tr').each((index, element) => {
                    if(index > 0) { // Skip header row
                        const address = $(element).find('td:nth-child(1) p').text().trim();
                        const streetNumber = $(element).find('td:nth-child(2) p').text().trim();

                        if(address) {
                            allLocations.push({
                                address,
                                streetNumber: streetNumber || '-',
                                binType
                            });
                        }
                    }
                });
            }
            
            console.log(`Found ${allLocations.length} locations for ${binType}`);
        }

        // Create directory if it doesn't exist
        // const fs = require('fs').promises;
        // await fs.mkdir('json', { recursive: true }).catch(() => {});
        
        // Write all locations to a single file
        await writeFile('json/all_recycling_locations_rehovot.json', JSON.stringify(allLocations, null, 2), 'utf8');
        console.log(`Total locations saved: ${allLocations.length}`);
        return allLocations;
    } catch (error) {
        console.error('Error fetching recycling locations:', error.message);
        throw error;
    }
}

fetchRecyclingLocations()
    .then(locations => {
        console.log('Recycling bin locations:', locations.length);
    })
    .catch(error => {
        console.error('Failed to fetch recycling bin locations:', error);
    });
// import axios from 'axios';
// import * as cheerio from 'cheerio';
// import { writeFile } from 'fs/promises';


// const urls = [
//     'https://www.rehovot.muni.il/314/', //Plastic packaging, metal packaging, beverage cartons and plastic bags.
//     'https://www.rehovot.muni.il/863/', //For recycling paper, newspapers and thin cardboard
//     'https://www.rehovot.muni.il/317/' //For recycling cartons
//     ];


// async function fetchRecyclingLocations() {
//     try {
//         const allLocations = [];

//         for(const url of urls) {
//             const response = await axios.get(url, {
//                 headers: {
//                     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//                     'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
//                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//                 }
//             });
//             const number = url.replace(/\/$/, '').split('/').pop();
//             console.log(`number: ${number}`);
            
//             let binType = "";
//             if (number === '314')
//                 binType = "פחים כתומים";
//             else if(number === '863') {
//                 binType = "פחים כחולים";
//             } else if(number === '317') {
//                 binType = "קרטונים";
//             }
//             // Load the HTML into cheerio
//             const $ = cheerio.load(response.data);

//             if(binType === "פחים כתומים") {                
//                 $('.table.table-bordered tbody tr').each((index, element) => {
//                     const address = $(element).find('td:nth-child(1)').text().trim();
//                     const volume = $(element).find('td:nth-child(2)').text().trim();
                    
//                     allLocations.push({
//                         address,
//                         volume,
//                         binType
//                     });
//                 })
//             } else if(binType === "פחים כחולים") {
//                 $('.table.table-responsive tbody tr').each((index, element) => {
//                         const address = $(element).find('td').first().text().trim();
                        
//                         allLocations.push({
//                             address,
//                             binType
//                         });
//                 });
//             } else if(binType === "קרטונים") {
//                 $('.table.table-responsive tbody tr').each((index, element) => {
//                     const address = $(element).find('td:nth-child(1) p').text().trim();
//                     const streetNumber = $(element).find('td:nth-child(2) p').text().trim();

//                     allLocations.push({
//                         address,
//                         streetNumber,
//                         binType
//                     });
//                 });
//             }
//         }
//         // Write all locations to a single file
//         await writeFile('json/all_recycling_locations_rehovot.json', JSON.stringify(allLocations, null, 2), 'utf8');
//         return allLocations;
//     } catch (error) {
//         console.error('Error fetching recycling locations:', error.message);
//         throw error;
//     }
// }
// fetchRecyclingLocations()
// .then(locations => {
//     console.log('Recycling bin locations:', locations.length);
//   })
//   .catch(error => {
//     console.error('Failed to fetch recycling bin locations:', error);
//   });