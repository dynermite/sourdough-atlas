#!/usr/bin/env tsx

/**
 * Simple CLI to run the complete 5-step sourdough pizza discovery system
 * 
 * Usage:
 *   npx tsx run-discovery.ts "San Francisco" "CA"
 *   npx tsx run-discovery.ts "Portland" "OR"
 *   npx tsx run-discovery.ts "Austin" "TX"
 */

import { runCompleteDiscovery } from './server/complete-discovery-system';

async function main() {
  const city = process.argv[2];
  const state = process.argv[3];

  if (!city || !state) {
    console.log('🔍 SOURDOUGH PIZZA DISCOVERY SYSTEM');
    console.log('='.repeat(50));
    console.log('Usage: npx tsx run-discovery.ts "<CITY>" "<STATE>"');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx run-discovery.ts "San Francisco" "CA"');
    console.log('  npx tsx run-discovery.ts "Portland" "OR"');
    console.log('  npx tsx run-discovery.ts "Austin" "TX"');
    console.log('  npx tsx run-discovery.ts "Seattle" "WA"');
    console.log('  npx tsx run-discovery.ts "Chicago" "IL"');
    console.log('');
    console.log('📋 Prerequisites:');
    console.log('  1. Set OUTSCRAPER_API_KEY environment variable');
    console.log('  2. Get free API key from https://outscraper.com/');
    console.log('  3. Ensure database is running');
    process.exit(1);
  }

  console.log(`🚀 Starting complete discovery for ${city}, ${state}...`);
  console.log('This will run the full 5-step workflow:');
  console.log('  1. Search for "sourdough pizza" and "artisan pizza"');
  console.log('  2. Analyze Google Business Profiles');
  console.log('  3. Scrape restaurant websites');
  console.log('  4. Check social media profiles');
  console.log('  5. Compile and add to database');
  console.log('');

  try {
    const results = await runCompleteDiscovery(city, state);
    
    console.log('\n🎉 DISCOVERY COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`📊 Total restaurants: ${results.total}`);
    console.log(`✅ Sourdough verified: ${results.verified}`);
    console.log(`📈 Success rate: ${results.success_rate.toFixed(1)}%`);
    console.log(`🗺️  All restaurants added to the map`);
    console.log('');
    console.log('Visit your application to see the results on the interactive map!');
    
  } catch (error) {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}