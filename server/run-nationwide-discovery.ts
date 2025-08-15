#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Strategic Tier 1 cities for immediate execution
const TIER_1_CITIES = [
  { city: 'San Francisco', state: 'CA', priority: 1, expectedPizza: 180, likelihood: 'Very High' },
  { city: 'Portland', state: 'OR', priority: 2, expectedPizza: 140, likelihood: 'Very High' },
  { city: 'Seattle', state: 'WA', priority: 3, expectedPizza: 150, likelihood: 'Very High' },
  { city: 'Austin', state: 'TX', priority: 4, expectedPizza: 120, likelihood: 'High' },
  { city: 'Denver', state: 'CO', priority: 5, expectedPizza: 130, likelihood: 'High' },
  { city: 'Boston', state: 'MA', priority: 6, expectedPizza: 160, likelihood: 'High' },
  { city: 'Napa', state: 'CA', priority: 7, expectedPizza: 25, likelihood: 'Very High' },
  { city: 'Burlington', state: 'VT', priority: 8, expectedPizza: 25, likelihood: 'Very High' },
  { city: 'Charleston', state: 'SC', priority: 9, expectedPizza: 40, likelihood: 'High' },
  { city: 'Santa Fe', state: 'NM', priority: 10, expectedPizza: 30, likelihood: 'High' }
];

export class NationwideDiscoveryRunner {
  private discovery: OutscraperSourdoughDiscovery;
  
  constructor() {
    this.discovery = new OutscraperSourdoughDiscovery();
  }

  async runTier1Discovery(apiKey: string): Promise<void> {
    console.log('🚀 STARTING TIER 1 NATIONWIDE DISCOVERY');
    console.log('=' .repeat(50));
    console.log(`Cities to process: ${TIER_1_CITIES.length}`);
    console.log(`Expected restaurants: ${TIER_1_CITIES.reduce((sum, city) => sum + city.expectedPizza, 0).toLocaleString()}`);
    
    let totalFound = 0;
    let citiesProcessed = 0;
    
    for (const cityData of TIER_1_CITIES.slice(0, 5)) { // Start with first 5 cities
      citiesProcessed++;
      console.log(`\n[${citiesProcessed}/5] Processing ${cityData.city}, ${cityData.state}`);
      console.log(`Expected: ${cityData.expectedPizza} restaurants | Likelihood: ${cityData.likelihood}`);
      
      try {
        const sourdoughCount = await this.discovery.processOutscraperData(
          apiKey,
          cityData.city,
          cityData.state
        );
        
        totalFound += sourdoughCount;
        console.log(`✅ ${cityData.city} complete: ${sourdoughCount} sourdough restaurants found`);
        
        // Show progress
        const avgPerCity = totalFound / citiesProcessed;
        console.log(`📊 Progress: ${citiesProcessed}/5 cities | Total found: ${totalFound} | Average: ${avgPerCity.toFixed(1)} per city`);
        
        // Rate limiting
        if (citiesProcessed < 5) {
          console.log('⏳ Waiting 5 seconds before next city...');
          await this.delay(5000);
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${cityData.city}: ${error.message}`);
      }
    }
    
    console.log(`\n${'=' .repeat(50)}`);
    console.log('🎉 TIER 1 PHASE 1 COMPLETE');
    console.log(`Cities processed: ${citiesProcessed}`);
    console.log(`Total sourdough restaurants found: ${totalFound}`);
    console.log(`Average per city: ${(totalFound / citiesProcessed).toFixed(1)}`);
    
    if (totalFound > 0) {
      console.log(`\n🚀 SUCCESS! Your database now has ${totalFound} additional verified sourdough restaurants.`);
      console.log('Ready to continue with remaining Tier 1 cities and expand nationwide.');
    } else {
      console.log('\n⚠️  No new sourdough restaurants found in this batch.');
      console.log('This could indicate API issues or very low sourdough adoption in these markets.');
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Execute if API key provided as argument
async function main() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('❌ Please provide your Outscraper API key as an argument');
    console.log('Usage: tsx run-nationwide-discovery.ts YOUR_API_KEY');
    console.log('');
    console.log('This will start the nationwide discovery with the first 5 Tier 1 cities:');
    TIER_1_CITIES.slice(0, 5).forEach((city, index) => {
      console.log(`${index + 1}. ${city.city}, ${city.state} (${city.likelihood} likelihood)`);
    });
    return;
  }
  
  const runner = new NationwideDiscoveryRunner();
  await runner.runTier1Discovery(apiKey);
}

main().catch(console.error);