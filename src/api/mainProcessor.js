import HerzliyaDataFetcher from './cities/herzliyaFetcher.js';
import RamatGanDataFetcher from "./cities/ramatGanFetcher.js";
import TelAvivDataFetcher from './cities/telAvivFetcher.js';
import RishonLezionDataFetcher from './cities/rishonLezionFetcher.js';

import CityDataProcessor from './cityDataProcessor.js';

async function main() {
    
    const herzliyaFetcher = new HerzliyaDataFetcher();
    const ramatGanFetcher = new RamatGanDataFetcher();
    const telAvivFetcher = new TelAvivDataFetcher();
    const rishonLezionFetcher = new RishonLezionDataFetcher();
    const processor = new CityDataProcessor([
        // herzliyaFetcher,
        // ramatGanFetcher,
        // telAvivFetcher,
        rishonLezionFetcher,
    ]);

    await processor.proccesAll();
}

// // Run if this is the main module
// if (import.meta.url.endsWith(process.argv[1])) {
//     main().catch(console.error);
// }

await main();