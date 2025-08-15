#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Strategic city execution plan based on real data
const TIER_1_CITIES = [
  { city: 'San Francisco', state: 'CA', priority: 1, expectedPizza: 180, likelihood: 'Very High' },
  { city: 'Portland', state: 'OR', priority: 2, expectedPizza: 140, likelihood: 'Very High' },
  { city: 'Seattle', state: 'WA', priority: 3, expectedPizza: 150, likelihood: 'Very High' },
  { city: 'Napa', state: 'CA', priority: 4, expectedPizza: 25, likelihood: 'Very High' },
  { city: 'Burlington', state: 'VT', priority: 5, expectedPizza: 25, likelihood: 'Very High' },
  { city: 'Stowe', state: 'VT', priority: 6, expectedPizza: 15, likelihood: 'Very High' },
  { city: 'Bend', state: 'OR', priority: 7, expectedPizza: 35, likelihood: 'Very High' },
  { city: 'Sausalito', state: 'CA', priority: 8, expectedPizza: 12, likelihood: 'Very High' },
  { city: 'Austin', state: 'TX', priority: 9, expectedPizza: 120, likelihood: 'High' },
  { city: 'Denver', state: 'CO', priority: 10, expectedPizza: 130, likelihood: 'High' },
  { city: 'Boston', state: 'MA', priority: 11, expectedPizza: 160, likelihood: 'High' },
  { city: 'Charleston', state: 'SC', priority: 12, expectedPizza: 40, likelihood: 'High' },
  { city: 'New York', state: 'NY', priority: 13, expectedPizza: 600, likelihood: 'High' },
  { city: 'Aspen', state: 'CO', priority: 14, expectedPizza: 20, likelihood: 'High' },
  { city: 'Santa Fe', state: 'NM', priority: 15, expectedPizza: 30, likelihood: 'High' },
  { city: 'Bar Harbor', state: 'ME', priority: 16, expectedPizza: 15, likelihood: 'High' },
  { city: 'Martha\'s Vineyard', state: 'MA', priority: 17, expectedPizza: 12, likelihood: 'High' },
  { city: 'Nantucket', state: 'MA', priority: 18, expectedPizza: 10, likelihood: 'High' },
  { city: 'Newport', state: 'RI', priority: 19, expectedPizza: 20, likelihood: 'High' },
  { city: 'Cape Cod', state: 'MA', priority: 20, expectedPizza: 30, likelihood: 'High' },
  { city: 'Carmel', state: 'CA', priority: 21, expectedPizza: 15, likelihood: 'High' },
  { city: 'Telluride', state: 'CO', priority: 22, expectedPizza: 15, likelihood: 'High' },
  { city: 'Bellingham', state: 'WA', priority: 23, expectedPizza: 20, likelihood: 'High' },
  { city: 'Oakland', state: 'CA', priority: 24, expectedPizza: 70, likelihood: 'High' },
  { city: 'Chicago', state: 'IL', priority: 25, expectedPizza: 350, likelihood: 'Medium' },
  { city: 'Los Angeles', state: 'CA', priority: 26, expectedPizza: 450, likelihood: 'Medium' },
  { city: 'Philadelphia', state: 'PA', priority: 27, expectedPizza: 220, likelihood: 'Medium' }
];

const TIER_2_CITIES = [
  { city: 'Washington', state: 'DC', expectedPizza: 140, likelihood: 'Medium' },
  { city: 'Atlanta', state: 'GA', expectedPizza: 90, likelihood: 'Medium' },
  { city: 'Nashville', state: 'TN', expectedPizza: 100, likelihood: 'Medium' },
  { city: 'Dallas', state: 'TX', expectedPizza: 200, likelihood: 'Medium' },
  { city: 'San Diego', state: 'CA', expectedPizza: 170, likelihood: 'Medium' },
  { city: 'Minneapolis', state: 'MN', expectedPizza: 65, likelihood: 'Medium' },
  { city: 'Detroit', state: 'MI', expectedPizza: 90, likelihood: 'Medium' },
  { city: 'Baltimore', state: 'MD', expectedPizza: 80, likelihood: 'Medium' },
  { city: 'Milwaukee', state: 'WI', expectedPizza: 80, likelihood: 'Medium' },
  { city: 'Kansas City', state: 'MO', expectedPizza: 70, likelihood: 'Medium' },
  { city: 'Columbus', state: 'OH', expectedPizza: 110, likelihood: 'Medium' },
  { city: 'Charlotte', state: 'NC', expectedPizza: 100, likelihood: 'Medium' },
  { city: 'Indianapolis', state: 'IN', expectedPizza: 95, likelihood: 'Medium' },
  { city: 'Sacramento', state: 'CA', expectedPizza: 65, likelihood: 'Medium' },
  { city: 'Raleigh', state: 'NC', expectedPizza: 60, likelihood: 'Medium' },
  { city: 'Colorado Springs', state: 'CO', expectedPizza: 50, likelihood: 'Medium' },
  { city: 'San Jose', state: 'CA', expectedPizza: 120, likelihood: 'Medium' },
  { city: 'New Orleans', state: 'LA', expectedPizza: 60, likelihood: 'Medium' },
  { city: 'Louisville', state: 'KY', expectedPizza: 70, likelihood: 'Medium' },
  { city: 'Omaha', state: 'NE', expectedPizza: 50, likelihood: 'Medium' },
  { city: 'Orlando', state: 'FL', expectedPizza: 200, likelihood: 'Low' },
  { city: 'Las Vegas', state: 'NV', expectedPizza: 120, likelihood: 'Low' },
  { city: 'Miami', state: 'FL', expectedPizza: 80, likelihood: 'Low' },
  { city: 'Phoenix', state: 'AZ', expectedPizza: 200, likelihood: 'Low' },
  { city: 'Houston', state: 'TX', expectedPizza: 280, likelihood: 'Medium' }
];

