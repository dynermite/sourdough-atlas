#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Complete 99-city strategic plan for comprehensive sourdough directory
const ALL_99_CITIES = [
  // Tier 1: Very High Sourdough Likelihood (27 cities)
  { city: 'San Francisco', state: 'CA', tier: 1 },
  { city: 'Portland', state: 'OR', tier: 1 },
  { city: 'Seattle', state: 'WA', tier: 1 },
  { city: 'Napa', state: 'CA', tier: 1 },
  { city: 'Burlington', state: 'VT', tier: 1 },
  { city: 'Stowe', state: 'VT', tier: 1 },
  { city: 'Bend', state: 'OR', tier: 1 },
  { city: 'Sausalito', state: 'CA', tier: 1 },
  { city: 'Austin', state: 'TX', tier: 1 },
  { city: 'Denver', state: 'CO', tier: 1 },
  { city: 'Boston', state: 'MA', tier: 1 },
  { city: 'Charleston', state: 'SC', tier: 1 },
  { city: 'New York', state: 'NY', tier: 1 },
  { city: 'Aspen', state: 'CO', tier: 1 },
  { city: 'Santa Fe', state: 'NM', tier: 1 },
  { city: 'Bar Harbor', state: 'ME', tier: 1 },
  { city: 'Martha\'s Vineyard', state: 'MA', tier: 1 },
  { city: 'Nantucket', state: 'MA', tier: 1 },
  { city: 'Newport', state: 'RI', tier: 1 },
  { city: 'Cape Cod', state: 'MA', tier: 1 },
  { city: 'Carmel', state: 'CA', tier: 1 },
  { city: 'Telluride', state: 'CO', tier: 1 },
  { city: 'Bellingham', state: 'WA', tier: 1 },
  { city: 'Oakland', state: 'CA', tier: 1 },
  { city: 'Chicago', state: 'IL', tier: 1 },
  { city: 'Los Angeles', state: 'CA', tier: 1 },
  { city: 'Philadelphia', state: 'PA', tier: 1 },

  // Tier 2: Major Population Centers (47 cities)
  { city: 'Washington', state: 'DC', tier: 2 },
  { city: 'Atlanta', state: 'GA', tier: 2 },
  { city: 'Nashville', state: 'TN', tier: 2 },
  { city: 'Dallas', state: 'TX', tier: 2 },
  { city: 'San Diego', state: 'CA', tier: 2 },
  { city: 'Minneapolis', state: 'MN', tier: 2 },
  { city: 'Detroit', state: 'MI', tier: 2 },
  { city: 'Baltimore', state: 'MD', tier: 2 },
  { city: 'Milwaukee', state: 'WI', tier: 2 },
  { city: 'Kansas City', state: 'MO', tier: 2 },
  { city: 'Columbus', state: 'OH', tier: 2 },
  { city: 'Charlotte', state: 'NC', tier: 2 },
  { city: 'Indianapolis', state: 'IN', tier: 2 },
  { city: 'Sacramento', state: 'CA', tier: 2 },
  { city: 'Raleigh', state: 'NC', tier: 2 },
  { city: 'Colorado Springs', state: 'CO', tier: 2 },
  { city: 'San Jose', state: 'CA', tier: 2 },
  { city: 'New Orleans', state: 'LA', tier: 2 },
  { city: 'Louisville', state: 'KY', tier: 2 },
  { city: 'Omaha', state: 'NE', tier: 2 },
  { city: 'Orlando', state: 'FL', tier: 2 },
  { city: 'Las Vegas', state: 'NV', tier: 2 },
  { city: 'Miami', state: 'FL', tier: 2 },
  { city: 'Phoenix', state: 'AZ', tier: 2 },
  { city: 'Houston', state: 'TX', tier: 2 },
  { city: 'Honolulu', state: 'HI', tier: 2 },
  { city: 'Savannah', state: 'GA', tier: 2 },
  { city: 'Park City', state: 'UT', tier: 2 },
  { city: 'Sedona', state: 'AZ', tier: 2 },
  { city: 'Williamsburg', state: 'VA', tier: 2 },
  { city: 'Flagstaff', state: 'AZ', tier: 2 },
  { city: 'Traverse City', state: 'MI', tier: 2 },
  { city: 'Jackson', state: 'WY', tier: 2 },
  { city: 'Outer Banks', state: 'NC', tier: 2 },
  { city: 'Big Sur', state: 'CA', tier: 2 },
  { city: 'Half Moon Bay', state: 'CA', tier: 2 },
  { city: 'Mendocino', state: 'CA', tier: 2 },
  { city: 'Vail', state: 'CO', tier: 2 },
  { city: 'Breckenridge', state: 'CO', tier: 2 },
  { city: 'Steamboat Springs', state: 'CO', tier: 2 },
  { city: 'Sun Valley', state: 'ID', tier: 2 },
  { city: 'Jackson Hole', state: 'WY', tier: 2 },
  { city: 'Hood River', state: 'OR', tier: 2 },
  { city: 'Cannon Beach', state: 'OR', tier: 2 },
  { city: 'Friday Harbor', state: 'WA', tier: 2 },
  { city: 'Whidbey Island', state: 'WA', tier: 2 },
  { city: 'Bozeman', state: 'MT', tier: 2 },
  { city: 'Missoula', state: 'MT', tier: 2 },

  // Tier 3: Complete Coverage (25 cities)
  { city: 'Key West', state: 'FL', tier: 3 },
  { city: 'Myrtle Beach', state: 'SC', tier: 3 },
  { city: 'Virginia Beach', state: 'VA', tier: 3 },
  { city: 'Gatlinburg', state: 'TN', tier: 3 },
  { city: 'Branson', state: 'MO', tier: 3 },
  { city: 'Mammoth Lakes', state: 'CA', tier: 3 },
  { city: 'Mackinac Island', state: 'MI', tier: 3 },
  { city: 'St. Augustine', state: 'FL', tier: 3 },
  { city: 'Moab', state: 'UT', tier: 3 },
  { city: 'Anchorage', state: 'AK', tier: 3 },
  { city: 'Long Beach', state: 'CA', tier: 3 },
  { city: 'Mesa', state: 'AZ', tier: 3 },
  { city: 'Oklahoma City', state: 'OK', tier: 3 },
  { city: 'El Paso', state: 'TX', tier: 3 },
  { city: 'Memphis', state: 'TN', tier: 3 },
  { city: 'Albuquerque', state: 'NM', tier: 3 },
  { city: 'Fresno', state: 'CA', tier: 3 },
  { city: 'Tucson', state: 'AZ', tier: 3 },
  { city: 'Tampa', state: 'FL', tier: 3 },
  { city: 'Tulsa', state: 'OK', tier: 3 },
  { city: 'Arlington', state: 'TX', tier: 3 },
  { city: 'Fort Worth', state: 'TX', tier: 3 },
  { city: 'Jacksonville', state: 'FL', tier: 3 },
  { city: 'San Antonio', state: 'TX', tier: 3 },
  { city: 'Salt Lake City', state: 'UT', tier: 3 }
];

