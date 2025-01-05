import axios from 'axios';
import * as fs from 'fs';
import proj4 from 'proj4';

// Define the ITM projection
proj4.defs("ITM", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");

function parseAddress(addressString) {
  const defaultCountry = 'ישראל';
  let cleanAddress = addressString.replace(/, ישראל$/, '').trim();
  const components = cleanAddress.split(',').map(comp => comp.trim());
  const city = components.length > 1 ? components[components.length - 1] : 'לא ידוע';
  
  const fullStreetAddress = components[0];
  const streetMatch = fullStreetAddress.match(/(.*?)\s*(\d+)\s*$/);
  
  let streetAddress = 'לא ידוע';
  let houseNumber = 'לא ידוע';
  
  if (streetMatch) {
    streetAddress = streetMatch[1].trim();
    houseNumber = streetMatch[2];
  }

  return {
    streetAddress,
    houseNumber,
    city
  };
}

function getSchemaFormat(transformedData, cityName) {
  const cityData = {
    city_name: cityName
  };

  return transformedData.map(item => {
    // Handle street data
    const streetData = {
      street_name: item.street,
      street_code: null // We can add this if needed in the future
    };

    // Handle bin data - note that we'll need one entry per bin type
    const binEntries = item.containerTypes.map(binType => ({
      bin_type_name: binType,
      building_number: item.houseNumber,
      latitude: item.location?.latitude,
      longitude: item.location?.longitude,
      bin_count: 1,
      status: 'active',
      unique_external_id: item.externalId
    }));

    return {
      city: cityData,
      street: streetData,
      bins: binEntries
    };
  });
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
    const allStands = new Set();
    const processedLocations = new Set();
    let idCounter = 1;

    // Execute searches
    for (const location of searchCoordinates) {
      const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
      if (processedLocations.has(locationKey)) continue;

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

          if (!response.data?.data?.[0]?.Result) continue;

          response.data.data[0].Result.forEach(result => {
            if (result.centroid && result.tabs?.[0]?.fields) {
              const [longitude, latitude] = proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]);
              
              let address = '';
              let rawDate = '';
              result.tabs[0].fields.forEach(field => {
                if (field.FieldName === 'כתובת') {
                  address = field.FieldValue;
                }
                if (field.FieldName === 'תאריך עדכון') {
                    rawDate = field.FieldValue;
                  }
              });

              const parsedAddress = parseAddress(address);
              const dateObj = rawDate ? new Date(rawDate) : null;

              const standInfo = {
                id: result.objectId,
                city: parsedAddress.city,
                street: parsedAddress.streetAddress,
                houseNumber: parsedAddress.houseNumber,
                containerTypes: ['glass'],
                rawDate: rawDate || null,
                date: dateObj ? dateObj.toISOString() : null,
                location: {
                  longitude,
                  latitude
                },
                externalId: result.objectId
              };

              allStands.add(JSON.stringify(standInfo));
            }
          });

          processedLocations.add(locationKey);
          if (response.data.data[0].Result.length > 0) break;
        } catch (error) {
          console.error(`Error searching ${location.name} with ${strategy.name}:`, error.message);
          continue;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
    
    // Create schema formatted data
    const standsByCity = {};
    uniqueStands.forEach(stand => {
      if (!standsByCity[stand.city]) {
        standsByCity[stand.city] = [];
      }
      standsByCity[stand.city].push(stand);
    });

    // Process each city separately
    const schemaFormattedData = {};
    for (const [cityName, cityStands] of Object.entries(standsByCity)) {
      schemaFormattedData[cityName] = getSchemaFormat(cityStands, cityName);
    }

    // Ensure the json directory exists
    if (!fs.existsSync('json')) {
      fs.mkdirSync('json');
    }
    
    // Save both formats
    fs.writeFileSync('json/glass_recycling_stands_transformed.json', 
      JSON.stringify(uniqueStands, null, 2));
    fs.writeFileSync('json/glass_recycling_stands_schema.json', 
      JSON.stringify(schemaFormattedData, null, 2));
    
    console.log(`Found and saved ${uniqueStands.length} unique recycling stands`);
    console.log(`Data saved in both original and schema formats`);
    
    return {
      originalFormat: uniqueStands,
      schemaFormat: schemaFormattedData
    };

  } catch (error) {
    console.error('Critical error:', error);
    throw error;
  }
}

