#!/usr/bin/env tsx

// Comprehensive plan for nationwide sourdough pizza discovery using Outscraper API

const TOP_100_US_CITIES_FOR_PIZZA = [
  // Tier 1: Sourdough Culture Strong (10 cities)
  { city: 'San Francisco', state: 'CA', tier: 1, expectedPizza: 180, sourdoughLikelihood: 'Very High' },
  { city: 'Portland', state: 'OR', tier: 1, expectedPizza: 120, sourdoughLikelihood: 'Very High' },
  { city: 'Seattle', state: 'WA', tier: 1, expectedPizza: 150, sourdoughLikelihood: 'Very High' },
  { city: 'Austin', state: 'TX', tier: 1, expectedPizza: 100, sourdoughLikelihood: 'High' },
  { city: 'Brooklyn', state: 'NY', tier: 1, expectedPizza: 200, sourdoughLikelihood: 'High' },
  { city: 'Boulder', state: 'CO', tier: 1, expectedPizza: 40, sourdoughLikelihood: 'High' },
  { city: 'Asheville', state: 'NC', tier: 1, expectedPizza: 30, sourdoughLikelihood: 'High' },
  { city: 'Burlington', state: 'VT', tier: 1, expectedPizza: 25, sourdoughLikelihood: 'High' },
  { city: 'Madison', state: 'WI', tier: 1, expectedPizza: 50, sourdoughLikelihood: 'High' },
  { city: 'Providence', state: 'RI', tier: 1, expectedPizza: 40, sourdoughLikelihood: 'High' },

  // Tier 2: Major Metros (15 cities)
  { city: 'New York', state: 'NY', tier: 2, expectedPizza: 500, sourdoughLikelihood: 'Medium' },
  { city: 'Los Angeles', state: 'CA', tier: 2, expectedPizza: 400, sourdoughLikelihood: 'Medium' },
  { city: 'Chicago', state: 'IL', tier: 2, expectedPizza: 300, sourdoughLikelihood: 'Medium' },
  { city: 'Boston', state: 'MA', tier: 2, expectedPizza: 200, sourdoughLikelihood: 'Medium' },
  { city: 'Denver', state: 'CO', tier: 2, expectedPizza: 150, sourdoughLikelihood: 'Medium' },
  { city: 'Philadelphia', state: 'PA', tier: 2, expectedPizza: 250, sourdoughLikelihood: 'Medium' },
  { city: 'Washington', state: 'DC', tier: 2, expectedPizza: 180, sourdoughLikelihood: 'Medium' },
  { city: 'Atlanta', state: 'GA', tier: 2, expectedPizza: 180, sourdoughLikelihood: 'Medium' },
  { city: 'Miami', state: 'FL', tier: 2, expectedPizza: 150, sourdoughLikelihood: 'Low' },
  { city: 'Phoenix', state: 'AZ', tier: 2, expectedPizza: 120, sourdoughLikelihood: 'Low' },
  { city: 'Dallas', state: 'TX', tier: 2, expectedPizza: 200, sourdoughLikelihood: 'Medium' },
  { city: 'Houston', state: 'TX', tier: 2, expectedPizza: 180, sourdoughLikelihood: 'Medium' },
  { city: 'Detroit', state: 'MI', tier: 2, expectedPizza: 120, sourdoughLikelihood: 'Medium' },
  { city: 'Minneapolis', state: 'MN', tier: 2, expectedPizza: 100, sourdoughLikelihood: 'Medium' },
  { city: 'Tampa', state: 'FL', tier: 2, expectedPizza: 80, sourdoughLikelihood: 'Low' },

  // Tier 3: Secondary Markets (25 cities)
  { city: 'Nashville', state: 'TN', tier: 3, expectedPizza: 80, sourdoughLikelihood: 'Medium' },
  { city: 'San Diego', state: 'CA', tier: 3, expectedPizza: 120, sourdoughLikelihood: 'Medium' },
  { city: 'Orlando', state: 'FL', tier: 3, expectedPizza: 70, sourdoughLikelihood: 'Low' },
  { city: 'Las Vegas', state: 'NV', tier: 3, expectedPizza: 90, sourdoughLikelihood: 'Low' },
  { city: 'Salt Lake City', state: 'UT', tier: 3, expectedPizza: 60, sourdoughLikelihood: 'Medium' },
  { city: 'Kansas City', state: 'MO', tier: 3, expectedPizza: 80, sourdoughLikelihood: 'Medium' },
  { city: 'Cleveland', state: 'OH', tier: 3, expectedPizza: 70, sourdoughLikelihood: 'Medium' },
  { city: 'Pittsburgh', state: 'PA', tier: 3, expectedPizza: 80, sourdoughLikelihood: 'Medium' },
  { city: 'Cincinnati', state: 'OH', tier: 3, expectedPizza: 60, sourdoughLikelihood: 'Medium' },
  { city: 'Sacramento', state: 'CA', tier: 3, expectedPizza: 80, sourdoughLikelihood: 'Medium' },
  { city: 'San Jose', state: 'CA', tier: 3, expectedPizza: 100, sourdoughLikelihood: 'Medium' },
  { city: 'Oakland', state: 'CA', tier: 3, expectedPizza: 80, sourdoughLikelihood: 'High' },
  { city: 'Milwaukee', state: 'WI', tier: 3, expectedPizza: 70, sourdoughLikelihood: 'Medium' },
  { city: 'Louisville', state: 'KY', tier: 3, expectedPizza: 50, sourdoughLikelihood: 'Medium' },
  { city: 'Memphis', state: 'TN', tier: 3, expectedPizza: 50, sourdoughLikelihood: 'Low' },
  { city: 'Baltimore', state: 'MD', tier: 3, expectedPizza: 80, sourdoughLikelihood: 'Medium' },
  { city: 'Charlotte', state: 'NC', tier: 3, expectedPizza: 70, sourdoughLikelihood: 'Medium' },
  { city: 'Raleigh', state: 'NC', tier: 3, expectedPizza: 60, sourdoughLikelihood: 'Medium' },
  { city: 'New Orleans', state: 'LA', tier: 3, expectedPizza: 60, sourdoughLikelihood: 'Medium' },
  { city: 'Richmond', state: 'VA', tier: 3, expectedPizza: 50, sourdoughLikelihood: 'Medium' },
  { city: 'Columbus', state: 'OH', tier: 3, expectedPizza: 70, sourdoughLikelihood: 'Medium' },
  { city: 'Indianapolis', state: 'IN', tier: 3, expectedPizza: 60, sourdoughLikelihood: 'Medium' },
  { city: 'Jacksonville', state: 'FL', tier: 3, expectedPizza: 50, sourdoughLikelihood: 'Low' },
  { city: 'Tucson', state: 'AZ', tier: 3, expectedPizza: 40, sourdoughLikelihood: 'Low' },
  { city: 'Fresno', state: 'CA', tier: 3, expectedPizza: 40, sourdoughLikelihood: 'Low' },

  // Tier 4: Comprehensive Coverage (50 additional cities)
  { city: 'Long Beach', state: 'CA', tier: 4, expectedPizza: 50, sourdoughLikelihood: 'Low' },
  { city: 'Mesa', state: 'AZ', tier: 4, expectedPizza: 40, sourdoughLikelihood: 'Low' },
  { city: 'Virginia Beach', state: 'VA', tier: 4, expectedPizza: 40, sourdoughLikelihood: 'Low' },
  { city: 'Colorado Springs', state: 'CO', tier: 4, expectedPizza: 50, sourdoughLikelihood: 'Medium' },
  { city: 'Omaha', state: 'NE', tier: 4, expectedPizza: 40, sourdoughLikelihood: 'Medium' },
  { city: 'Tulsa', state: 'OK', tier: 4, expectedPizza: 35, sourdoughLikelihood: 'Low' },
  { city: 'Arlington', state: 'TX', tier: 4, expectedPizza: 40, sourdoughLikelihood: 'Low' },
  { city: 'Wichita', state: 'KS', tier: 4, expectedPizza: 30, sourdoughLikelihood: 'Low' },
  { city: 'Bakersfield', state: 'CA', tier: 4, expectedPizza: 30, sourdoughLikelihood: 'Low' },
  { city: 'Honolulu', state: 'HI', tier: 4, expectedPizza: 40, sourdoughLikelihood: 'Low' },
  // ... 40 more cities to reach 100 total
];

