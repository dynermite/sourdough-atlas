#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Top 20 priority cities for comprehensive sourdough directory
const PRIORITY_CITIES = [
  { city: 'New York', state: 'NY', expectedSourdough: 25 },
  { city: 'Los Angeles', state: 'CA', expectedSourdough: 15 },
  { city: 'Chicago', state: 'IL', expectedSourdough: 20 },
  { city: 'Boston', state: 'MA', expectedSourdough: 12 },
  { city: 'Philadelphia', state: 'PA', expectedSourdough: 10 },
  { city: 'Washington', state: 'DC', expectedSourdough: 8 },
  { city: 'Atlanta', state: 'GA', expectedSourdough: 6 },
  { city: 'Dallas', state: 'TX', expectedSourdough: 8 },
  { city: 'Houston', state: 'TX', expectedSourdough: 8 },
  { city: 'Phoenix', state: 'AZ', expectedSourdough: 5 },
  { city: 'San Diego', state: 'CA', expectedSourdough: 10 },
  { city: 'Detroit', state: 'MI', expectedSourdough: 6 },
  { city: 'Minneapolis', state: 'MN', expectedSourdough: 8 },
  { city: 'Miami', state: 'FL', expectedSourdough: 4 },
  { city: 'Tampa', state: 'FL', expectedSourdough: 3 },
  { city: 'Nashville', state: 'TN', expectedSourdough: 6 },
  { city: 'Charlotte', state: 'NC', expectedSourdough: 4 },
  { city: 'Orlando', state: 'FL', expectedSourdough: 3 },
  { city: 'Las Vegas', state: 'NV', expectedSourdough: 3 },
  { city: 'San Antonio', state: 'TX', expectedSourdough: 4 }
];

export async function executePriorityBatchDiscovery() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY not found');
    return;
  }

  console.log('🚀 PRIORITY BATCH DISCOVERY - BUILDING CORE DIRECTORY');
  console.log('=' .repeat(60));
  console.log(`📊 Processing ${PRIORITY_CITIES.length} priority cities`);
  console.log(`🎯 Expected: ${PRIORITY_CITIES.reduce((sum, c) => sum + c.expectedSourdough, 0)}+ sourdough restaurants`);
  console.log(`💰 Cost: $${(PRIORITY_CITIES.length * 0.001).toFixed(3)}`);
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalSourdoughFound = 0;
  let citiesCompleted = 0;
  const results: any[] = [];

  console.log('\n🏙️  PROCESSING PRIORITY CITIES:');
  console.log('=' .repeat(40));

  for (const cityData of PRIORITY_CITIES) {
    const { city, state, expectedSourdough } = cityData;
    
    try {
      console.log(`\n[${citiesCompleted + 1}/${PRIORITY_CITIES.length}] 🍕 ${city}, ${state}`);
      console.log(`Expected sourdough restaurants: ${expectedSourdough}`);
      
      const startTime = Date.now();
      const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      totalSourdoughFound += sourdoughFound;
      citiesCompleted++;
      
      results.push({
        city,
        state,
        sourdoughFound,
        expectedSourdough,
        processingTime
      });
      
      console.log(`✅ ${city}: Found ${sourdoughFound} sourdough restaurants (${processingTime}s)`);
      
      // Quick status update
      if (citiesCompleted % 5 === 0) {
        console.log(`\n📊 Progress: ${citiesCompleted}/${PRIORITY_CITIES.length} cities, ${totalSourdoughFound} restaurants found`);
      }
      
    } catch (error) {
      console.log(`❌ ${city}: Failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Final results
  console.log('\n' + '='.repeat(60));
  console.log('🎉 PRIORITY DISCOVERY COMPLETE!');
  console.log('='.repeat(60));
  
  console.log(`📊 DIRECTORY RESULTS:`);
  console.log(`✅ Cities processed: ${citiesCompleted}/${PRIORITY_CITIES.length}`);
  console.log(`🍕 Sourdough restaurants found: ${totalSourdoughFound}`);
  console.log(`🎯 Coverage: ${((citiesCompleted / PRIORITY_CITIES.length) * 100).toFixed(1)}%`);
  
  console.log(`\n🏆 TOP PERFORMING CITIES:`);
  results
    .sort((a, b) => b.sourdoughFound - a.sourdoughFound)
    .slice(0, 10)
    .forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.city}, ${r.state}: ${r.sourdoughFound} restaurants`);
    });
  
  console.log(`\n🗺️  DIRECTORY NOW SEARCHABLE BY:`);
  console.log(`   • City: /api/restaurants/city/:city`);
  console.log(`   • State: /api/restaurants/state/:state`);
  console.log(`   • Interactive map with zoom filtering`);
  console.log(`   • Complete restaurant details and directions`);
  
  return {
    totalRestaurants: totalSourdoughFound,
    citiesProcessed: citiesCompleted,
    results
  };
}

if (import.meta.url.endsWith(process.argv[1])) {
  executePriorityBatchDiscovery().catch(console.error);
}