// Run the function
getGlassRecycleStands()
  .then(result => {
    if (result.originalFormat.length > 0) {
      console.log('Successfully completed with stands found');
      console.log(`Processed ${Object.keys(result.schemaFormat).length} cities`);
    } else {
      console.log('Completed, but no stands were found');
    }
  })
  .catch(error => {
    console.error('Failed to retrieve stands:', error);
  });
// import axios from 'axios';
// import * as fs from 'fs';
// import proj4 from 'proj4';

// // Define the ITM projection
// proj4.defs("ITM", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");

// function parseAddress(addressString) {
//   const defaultCountry = 'ישראל';
//   let cleanAddress = addressString.replace(/, ישראל$/, '').trim();
//   const components = cleanAddress.split(',').map(comp => comp.trim());
//   const city = components.length > 1 ? components[components.length - 1] : 'לא ידוע';
  
//   const fullStreetAddress = components[0];
//   const streetMatch = fullStreetAddress.match(/(.*?)\s*(\d+)\s*$/);
  
//   let streetAddress = 'לא ידוע';
//   let houseNumber = 'לא ידוע';
  
//   if (streetMatch) {
//     streetAddress = streetMatch[1].trim();
//     houseNumber = streetMatch[2];
//   }

//   return {
//     streetAddress,
//     houseNumber,
//     city
//   };
// }

// async function getGlassRecycleStands() {
//   try {
//     const axiosInstance = axios.create({
//       baseURL: 'https://ags.govmap.gov.il',
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//         'Referer': 'https://www.govmap.gov.il/',
//         'Origin': 'https://www.govmap.gov.il'
//       }
//     });

//     // Comprehensive set of coordinates covering all Israel
//     const searchCoordinates = [
//       // North Israel
//       { x: 186026, y: 692504, name: 'Netanya' },
//       { x: 209000, y: 752000, name: 'Kiryat Shmona' },
//       { x: 203000, y: 745000, name: 'Safed' },
//       { x: 198000, y: 738000, name: 'Karmiel' },
//       { x: 215000, y: 733000, name: 'Tiberias' },
//       { x: 191000, y: 733000, name: 'Acre' },
//       { x: 198500, y: 725000, name: 'Nazareth' },
//       { x: 185000, y: 725000, name: 'Haifa' },
//       { x: 192000, y: 712000, name: 'Afula' },
//       { x: 185000, y: 705000, name: 'Hadera' },

//       // Central Israel
//       { x: 182500, y: 672500, name: 'Herzliya' },
//       { x: 187000, y: 675000, name: 'Hod HaSharon' },
//       { x: 184500, y: 670000, name: 'Ramat HaSharon' },
//       { x: 178500, y: 663900, name: 'Tel Aviv North' },
//       { x: 178000, y: 658000, name: 'Tel Aviv South' },
//       { x: 184000, y: 682000, name: 'Raanana' },
//       { x: 190704, y: 689190, name: 'Kfar Saba' },
//       { x: 185000, y: 666000, name: 'Ramat Gan' },
//       { x: 181500, y: 660000, name: 'Holon' },
//       { x: 176500, y: 657500, name: 'Bat Yam' },
//       { x: 188000, y: 668000, name: 'Petah Tikva' },
//       { x: 195000, y: 683000, name: 'Rosh HaAyin' },

//       // Jerusalem Area
//       { x: 220000, y: 633000, name: 'Jerusalem Center' },
//       { x: 223000, y: 635000, name: 'Jerusalem East' },
//       { x: 217000, y: 635000, name: 'Jerusalem West' },
//       { x: 220000, y: 631000, name: 'Jerusalem South' },
//       { x: 215000, y: 642000, name: 'Mevaseret Zion' },
//       { x: 225000, y: 625000, name: 'Bethlehem' },

