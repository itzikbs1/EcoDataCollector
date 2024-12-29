// No need to import fetch as it's built into Node.js now
const fs = require('fs/promises');

async function fetchRecyclingContainers() {
    try {
        // Define the API URL with query parameters
        const url = 'https://services3.arcgis.com/9qGhZGtb39XMVQyR/arcgis/rest/services/survey123_7b3771dc7e724a4c8fb5e022be2110de/FeatureServer/0/query?where=1=1&outFields=*&f=json';

        // Make the HTTP request using built-in fetch
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Transform the data to a simpler format
        // const simplifiedData = data.features.map(feature => ({
        //     id: feature.attributes.objectid,
        //     street: feature.attributes.field_3,
        //     houseNumber: feature.attributes.field_11,
        //     containerType: feature.attributes.field_10,
        //     date: feature.attributes.field_6,
        //     location: feature.geometry ? {
        //         longitude: feature.geometry.x,
        //         latitude: feature.geometry.y
        //     } : null
        // }));
            // Transform the data with date parsing
            const simplifiedData = data.features.map(feature => {
                // Convert the date if it exists
                const rawDate = feature.attributes.field_6;
                const dateObj = rawDate ? new Date(rawDate) : null;
                
                return {
                    id: feature.attributes.objectid,
                    street: feature.attributes.field_3,
                    houseNumber: feature.attributes.field_11,
                    containerType: feature.attributes.field_10,
                    rawDate: rawDate, // Keep the raw date value
                    date: dateObj ? dateObj.toISOString() : null, // Convert to ISO string format
                    location: feature.geometry ? {
                        longitude: feature.geometry.x,
                        latitude: feature.geometry.y
                    } : null
                };
            });

        // Save both raw and simplified data
        await Promise.all([
            fs.writeFile('recycling_containers_raw.json', JSON.stringify(data, null, 2), 'utf8'),
            fs.writeFile('recycling_containers_simplified.json', JSON.stringify(simplifiedData, null, 2), 'utf8')
        ]);
        
        console.log('Data has been saved to both raw and simplified JSON files');
        console.log(`Total containers found: ${simplifiedData.length}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the function
fetchRecyclingContainers();