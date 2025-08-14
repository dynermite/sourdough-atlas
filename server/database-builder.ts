// import { scrapeReliableRestaurants } from './reliable-restaurant-scraper';

// Build comprehensive database by scraping multiple cities
export async function buildComprehensiveDatabase(): Promise<void> {
  console.log('🏗️  Building comprehensive sourdough pizza database...');
  
  const cities = [
    { name: 'Chicago', state: 'Illinois' },
    { name: 'Seattle', state: 'Washington' },
    { name: 'Austin', state: 'Texas' },
    { name: 'Denver', state: 'Colorado' },
    { name: 'Boston', state: 'Massachusetts' },
    { name: 'Philadelphia', state: 'Pennsylvania' },
    { name: 'San Diego', state: 'California' },
    { name: 'Phoenix', state: 'Arizona' },
    { name: 'Nashville', state: 'Tennessee' },
    { name: 'Atlanta', state: 'Georgia' }
  ];
  
  let totalAdded = 0;
  
  for (const city of cities) {
    console.log(`\n🌆 Starting scraping for ${city.name}, ${city.state}...`);
    
    try {
      const addedCount = await scrapeReliableRestaurants(city.name, city.state);
      totalAdded += addedCount;
      console.log(`✅ ${city.name} complete: Added ${addedCount} restaurants`);
      
      // Wait between cities to be respectful
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`❌ Error scraping ${city.name}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Database building complete! Added ${totalAdded} total verified sourdough restaurants`);
}

// Add individual city route
export async function buildCityDatabase(city: string, state: string): Promise<number> {
  console.log(`\n🌆 Building database for ${city}, ${state}...`);
  
  try {
    const addedCount = await scrapeReliableRestaurants(city, state);
    console.log(`✅ ${city} complete: Added ${addedCount} verified sourdough restaurants`);
    return addedCount;
  } catch (error) {
    console.error(`❌ Error building database for ${city}:`, error.message);
    return 0;
  }
}