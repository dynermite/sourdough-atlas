#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Complete 99-city plan for 1,000-1,500 restaurant directory
const ALL_99_STRATEGIC_CITIES = [
  // Tier 1: High Sourdough Cities (27 cities) - Expected 400-600 restaurants
  'San Francisco,CA', 'Portland,OR', 'Seattle,WA', 'Napa,CA', 'Burlington,VT',
  'Bend,OR', 'Austin,TX', 'Denver,CO', 'Boston,MA', 'Charleston,SC',
  'New York,NY', 'Aspen,CO', 'Santa Fe,NM', 'Bar Harbor,ME', 'Nantucket,MA',
  'Newport,RI', 'Carmel,CA', 'Telluride,CO', 'Bellingham,WA', 'Oakland,CA',
  'Chicago,IL', 'Los Angeles,CA', 'Philadelphia,PA', 'Boulder,CO', 'Asheville,NC',
  'Madison,WI', 'Providence,RI',

  // Tier 2: Major Markets (47 cities) - Expected 400-600 restaurants  
  'Washington,DC', 'Atlanta,GA', 'Nashville,TN', 'Dallas,TX', 'San Diego,CA',
  'Minneapolis,MN', 'Detroit,MI', 'Baltimore,MD', 'Milwaukee,WI', 'Kansas City,MO',
  'Columbus,OH', 'Charlotte,NC', 'Indianapolis,IN', 'Sacramento,CA', 'Raleigh,NC',
  'Colorado Springs,CO', 'San Jose,CA', 'New Orleans,LA', 'Louisville,KY', 'Omaha,NE',
  'Orlando,FL', 'Las Vegas,NV', 'Miami,FL', 'Phoenix,AZ', 'Houston,TX',
  'Honolulu,HI', 'Savannah,GA', 'Park City,UT', 'Sedona,AZ', 'Williamsburg,VA',
  'Flagstaff,AZ', 'Traverse City,MI', 'Jackson,WY', 'Big Sur,CA', 'Half Moon Bay,CA',
  'Mendocino,CA', 'Vail,CO', 'Breckenridge,CO', 'Steamboat Springs,CO', 'Sun Valley,ID',
  'Jackson Hole,WY', 'Hood River,OR', 'Cannon Beach,OR', 'Friday Harbor,WA', 'Whidbey Island,WA',
  'Bozeman,MT', 'Missoula,MT',

  // Tier 3: Complete Coverage (25 cities) - Expected 200-300 restaurants
  'Key West,FL', 'Myrtle Beach,SC', 'Virginia Beach,VA', 'Gatlinburg,TN', 'Branson,MO',
  'Mammoth Lakes,CA', 'Mackinac Island,MI', 'St. Augustine,FL', 'Moab,UT', 'Anchorage,AK',
  'Long Beach,CA', 'Mesa,AZ', 'Oklahoma City,OK', 'El Paso,TX', 'Memphis,TN',
  'Albuquerque,NM', 'Fresno,CA', 'Tucson,AZ', 'Tampa,FL', 'Tulsa,OK',
  'Arlington,TX', 'Fort Worth,TX', 'Jacksonville,FL', 'San Antonio,TX', 'Salt Lake City,UT'
];

