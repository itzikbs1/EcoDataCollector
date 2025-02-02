// import HerzliyaDataFetcher from './cities/herzliyaFetcher.js';
// import RamatGanDataFetcher from "./cities/ramatGanFetcher.js";
// import TelAvivDataFetcher from './cities/telAvivFetcher.js';
// import JerusalemDataFetcher from './cities/jerusalemFetcher.js';
// import RishonLezionDataFetcher from './cities/rishonLezionFetcher.js';
// import GlassRecyclingFetcher from './glassRecyclingFetcher.js';
// import PetahTikvaDataFetcher from './cities/petahTikvaFetcher.js';


import HerzliyaDataFetcher from './HerzliyaFetcher.js';
import RamatGanDataFetcher from "./RamatGanFetcher.js";
import TelAvivDataFetcher from './TelAvivFetcher.js';
import JerusalemDataFetcher from './JerusalemFetcher.js';
import RishonLezionDataFetcher from './RishonLezionFetcher.js';
import PetahTikvaDataFetcher from './PetahTikvaFetcher.js';
import GlassRecyclingFetcher from './glassRecyclingFetcher.js';


import CityDataProcessor from '../scripts/cityDataProcessor.js';

async function main() {
    
    const herzliyaFetcher = new HerzliyaDataFetcher();
    const ramatGanFetcher = new RamatGanDataFetcher();
    const telAvivFetcher = new TelAvivDataFetcher();
    const rishonLezionFetcher = new RishonLezionDataFetcher();
    const jerusalemFetcher = new JerusalemDataFetcher();
    const petahTikvaFetcher = new PetahTikvaDataFetcher();

    const glassRecyclingFetcher = new GlassRecyclingFetcher();

    const processor = new CityDataProcessor([
        herzliyaFetcher,
        ramatGanFetcher,
        telAvivFetcher,
        rishonLezionFetcher,
        jerusalemFetcher,
        petahTikvaFetcher,
        glassRecyclingFetcher
    ]);

    await processor.processAll();
}

await main();