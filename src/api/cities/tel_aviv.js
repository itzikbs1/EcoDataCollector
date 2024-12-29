import { writeFile } from 'fs/promises';


async function fetchRecyclingData() {
    try {
        // Using the identified service URL pattern from the HTML
        const url = 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/WM/IView2WM/MapServer/787/query';
        
        // Query parameters based on standard ArcGIS REST API
        const params = new URLSearchParams({
            where: '1=1', // Get all features
            outFields: '*', // Get all fields
            f: 'json', // Request JSON format
            returnGeometry: 'true'
        });

        // Make the request
        const response = await fetch(`${url}?${params}`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform and save simplified data if there are features
        if (data.features && data.features.length > 0) {
            const simplifiedData = data.features.map(feature => ({
                id: feature.attributes?.oid,
                street: {
                    name: feature.attributes?.shem_rechov,
                    code: feature.attributes?.k_rechov,
                    houseNumber: feature.attributes?.ms_bait
                },
                coordinates: {
                    wgs84: {  // Standard GPS coordinates
                        longitude: feature.attributes?.Lon,
                        latitude: feature.attributes?.Lat
                    },
                    itm: {    // Israeli Transverse Mercator
                        x: feature.attributes?.x_coord,
                        y: feature.attributes?.y_coord
                    }
                },
                container: {
                    type: feature.attributes?.t_sug,
                    count: feature.attributes?.ms_mechalim,
                    uniqueId: feature.attributes?.UniqueId
                },
                importDate: feature.attributes?.date_import
            }));
            // let types = new Set();
            // data.features.map(feature => {
            //     const type = feature.attributes?.t_sug;
            //     types.add(type)
            // });
            // console.log(`types: ${types}`);
            // console.log(types);
            
            await writeFile('json/recycling_containers_raw_tel_aviv.json', JSON.stringify(data, null, 2), 'utf8');
            await writeFile('json/recycling_containers_simplified_tel_aviv.json', JSON.stringify(simplifiedData, null, 2), 'utf8');
            
            console.log(`Successfully fetched ${simplifiedData.length} recycling container locations`);
        } else {
            console.log('No features found in the response');
        }

    } catch (error) {
        console.error('Error fetching recycling container data:', error.message);
    }
}

// Run the function
fetchRecyclingData();