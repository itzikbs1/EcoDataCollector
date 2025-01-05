// import axios from 'axios';

// async function getSingleGlassRecycleBin() {
//   try {
//     const axiosInstance = axios.create({
//       baseURL: 'https://ags.govmap.gov.il',
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//         'Referer': 'https://www.govmap.gov.il/',
//         'Origin': 'https://www.govmap.gov.il'
//       }
//     });

//     const location = { x: 173183, y: 631592 };
//     const response = await axiosInstance.post('/Identify/IdentifyByXY', {
//       x: location.x,
//       y: location.y,
//       mapTolerance: 3000,
//       IsPersonalSite: false,
//       layers: [{
//         LayerType: 0,
//         LayerName: "glass_recylce_stands",
//         LayerFilter: ""
//       }]
//     });

//     // Log the first bin's complete details including tabs
//     const firstBin = response.data.data[0];//.Result[1];
//     console.log('First bin complete details:', JSON.stringify(firstBin, null, 2));
//   } catch (error) {
//     console.error('Error:', error.message);
//   }
// }

// getSingleGlassRecycleBin();


// import axios from 'axios';

// async function getGlassRecycleBinById(id) {
//   try {
//     const axiosInstance = axios.create({
//       baseURL: 'https://ags.govmap.gov.il',
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//         'Referer': 'https://www.govmap.gov.il/',
//         'Origin': 'https://www.govmap.gov.il'
//       },
//       timeout: 5000
//     });

//     const response = await axiosInstance.post('/proxy/proxy.ashx?', {
//       dataSource: "SDE.tmir_glass_recylce_stands_v4",
//       filter: `OBJECTID = ${id}`,
//       geometryType: 0
//     });

//     if (response.data && response.data.data) {
//       console.log('Response:', JSON.stringify(response.data, null, 2));
//     } else {
//       console.log('No data found for ID:', id);
//     }
//   } catch (error) {
//     console.error('Full error:', error);
//   }
// }

// getGlassRecycleBinById(422);


import axios from 'axios';

async function getGlassRecycleBinById(id) {
  try {
    const response = await axios.post('https://ags.govmap.gov.il/proxy/proxy.ashx', {
      dataSource: "SDE.tmir_glass_recylce_stands_v4",
      fillColor: ["6", "55", "158", "0.4"],
      outLineColor: ["6", "55", "158", "0.5"],
      filter: `OBJECTID = ${id}`,
      geometryType: 0,
      marker: false
    }, {
      headers: {
        'Referer': 'https://www.govmap.gov.il/'
      }
    });

    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getGlassRecycleBinById(419);



// // import axios from 'axios';

// // async function getSingleGlassRecycleBin() {
// //   try {
// //     const axiosInstance = axios.create({
// //       baseURL: 'https://ags.govmap.gov.il',
// //       headers: {
// //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
// //         'Accept': 'application/json',
// //         'Content-Type': 'application/json',
// //         'Referer': 'https://www.govmap.gov.il/',
// //         'Origin': 'https://www.govmap.gov.il'
// //       }
// //     });

// //     const location = { x: 178500, y: 663900 };
// //     const response = await axiosInstance.post('/Identify/IdentifyByXY', {
// //       x: location.x,
// //       y: location.y,
// //       mapTolerance: 3000,
// //       IsPersonalSite: false,
// //       layers: [{
// //         LayerType: 0,
// //         LayerName: "glass_recylce_stands",
// //         LayerFilter: ""
// //       }]
// //     });

// //     // Log specific details
// //     console.log('Result Array:', response.data.data[0].Result);
// //     console.log('Result Array:', response.data.data[0].Result.length);
// //     console.log('Selection:', response.data.data[0].lyrSelection);
// //     console.log('Current Layer:', response.data.data[0].CurrentLayer);
// //   } catch (error) {
// //     console.error('Error:', error.message);
// //   }
// // }

// // getSingleGlassRecycleBin();

// import axios from 'axios';

// async function getGlassRecycleBinById(id) {
//   try {
//     const axiosInstance = axios.create({
//       baseURL: 'https://ags.govmap.gov.il',
//       headers: {
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//         'Referer': 'https://www.govmap.gov.il/',
//         'Origin': 'https://www.govmap.gov.il'
//       }
//     });

//     const response = await axiosInstance.post('/Identify/IdentifyByObjectId', {
//       layerName: "glass_recylce_stands",
//       objectId: id,
//       IsPersonalSite: false
//     });

//     console.log(JSON.stringify(response.data, null, 2));
//   } catch (error) {
//     console.error('Error:', error.message);
//   }
// }

// getGlassRecycleBinById(422);

// import axios from 'axios';

// async function getGlassRecycleBinById(id, retries = 3) {
//   const axiosInstance = axios.create({
//     baseURL: 'https://ags.govmap.gov.il',
//     headers: {
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       'Accept': 'application/json',
//       'Content-Type': 'application/json',
//       'Referer': 'https://www.govmap.gov.il/',
//       'Origin': 'https://www.govmap.gov.il'
//     },
//     timeout: 5000
//   });

//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const response = await axiosInstance.post('/arcgis/rest/services/AdditionalData/MapServer/212/query', {
//         f: 'json',
//         where: `OBJECTID=${id}`,
//         outFields: '*',
//         returnGeometry: true
//       });
      
//       console.log(JSON.stringify(response.data, null, 2));
//       return;
//     } catch (error) {
//       console.error(`Attempt ${attempt} failed:`, error.message);
//       if (attempt === retries) throw error;
//       await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
//     }
//   }
// }

// getGlassRecycleBinById(422);