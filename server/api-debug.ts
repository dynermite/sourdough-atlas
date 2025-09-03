// Debug OutScraper API to see why searches return empty results

export async function debugOutScraperAPI(): Promise<void> {
  console.log('🔧 DEBUGGING OUTSCRAPER API');
  console.log('===========================');
  
  const testSearches = [
    'sourdough pizza Chicago IL',
    'pizza Chicago IL',
    'George\'s Deep Dish Chicago',
    'restaurants Chicago IL',
    'sourdough pizza Portland OR'
  ];
  
  for (const query of testSearches) {
    console.log(`\n🔍 Testing: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch('https://api.outscraper.com/maps/search-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
        },
        body: JSON.stringify({
          query: [query],
          limit: 5,
          language: 'en',
          region: 'US'
        })
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Response type: ${typeof data}`);
        console.log(`Response: ${JSON.stringify(data, null, 2).substring(0, 500)}...`);
        
        if (Array.isArray(data) && data[0]) {
          console.log(`Results found: ${data[0].length}`);
          if (data[0].length > 0) {
            data[0].slice(0, 2).forEach((place: any, i: number) => {
              console.log(`  [${i+1}] ${place.name || 'No name'}`);
              console.log(`      Address: ${place.full_address || 'No address'}`);
              console.log(`      Category: ${place.category || 'No category'}`);
            });
          } else {
            console.log('  ❌ Empty results array');
          }
        } else {
          console.log('  ❌ Unexpected response format');
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Error response: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
    
    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 API DEBUG COMPLETE');
}