//       // South Israel
//       { x: 177500, y: 644000, name: 'Ashdod' },
//       { x: 174500, y: 635000, name: 'Ashkelon' },
//       { x: 194000, y: 627000, name: 'Kiryat Gat' },
//       { x: 206000, y: 617000, name: 'Arad' },
//       { x: 182000, y: 608000, name: 'Beer Sheva North' },
//       { x: 179000, y: 605000, name: 'Beer Sheva South' },
//       { x: 178500, y: 591000, name: 'Ofakim' },
//       { x: 195000, y: 593000, name: 'Dimona' },
//       { x: 178000, y: 569000, name: 'Mitzpe Ramon' },
//       { x: 190000, y: 545000, name: 'Eilat' }
//     ];

//     // Generate grid points between major cities
//     const gridSize = 5000; // 5km grid
//     const bounds = {
//       minX: 170000,
//       maxX: 225000,
//       minY: 540000,
//       maxY: 755000
//     };

//     // Add grid points
//     for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
//       for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
//         searchCoordinates.push({
//           x: x,
//           y: y,
//           name: `Grid_${x}_${y}`
//         });
//       }
//     }

//     const searchStrategies = [
//       {
//         name: 'Standard Search',
//         tolerance: 3000
//       },
//       {
//         name: 'Extended Search',
//         tolerance: 6000
//       }
//     ];

//     const allStands = new Set();
//     const processedLocations = new Set();
//     let idCounter = 1;

//     // Execute searches
//     for (const location of searchCoordinates) {
//       const locationKey = `${Math.round(location.x/1000)},${Math.round(location.y/1000)}`;
//       if (processedLocations.has(locationKey)) continue;

//       for (const strategy of searchStrategies) {
//         try {
//           const response = await axiosInstance.post('/Identify/IdentifyByXY', {
//             x: location.x,
//             y: location.y,
//             mapTolerance: strategy.tolerance,
//             IsPersonalSite: false,
//             layers: [{
//               LayerType: 0,
//               LayerName: "glass_recylce_stands",
//               LayerFilter: ""
//             }]
//           });

//           if (!response.data?.data?.[0]?.Result) continue;

//           response.data.data[0].Result.forEach(result => {
//             if (result.centroid && result.tabs?.[0]?.fields) {
//               const [longitude, latitude] = proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]);
              
//               let address = '';
//               result.tabs[0].fields.forEach(field => {
//                 if (field.FieldName === 'כתובת') {
//                   address = field.FieldValue;
//                 }
//               });

//               const parsedAddress = parseAddress(address);
              
//               const standInfo = {
//                 id: idCounter++,
//                 city: parsedAddress.city,
//                 street: parsedAddress.streetAddress,
//                 houseNumber: parsedAddress.houseNumber,
//                 containerTypes: ['glass'],
//                 rawDate: null,
//                 date: null,
//                 location: {
//                   longitude,
//                   latitude
//                 },
//                 externalId: result.id || `glass-${idCounter}`
//               };

//               allStands.add(JSON.stringify(standInfo));
//             }
//           });

//           processedLocations.add(locationKey);
//           if (response.data.data[0].Result.length > 0) break;
//         } catch (error) {
//           console.error(`Error searching ${location.name} with ${strategy.name}:`, error.message);
//           continue;
//         }

//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//     }

//     const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));
    
//     // Ensure the json directory exists
//     if (!fs.existsSync('json')) {
//       fs.mkdirSync('json');
//     }
    
//     fs.writeFileSync('json/glass_recycling_stands_transformed.json', JSON.stringify(uniqueStands, null, 2));
    
//     console.log(`Found and saved ${uniqueStands.length} unique recycling stands`);
//     return uniqueStands;

//   } catch (error) {
//     console.error('Critical error:', error);
//     throw error;
//   }
// }

// // Run the function
// getGlassRecycleStands()
//   .then(stands => {
//     if (stands.length > 0) {
//       console.log('Successfully completed with stands found');
//     } else {
//       console.log('Completed, but no stands were found');
//     }
//   })
//   .catch(error => {
//     console.error('Failed to retrieve stands:', error);
//   });