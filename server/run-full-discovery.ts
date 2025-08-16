#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Strategic cities for initial discovery - Phase 1 high-value targets
const PHASE_1_CITIES = [
  { city: 'New York', state: 'NY', tier: 1 },
  { city: 'Los Angeles', state: 'CA', tier: 1 },
  { city: 'Chicago', state: 'IL', tier: 1 },
  { city: 'Boston', state: 'MA', tier: 1 },
  { city: 'Philadelphia', state: 'PA', tier: 1 },
  { city: 'Washington', state: 'DC', tier: 1 },
  { city: 'Denver', state: 'CO', tier: 1 },
  { city: 'Portland', state: 'OR', tier: 1 },
  { city: 'Seattle', state: 'WA', tier: 1 },
  { city: 'Austin', state: 'TX', tier: 1 },
  { city: 'Atlanta', state: 'GA', tier: 1 },
  { city: 'Miami', state: 'FL', tier: 1 },
  { city: 'Dallas', state: 'TX', tier: 1 },
  { city: 'Houston', state: 'TX', tier: 1 },
  { city: 'Phoenix', state: 'AZ', tier: 1 },
  { city: 'San Diego', state: 'CA', tier: 1 },
  { city: 'Detroit', state: 'MI', tier: 1 },
  { city: 'Minneapolis', state: 'MN', tier: 1 },
  { city: 'Nashville', state: 'TN', tier: 1 },
  { city: 'Las Vegas', state: 'NV', tier: 1 }
];

async function executeFullDiscovery() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY not found in environment');
    console.log('Please ensure the API key is properly configured');
    return;
  }

  console.log('🚀 EXECUTING COMPREHENSIVE NATIONWIDE SOURDOUGH DISCOVERY');
  console.log('============================================================');
  console.log(`📊 Processing ${PHASE_1_CITIES.length} strategic cities`);
  console.log(`🎯 Goal: Discover 500-1,500 authentic sourdough restaurants`);
  console.log(`💰 Estimated cost: $${(PHASE_1_CITIES.length * 0.001).toFixed(3)}`);
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalSourdoughFound = 0;
  let totalRestaurantsProcessed = 0;
  let citiesCompleted = 0;
  let failedCities = 0;

  console.log('\n🏙️  PROCESSING CITIES:');
  console.log('=' .repeat(50));

  for (const cityData of PHASE_1_CITIES) {
    const { city, state } = cityData;
    
    try {
      console.log(`\n[${citiesCompleted + 1}/${PHASE_1_CITIES.length}] 🍕 ${city}, ${state}`);
      console.log('-'.repeat(40));
      
      const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
      
      totalSourdoughFound += sourdoughFound;
      citiesCompleted++;
      
      console.log(`✅ ${city}: Found ${sourdoughFound} verified sourdough restaurants`);
      
      // Brief pause between cities to respect API limits
      if (citiesCompleted < PHASE_1_CITIES.length) {
        console.log('⏸️  Pausing 1 second between cities...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      failedCities++;
      console.log(`❌ ${city}: Discovery failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Final Results Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 NATIONWIDE DISCOVERY COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 FINAL RESULTS:`);
  console.log(`✅ Cities successfully processed: ${citiesCompleted}`);
  console.log(`❌ Cities failed: ${failedCities}`);
  console.log(`🍕 Total sourdough restaurants discovered: ${totalSourdoughFound}`);
  console.log(`🎯 Success rate: ${((citiesCompleted / PHASE_1_CITIES.length) * 100).toFixed(1)}%`);
  
  if (totalSourdoughFound > 0) {
    console.log(`\n🗺️  Your sourdough directory now covers ${citiesCompleted} major cities!`);
    console.log(`🧭 Travelers can now find authentic sourdough pizza nationwide`);
  }
  
  console.log('\n📈 Database ready for user queries and map visualization');
}

if (import.meta.url.endsWith(process.argv[1])) {
  executeFullDiscovery().catch(console.error);
}

export { executeFullDiscovery };