export class ComprehensiveNationwidePlan {
  
  displayFullPlan(): void {
    console.log('🇺🇸 COMPREHENSIVE NATIONWIDE SOURDOUGH PIZZA DISCOVERY');
    console.log('=' .repeat(70));
    
    const summary = this.calculateSummary();
    
    console.log('\n📊 COVERAGE SUMMARY:');
    console.log(`Total cities planned: ${summary.totalCities}`);
    console.log(`Total pizza restaurants: ${summary.totalRestaurants.toLocaleString()}`);
    console.log(`API requests needed: ${summary.totalCities} (FREE with Outscraper)`);
    console.log(`Estimated cost: $${(summary.totalCities * 0.001).toFixed(2)}`);
    
    console.log('\n🎯 TIER BREAKDOWN:');
    [1, 2, 3, 4].forEach(tier => {
      const tierCities = TOP_100_US_CITIES_FOR_PIZZA.filter(c => c.tier === tier);
      const tierRestaurants = tierCities.reduce((sum, city) => sum + city.expectedPizza, 0);
      
      const tierNames = {
        1: 'Sourdough Strongholds',
        2: 'Major Metros', 
        3: 'Secondary Markets',
        4: 'Comprehensive Coverage'
      };
      
      console.log(`Tier ${tier} (${tierNames[tier]}): ${tierCities.length} cities, ${tierRestaurants.toLocaleString()} restaurants`);
    });
    
    console.log('\n🔥 TOP PRIORITY CITIES (Tier 1):');
    TOP_100_US_CITIES_FOR_PIZZA.filter(c => c.tier === 1).forEach((city, index) => {
      console.log(`${index + 1}. ${city.city}, ${city.state} - ${city.expectedPizza} restaurants (${city.sourdoughLikelihood} likelihood)`);
    });
    
    console.log('\n💡 WHY API APPROACH IS PERFECT:');
    console.log('• 100 free requests = 100 cities covered');
    console.log('• Each city search returns ALL pizza restaurants');
    console.log('• Automated sourdough verification for each restaurant');
    console.log('• No manual work required');
    console.log('• Complete nationwide foundation in one run');
    
    console.log('\n🚀 EXECUTION PLAN:');
    console.log('1. Get free Outscraper API key');
    console.log('2. Run Tier 1 cities first (highest sourdough probability)');
    console.log('3. Expand through Tier 2-4 as API requests allow');
    console.log('4. Build comprehensive national sourdough pizza database');
    
    console.log('\n📈 EXPECTED OUTCOMES:');
    console.log('• 5,000-15,000 total pizza restaurants analyzed');
    console.log('• 300-1,500 verified sourdough restaurants found');
    console.log('• Real sourdough adoption rates by region');
    console.log('• Complete foundation for nationwide expansion');
  }
  
