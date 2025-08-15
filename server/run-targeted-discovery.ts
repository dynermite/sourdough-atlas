#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

const PRIORITY_CITIES = [
  { city: 'Portland', state: 'OR' },
  { city: 'Seattle', state: 'WA' },
  { city: 'Austin', state: 'TX' },
  { city: 'Denver', state: 'CO' },
  { city: 'Chicago', state: 'IL' }
];

async function runTargetedDiscovery() {
  console.log('🚀 STARTING TARGETED SOURDOUGH DISCOVERY');
  console.log('=================================================');
  console.log(`Processing ${PRIORITY_CITIES.length} high-priority cities`);
  
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  if (!apiKey) {
    console.error('❌ OUTSCRAPER_API_KEY not found in environment');
    process.exit(1);
  }
  
  const discovery = new OutscraperSourdoughDiscovery(apiKey);
  let totalFound = 0;
  let totalAnalyzed = 0;
  
  for (let i = 0; i < PRIORITY_CITIES.length; i++) {
    const { city, state } = PRIORITY_CITIES[i];
    
    console.log(`\n[${i + 1}/${PRIORITY_CITIES.length}] Processing ${city}, ${state}`);
    console.log('-'.repeat(50));
    
    try {
      const sourdoughFound = await discovery.processOutscraperData(apiKey, city, state);
      
      console.log(`✅ Found ${sourdoughFound} sourdough restaurants in ${city}`);
      
      totalFound += sourdoughFound;
      
      // Brief pause between cities
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Error processing ${city}, ${state}:`, error.message);
    }
  }
  
  console.log('\n🎉 DISCOVERY COMPLETE');
  console.log('='.repeat(50));
  console.log(`Total pizza restaurants analyzed: ${totalAnalyzed}`);
  console.log(`Total sourdough restaurants found: ${totalFound}`);
  console.log(`Overall sourdough adoption rate: ${((totalFound / totalAnalyzed) * 100).toFixed(1)}%`);
  
  console.log('\n📊 Database now contains authentic sourdough restaurants for travelers!');
}

runTargetedDiscovery().catch(console.error);