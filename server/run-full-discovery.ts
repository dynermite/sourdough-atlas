#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Strategic 30-city plan for maximum verified restaurant discovery
const PRIORITY_DISCOVERY_PLAN = [
  // Tier 1: Proven high-yield markets
  'Los Angeles,CA', 'San Diego,CA', 'Oakland,CA', 'Sacramento,CA',
  'Denver,CO', 'Boulder,CO', 'Washington,DC', 
  'Miami,FL', 'Tampa,FL', 'Atlanta,GA',
  'Boston,MA', 'Cambridge,MA', 'Minneapolis,MN',
  'Las Vegas,NV', 'Brooklyn,NY', 'Buffalo,NY',
  'Cleveland,OH', 'Columbus,OH', 'Pittsburgh,PA',
  'Nashville,TN', 'Memphis,TN', 'Dallas,TX', 'Houston,TX',
  'Salt Lake City,UT', 'Richmond,VA', 'Milwaukee,WI',
  'Detroit,MI', 'Baltimore,MD', 'New Orleans,LA', 'Louisville,KY'
];

export async function runFullDiscovery() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('OUTSCRAPER_API_KEY required for comprehensive discovery');
    return { error: 'Missing API key' };
  }

  console.log('🚀 COMPREHENSIVE VERIFIED RESTAURANT DISCOVERY');
  console.log('=' .repeat(60));
  console.log(`📊 Processing ${PRIORITY_DISCOVERY_PLAN.length} strategic cities`);
  console.log('✅ Only adding verified, real sourdough restaurants');
  
  const discovery = new OutscraperSourdoughDiscovery();
  let totalVerified = 0;
  let processed = 0;
  let failed = 0;

  console.log('\n🔍 BEGINNING SYSTEMATIC DISCOVERY:');

  for (const cityState of PRIORITY_DISCOVERY_PLAN) {
    const [city, state] = cityState.split(',');
    
    try {
      console.log(`[${processed + 1}/${PRIORITY_DISCOVERY_PLAN.length}] ${city}, ${state}`);
      
      const verified = await discovery.processOutscraperData(apiKey, city, state);
      totalVerified += verified;
      processed++;
      
      if (verified > 0) {
        console.log(`  ✅ +${verified} verified restaurants`);
      } else {
        console.log(`  ⚠️  No verified restaurants found`);
      }
      
      if (processed % 10 === 0) {
        console.log(`\n📊 Progress: ${processed}/${PRIORITY_DISCOVERY_PLAN.length} cities, ${totalVerified} total verified restaurants\n`);
      }
      
    } catch (error) {
      failed++;
      console.log(`  ❌ Failed`);
    }
  }

  console.log('\n🎉 COMPREHENSIVE DISCOVERY COMPLETE!');
  console.log(`📊 Final Results: ${totalVerified} verified restaurants from ${processed} cities`);
  console.log(`🗺️  Directory ready for nationwide searches and map visualization`);
  
  return { totalVerified, processed, failed };
}

if (import.meta.url.endsWith(process.argv[1])) {
  runFullDiscovery().catch(console.error);
}