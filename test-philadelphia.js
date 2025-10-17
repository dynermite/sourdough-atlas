import axios from 'axios';

async function searchSourdoughPizza() {
  console.log('🍕 SOURDOUGH PIZZA DISCOVERY - PHILADELPHIA, PA');
  console.log('API Key Status:', process.env.OUTSCRAPER_API_KEY ? '✅ Found' : '❌ Missing');
  
  if (!process.env.OUTSCRAPER_API_KEY) {
    console.log('❌ OUTSCRAPER_API_KEY not found');
    return;
  }

  const searches = [
    'sourdough pizza Philadelphia PA',
    'artisan pizza Philadelphia PA sourdough',
    'wood fired pizza Philadelphia PA sourdough crust',
    'neapolitan pizza Philadelphia PA sourdough'
  ];

  try {
    for (const [index, query] of searches.entries()) {
      console.log(`\n🔍 Search ${index + 1}: "${query}"`);
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: query,
          limit: 15,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': process.env.OUTSCRAPER_API_KEY
        }
      });

      if (response.data.id) {
        console.log('⏳ Processing...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': process.env.OUTSCRAPER_API_KEY
          }
        });
        
        if (resultResponse.data.data && resultResponse.data.data.length > 0) {
          const places = resultResponse.data.data[0];
          console.log(`✅ Found ${places.length} results\n`);
          
          places.slice(0, 5).forEach((place, idx) => {
            console.log(`${idx + 1}. ${place.name || 'Unknown'}`);
            console.log(`   📍 ${place.address || 'Address not available'}`);
            console.log(`   ⭐ ${place.rating || 'N/A'} (${place.reviews_count || 0} reviews)`);
            console.log(`   📞 ${place.phone || 'Phone not available'}`);
            console.log(`   🌐 ${place.website || 'Website not available'}`);
            
            // Check for sourdough indicators
            const description = (place.description || '').toLowerCase();
            const name = (place.name || '').toLowerCase();
            const sourdoughIndicators = ['sourdough', 'artisan', 'wood fired', 'neapolitan', 'authentic'];
            const hasIndicator = sourdoughIndicators.some(term => 
              name.includes(term) || description.includes(term)
            );
            
            if (hasIndicator) {
              console.log(`   🍞 POTENTIAL SOURDOUGH MATCH!`);
            }
            console.log('');
          });
        }
      }
      
      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

searchSourdoughPizza();