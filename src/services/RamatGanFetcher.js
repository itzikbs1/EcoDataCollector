import BaseFetcher from '../core/BaseFetcher.js';

class RamatGanFetcher extends BaseFetcher {
    constructor() {
        super('Ramat Gan');
        this.apiUrl = 'https://rgsec.ramat-gan.muni.il/__svws__/SvService.asmx/GetCategoriesCoordinates';
    }

    async fetchData() {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    category: 'מתקני מיחזור'
                })
            });

            if(!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const rawData = await response.json();
            return rawData.d;
        } catch(error) {
            console.error(`Error fetching: ${this.cityName} data: `, error.message);
            throw error;
        }
    }

    validateFeature(item) {
        const errors = [];

        if (!item.Latitude || !item.Longtitude || 
            !this.validateCoordinates(item.Latitude, item.Longtitude)) {
            errors.push('Missing or invalid coordinates');
            return errors;
        }
        if (!item.Title) {
            errors.push('Missing container type');
        }

        return errors;
    }

    transformData(rawData) {
        try {
            return rawData
                .filter(item => {
                    const validationErrors = this.validateFeature(item);
                    if (validationErrors.length > 0) {
                        console.warn(`Skipping invalid item:`, validationErrors);
                        return false;
                    }
                    return true;
                })
                .map(item => {
                    const types = ['אריזות', 'נייר', 'אלקטרונית', 'טקסטיל', 'קרטונים'];
                    const cleandTitle = item.Title?.replace(/<[^>]*>/g, '')
                        .replace(/\s*\[[^\]]*\]/g, '')
                        .trim() || '';
                    
                    const matchedTypes = types.filter(type => cleandTitle.includes(type));

                    return {
                        id: item.Id,
                        city: this.cityName,
                        street: item.SteetName,
                        houseNumber: item.BuildingNumber?.toString(),
                        containerTypes: matchedTypes,
                        location: {
                            longitude: item.Longtitude,
                            latitude: item.Latitude
                        },
                        externalId: item.Id
                    };
                });
        } catch (error) {
            console.error(`Error transforming ${this.cityName} data:`, error.message);
            throw error;
        }
    }
}

export default RamatGanFetcher;