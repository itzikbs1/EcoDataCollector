import fs from 'fs';
import path from 'path';

async function main() {
    // Load the JSON data from the provided file
    const filePath = './schemaformated.json';
    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

    // Define a function to create a unique identifier for each entry
    const generateIdentifier = (entry) => [
    entry.city_name,
    entry.street_name,
    entry.building_number,
    entry.bin_type_name,
    entry.location.latitude,
    entry.location.longitude,
    ].join('|'); // Join with a delimiter to create a unique identifier string

    // Create a list of identifiers
    const identifiers = data.map(generateIdentifier);

    // Count duplicates
    const duplicates = identifiers.reduce((counter, identifier) => {
    counter[identifier] = (counter[identifier] || 0) + 1;
    return counter;
    }, {});

    // Find only duplicates (more than 1 occurrence)
    const duplicatesFiltered = Object.entries(duplicates).reduce((filtered, [key, value]) => {
    if (value > 1) filtered[key] = value;
    return filtered;
    }, {});
    const totalDuplicates = Object.values(duplicatesFiltered)
    .reduce((sum, count) => sum + (count - 1), 0);
  
  console.log({ duplicatesFiltered, lenDuplicates: Object.keys(duplicatesFiltered).length, totalDuplicates });
    
}
main();
