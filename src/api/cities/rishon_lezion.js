import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFile } from 'fs/promises';


const urls = [
    'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/PlasticRecycling.aspx',
    'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/TextileRecycling.aspx',
    'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/RecyclingElectronics.aspx',
    'https://www.rishonlezion.muni.il/Residents/Environment/SanitationRecycling/Pages/boxesRecycling.aspx'
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
            const binType = url.split('/').pop().replace('Recycling.aspx', '');
        
        
            // Load the HTML into cheerio
            const $ = cheerio.load(response.data);

            $('.ms-listviewtable tbody tr').each((index, element) => {
                if(binType === 'boxes') {
                    const address = $(element).find('td:nth-child(1)').text().trim();
                    const neighborhood  = $(element).find('td:nth-child(2)').text().trim();
                    const description = $(element).find('td:nth-child(3)').text().trim();
                    
                    allLocations.push({
                        address,
                        neighborhood ,
                        description,
                        binType
                    });
                } else {
                    const neighborhood = $(element).find('td:nth-child(1)').text().trim();
                    const address = $(element).find('td:nth-child(2)').text().trim();
                    
                    allLocations.push({
                        address,
                        neighborhood ,
                        binType
                    });
                }
            });
        }
        // Write all locations to a single file
        await writeFile('json/all_recycling_locations_rishon_lezion.json', JSON.stringify(allLocations, null, 2), 'utf8');
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