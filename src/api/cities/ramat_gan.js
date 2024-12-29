import { writeFile } from 'fs/promises';


async function fetchRecyclingBinLocations() {
    try {
      const response = await fetch('https://rgsec.ramat-gan.muni.il/__svws__/SvService.asmx/GetCategoriesCoordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          category: 'מתקני מיחזור'
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
    //   const data = await response.json();
    
        const rawData = await response.json();
        // console.log('Raw response structure:', rawData); // Let's see the actual structure
        
        // The data might be nested inside the response
        const data = rawData.d; // || rawData.data || rawData;
        
        // Check if data is an array
        // if (!Array.isArray(data)) {
        //     console.error('Data is not an array:', data);
        //     throw new Error('Unexpected data format');
        // }

      const cleanedData = data.map(item => ({
        ...item,
        // Remove HTML tags and square brackets with their content
        Title: item.Title?.replace(/<[^>]*>/g, '')  // First remove HTML tags
                        .replace(/\s*\[[^\]]*\]/g, '')  // Then remove square brackets and their content
                        .trim() || ''
      }))
    //   console.log('Raw response:', cleanedData);
      await writeFile('json/recycling_containers_raw_ramat_gan.json', JSON.stringify(data, null, 2), 'utf8');
      await writeFile('json/recycling_containers_simplified_ramat_gan.json', JSON.stringify(cleanedData, null, 2), 'utf8');
        return cleanedData;
    } catch (error) {
      console.error('Error fetching recycling bin locations:', error);
      throw error;
    }
  }
//   await writeFile('json/recycling_containers_raw_ramat_gan.json', JSON.stringify(data, null, 2), 'utf8');
//   await writeFile('json/recycling_containers_simplified_ramat_gan.json', JSON.stringify(data, null, 2), 'utf8');
  // Usage
  fetchRecyclingBinLocations()
    .then(cleanedData => {
      console.log('Recycling bin locations:', cleanedData.length);
    })
    .catch(error => {
      console.error('Failed to fetch recycling bin locations:', error);
    });