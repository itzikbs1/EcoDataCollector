// import HerzliyaDataFetcher from './cities/herzliyaFetcher.js';
// import RamatGanDataFetcher from "./cities/ramatGanFetcher.js";
// import TelAvivDataFetcher from './cities/telAvivFetcher.js';
// import JerusalemDataFetcher from './cities/jerusalemFetcher.js';
// import RishonLezionDataFetcher from './cities/rishonLezionFetcher.js';
// import GlassRecyclingFetcher from './glassRecyclingFetcher.js';
// import PetahTikvaDataFetcher from './cities/petahTikvaFetcher.js';


import HerzliyaDataFetcher from './services/HerzliyaFetcher.js';
import RamatGanDataFetcher from "./services/RamatGanFetcher.js";
import TelAvivDataFetcher from './services/TelAvivFetcher.js';
import JerusalemDataFetcher from './services/JerusalemFetcher.js';
import RishonLezionDataFetcher from './services/RishonLezionFetcher.js';
import PetahTikvaDataFetcher from './services/PetahTikvaFetcher.js';
import GlassRecyclingFetcher from './services/glassRecyclingFetcher.js';


import CityDataProcessor from './cityDataProcessor.js';

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

// // Run if this is the main module
// if (import.meta.url.endsWith(process.argv[1])) {
//     main().catch(console.error);
// }

await main();