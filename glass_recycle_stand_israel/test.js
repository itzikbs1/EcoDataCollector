// Include GovMap API
const script = document.createElement('script');
script.src = 'https://www.govmap.gov.il/govmap/api/govmap.api.js';
document.head.appendChild(script);

script.onload = () => {
  govmap.createMap('map', 
    {
      token: '',
      layers: ["GLASS_RECYLCE_STANDS"],
      showXY: true,
      identifyOnClick: true
    }
  );
  
  govmap.queryFeatures({
    layer: 'GLASS_RECYLCE_STANDS',
    whereClause: '1=1',
    onSuccess: (response) => {
      console.log(response);
    }
  });
};

// fetch('https://www.govmap.gov.il/proxy/proxy.ashx?http://govmap/arcgis/rest/services/AdditionalData/MapServer/212/query', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded'
//     },
//     body: 'f=json&where=1=1&outFields=*&returnGeometry=true'
//   })
//   .then(response => response.json())
//   .then(data => {
//     console.log(data);
//   });
//   .then(data => {
//     const locations = data.features.map(feature => ({
//       x: feature.geometry.x,
//       y: feature.geometry.y,
//       address: feature.attributes.STREET,
//       city: feature.attributes.CITY
//     }));
//     console.log(locations);
//   });