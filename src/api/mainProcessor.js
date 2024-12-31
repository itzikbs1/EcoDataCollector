import HerzliyaDataFetcher from './cities/herzliyaFetcher.js';
import RamatGanDataFetcher from "./cities/ramatGanFetcher.js";
import CityDataProcessor from './cityDataProcessor.js';


async function main() {
    
    const herzliyaFetcher = new HerzliyaDataFetcher();
    const ramatGanFetcher = new RamatGanDataFetcher();

    const processor = new CityDataProcessor([
        herzliyaFetcher,
        ramatGanFetcher
    ]);

    await processor.proccesAll();
}

// // Run if this is the main module
// if (import.meta.url.endsWith(process.argv[1])) {
//     main().catch(console.error);
// }

await main();