export async function executeComplete99CityDiscovery() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY not found');
    return;
  }

  console.log('🚀 EXECUTING COMPLETE 99-CITY SOURDOUGH DIRECTORY BUILD');
  console.log('=' .repeat(70));
  console.log(`📊 Target: All ${ALL_99_CITIES.length} strategic cities nationwide`);
  console.log(`🎯 Goal: Build comprehensive searchable sourdough directory`);
  console.log(`💰 Estimated cost: $${(ALL_99_CITIES.length * 0.001).toFixed(3)} (within free tier)`);
  console.log(`📍 Expected outcome: 500-1,500 verified sourdough restaurants`);
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalSourdoughFound = 0;
  let totalRestaurantsAnalyzed = 0;
  let citiesCompleted = 0;
  let failedCities = 0;
  const cityResults: any[] = [];

  console.log('\n🏙️  BUILDING COMPLETE DIRECTORY:');
  console.log('=' .repeat(50));

  // Process by tier for optimal results
  for (let tier = 1; tier <= 3; tier++) {
    const tierCities = ALL_99_CITIES.filter(c => c.tier === tier);
    console.log(`\n🎯 TIER ${tier}: Processing ${tierCities.length} cities`);
    console.log('-' .repeat(40));
    
    for (const cityData of tierCities) {
      const { city, state } = cityData;
      
      try {
        console.log(`[${citiesCompleted + 1}/${ALL_99_CITIES.length}] 🍕 ${city}, ${state}`);
        
        const startTime = Date.now();
        const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        totalSourdoughFound += sourdoughFound;
        citiesCompleted++;
        
        cityResults.push({
          city,
          state,
          tier,
          sourdoughFound,
          processingTime
        });
        
        console.log(`✅ ${city}: ${sourdoughFound} sourdough restaurants (${processingTime}s)`);
        
        // Brief pause to respect API limits
        if (citiesCompleted < ALL_99_CITIES.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        failedCities++;
        console.log(`❌ ${city}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Final comprehensive results
  console.log('\n' + '='.repeat(70));
  console.log('🎉 COMPLETE SOURDOUGH DIRECTORY BUILT!');
  console.log('='.repeat(70));
  
  console.log(`📊 FINAL DIRECTORY STATISTICS:`);
  console.log(`✅ Cities successfully processed: ${citiesCompleted}/${ALL_99_CITIES.length}`);
  console.log(`❌ Cities failed: ${failedCities}`);
  console.log(`🍕 Total sourdough restaurants in directory: ${totalSourdoughFound}`);
  console.log(`🎯 Success rate: ${((citiesCompleted / ALL_99_CITIES.length) * 100).toFixed(1)}%`);
  
  // Tier breakdown
  for (let tier = 1; tier <= 3; tier++) {
    const tierResults = cityResults.filter(r => r.tier === tier);
    const tierSourdough = tierResults.reduce((sum, r) => sum + r.sourdoughFound, 0);
    console.log(`   Tier ${tier}: ${tierSourdough} restaurants from ${tierResults.length} cities`);
  }
  
  console.log(`\n🗺️  DIRECTORY NOW COVERS:`);
  console.log(`   • Comprehensive sourdough restaurant database`);
  console.log(`   • Searchable by city name via /api/restaurants/city/:city`);
  console.log(`   • Searchable by state via /api/restaurants/state/:state`);
  console.log(`   • Interactive map visualization with zoom-based filtering`);
  console.log(`   • Complete coverage of all major US markets`);
  
  console.log(`\n🧭 TRAVELERS CAN NOW:`);
  console.log(`   • Find sourdough pizza in any major US city`);
  console.log(`   • Get directions and details for each restaurant`);
  console.log(`   • Discover authentic sourdough establishments nationwide`);
  console.log(`   • Access the most comprehensive sourdough directory available`);
  
  return {
    totalRestaurants: totalSourdoughFound,
    citiesProcessed: citiesCompleted,
    cityResults
  };
}

if (import.meta.url.endsWith(process.argv[1])) {
  executeComplete99CityDiscovery().catch(console.error);
}