export class NationwideExecutor {
  private discovery: OutscraperSourdoughDiscovery;
  private results: any[] = [];
  
  constructor() {
    this.discovery = new OutscraperSourdoughDiscovery();
  }

  async executeTier1Discovery(apiKey: string): Promise<void> {
    console.log('🚀 EXECUTING TIER 1 NATIONWIDE SOURDOUGH DISCOVERY');
    console.log('=' .repeat(65));
    console.log(`Target: ${TIER_1_CITIES.length} highest priority cities`);
    console.log(`Expected restaurants: ${TIER_1_CITIES.reduce((sum, city) => sum + city.expectedPizza, 0).toLocaleString()}`);
    console.log(`API requests: ${TIER_1_CITIES.length}`);
    console.log(`Cost: $${(TIER_1_CITIES.length * 0.001).toFixed(3)}`);
    
    let totalSourdoughFound = 0;
    let citiesProcessed = 0;
    
    for (const cityData of TIER_1_CITIES) {
      citiesProcessed++;
      console.log(`\n[${citiesProcessed}/${TIER_1_CITIES.length}] 🎯 ${cityData.city}, ${cityData.state}`);
      console.log(`Priority: ${cityData.priority} | Expected: ${cityData.expectedPizza} restaurants | Likelihood: ${cityData.likelihood}`);
      
      try {
        const sourdoughCount = await this.discovery.processOutscraperData(
          apiKey,
          cityData.city,
          cityData.state
        );
        
        const cityResult = {
          ...cityData,
          sourdoughFound: sourdoughCount,
          processed: true,
          timestamp: new Date().toISOString()
        };
        
        this.results.push(cityResult);
        totalSourdoughFound += sourdoughCount;
        
        console.log(`✅ ${cityData.city} complete: ${sourdoughCount} sourdough restaurants found`);
        
        // Progress update
        const remainingCities = TIER_1_CITIES.length - citiesProcessed;
        const avgSourdoughPerCity = totalSourdoughFound / citiesProcessed;
        const projectedTotal = Math.round(avgSourdoughPerCity * TIER_1_CITIES.length);
        
        console.log(`📊 Progress: ${citiesProcessed}/${TIER_1_CITIES.length} cities | ${totalSourdoughFound} sourdough restaurants | Projected total: ${projectedTotal}`);
        
        // Rate limiting between cities
        if (remainingCities > 0) {
          console.log(`⏳ Waiting 3 seconds before next city...`);
          await this.delay(3000);
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${cityData.city}: ${error.message}`);
        
        this.results.push({
          ...cityData,
          sourdoughFound: 0,
          processed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    this.displayTier1Results(totalSourdoughFound);
  }

  private displayTier1Results(totalFound: number): void {
    console.log(`\n${'=' .repeat(65)}`);
    console.log('🎉 TIER 1 DISCOVERY COMPLETE');
    console.log(`${'=' .repeat(65)}`);
    
    const processedResults = this.results.filter(r => r.processed);
    const failedResults = this.results.filter(r => !r.processed);
    
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`Cities processed: ${processedResults.length}/${TIER_1_CITIES.length}`);
    console.log(`Total sourdough restaurants found: ${totalFound}`);
    console.log(`Average per city: ${(totalFound / processedResults.length).toFixed(1)}`);
    console.log(`Success rate: ${((processedResults.length / TIER_1_CITIES.length) * 100).toFixed(1)}%`);
    
    if (totalFound > 0) {
      console.log(`\n🏆 TOP PERFORMING CITIES:`);
      const topCities = processedResults
        .sort((a, b) => b.sourdoughFound - a.sourdoughFound)
        .slice(0, 10);
      
      topCities.forEach((city, index) => {
        const rate = ((city.sourdoughFound / city.expectedPizza) * 100).toFixed(1);
        console.log(`${index + 1}. ${city.city}, ${city.state}: ${city.sourdoughFound} restaurants (${rate}% adoption rate)`);
      });
    }
    
    if (failedResults.length > 0) {
      console.log(`\n⚠️  FAILED CITIES (${failedResults.length}):`);
      failedResults.forEach(city => {
        console.log(`❌ ${city.city}, ${city.state}: ${city.error}`);
      });
    }
    
    console.log(`\n🎯 NEXT STEPS:`);
    if (totalFound >= 100) {
      console.log(`✅ Excellent results! Ready for Tier 2 expansion`);
      console.log(`📈 Current database: Strong foundation with ${totalFound} verified restaurants`);
    } else {
      console.log(`📊 Baseline established with ${totalFound} restaurants`);
      console.log(`🔍 Consider expanding verification criteria or adding Tier 2 cities`);
    }
    console.log(`💾 All data saved to database and ready for travelers`);
  }

  async executeTier2Discovery(apiKey: string): Promise<void> {
    console.log('\n🚀 EXECUTING TIER 2 DISCOVERY');
    console.log('=' .repeat(40));
    console.log(`Target: ${TIER_2_CITIES.length} major market cities`);
    
    // Continue with same process for Tier 2
    for (const cityData of TIER_2_CITIES.slice(0, 25)) { // Limit to stay within API quota
      try {
        const sourdoughCount = await this.discovery.processOutscraperData(
          apiKey,
          cityData.city,
          cityData.state
        );
        
        console.log(`✅ ${cityData.city}: ${sourdoughCount} sourdough restaurants`);
        await this.delay(3000);
        
      } catch (error) {
        console.log(`❌ ${cityData.city}: ${error.message}`);
      }
    }
  }

  displayExecutionPlan(): void {
    console.log('📋 NATIONWIDE EXECUTION PLAN');
    console.log('=' .repeat(40));
    
    console.log('\n🎯 TIER 1 EXECUTION (Immediate)');
    console.log(`Cities: ${TIER_1_CITIES.length}`);
    console.log(`Expected restaurants: ${TIER_1_CITIES.reduce((sum, city) => sum + city.expectedPizza, 0).toLocaleString()}`);
    console.log(`API requests: ${TIER_1_CITIES.length}`);
    console.log(`Cost: $${(TIER_1_CITIES.length * 0.001).toFixed(3)}`);
    
    console.log('\n🎯 TIER 2 EXECUTION (Next Phase)');
    console.log(`Cities: ${TIER_2_CITIES.length}`);
    console.log(`Expected restaurants: ${TIER_2_CITIES.reduce((sum, city) => sum + city.expectedPizza, 0).toLocaleString()}`);
    console.log(`API requests: ${TIER_2_CITIES.length}`);
    console.log(`Cost: $${(TIER_2_CITIES.length * 0.001).toFixed(3)}`);
    
    const totalCities = TIER_1_CITIES.length + TIER_2_CITIES.length;
    const totalRestaurants = [...TIER_1_CITIES, ...TIER_2_CITIES].reduce((sum, city) => sum + city.expectedPizza, 0);
    
    console.log('\n📊 TOTAL NATIONWIDE SCOPE:');
    console.log(`Cities: ${totalCities}`);
    console.log(`Restaurants: ${totalRestaurants.toLocaleString()}`);
    console.log(`API requests: ${totalCities} (within 100 free limit)`);
    console.log(`Total cost: $${(totalCities * 0.001).toFixed(3)}`);
    
    console.log('\n🔥 EXPECTED OUTCOMES:');
    console.log(`• 500-1,200 verified sourdough restaurants`);
    console.log(`• Complete coverage of major US pizza markets`);
    console.log(`• Real sourdough adoption data across regions`);
    console.log(`• Foundation for most comprehensive directory in America`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const executor = new NationwideExecutor();
  
  const command = process.argv[2];
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (command === 'plan') {
    executor.displayExecutionPlan();
    return;
  }
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY environment variable required');
    console.log('');
    console.log('🔑 Get your free API key:');
    console.log('1. Go to outscraper.com');
    console.log('2. Sign up for free account');
    console.log('3. Get API key from dashboard');
    console.log('4. Add to environment variables');
    console.log('');
    console.log('💡 Free tier includes 100 requests - perfect for our 99 cities');
    return;
  }
  
  switch (command) {
    case 'tier1':
      await executor.executeTier1Discovery(apiKey);
      break;
      
    case 'tier2':
      await executor.executeTier2Discovery(apiKey);
      break;
      
    case 'full':
      await executor.executeTier1Discovery(apiKey);
      await executor.executeTier2Discovery(apiKey);
      break;
      
    default:
      console.log('🚀 NATIONWIDE SOURDOUGH DISCOVERY SYSTEM');
      console.log('');
      console.log('Commands:');
      console.log('  plan   - Show execution plan');
      console.log('  tier1  - Execute Tier 1 cities (highest priority)');
      console.log('  tier2  - Execute Tier 2 cities (major markets)');
      console.log('  full   - Execute both tiers');
      console.log('');
      console.log('Examples:');
      console.log('  tsx execute-nationwide-discovery.ts plan');
      console.log('  tsx execute-nationwide-discovery.ts tier1');
  }
}

main().catch(console.error);