  private calculateSummary() {
    const totalCities = TOP_100_US_CITIES_FOR_PIZZA.length;
    const totalRestaurants = TOP_100_US_CITIES_FOR_PIZZA.reduce((sum, city) => sum + city.expectedPizza, 0);
    
    return {
      totalCities,
      totalRestaurants
    };
  }
  
  displayAPIBenefits(): void {
    console.log('\n🏆 API vs WEBSITE COMPARISON:');
    console.log('=' .repeat(40));
    
    console.log('\nAPI Approach (RECOMMENDED):');
    console.log('✅ 100 cities for FREE');
    console.log('✅ Complete automation');
    console.log('✅ Real-time data processing');
    console.log('✅ No manual work');
    console.log('✅ Consistent data quality');
    console.log('✅ Runs overnight/continuously');
    
    console.log('\nWebsite Approach:');
    console.log('❌ 100 manual searches');
    console.log('❌ 100 CSV downloads');
    console.log('❌ 100 file uploads');
    console.log('❌ Hours of manual work');
    console.log('❌ Inconsistent data formats');
    console.log('❌ Human error potential');
    
    console.log('\n🎯 CLEAR WINNER: API Integration');
    console.log('The free API tier gives you enough requests to build a comprehensive nationwide database.');
  }
}

// Main execution
async function main() {
  const plan = new ComprehensiveNationwidePlan();
  
  plan.displayFullPlan();
  plan.displayAPIBenefits();
}

main().catch(console.error);