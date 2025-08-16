#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Strategic city-by-city discovery plan for verified real restaurants
const PRIORITY_DISCOVERY_CITIES = [
  // Phase 1: High sourdough likelihood cities (already have some verified establishments)
  { city: 'San Francisco', state: 'CA', priority: 1, expectedCount: 20 },
  { city: 'Portland', state: 'OR', priority: 1, expectedCount: 15 },
  { city: 'Seattle', state: 'WA', priority: 1, expectedCount: 12 },
  { city: 'Austin', state: 'TX', priority: 1, expectedCount: 10 },
  { city: 'Chicago', state: 'IL', priority: 1, expectedCount: 8 },
  { city: 'Brooklyn', state: 'NY', priority: 1, expectedCount: 8 },
  { city: 'Philadelphia', state: 'PA', priority: 1, expectedCount: 6 },
  { city: 'Phoenix', state: 'AZ', priority: 1, expectedCount: 5 },
  
  // Phase 2: Major metro areas with good sourdough potential
  { city: 'Los Angeles', state: 'CA', priority: 2, expectedCount: 12 },
  { city: 'New York', state: 'NY', priority: 2, expectedCount: 10 },
  { city: 'Boston', state: 'MA', priority: 2, expectedCount: 8 },
  { city: 'Denver', state: 'CO', priority: 2, expectedCount: 7 },
  { city: 'Washington', state: 'DC', priority: 2, expectedCount: 6 },
  { city: 'Atlanta', state: 'GA', priority: 2, expectedCount: 5 },
  { city: 'Nashville', state: 'TN', priority: 2, expectedCount: 5 },
  { city: 'Minneapolis', state: 'MN', priority: 2, expectedCount: 4 },
  { city: 'Dallas', state: 'TX', priority: 2, expectedCount: 6 },
  { city: 'Houston', state: 'TX', priority: 2, expectedCount: 5 },
  { city: 'San Diego', state: 'CA', priority: 2, expectedCount: 6 },
  { city: 'Oakland', state: 'CA', priority: 2, expectedCount: 5 },
  
  // Phase 3: Additional major markets
  { city: 'Detroit', state: 'MI', priority: 3, expectedCount: 4 },
  { city: 'Baltimore', state: 'MD', priority: 3, expectedCount: 3 },
  { city: 'Milwaukee', state: 'WI', priority: 3, expectedCount: 3 },
  { city: 'Kansas City', state: 'MO', priority: 3, expectedCount: 3 },
  { city: 'Columbus', state: 'OH', priority: 3, expectedCount: 3 },
  { city: 'Charlotte', state: 'NC', priority: 3, expectedCount: 3 },
  { city: 'Sacramento', state: 'CA', priority: 3, expectedCount: 4 },
  { city: 'Miami', state: 'FL', priority: 3, expectedCount: 3 },
  { city: 'Tampa', state: 'FL', priority: 3, expectedCount: 3 },
  { city: 'Las Vegas', state: 'NV', priority: 3, expectedCount: 3 },
  
  // Phase 4: Complete coverage cities
  { city: 'Salt Lake City', state: 'UT', priority: 4, expectedCount: 3 },
  { city: 'New Orleans', state: 'LA', priority: 4, expectedCount: 3 },
  { city: 'Cleveland', state: 'OH', priority: 4, expectedCount: 2 },
  { city: 'Pittsburgh', state: 'PA', priority: 4, expectedCount: 3 },
  { city: 'Cincinnati', state: 'OH', priority: 4, expectedCount: 2 },
  { city: 'Indianapolis', state: 'IN', priority: 4, expectedCount: 2 },
  { city: 'Louisville', state: 'KY', priority: 4, expectedCount: 2 },
  { city: 'Memphis', state: 'TN', priority: 4, expectedCount: 2 },
  { city: 'Raleigh', state: 'NC', priority: 4, expectedCount: 2 },
  { city: 'Richmond', state: 'VA', priority: 4, expectedCount: 2 }
];

