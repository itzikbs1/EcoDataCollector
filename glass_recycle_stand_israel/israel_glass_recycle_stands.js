const axios = require('axios');
const fs = require('fs');

function parseAddress(addressString) {
  const defaultCountry = 'ישראל';
  let cleanAddress = addressString.replace(/, ישראל$/, '').trim();
  const components = cleanAddress.split(',').map(comp => comp.trim());
  const city = components.length > 1 ? components[components.length - 1] : 'לא ידוע';
  const streetAddress = components.slice(0, -1).join(', ');
  
  return {
    originalAddress: addressString,
    streetAddress: streetAddress,
    city: city,
    country: defaultCountry
  };
}

async function getGlassRecycleStands() {
  try {
    const axiosInstance = axios.create({
      baseURL: 'https://ags.govmap.gov.il',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://www.govmap.gov.il/',
        'Origin': 'https://www.govmap.gov.il'
      }
    });

    // Comprehensive set of coordinates covering all Israel
    const searchCoordinates = [
      // North Israel
      { x: 186026, y: 692504, name: 'Netanya' },
      { x: 209000, y: 752000, name: 'Kiryat Shmona' },
      { x: 203000, y: 745000, name: 'Safed' },
      { x: 198000, y: 738000, name: 'Karmiel' },
      { x: 215000, y: 733000, name: 'Tiberias' },
      { x: 191000, y: 733000, name: 'Acre' },
      { x: 198500, y: 725000, name: 'Nazareth' },
      { x: 185000, y: 725000, name: 'Haifa' },
      { x: 192000, y: 712000, name: 'Afula' },
      { x: 185000, y: 705000, name: 'Hadera' },

      // Central Israel
      { x: 182500, y: 672500, name: 'Herzliya' },
      { x: 187000, y: 675000, name: 'Hod HaSharon' },
      { x: 184500, y: 670000, name: 'Ramat HaSharon' },
      { x: 178500, y: 663900, name: 'Tel Aviv North' },
      { x: 178000, y: 658000, name: 'Tel Aviv South' },
      { x: 184000, y: 682000, name: 'Raanana' },
      { x: 190704, y: 689190, name: 'Kfar Saba' },
      { x: 185000, y: 666000, name: 'Ramat Gan' },
      { x: 181500, y: 660000, name: 'Holon' },
      { x: 176500, y: 657500, name: 'Bat Yam' },
      { x: 188000, y: 668000, name: 'Petah Tikva' },
      { x: 195000, y: 683000, name: 'Rosh HaAyin' },

      // Jerusalem Area
      { x: 220000, y: 633000, name: 'Jerusalem Center' },
      { x: 223000, y: 635000, name: 'Jerusalem East' },
      { x: 217000, y: 635000, name: 'Jerusalem West' },
      { x: 220000, y: 631000, name: 'Jerusalem South' },
      { x: 215000, y: 642000, name: 'Mevaseret Zion' },
      { x: 225000, y: 625000, name: 'Bethlehem' },

      // South Israel
      { x: 177500, y: 644000, name: 'Ashdod' },
      { x: 174500, y: 635000, name: 'Ashkelon' },
      { x: 194000, y: 627000, name: 'Kiryat Gat' },
      { x: 206000, y: 617000, name: 'Arad' },
      { x: 182000, y: 608000, name: 'Beer Sheva North' },
      { x: 179000, y: 605000, name: 'Beer Sheva South' },
      { x: 178500, y: 591000, name: 'Ofakim' },
      { x: 195000, y: 593000, name: 'Dimona' },
      { x: 178000, y: 569000, name: 'Mitzpe Ramon' },
      { x: 190000, y: 545000, name: 'Eilat' }
    ];

    // Generate grid points between major cities
    const gridSize = 5000; // 5km grid
    const bounds = {
      minX: 170000,
      maxX: 225000,
      minY: 540000,
      maxY: 755000
    };

    // Add grid points
    for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
      for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
        searchCoordinates.push({
          x: x,
          y: y,
          name: `Grid_${x}_${y}`
        });
      }
    }

    const searchStrategies = [
      {
        name: 'Standard Search',
        tolerance: 3000
      },
      {
        name: 'Extended Search',
        tolerance: 6000
      }
    ];

    const allStands = new Set(); // Use Set for automatic deduplication
    const processedLocations = new Set(); // Track processed coordinates

    // Execute searches
    for (const location of searchCoordinates) {
      // Skip if we've already processed this location (within a certain radius)
      const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
      if (processedLocations.has(locationKey)) {
        continue;
      }

      for (const strategy of searchStrategies) {
        try {
          const response = await axiosInstance.post('/Identify/IdentifyByXY', {
            x: location.x,
            y: location.y,
            mapTolerance: strategy.tolerance,
            IsPersonalSite: false,
            layers: [{
              LayerType: 0, 
              LayerName: "glass_recylce_stands", 
              LayerFilter: ""
            }]
          });

          // Skip if no data or no results
          if (!response.data?.data?.[0]?.Result) {
            continue;
          }

          // Process found stands
          response.data.data[0].Result.forEach(result => {
            if (result.centroid && result.tabs?.[0]?.fields) {
              const standInfo = {
                coordinates: {
                  x: result.centroid.x,
                  y: result.centroid.y
                },
                details: {}
              };

              result.tabs[0].fields.forEach(field => {
                standInfo.details[field.FieldName] = field.FieldValue;
              });

              if (standInfo.details['כתובת']) {
                standInfo.parsedAddress = parseAddress(standInfo.details['כתובת']);
              }

              allStands.add(JSON.stringify(standInfo));
            }
          });

          // Mark this location as processed
          processedLocations.add(locationKey);

          // If stands were found with current strategy, skip other strategies
          if (response.data.data[0].Result.length > 0) {
            break;
          }
        } catch (error) {
          console.error(`Error searching ${location.name} with ${strategy.name}:`, error.message);
          continue;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Convert Set back to array and parse JSON strings
    const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));

    // Save results if stands were found
    if (uniqueStands.length > 0) {
      // Save by region for easier analysis
      const standsByRegion = {
        north: uniqueStands.filter(stand => stand.coordinates.y >= 705000),
        central: uniqueStands.filter(stand => stand.coordinates.y >= 657000 && stand.coordinates.y < 705000),
        jerusalem: uniqueStands.filter(stand => stand.coordinates.x >= 215000 && stand.coordinates.y >= 625000 && stand.coordinates.y < 657000),
        south: uniqueStands.filter(stand => stand.coordinates.y < 625000)
      };

      fs.writeFileSync('json/glass_recycling_stands_all_israel.json', JSON.stringify(uniqueStands, null, 2));
      fs.writeFileSync('json/glass_recycling_stands_by_region.json', JSON.stringify(standsByRegion, null, 2));
      
      console.log(`Found and saved ${uniqueStands.length} unique recycling stands`);
      console.log('Stands by region:', {
        north: standsByRegion.north.length,
        central: standsByRegion.central.length,
        jerusalem: standsByRegion.jerusalem.length,
        south: standsByRegion.south.length
      });
    } else {
      console.log('No recycling stands found');
    }

    return uniqueStands;

  } catch (error) {
    console.error('Critical error:', error);
    throw error;
  }
}

// Run the function
getGlassRecycleStands()
  .then(stands => {
    if (stands.length > 0) {
      console.log('Successfully completed with stands found');
    } else {
      console.log('Completed, but no stands were found');
    }
  })
  .catch(error => {
    console.error('Failed to retrieve stands:', error);
  });