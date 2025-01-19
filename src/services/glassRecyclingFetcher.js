import BaseFetcher from '../core/BaseFetcher.js';
import axios from 'axios';
import proj4 from 'proj4';

class GlassRecyclingFetcher extends BaseFetcher {
    constructor() {
        super('');
        this.initializeProjection();
        this.initializeAxios();
        this.setupSearchParameters();
        this.retryDelay = 2000;
        this.maxRetries = 3;
        this.processedResults = new Set();
    }

    initializeProjection() {
        proj4.defs("ITM", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");
    }

    initializeAxios() {
        this.axiosInstance = axios.create({
            baseURL: 'https://ags.govmap.gov.il',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Referer': 'https://www.govmap.gov.il/',
                'Origin': 'https://www.govmap.gov.il',
            },
            timeout: 15000,
        });
    }

    setupSearchParameters() {
        this.searchCoordinates = this.getSearchCoordinates();
    }

    getSearchCoordinates() {
        const baseCoordinates = [
            { x: 186026, y: 692504, name: 'נתניה' },
            { x: 209000, y: 752000, name: 'קריית שמונה' },
            { x: 203000, y: 745000, name: 'צפת' },
            { x: 198000, y: 738000, name: 'כרמיאל' },
            { x: 215000, y: 733000, name: 'טבריה' },
            { x: 191000, y: 733000, name: 'עכו' },
            { x: 198500, y: 725000, name: 'נצרת' },
            { x: 185000, y: 725000, name: 'חיפה' },
            { x: 192000, y: 712000, name: 'עפולה' },
            { x: 185000, y: 705000, name: 'חדרה' },
            { x: 182500, y: 672500, name: 'הרצליה' },
            { x: 187000, y: 675000, name: 'הוד השרון' },
            { x: 184500, y: 670000, name: 'רמת השרון' },
            { x: 178500, y: 663900, name: 'תל אביב צפון' },
            { x: 178000, y: 658000, name: 'תל אביב דרום' },
            { x: 184000, y: 682000, name: 'רעננה' },
            { x: 190704, y: 689190, name: 'כפר סבא' },
            { x: 185000, y: 666000, name: 'רמת גן' },
            { x: 181500, y: 660000, name: 'חולון' },
            { x: 176500, y: 657500, name: 'בת ים' },
            { x: 188000, y: 668000, name: 'פתח תקווה' },
            { x: 195000, y: 683000, name: 'ראש העין' },
            { x: 220000, y: 633000, name: 'ירושלים מרכז' },
            { x: 223000, y: 635000, name: 'ירושלים מזרח' },
            { x: 217000, y: 635000, name: 'ירושלים מערב' },
            { x: 220000, y: 631000, name: 'ירושלים דרום' },
            { x: 215000, y: 642000, name: 'מבשרת ציון' },
            { x: 225000, y: 625000, name: 'בית לחם' },
            { x: 177500, y: 644000, name: 'אשדוד' },
            { x: 174500, y: 635000, name: 'אשקלון' },
            { x: 194000, y: 627000, name: 'קריית גת' },
            { x: 206000, y: 617000, name: 'ערד' },
            { x: 182000, y: 608000, name: 'באר שבע צפון' },
            { x: 179000, y: 605000, name: 'באר שבע דרום' },
            { x: 178500, y: 591000, name: 'אופקים' },
            { x: 195000, y: 593000, name: 'דימונה' },
            { x: 178000, y: 569000, name: 'מצפה רמון' },
            { x: 190000, y: 545000, name: 'אילת' }
        ];

        const gridCoordinates = this.generateGridPoints();
        return [...baseCoordinates, ...gridCoordinates];
    }

