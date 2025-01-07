// src/services/TelAvivFetcher.js
import BaseFetcher from '../core/BaseFetcher.js';

class TelAvivFetcher extends BaseFetcher {
    constructor() {
        super('Tel Aviv');
        this.apiUrl = 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/WM/IView2WM/MapServer/787/query';
        this.params = new URLSearchParams({
            where: '1=1',
            outFields: '*',
            f: 'json',
            returnGeometry: 'true'
        });
    }

    async fetchData() {
        try {
            const response = await fetch(`${this.apiUrl}?${this.params}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch(error) {
            console.error(`Error fetching: ${this.cityName} data: `, error.message);
            throw error;
        }
    }

    transformData(data) {
        try {
            if (!data.features || !Array.isArray(data.features)) {
                throw new Error('Invalid input data structure');
            }
            console.log(`Total features before filtering: ${data.features.length}`);  // Add this line

            const filteredData = data.features
                .filter(feature => {
                    const latitude = feature.attributes?.Lat;
                    const longitude = feature.attributes?.Lon;
                    const isValid = this.validateCoordinates(latitude, longitude);
                    if (!isValid) {
                        console.log(`Filtered out bin with invalid coordinates: Lat=${latitude}, Lon=${longitude}`);
                    }
                    return isValid;
                });
                console.log(`Total features after filtering: ${filteredData.length}`);
                return filteredData.map(feature => {
                    // Process the container type (t_sug)
                    let containerType = feature.attributes?.t_sug || '';
                    
                    // Remove text in parentheses
                    containerType = containerType.replace(/\s*\([^)]*\)/g, '').trim();
                    
                    // If there's a slash, take the second part
                    if (containerType.includes('/')) {
                        containerType = containerType.split('/')[1].trim();
                    }

                    return {
                        id: feature.attributes?.UniqueId,
                        city: this.cityName,
                        street: feature.attributes?.shem_rechov,
                        houseNumber: feature.attributes?.ms_bait?.toString(),
                        containerTypes: [containerType],
                        location: {
                            longitude: feature.attributes?.Lon,
                            latitude: feature.attributes?.Lat
                        },
                        binCount: feature.attributes?.ms_mechalim || 1,
                        externalId: feature.attributes?.oid
                    };
                });
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
}

export default TelAvivFetcher;