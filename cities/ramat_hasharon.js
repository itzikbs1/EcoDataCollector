import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFile } from 'fs/promises';

async function fetchRecyclingLocations() {
    try {
        // Fetch the webpage
        // this url: https://ramat-hasharon.muni.il/מיקומי-מתקני-נייר-גזם-נייר/
        const response = await axios.get('https://ramat-hasharon.muni.il/%D7%9E%D7%99%D7%A7%D7%95%D7%9E%D7%99-%D7%9E%D7%AA%D7%A7%D7%A0%D7%99-%D7%A0%D7%99%D7%99%D7%A8-%D7%92%D7%96%D7%9D-%D7%A0%D7%99%D7%99%D7%A8/', {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'he,en-US;q=0.7,en;q=0.3',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Load the HTML into cheerio
        const $ = cheerio.load(response.data);

        // Find the table and extract data
        const locations = [];
        $('#tablepress-211 tbody tr').each((index, element) => {
            const street = $(element).find('td:nth-child(1)').text().trim();
            const binType = $(element).find('td:nth-child(2)').text().trim();
            
            locations.push({
                street,
                binType,
            });
        });
        await writeFile('json/recycling_locations_ramat_hasharon.json', JSON.stringify(locations, null, 2), 'utf8');
        return locations;
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