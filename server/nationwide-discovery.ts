#!/usr/bin/env tsx

import { OutscraperSourdoughDiscovery } from './outscraper-integration';

// Major US cities for comprehensive pizza discovery
const majorUSCities = [
  // Phase 1: Sourdough Strongholds
  { city: 'San Francisco', state: 'CA', phase: 1, priority: 'High' },
  { city: 'Portland', state: 'OR', phase: 1, priority: 'High' },
  { city: 'Seattle', state: 'WA', phase: 1, priority: 'High' },
  { city: 'Austin', state: 'TX', phase: 1, priority: 'High' },
  { city: 'Brooklyn', state: 'NY', phase: 1, priority: 'High' },
  
  // Phase 2: Major Metro Areas
  { city: 'New York', state: 'NY', phase: 2, priority: 'High' },
  { city: 'Los Angeles', state: 'CA', phase: 2, priority: 'High' },
  { city: 'Chicago', state: 'IL', phase: 2, priority: 'High' },
  { city: 'Boston', state: 'MA', phase: 2, priority: 'High' },
  { city: 'Denver', state: 'CO', phase: 2, priority: 'High' },
  { city: 'Philadelphia', state: 'PA', phase: 2, priority: 'High' },
  
  // Phase 3: Secondary Markets
  { city: 'Nashville', state: 'TN', phase: 3, priority: 'Medium' },
  { city: 'Atlanta', state: 'GA', phase: 3, priority: 'Medium' },
  { city: 'Phoenix', state: 'AZ', phase: 3, priority: 'Medium' },
  { city: 'San Diego', state: 'CA', phase: 3, priority: 'Medium' },
  { city: 'Tampa', state: 'FL', phase: 3, priority: 'Medium' },
  { city: 'Miami', state: 'FL', phase: 3, priority: 'Medium' },
  { city: 'Orlando', state: 'FL', phase: 3, priority: 'Medium' },
  { city: 'Las Vegas', state: 'NV', phase: 3, priority: 'Medium' },
  { city: 'Salt Lake City', state: 'UT', phase: 3, priority: 'Medium' },
  { city: 'Minneapolis', state: 'MN', phase: 3, priority: 'Medium' },
  
  // Phase 4: Comprehensive Coverage
  { city: 'Sacramento', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'San Jose', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Oakland', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Long Beach', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Fresno', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Mesa', state: 'AZ', phase: 4, priority: 'Low' },
  { city: 'Virginia Beach', state: 'VA', phase: 4, priority: 'Low' },
  { city: 'Atlanta', state: 'GA', phase: 4, priority: 'Low' },
  { city: 'Colorado Springs', state: 'CO', phase: 4, priority: 'Low' },
  { city: 'Raleigh', state: 'NC', phase: 4, priority: 'Low' },
  { city: 'Omaha', state: 'NE', phase: 4, priority: 'Low' },
  { city: 'Miami', state: 'FL', phase: 4, priority: 'Low' },
  { city: 'Cleveland', state: 'OH', phase: 4, priority: 'Low' },
  { city: 'Tulsa', state: 'OK', phase: 4, priority: 'Low' },
  { city: 'Arlington', state: 'TX', phase: 4, priority: 'Low' },
  { city: 'New Orleans', state: 'LA', phase: 4, priority: 'Low' },
  { city: 'Wichita', state: 'KS', phase: 4, priority: 'Low' },
  { city: 'Bakersfield', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Tampa', state: 'FL', phase: 4, priority: 'Low' },
  { city: 'Honolulu', state: 'HI', phase: 4, priority: 'Low' },
  { city: 'Anaheim', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Santa Ana', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Corpus Christi', state: 'TX', phase: 4, priority: 'Low' },
  { city: 'Riverside', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Lexington', state: 'KY', phase: 4, priority: 'Low' },
  { city: 'Stockton', state: 'CA', phase: 4, priority: 'Low' },
  { city: 'Henderson', state: 'NV', phase: 4, priority: 'Low' },
  { city: 'Saint Paul', state: 'MN', phase: 4, priority: 'Low' },
  { city: 'Cincinnati', state: 'OH', phase: 4, priority: 'Low' },
  { city: 'Pittsburgh', state: 'PA', phase: 4, priority: 'Low' }
];

export class NationwideDiscoverySystem {
  private discovery: OutscraperSourdoughDiscovery;
  
  constructor() {
    this.discovery = new OutscraperSourdoughDiscovery();
  }

  // Run comprehensive nationwide discovery
  async runNationwideDiscovery(apiKey: string, targetPhase: number = 1): Promise<void> {
    console.log('🇺🇸 NATIONWIDE SOURDOUGH PIZZA DISCOVERY SYSTEM');
    console.log('=' .repeat(60));
    
    const targetCities = majorUSCities.filter(city => city.phase <= targetPhase);
    console.log(`Phase ${targetPhase} Target: ${targetCities.length} cities`);
    console.log(`Free API requests available: 100`);
    console.log(`Estimated cost: $${(targetCities.length * 0.001).toFixed(3)}`);
    
    const results = {
      totalCities: 0,
      totalRestaurants: 0,
      totalSourdoughRestaurants: 0,
      cityResults: [] as any[]
    };
    
    for (let i = 0; i < targetCities.length; i++) {
      const cityData = targetCities[i];
      console.log(`\n[${i + 1}/${targetCities.length}] 🏙️  ${cityData.city}, ${cityData.state}`);
      console.log(`Phase ${cityData.phase} | Priority: ${cityData.priority}`);
      
      try {
        const sourdoughCount = await this.discovery.processOutscraperData(
          apiKey, 
          cityData.city, 
          cityData.state
        );
        
        const cityResult = {
          city: cityData.city,
          state: cityData.state,
          phase: cityData.phase,
          sourdoughRestaurants: sourdoughCount,
          processed: true
        };
        
        results.cityResults.push(cityResult);
        results.totalCities++;
        results.totalSourdoughRestaurants += sourdoughCount;
        
        console.log(`✅ ${cityData.city} complete: ${sourdoughCount} sourdough restaurants found`);
        
        // Rate limiting between cities
        await this.delay(3000);
        
      } catch (error) {
        console.log(`❌ Error processing ${cityData.city}: ${error.message}`);
        
        results.cityResults.push({
          city: cityData.city,
          state: cityData.state,
          phase: cityData.phase,
          sourdoughRestaurants: 0,
          processed: false,
          error: error.message
        });
      }
    }
    
    this.displayNationwideResults(results);
  }

  // Display comprehensive results
  private displayNationwideResults(results: any): void {
    console.log(`\n${'=' .repeat(60)}`);
    console.log('🎉 NATIONWIDE DISCOVERY COMPLETE');
    console.log(`${'=' .repeat(60)}`);
    
    console.log(`\n📊 SUMMARY STATISTICS:`);
    console.log(`Cities processed: ${results.totalCities}`);
    console.log(`Total sourdough restaurants found: ${results.totalSourdoughRestaurants}`);
    console.log(`Average per city: ${(results.totalSourdoughRestaurants / results.totalCities).toFixed(1)}`);
    
    console.log(`\n🏆 TOP PERFORMING CITIES:`);
    const topCities = results.cityResults
      .filter(r => r.processed)
      .sort((a, b) => b.sourdoughRestaurants - a.sourdoughRestaurants)
      .slice(0, 10);
    
    topCities.forEach((city, index) => {
      console.log(`${index + 1}. ${city.city}, ${city.state}: ${city.sourdoughRestaurants} restaurants`);
    });
    
    console.log(`\n📈 RESULTS BY PHASE:`);
    [1, 2, 3, 4].forEach(phase => {
      const phaseResults = results.cityResults.filter(r => r.phase === phase && r.processed);
      const phaseTotal = phaseResults.reduce((sum, r) => sum + r.sourdoughRestaurants, 0);
      
      if (phaseResults.length > 0) {
        console.log(`Phase ${phase}: ${phaseResults.length} cities, ${phaseTotal} restaurants (avg: ${(phaseTotal / phaseResults.length).toFixed(1)})`);
      }
    });
    
    if (results.cityResults.some(r => !r.processed)) {
      console.log(`\n⚠️  FAILED CITIES:`);
      results.cityResults.filter(r => !r.processed).forEach(city => {
        console.log(`❌ ${city.city}, ${city.state}: ${city.error}`);
      });
    }
  }

  // Run specific phase
  async runPhase(apiKey: string, phase: number): Promise<void> {
    console.log(`🎯 Running Phase ${phase} Discovery`);
    
    const phaseMap = {
      1: 'Sourdough Strongholds',
      2: 'Major Metro Areas', 
      3: 'Secondary Markets',
      4: 'Comprehensive Coverage'
    };
    
    console.log(`Focus: ${phaseMap[phase] || 'Unknown Phase'}`);
    await this.runNationwideDiscovery(apiKey, phase);
  }

  // Run single city for testing
  async runSingleCity(apiKey: string, cityName: string, stateName: string): Promise<void> {
    console.log(`🏙️  Single City Discovery: ${cityName}, ${stateName}`);
    
    const sourdoughCount = await this.discovery.processOutscraperData(apiKey, cityName, stateName);
    
    console.log(`\n✅ ${cityName} Discovery Complete`);
    console.log(`Sourdough restaurants found: ${sourdoughCount}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Display city list for planning
  displayCityList(): void {
    console.log('🗺️  NATIONWIDE DISCOVERY CITY LIST');
    console.log('=' .repeat(50));
    
    [1, 2, 3, 4].forEach(phase => {
      const phaseCities = majorUSCities.filter(city => city.phase === phase);
      
      console.log(`\nPhase ${phase}: ${phaseCities.length} cities`);
      phaseCities.forEach(city => {
        console.log(`  ${city.city}, ${city.state} (${city.priority})`);
      });
    });
    
    console.log(`\nTotal cities: ${majorUSCities.length}`);
    console.log(`Free API requests needed: ${majorUSCities.length}`);
    console.log(`Estimated total cost: $${(majorUSCities.length * 0.001).toFixed(2)}`);
  }
}

// Main execution
async function main() {
  const system = new NationwideDiscoverySystem();
  
  const command = process.argv[2];
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY environment variable required');
    console.log('Get your free API key from outscraper.com');
    return;
  }
  
  switch (command) {
    case 'list':
      system.displayCityList();
      break;
      
    case 'phase1':
      await system.runPhase(apiKey, 1);
      break;
      
    case 'phase2':
      await system.runPhase(apiKey, 2);
      break;
      
    case 'single':
      const city = process.argv[3];
      const state = process.argv[4];
      if (city && state) {
        await system.runSingleCity(apiKey, city, state);
      } else {
        console.log('Usage: tsx nationwide-discovery.ts single "City Name" "State"');
      }
      break;
      
    default:
      console.log('🚀 NATIONWIDE SOURDOUGH DISCOVERY SYSTEM');
      console.log('\nCommands:');
      console.log('  list     - Show all cities in discovery plan');
      console.log('  phase1   - Run Phase 1 (5 stronghold cities)');
      console.log('  phase2   - Run Phase 1 + 2 (11 major cities)');
      console.log('  single   - Run single city test');
      console.log('\nExamples:');
      console.log('  tsx nationwide-discovery.ts list');
      console.log('  tsx nationwide-discovery.ts phase1');
      console.log('  tsx nationwide-discovery.ts single "San Francisco" "CA"');
  }
}

main().catch(console.error);