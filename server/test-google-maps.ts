import { GoogleMapsScraper } from './google-maps-scraper';

async function testGoogleMaps() {
  console.log('🗺️ Testing Google Maps scraper for Portland...');
  console.log('This will:');
  console.log('1. Find ALL pizza restaurants in Google Maps Portland search');
  console.log('2. Analyze each restaurant\'s Google Business profile description');
  console.log('3. Analyze each restaurant\'s website for sourdough keywords');
  console.log('4. Only add verified sourdough restaurants to database\n');
  
  const scraper = new GoogleMapsScraper();
  
  try {
    await scraper.scrapeGoogleMapsRestaurants('Portland', 'OR');
    console.log('\n✅ Google Maps comprehensive scraping test complete!');
  } catch (error) {
    console.error('❌ Google Maps scraping failed:', error);
  }
  
  process.exit(0);
}

testGoogleMaps().catch(console.error);