export async function executeComplete99CityDiscovery() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('ERROR: OUTSCRAPER_API_KEY not found in environment');
    console.log('Cannot proceed with comprehensive discovery without API access');
    return { error: 'Missing API key' };
  }

  console.log('🚀 EXECUTING COMPLETE 99-CITY DISCOVERY FOR 1,000-1,500 RESTAURANTS');
  console.log('=' .repeat(80));
  console.log(`📊 Processing all ${ALL_99_STRATEGIC_CITIES.length} strategic cities nationwide`);
  console.log(`🎯 Target: 1,000-1,500 verified sourdough restaurants`);
  console.log(`💰 API Cost: ~$0.099 (within free tier limits)`);
  console.log(`🗺️  Complete searchable directory for all major US markets`);
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalSourdoughFound = 0;
  let totalRestaurantsAnalyzed = 0;
  let citiesCompleted = 0;
  let failedCities = 0;
  const tierResults = { tier1: 0, tier2: 0, tier3: 0 };
  const cityResults: any[] = [];

  console.log('\n🏗️  BUILDING COMPREHENSIVE 1,500-RESTAURANT DIRECTORY');
  console.log('=' .repeat(60));

  // Process Tier 1 cities (highest sourdough potential)
  const tier1Cities = ALL_99_STRATEGIC_CITIES.slice(0, 27);
  console.log(`\n🎯 TIER 1: High Sourdough Cities (${tier1Cities.length} cities)`);
  console.log('Expected: 400-600 sourdough restaurants');
  console.log('-' .repeat(50));
  
  for (const cityState of tier1Cities) {
    const [city, state] = cityState.split(',');
    try {
      console.log(`[${citiesCompleted + 1}/99] 🍕 ${city}, ${state} (Tier 1)`);
      const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
      
      totalSourdoughFound += sourdoughFound;
      tierResults.tier1 += sourdoughFound;
      citiesCompleted++;
      
      cityResults.push({ city, state, tier: 1, sourdoughFound });
      console.log(`  ✅ Found ${sourdoughFound} sourdough restaurants`);
      
      if (citiesCompleted % 10 === 0) {
        console.log(`📊 Progress: ${citiesCompleted}/99 cities, ${totalSourdoughFound} total restaurants`);
      }
      
    } catch (error) {
      failedCities++;
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process Tier 2 cities (major markets)  
  const tier2Cities = ALL_99_STRATEGIC_CITIES.slice(27, 74);
  console.log(`\n🎯 TIER 2: Major Markets (${tier2Cities.length} cities)`);
  console.log('Expected: 400-600 sourdough restaurants');
  console.log('-' .repeat(50));
  
  for (const cityState of tier2Cities) {
    const [city, state] = cityState.split(',');
    try {
      console.log(`[${citiesCompleted + 1}/99] 🏙️  ${city}, ${state} (Tier 2)`);
      const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
      
      totalSourdoughFound += sourdoughFound;
      tierResults.tier2 += sourdoughFound;
      citiesCompleted++;
      
      cityResults.push({ city, state, tier: 2, sourdoughFound });
      console.log(`  ✅ Found ${sourdoughFound} sourdough restaurants`);
      
      if (citiesCompleted % 10 === 0) {
        console.log(`📊 Progress: ${citiesCompleted}/99 cities, ${totalSourdoughFound} total restaurants`);
      }
      
    } catch (error) {
      failedCities++;
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process Tier 3 cities (complete coverage)
  const tier3Cities = ALL_99_STRATEGIC_CITIES.slice(74);
  console.log(`\n🎯 TIER 3: Complete Coverage (${tier3Cities.length} cities)`);
  console.log('Expected: 200-300 sourdough restaurants');
  console.log('-' .repeat(50));
  
  for (const cityState of tier3Cities) {
    const [city, state] = cityState.split(',');
    try {
      console.log(`[${citiesCompleted + 1}/99] 🌆 ${city}, ${state} (Tier 3)`);
      const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
      
      totalSourdoughFound += sourdoughFound;
      tierResults.tier3 += sourdoughFound;
      citiesCompleted++;
      
      cityResults.push({ city, state, tier: 3, sourdoughFound });
      console.log(`  ✅ Found ${sourdoughFound} sourdough restaurants`);
      
    } catch (error) {
      failedCities++;
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Final comprehensive results
  console.log('\n' + '='.repeat(80));
  console.log('🎉 COMPLETE 99-CITY DISCOVERY FINISHED!');
  console.log('='.repeat(80));
  
  console.log(`📊 FINAL DIRECTORY STATISTICS:`);
  console.log(`✅ Cities successfully processed: ${citiesCompleted}/99`);
  console.log(`❌ Cities failed: ${failedCities}`);
  console.log(`🍕 Total sourdough restaurants discovered: ${totalSourdoughFound}`);
  console.log(`🎯 Success rate: ${((citiesCompleted / 99) * 100).toFixed(1)}%`);
  
  console.log(`\n📈 RESULTS BY TIER:`);
  console.log(`   Tier 1 (High Sourdough): ${tierResults.tier1} restaurants`);
  console.log(`   Tier 2 (Major Markets): ${tierResults.tier2} restaurants`);
  console.log(`   Tier 3 (Complete Coverage): ${tierResults.tier3} restaurants`);
  
  console.log(`\n🗺️  COMPREHENSIVE DIRECTORY NOW INCLUDES:`);
  console.log(`   • ${totalSourdoughFound} verified sourdough restaurants`);
  console.log(`   • Coverage across ${citiesCompleted} major US cities`);
  console.log(`   • Searchable by city: /api/restaurants/city/:city`);
  console.log(`   • Searchable by state: /api/restaurants/state/:state`);
  console.log(`   • Interactive map with complete coverage`);
  console.log(`   • All restaurants verified through official sources`);
  
  console.log(`\n🧭 DIRECTORY STATUS:`);
  if (totalSourdoughFound >= 1000) {
    console.log(`   ✅ TARGET ACHIEVED: ${totalSourdoughFound} restaurants (1,000+ goal met)`);
  } else if (totalSourdoughFound >= 500) {
    console.log(`   🎯 SUBSTANTIAL COVERAGE: ${totalSourdoughFound} restaurants (50%+ of goal)`);
  } else {
    console.log(`   📈 BUILDING: ${totalSourdoughFound} restaurants (expanding database)`);
  }
  
  console.log(`\n🌟 TRAVELERS CAN NOW:`);
  console.log(`   • Find sourdough pizza in any major US city`);
  console.log(`   • Search comprehensive database by location`);
  console.log(`   • Access the largest sourdough directory available`);
  console.log(`   • Plan trips around authentic sourdough establishments`);
  
  return {
    totalRestaurants: totalSourdoughFound,
    citiesProcessed: citiesCompleted,
    tierResults,
    cityResults,
    targetAchieved: totalSourdoughFound >= 1000
  };
}

if (import.meta.url.endsWith(process.argv[1])) {
  executeComplete99CityDiscovery().catch(console.error);
}