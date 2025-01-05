// const fs = require('fs').promises;
import fs from 'fs/promises';
async function fetchRecyclingBins() {
    try {
        const response = await fetch('https://www.jerusalem.muni.il/Umbraco/Surface/Int/GetMapNew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                culture: 'he-IL',
                ms: 168571
            })
        });

        const data = await response.json();
        
        // Process and save as JSON
        const processedData = data.map(location => ({
            id: location.Id,
            name: location.Name,
            address: location.Address,
            category: location.Cat,
            categoryName: location.CatName,
            latitude: location.Lat,
            longitude: location.Long,
            link: location.Link || ''
        }));

        await fs.writeFile('recycling_bins.json', JSON.stringify(processedData, null, 2));
        console.log(`Saved ${processedData.length} recycling bin locations`);

    } catch (error) {
        console.error('Error:', error);
    }
}

fetchRecyclingBins();