    generateGridPoints() {
        const gridPoints = [];
        const gridSize = 7500; // Reduced grid size for better coverage
        const bounds = {
            minX: 150000,
            maxX: 250000,
            minY: 450000,
            maxY: 780000
        };

        for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
            for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
                gridPoints.push({
                    x, y,
                    name: `Grid_${x}_${y}`
                });
            }
        }
        return gridPoints;
    }

    parseAddress(addressString) {
        if (!addressString) return { streetAddress: 'לא ידוע', houseNumber: 'לא ידוע', city: 'לא ידוע' };
        
        const cleanAddress = addressString.replace(/, ישראל$/, '').trim();
        const components = cleanAddress.split(',').map(comp => comp.trim());
        const city = components.length > 1 ? components[components.length - 1] : 'לא ידוע';
        
        const fullStreetAddress = components[0];
        const streetMatch = fullStreetAddress.match(/(.*?)\s*(\d+)\s*$/);
        
        return {
            streetAddress: streetMatch ? streetMatch[1].trim() : fullStreetAddress || 'לא ידוע',
            houseNumber: streetMatch ? streetMatch[2] : 'לא ידוע',
            city
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    validateCoordinates(latitude, longitude) {
        return latitude >= 29.0 && latitude <= 34.0 && 
               longitude >= 34.0 && longitude <= 36.0;
    }

    async fetchLocationDataWithRetry(locations, retryCount = 0) {
        try {
            const promises = locations.map(location => 
                this.axiosInstance.post('/Identify/IdentifyByXY', {
                    x: location.x,
                    y: location.y,
                    mapTolerance: 10000,
                    IsPersonalSite: false,
                    layers: [{
                        LayerType: 0,
                        LayerName: "glass_recylce_stands",
                        LayerFilter: ""
                    }]
                })
            );

            const responses = await Promise.allSettled(promises);
            return responses.map((response, index) => ({
                location: locations[index],
                data: response.status === 'fulfilled' ? response.value.data?.data?.[0]?.Result || [] : []
            }));
        } catch (error) {
            if (retryCount < this.maxRetries && 
                (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED' || error.response?.status === 429)) {
                console.log(`Retrying batch (attempt ${retryCount + 1} of ${this.maxRetries})...`);
                await this.sleep(this.retryDelay * (retryCount + 1));
                return this.fetchLocationDataWithRetry(locations, retryCount + 1);
            }
            console.error('Error in batch fetch:', error.message);
            return locations.map(location => ({
                location,
                data: []
            }));
        }
    }

    transformStandData(result) {
        if (!result.centroid || !result.tabs?.[0]?.fields) return null;

        const [longitude, latitude] = proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]);
        
        if (!this.validateCoordinates(latitude, longitude)) {
            return null;
        }

        let address = '';
        let rawDate = '';
        result.tabs[0].fields.forEach(field => {
            if (field.FieldName === 'כתובת') address = field.FieldValue;
            if (field.FieldName === 'תאריך עדכון') rawDate = field.FieldValue;
        });

        const parsedAddress = this.parseAddress(address);

        return {
            street: parsedAddress.streetAddress,
            houseNumber: parsedAddress.houseNumber,
            containerTypes: ['Glass'],
            location: { latitude, longitude },
            city: parsedAddress.city
        };
    }

    async fetchData() {
        const allStands = new Set();
        const processedLocations = new Set();
        const batchSize = 5;

        const filteredCoordinates = this.searchCoordinates.filter(coord => {
            const locationKey = `${Math.round(coord.x/1000)},${Math.round(coord.y/1000)}`;
            if (processedLocations.has(locationKey)) return false;
            processedLocations.add(locationKey);
            return true;
        });

        for (let i = 0; i < filteredCoordinates.length; i += batchSize) {
            const batch = filteredCoordinates.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(filteredCoordinates.length/batchSize)}`);

            const batchResults = await this.fetchLocationDataWithRetry(batch);
            
            batchResults.forEach(({data}) => {
                data.forEach(result => {
                    const standData = this.transformStandData(result);
                    if (standData) {
                        const standKey = `${standData.location.latitude},${standData.location.longitude}`;
                        if (!this.processedResults.has(standKey)) {
                            allStands.add(JSON.stringify(standData));
                            this.processedResults.add(standKey);
                        }
                    }
                });
            });

            await this.sleep(2000);
        }

        const finalResults = Array.from(allStands).map(standStr => JSON.parse(standStr));
        console.log(`Total unique stands found: ${finalResults.length}`);
        console.log(`Total processed locations: ${processedLocations.size}`);
        console.log(`Total search coordinates: ${filteredCoordinates.length}`);
        return finalResults;
    }

    async transformData(rawData) {
        return rawData.map(item => ({
            street: item.street,
            houseNumber: item.houseNumber,
            containerTypes: item.containerTypes,
            location: item.location,
            city: item.city
        }));
    }
}

export default GlassRecyclingFetcher;