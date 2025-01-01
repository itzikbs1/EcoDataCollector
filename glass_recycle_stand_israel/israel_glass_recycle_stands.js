import axios from 'axios';
import * as fs from 'fs';
import UtmLatLng from 'utm-latlng';
import proj4 from 'proj4';

// Define the ITM projection
proj4.defs("ITM", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");

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
              const [lon, lat] = proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]);
              const standInfo = {
                coordinates: {
                  x: result.centroid.x,
                  y: result.centroid.y
                },
                latitude: lat,
                longitude: lon,
                // gpsCoordinates: ITMtoWGS84(result.centroid.x, result.centroid.y, 36, 'N'),
                // gpsCoordinates: proj4("ITM", "WGS84", [result.centroid.x, result.centroid.y]),
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
// import proj4 from 'proj4';
// Define the ITM projection
// proj4.defs("ITM", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");

  const utm = new UtmLatLng();
  function ITMtoWGS84(x, y) {
    try {
        // Convert from ITM to WGS84 using specific parameters for Israel
        const easting = x - 50000;  // Adjust for ITM false easting
        const northing = y - 500000;  // Adjust for ITM false northing
        const { lat, lng } = utm.convertUtmToLatLng(easting, northing, 36, 'N');
        return { latitude: lat, longitude: lng };
    } catch (error) {
        console.error('Error converting coordinates:', error);
        return null;
    }
}
//   function ITMtoWGS84(east, north) {
//     // Constants for ITM to WGS84 conversion
//     const k0 = 1.0000067;
//     const a = 6378137.0;
//     const e = 0.081819191042816;
//     const lon0 = 0.61443473225468920;
//     const lat0 = 0.55386447682762762;
//     const false_e = 219529.584;
//     const false_n = 626907.390;
//     const n = 0.9996;
//     const m = 1;

//     // Subtract false easting and northing
//     const y = (east - false_e) / k0;
//     const x = (north - false_n) / k0;

//     const M = x / n;
//     const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64));
//     const phi1 = mu + (3 * e / 2 - 27 * Math.pow(e, 3) / 32) * Math.sin(2 * mu);

//     const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.pow(Math.sin(phi1), 2));
//     const T1 = Math.pow(Math.tan(phi1), 2);
//     const C1 = Math.pow(e, 2) * Math.pow(Math.cos(phi1), 2);
//     const R1 = a * (1 - Math.pow(e, 2)) / Math.pow((1 - Math.pow(e, 2) * Math.pow(Math.sin(phi1), 2)), 1.5);
//     const D = y / (N1 * k0);

//     const lat = phi1 - ((N1 * Math.tan(phi1) / R1) * (Math.pow(D, 2) / 2 - (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2)) * Math.pow(D, 4) / 24));
//     const lon = lon0 + (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6) / Math.cos(phi1);

//     return {
//         latitude: lat * 180 / Math.PI,
//         longitude: lon * 180 / Math.PI
//     };
// }

// Example usage:
// const ITMCoords = {
//   x: 185911.1505,
//   y: 689566.2333
// };

// const WGS84Coords = ITMtoWGS84(ITMCoords.x, ITMCoords.y);
// console.log(WGS84Coords);
// Should output something like: 
// { latitude: 32.xxx, longitude: 34.xxx }



//   // const axios = require('axios');
// import axios from 'axios';
// import * as fs from 'fs';
// // const fs = require('fs');

// function parseAddress(addressString) {
//   const defaultCountry = 'ישראל';
//   let cleanAddress = addressString.replace(/, ישראל$/, '').trim();
//   const components = cleanAddress.split(',').map(comp => comp.trim());
//   const city = components.length > 1 ? components[components.length - 1] : 'לא ידוע';
//   const streetAddress = components.slice(0, -1).join(', ');
  
//   return {
//     originalAddress: addressString,
//     streetAddress: streetAddress,
//     city: city,
//     country: defaultCountry
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

//     // Comprehensive set of GPS coordinates covering all Israel
//     const searchCoordinates = [
//       // North Israel
//       { latitude: 32.3276, longitude: 34.8534, name: 'Netanya' },
//       { latitude: 33.2075, longitude: 35.5684, name: 'Kiryat Shmona' },
//       { latitude: 32.9646, longitude: 35.4960, name: 'Safed' },
//       { latitude: 32.9167, longitude: 35.2833, name: 'Karmiel' },
//       { latitude: 32.7922, longitude: 35.5312, name: 'Tiberias' },
//       { latitude: 32.9281, longitude: 35.0820, name: 'Acre' },
//       { latitude: 32.7021, longitude: 35.2978, name: 'Nazareth' },
//       { latitude: 32.8184, longitude: 34.9885, name: 'Haifa' },
//       { latitude: 32.6078, longitude: 35.2897, name: 'Afula' },
//       { latitude: 32.4370, longitude: 34.9197, name: 'Hadera' },

//       // Central Israel
//       { latitude: 32.1647, longitude: 34.8238, name: 'Herzliya' },
//       { latitude: 32.1591, longitude: 34.8935, name: 'Hod HaSharon' },
//       { latitude: 32.1461, longitude: 34.8384, name: 'Ramat HaSharon' },
//       { latitude: 32.0853, longitude: 34.7818, name: 'Tel Aviv North' },
//       { latitude: 32.0504, longitude: 34.7751, name: 'Tel Aviv South' },
//       { latitude: 32.1836, longitude: 34.8716, name: 'Raanana' },
//       { latitude: 32.1750, longitude: 34.9070, name: 'Kfar Saba' },
//       { latitude: 32.0823, longitude: 34.8116, name: 'Ramat Gan' },
//       { latitude: 32.0167, longitude: 34.7667, name: 'Holon' },
//       { latitude: 32.0231, longitude: 34.7507, name: 'Bat Yam' },
//       { latitude: 32.0889, longitude: 34.8862, name: 'Petah Tikva' },
//       { latitude: 32.0956, longitude: 34.9517, name: 'Rosh HaAyin' },

//       // Jerusalem Area
//       { latitude: 31.7833, longitude: 35.2167, name: 'Jerusalem Center' },
//       { latitude: 31.7914, longitude: 35.2332, name: 'Jerusalem East' },
//       { latitude: 31.7833, longitude: 35.1833, name: 'Jerusalem West' },
//       { latitude: 31.7500, longitude: 35.2167, name: 'Jerusalem South' },
//       { latitude: 31.8019, longitude: 35.1508, name: 'Mevaseret Zion' },
//       { latitude: 31.7043, longitude: 35.2027, name: 'Bethlehem' },

//       // South Israel
//       { latitude: 31.7892, longitude: 34.6497, name: 'Ashdod' },
//       { latitude: 31.6658, longitude: 34.5714, name: 'Ashkelon' },
//       { latitude: 31.6100, longitude: 34.7642, name: 'Kiryat Gat' },
//       { latitude: 31.2588, longitude: 35.2128, name: 'Arad' },
//       { latitude: 31.2518, longitude: 34.7915, name: 'Beer Sheva North' },
//       { latitude: 31.2300, longitude: 34.7913, name: 'Beer Sheva South' },
//       { latitude: 31.3147, longitude: 34.6201, name: 'Ofakim' },
//       { latitude: 31.0689, longitude: 35.0334, name: 'Dimona' },
//       { latitude: 30.6089, longitude: 34.8016, name: 'Mitzpe Ramon' },
//       { latitude: 29.5581, longitude: 34.9482, name: 'Eilat' }
//     ];

//     // Generate grid points between major cities (approximately 5km spacing)
//     const gridSize = 0.045; // roughly 5km in decimal degrees
//     const bounds = {
//       minLat: 29.5, // Eilat
//       maxLat: 33.3, // Northern border
//       minLon: 34.2, // Western border
//       maxLon: 35.9  // Eastern border
//     };

//     // Add grid points
//     for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += gridSize) {
//       for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += gridSize) {
//         searchCoordinates.push({
//           latitude: lat,
//           longitude: lon,
//           name: `Grid_${lat.toFixed(4)}_${lon.toFixed(4)}`
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

//     const allStands = new Set(); // Use Set for automatic deduplication
//     const processedLocations = new Set(); // Track processed coordinates

//     // Execute searches
//     for (const location of searchCoordinates) {
//       // Skip if we've already processed this location (within a certain radius)
//       const locationKey = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
//       if (processedLocations.has(locationKey)) {
//         continue;
//       }

//       for (const strategy of searchStrategies) {
//         try {
//           const response = await axiosInstance.post('/Identify/IdentifyByXY', {
//             x: location.longitude,
//             y: location.latitude,
//             mapTolerance: strategy.tolerance,
//             IsPersonalSite: false,
//             outSR: 4326, // Request WGS84 (GPS) coordinates
//             layers: [{
//               LayerType: 0, 
//               LayerName: "glass_recylce_stands", 
//               LayerFilter: ""
//             }]
//           });

//           // Skip if no data or no results
//           if (!response.data?.data?.[0]?.Result) {
//             continue;
//           }

//           // Process found stands
//           response.data.data[0].Result.forEach(result => {
//             if (result.centroid && result.tabs?.[0]?.fields) {
//               const standInfo = {
//                 coordinates: {
//                   latitude: result.centroid.y,  // Note: y is latitude in WGS84
//                   longitude: result.centroid.x   // x is longitude in WGS84
//                 },
//                 details: {}
//               };

//               result.tabs[0].fields.forEach(field => {
//                 standInfo.details[field.FieldName] = field.FieldValue;
//               });

//               if (standInfo.details['כתובת']) {
//                 standInfo.parsedAddress = parseAddress(standInfo.details['כתובת']);
//               }

//               allStands.add(JSON.stringify(standInfo));
//             }
//           });

//           // Mark this location as processed
//           processedLocations.add(locationKey);

//           // If stands were found with current strategy, skip other strategies
//           if (response.data.data[0].Result.length > 0) {
//             break;
//           }
//         } catch (error) {
//           console.error(`Error searching ${location.name} with ${strategy.name}:`, error.message);
//           continue;
//         }

//         // Add delay to avoid rate limiting
//         await new Promise(resolve => setTimeout(resolve, 1000));
//       }
//     }

//     // Convert Set back to array and parse JSON strings
//     const uniqueStands = Array.from(allStands).map(standStr => JSON.parse(standStr));

//     // Save results if stands were found
//     if (uniqueStands.length > 0) {
//       // Save by region for easier analysis
//       const standsByRegion = {
//         north: uniqueStands.filter(stand => stand.coordinates.latitude >= 32.4),
//         central: uniqueStands.filter(stand => stand.coordinates.latitude >= 31.8 && stand.coordinates.latitude < 32.4),
//         jerusalem: uniqueStands.filter(stand => stand.coordinates.longitude >= 35.1 && stand.coordinates.latitude >= 31.7 && stand.coordinates.latitude < 31.8),
//         south: uniqueStands.filter(stand => stand.coordinates.latitude < 31.7)
//       };

//       fs.writeFileSync('json/glass_recycling_stands_all_israel.json', JSON.stringify(uniqueStands, null, 2));
//       fs.writeFileSync('json/glass_recycling_stands_by_region.json', JSON.stringify(standsByRegion, null, 2));
      
//       console.log(`Found and saved ${uniqueStands.length} unique recycling stands`);
//       console.log('Stands by region:', {
//         north: standsByRegion.north.length,
//         central: standsByRegion.central.length,
//         jerusalem: standsByRegion.jerusalem.length,
//         south: standsByRegion.south.length
//       });
//     } else {
//       console.log('No recycling stands found');
//     }

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