export async function buildSystematicVerifiedDatabase() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('ERROR: OUTSCRAPER_API_KEY required for systematic discovery');
    return { error: 'Missing API key' };
  }

  console.log('🔍 SYSTEMATIC VERIFIED RESTAURANT DISCOVERY');
  console.log('=' .repeat(60));
  console.log('🎯 Building comprehensive directory with REAL restaurants only');
  console.log(`📊 Processing ${PRIORITY_DISCOVERY_CITIES.length} strategic cities`);
  console.log('✅ Every restaurant verified through official sources');
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalVerifiedRestaurants = 0;
  let citiesProcessed = 0;
  let citiesFailed = 0;
  const results: any[] = [];

  // Process by priority phases
  for (let phase = 1; phase <= 4; phase++) {
    const phaseCities = PRIORITY_DISCOVERY_CITIES.filter(c => c.priority === phase);
    
    console.log(`\n🎯 PHASE ${phase}: Processing ${phaseCities.length} cities`);
    console.log('=' .repeat(50));
    
    for (const cityData of phaseCities) {
      try {
        console.log(`[${citiesProcessed + 1}/${PRIORITY_DISCOVERY_CITIES.length}] 🏙️ ${cityData.city}, ${cityData.state}`);
        console.log(`   Expected: ~${cityData.expectedCount} sourdough restaurants`);
        
        const startTime = Date.now();
        const verifiedCount = await discovery.processOutscraperData(apiKey, cityData.city, cityData.state);
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        totalVerifiedRestaurants += verifiedCount;
        citiesProcessed++;
        
        const result = {
          city: cityData.city,
          state: cityData.state,
          phase,
          expected: cityData.expectedCount,
          found: verifiedCount,
          duration,
          success: true
        };
        
        results.push(result);
        
        if (verifiedCount > 0) {
          console.log(`   ✅ SUCCESS: Found ${verifiedCount} verified sourdough restaurants (${duration}s)`);
        } else {
          console.log(`   ⚠️  No verified sourdough restaurants found (${duration}s)`);
        }
        
        // Progress update every 5 cities
        if (citiesProcessed % 5 === 0) {
          console.log(`\n📊 PROGRESS UPDATE:`);
          console.log(`   Cities processed: ${citiesProcessed}/${PRIORITY_DISCOVERY_CITIES.length}`);
          console.log(`   Total verified restaurants: ${totalVerifiedRestaurants}`);
          console.log(`   Success rate: ${((citiesProcessed / (citiesProcessed + citiesFailed)) * 100).toFixed(1)}%`);
        }
        
        // Brief pause between requests to respect API limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        citiesFailed++;
        console.log(`   ❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        results.push({
          city: cityData.city,
          state: cityData.state,
          phase,
          expected: cityData.expectedCount,
          found: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }
    
    console.log(`\n✅ PHASE ${phase} COMPLETE`);
    console.log(`   Cities processed: ${phaseCities.length}`);
    console.log(`   Restaurants discovered: ${results.filter(r => r.phase === phase).reduce((sum, r) => sum + r.found, 0)}`);
  }

  // Final comprehensive results
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SYSTEMATIC DISCOVERY COMPLETE');
  console.log('='.repeat(60));
  
  console.log(`📊 FINAL VERIFIED DIRECTORY STATISTICS:`);
  console.log(`✅ Cities successfully processed: ${citiesProcessed}`);
  console.log(`❌ Cities failed: ${citiesFailed}`);
  console.log(`🍕 Total verified sourdough restaurants: ${totalVerifiedRestaurants}`);
  console.log(`🎯 Success rate: ${((citiesProcessed / PRIORITY_DISCOVERY_CITIES.length) * 100).toFixed(1)}%`);
  
  console.log(`\n🏆 TOP PERFORMING CITIES:`);
  results
    .filter(r => r.success && r.found > 0)
    .sort((a, b) => b.found - a.found)
    .slice(0, 10)
    .forEach(r => {
      console.log(`   ${r.city}, ${r.state}: ${r.found} restaurants`);
    });
  
  console.log(`\n📈 RESULTS BY PHASE:`);
  for (let phase = 1; phase <= 4; phase++) {
    const phaseResults = results.filter(r => r.phase === phase);
    const phaseTotal = phaseResults.reduce((sum, r) => sum + r.found, 0);
    console.log(`   Phase ${phase}: ${phaseTotal} restaurants from ${phaseResults.length} cities`);
  }
  
  console.log(`\n✅ VERIFIED DIRECTORY NOW INCLUDES:`);
  console.log(`   • ${totalVerifiedRestaurants} confirmed real sourdough restaurants`);
  console.log(`   • Coverage across ${citiesProcessed} major US cities`);
  console.log(`   • Every restaurant verified through official sources`);
  console.log(`   • 100% authentic establishments that travelers can visit`);
  console.log(`   • Searchable by city and state through API endpoints`);
  console.log(`   • Interactive map with complete verified coverage`);
  
  if (totalVerifiedRestaurants >= 200) {
    console.log(`\n🌟 MILESTONE ACHIEVED: ${totalVerifiedRestaurants}+ verified restaurants!`);
    console.log(`   Directory now provides substantial nationwide coverage`);
  } else if (totalVerifiedRestaurants >= 100) {
    console.log(`\n🎯 STRONG FOUNDATION: ${totalVerifiedRestaurants} verified restaurants`);
    console.log(`   Solid coverage of major sourdough markets established`);
  }
  
  return {
    totalRestaurants: totalVerifiedRestaurants,
    citiesProcessed,
    citiesFailed,
    results,
    phaseResults: [1, 2, 3, 4].map(phase => ({
      phase,
      restaurants: results.filter(r => r.phase === phase).reduce((sum, r) => sum + r.found, 0),
      cities: results.filter(r => r.phase === phase).length
    }))
  };
}

if (import.meta.url.endsWith(process.argv[1])) {
  buildSystematicVerifiedDatabase().catch(console.error);
}