#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Strategic 50-city comprehensive directory plan
const COMPREHENSIVE_CITIES = [
  // Major metros with high sourdough potential
  'New York,NY', 'Los Angeles,CA', 'Chicago,IL', 'Houston,TX', 'Phoenix,AZ',
  'Philadelphia,PA', 'San Antonio,TX', 'San Diego,CA', 'Dallas,TX', 'Austin,TX',
  'Jacksonville,FL', 'Fort Worth,TX', 'Columbus,OH', 'Charlotte,NC', 'San Francisco,CA',
  'Indianapolis,IN', 'Seattle,WA', 'Denver,CO', 'Washington,DC', 'Boston,MA',
  'El Paso,TX', 'Nashville,TN', 'Detroit,MI', 'Oklahoma City,OK', 'Portland,OR',
  'Las Vegas,NV', 'Memphis,TN', 'Louisville,KY', 'Baltimore,MD', 'Milwaukee,WI',
  'Albuquerque,NM', 'Tucson,AZ', 'Fresno,CA', 'Mesa,AZ', 'Sacramento,CA',
  'Atlanta,GA', 'Kansas City,MO', 'Colorado Springs,CO', 'Omaha,NE', 'Raleigh,NC',
  'Miami,FL', 'Long Beach,CA', 'Virginia Beach,VA', 'Oakland,CA', 'Minneapolis,MN',
  'Tampa,FL', 'Arlington,TX', 'New Orleans,LA', 'Wichita,KS', 'Cleveland,OH'
];

export async function buildRapidDirectory() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY not found');
    return;
  }

  console.log('🚀 RAPID DIRECTORY BUILDER - COMPREHENSIVE 50-CITY SCAN');
  console.log('=' .repeat(65));
  console.log(`📊 Building searchable directory with ${COMPREHENSIVE_CITIES.length} cities`);
  console.log(`🎯 Target: 200-500 verified sourdough restaurants`);
  console.log(`🗺️  Coverage: All major US markets + high-potential cities`);
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalFound = 0;
  let processed = 0;

  console.log('\n🏗️  BUILDING DIRECTORY:');

  // Process cities in batches of 10
  const batchSize = 10;
  for (let i = 0; i < COMPREHENSIVE_CITIES.length; i += batchSize) {
    const batch = COMPREHENSIVE_CITIES.slice(i, i + batchSize);
    
    console.log(`\n📦 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(COMPREHENSIVE_CITIES.length/batchSize)}: ${batch.length} cities`);
    
    for (const cityState of batch) {
      const [city, state] = cityState.split(',');
      
      try {
        console.log(`[${processed + 1}] ${city}, ${state}`);
        
        const found = await discovery.processOutscraperData(apiKey, city, state);
        totalFound += found;
        processed++;
        
        if (found > 0) {
          console.log(`  ✅ +${found} restaurants`);
        }
        
      } catch (error) {
        console.log(`  ❌ Failed`);
      }
    }
    
    console.log(`📊 Progress: ${processed}/${COMPREHENSIVE_CITIES.length} cities, ${totalFound} total restaurants`);
  }

  console.log('\n🎉 DIRECTORY BUILD COMPLETE!');
  console.log(`📊 Final Results: ${totalFound} sourdough restaurants from ${processed} cities`);
  console.log('🗺️  Directory ready for user searches and map visualization');
  
  return { totalFound, processed };
}

if (import.meta.url.endsWith(process.argv[1])) {
  buildRapidDirectory().catch(console.error);
}