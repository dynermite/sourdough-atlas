#!/usr/bin/env tsx

// Strategic city lists for comprehensive nationwide sourdough pizza discovery
// Based on 2024-2025 population and tourism data

interface CityData {
  city: string;
  state: string;
  category: 'Population' | 'Tourism' | 'Both';
  population?: number;
  annualVisitors?: number;
  expectedPizzaRestaurants: number;
  sourdoughLikelihood: 'Very High' | 'High' | 'Medium' | 'Low';
  priority: 'Tier 1' | 'Tier 2' | 'Tier 3';
  specialNotes?: string;
}

// 50 Most Populated Cities in the US (2024-2025)
const top50PopulationCities: CityData[] = [
  { city: 'New York', state: 'NY', category: 'Both', population: 8335000, annualVisitors: 65000000, expectedPizzaRestaurants: 600, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Massive pizza scene, diverse neighborhoods' },
  { city: 'Los Angeles', state: 'CA', category: 'Both', population: 3800000, annualVisitors: 50000000, expectedPizzaRestaurants: 450, sourdoughLikelihood: 'Medium', priority: 'Tier 1', specialNotes: 'Large market, health-conscious trends' },
  { city: 'Chicago', state: 'IL', category: 'Both', population: 2600000, annualVisitors: 55000000, expectedPizzaRestaurants: 350, sourdoughLikelihood: 'Medium', priority: 'Tier 1', specialNotes: 'Deep dish capital, pizza innovation' },
  { city: 'Houston', state: 'TX', category: 'Population', population: 2300000, expectedPizzaRestaurants: 280, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Phoenix', state: 'AZ', category: 'Population', population: 1700000, expectedPizzaRestaurants: 200, sourdoughLikelihood: 'Low', priority: 'Tier 2' },
  { city: 'Philadelphia', state: 'PA', category: 'Both', population: 1600000, expectedPizzaRestaurants: 220, sourdoughLikelihood: 'Medium', priority: 'Tier 1', specialNotes: 'Strong food culture' },
  { city: 'San Antonio', state: 'TX', category: 'Population', population: 1500000, expectedPizzaRestaurants: 180, sourdoughLikelihood: 'Low', priority: 'Tier 2' },
  { city: 'San Diego', state: 'CA', category: 'Both', population: 1400000, expectedPizzaRestaurants: 170, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Health-conscious market' },
  { city: 'Dallas', state: 'TX', category: 'Both', population: 1300000, annualVisitors: 22500000, expectedPizzaRestaurants: 200, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Austin', state: 'TX', category: 'Both', population: 980000, expectedPizzaRestaurants: 120, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Foodie culture, artisan trends' },
  { city: 'Jacksonville', state: 'FL', category: 'Population', population: 950000, expectedPizzaRestaurants: 100, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Fort Worth', state: 'TX', category: 'Population', population: 920000, expectedPizzaRestaurants: 90, sourdoughLikelihood: 'Medium', priority: 'Tier 3' },
  { city: 'San Jose', state: 'CA', category: 'Population', population: 1000000, expectedPizzaRestaurants: 120, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Tech hub' },
  { city: 'Columbus', state: 'OH', category: 'Population', population: 900000, expectedPizzaRestaurants: 110, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Charlotte', state: 'NC', category: 'Population', population: 880000, expectedPizzaRestaurants: 100, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Indianapolis', state: 'IN', category: 'Population', population: 870000, expectedPizzaRestaurants: 95, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'San Francisco', state: 'CA', category: 'Both', population: 850000, annualVisitors: 21900000, expectedPizzaRestaurants: 180, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Sourdough capital of America' },
  { city: 'Seattle', state: 'WA', category: 'Both', population: 750000, expectedPizzaRestaurants: 150, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Strong food culture, artisan focus' },
  { city: 'Denver', state: 'CO', category: 'Both', population: 720000, expectedPizzaRestaurants: 130, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Health-conscious, outdoor culture' },
  { city: 'Oklahoma City', state: 'OK', category: 'Population', population: 710000, expectedPizzaRestaurants: 80, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Nashville', state: 'TN', category: 'Both', population: 690000, expectedPizzaRestaurants: 100, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Growing food scene' },
  { city: 'El Paso', state: 'TX', category: 'Population', population: 680000, expectedPizzaRestaurants: 70, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Washington', state: 'DC', category: 'Both', population: 670000, annualVisitors: 22000000, expectedPizzaRestaurants: 140, sourdoughLikelihood: 'Medium', priority: 'Tier 1', specialNotes: 'Diverse, educated market' },
  { city: 'Boston', state: 'MA', category: 'Both', population: 650000, expectedPizzaRestaurants: 160, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Historic food culture, college town' },
  { city: 'Las Vegas', state: 'NV', category: 'Both', population: 640000, annualVisitors: 42000000, expectedPizzaRestaurants: 120, sourdoughLikelihood: 'Low', priority: 'Tier 2', specialNotes: 'Tourist-focused dining' },
  { city: 'Detroit', state: 'MI', category: 'Population', population: 633218, expectedPizzaRestaurants: 90, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Portland', state: 'OR', category: 'Both', population: 630000, expectedPizzaRestaurants: 140, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Artisan food capital' },
  { city: 'Memphis', state: 'TN', category: 'Population', population: 620000, expectedPizzaRestaurants: 70, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Louisville', state: 'KY', category: 'Population', population: 610000, expectedPizzaRestaurants: 70, sourdoughLikelihood: 'Medium', priority: 'Tier 3' },
  { city: 'Baltimore', state: 'MD', category: 'Population', population: 600000, expectedPizzaRestaurants: 80, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Milwaukee', state: 'WI', category: 'Population', population: 590000, expectedPizzaRestaurants: 80, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Albuquerque', state: 'NM', category: 'Population', population: 560000, expectedPizzaRestaurants: 60, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Fresno', state: 'CA', category: 'Population', population: 550000, expectedPizzaRestaurants: 55, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Tucson', state: 'AZ', category: 'Population', population: 540000, expectedPizzaRestaurants: 55, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Sacramento', state: 'CA', category: 'Population', population: 520000, expectedPizzaRestaurants: 65, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Mesa', state: 'AZ', category: 'Population', population: 510000, expectedPizzaRestaurants: 50, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Kansas City', state: 'MO', category: 'Population', population: 500000, expectedPizzaRestaurants: 70, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Atlanta', state: 'GA', category: 'Both', population: 490000, expectedPizzaRestaurants: 90, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Growing food scene' },
  { city: 'Colorado Springs', state: 'CO', category: 'Population', population: 480000, expectedPizzaRestaurants: 50, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Omaha', state: 'NE', category: 'Population', population: 470000, expectedPizzaRestaurants: 50, sourdoughLikelihood: 'Medium', priority: 'Tier 3' },
  { city: 'Raleigh', state: 'NC', category: 'Population', population: 460000, expectedPizzaRestaurants: 60, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Miami', state: 'FL', category: 'Both', population: 450000, annualVisitors: 25000000, expectedPizzaRestaurants: 80, sourdoughLikelihood: 'Low', priority: 'Tier 2', specialNotes: 'International cuisine focus' },
  { city: 'Long Beach', state: 'CA', category: 'Population', population: 440000, expectedPizzaRestaurants: 50, sourdoughLikelihood: 'Medium', priority: 'Tier 3' },
  { city: 'Virginia Beach', state: 'VA', category: 'Population', population: 430000, expectedPizzaRestaurants: 45, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Oakland', state: 'CA', category: 'Population', population: 420000, expectedPizzaRestaurants: 70, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Bay Area food culture' },
  { city: 'Minneapolis', state: 'MN', category: 'Population', population: 410000, expectedPizzaRestaurants: 65, sourdoughLikelihood: 'Medium', priority: 'Tier 2' },
  { city: 'Tampa', state: 'FL', category: 'Population', population: 400000, expectedPizzaRestaurants: 55, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Tulsa', state: 'OK', category: 'Population', population: 390000, expectedPizzaRestaurants: 40, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'Arlington', state: 'TX', category: 'Population', population: 380000, expectedPizzaRestaurants: 45, sourdoughLikelihood: 'Low', priority: 'Tier 3' },
  { city: 'New Orleans', state: 'LA', category: 'Both', population: 370000, expectedPizzaRestaurants: 60, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Unique food culture' }
];

// 50 Top Tourist Destination Cities (Additional to population list)
const top50TouristCities: CityData[] = [
  { city: 'Orlando', state: 'FL', category: 'Tourism', annualVisitors: 75000000, expectedPizzaRestaurants: 200, sourdoughLikelihood: 'Low', priority: 'Tier 2', specialNotes: 'Theme park capital' },
  { city: 'Honolulu', state: 'HI', category: 'Tourism', annualVisitors: 10000000, expectedPizzaRestaurants: 60, sourdoughLikelihood: 'Low', priority: 'Tier 2', specialNotes: 'Island cuisine focus' },
  { city: 'Charleston', state: 'SC', category: 'Tourism', expectedPizzaRestaurants: 40, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Historic food culture, artisan scene' },
  { city: 'Savannah', state: 'GA', category: 'Tourism', expectedPizzaRestaurants: 30, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Historic district' },
  { city: 'Key West', state: 'FL', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Seafood-focused' },
  { city: 'Napa', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Wine country, artisan food' },
  { city: 'Aspen', state: 'CO', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'High-end resort town' },
  { city: 'Park City', state: 'UT', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Ski resort town' },
  { city: 'Sedona', state: 'AZ', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Wellness tourism' },
  { city: 'Santa Fe', state: 'NM', category: 'Tourism', expectedPizzaRestaurants: 30, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Artistic community' },
  { city: 'Williamsburg', state: 'VA', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Colonial history' },
  { city: 'Myrtle Beach', state: 'SC', category: 'Tourism', expectedPizzaRestaurants: 35, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Beach resort' },
  { city: 'Virginia Beach', state: 'VA', category: 'Tourism', expectedPizzaRestaurants: 45, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Beach tourism' },
  { city: 'Gatlinburg', state: 'TN', category: 'Tourism', expectedPizzaRestaurants: 30, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Mountain tourism' },
  { city: 'Branson', state: 'MO', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Entertainment tourism' },
  { city: 'Mammoth Lakes', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'Medium', priority: 'Tier 3', specialNotes: 'Ski resort' },
  { city: 'Jackson', state: 'WY', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'National park gateway' },
  { city: 'Bar Harbor', state: 'ME', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Maine food culture' },
  { city: 'Martha\'s Vineyard', state: 'MA', category: 'Tourism', expectedPizzaRestaurants: 12, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'New England artisan scene' },
  { city: 'Nantucket', state: 'MA', category: 'Tourism', expectedPizzaRestaurants: 10, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Upscale island dining' },
  { city: 'Mackinac Island', state: 'MI', category: 'Tourism', expectedPizzaRestaurants: 8, sourdoughLikelihood: 'Medium', priority: 'Tier 3', specialNotes: 'Historic resort' },
  { city: 'St. Augustine', state: 'FL', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Historic city' },
  { city: 'Flagstaff', state: 'AZ', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Grand Canyon gateway' },
  { city: 'Traverse City', state: 'MI', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Wine region' },
  { city: 'Stowe', state: 'VT', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Vermont artisan culture' },
  { city: 'Burlington', state: 'VT', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'College town, foodie scene' },
  { city: 'Newport', state: 'RI', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'New England coastal' },
  { city: 'Cape Cod', state: 'MA', category: 'Tourism', expectedPizzaRestaurants: 30, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Summer destination' },
  { city: 'Outer Banks', state: 'NC', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Beach communities' },
  { city: 'Big Sur', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 8, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Coastal California' },
  { city: 'Carmel', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Upscale dining scene' },
  { city: 'Sausalito', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 12, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Bay Area artisan' },
  { city: 'Half Moon Bay', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 10, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Coastal farm-to-table' },
  { city: 'Mendocino', state: 'CA', category: 'Tourism', expectedPizzaRestaurants: 8, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Northern California artisan' },
  { city: 'Telluride', state: 'CO', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Mountain resort town' },
  { city: 'Vail', state: 'CO', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Ski resort' },
  { city: 'Breckenridge', state: 'CO', category: 'Tourism', expectedPizzaRestaurants: 18, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Mountain town' },
  { city: 'Steamboat Springs', state: 'CO', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Ski town' },
  { city: 'Sun Valley', state: 'ID', category: 'Tourism', expectedPizzaRestaurants: 12, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Mountain resort' },
  { city: 'Jackson Hole', state: 'WY', category: 'Tourism', expectedPizzaRestaurants: 18, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'Ski resort' },
  { city: 'Moab', state: 'UT', category: 'Tourism', expectedPizzaRestaurants: 15, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Adventure tourism' },
  { city: 'Bend', state: 'OR', category: 'Tourism', expectedPizzaRestaurants: 35, sourdoughLikelihood: 'Very High', priority: 'Tier 1', specialNotes: 'Oregon artisan culture' },
  { city: 'Hood River', state: 'OR', category: 'Tourism', expectedPizzaRestaurants: 12, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Columbia River Gorge' },
  { city: 'Cannon Beach', state: 'OR', category: 'Tourism', expectedPizzaRestaurants: 8, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Oregon coast' },
  { city: 'Bellingham', state: 'WA', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'High', priority: 'Tier 1', specialNotes: 'Pacific Northwest culture' },
  { city: 'Friday Harbor', state: 'WA', category: 'Tourism', expectedPizzaRestaurants: 8, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'San Juan Islands' },
  { city: 'Whidbey Island', state: 'WA', category: 'Tourism', expectedPizzaRestaurants: 10, sourdoughLikelihood: 'High', priority: 'Tier 2', specialNotes: 'Island artisan community' },
  { city: 'Bozeman', state: 'MT', category: 'Tourism', expectedPizzaRestaurants: 20, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'College town, outdoor culture' },
  { city: 'Missoula', state: 'MT', category: 'Tourism', expectedPizzaRestaurants: 18, sourdoughLikelihood: 'Medium', priority: 'Tier 2', specialNotes: 'University town' },
  { city: 'Anchorage', state: 'AK', category: 'Tourism', expectedPizzaRestaurants: 25, sourdoughLikelihood: 'Low', priority: 'Tier 3', specialNotes: 'Alaska tourism hub' }
];

export class StrategicCityPlanner {
  
  analyzeComprehensiveLists(): void {
    console.log('🎯 STRATEGIC NATIONWIDE PIZZA DISCOVERY PLAN');
    console.log('=' .repeat(70));
    
    const combined = [...top50PopulationCities, ...top50TouristCities];
    const unique = this.removeDuplicateCities(combined);
    
    console.log('\n📊 COMPREHENSIVE COVERAGE ANALYSIS:');
    console.log(`Population-based cities: ${top50PopulationCities.length}`);
    console.log(`Tourism-based cities: ${top50TouristCities.length}`);
    console.log(`Total unique cities: ${unique.length}`);
    console.log(`Duplicate cities (in both lists): ${combined.length - unique.length}`);
    
    const totalRestaurants = unique.reduce((sum, city) => sum + city.expectedPizzaRestaurants, 0);
    console.log(`Total pizza restaurants to analyze: ${totalRestaurants.toLocaleString()}`);
    
    console.log('\n🎯 PRIORITY TIER BREAKDOWN:');
    ['Tier 1', 'Tier 2', 'Tier 3'].forEach(tier => {
      const tierCities = unique.filter(city => city.priority === tier);
      const tierRestaurants = tierCities.reduce((sum, city) => sum + city.expectedPizzaRestaurants, 0);
      
      console.log(`${tier}: ${tierCities.length} cities, ${tierRestaurants.toLocaleString()} restaurants`);
    });
    
    console.log('\n🔥 SOURDOUGH LIKELIHOOD ANALYSIS:');
    ['Very High', 'High', 'Medium', 'Low'].forEach(likelihood => {
      const cities = unique.filter(city => city.sourdoughLikelihood === likelihood);
      const restaurants = cities.reduce((sum, city) => sum + city.expectedPizzaRestaurants, 0);
      
      console.log(`${likelihood}: ${cities.length} cities, ${restaurants.toLocaleString()} restaurants`);
    });
    
    console.log('\n💰 API REQUEST EFFICIENCY:');
    console.log(`Free Outscraper requests available: 100`);
    console.log(`Cities we can process: ${Math.min(unique.length, 100)}`);
    console.log(`Estimated total cost: $${(Math.min(unique.length, 100) * 0.001).toFixed(3)}`);
    
    if (unique.length > 100) {
      console.log(`Cities requiring paid requests: ${unique.length - 100}`);
      console.log(`Additional cost for full coverage: $${((unique.length - 100) * 0.001).toFixed(3)}`);
    }
  }
  
  displayTier1Cities(): void {
    console.log('\n🏆 TIER 1 CITIES (HIGHEST PRIORITY):');
    console.log('=' .repeat(50));
    
    const combined = [...top50PopulationCities, ...top50TouristCities];
    const unique = this.removeDuplicateCities(combined);
    const tier1Cities = unique.filter(city => city.priority === 'Tier 1');
    
    tier1Cities.forEach((city, index) => {
      console.log(`${index + 1}. ${city.city}, ${city.state}`);
      console.log(`   🍕 Expected restaurants: ${city.expectedPizzaRestaurants}`);
      console.log(`   📈 Sourdough likelihood: ${city.sourdoughLikelihood}`);
      console.log(`   📋 Category: ${city.category}`);
      if (city.specialNotes) console.log(`   💡 Notes: ${city.specialNotes}`);
      console.log('');
    });
    
    const tier1Restaurants = tier1Cities.reduce((sum, city) => sum + city.expectedPizzaRestaurants, 0);
    console.log(`🎯 Tier 1 Total: ${tier1Cities.length} cities, ${tier1Restaurants.toLocaleString()} restaurants`);
    console.log(`💸 Cost for Tier 1: $${(tier1Cities.length * 0.001).toFixed(3)} (${tier1Cities.length} API requests)`);
  }
  
  private removeDuplicateCities(cities: CityData[]): CityData[] {
    const seen = new Map();
    return cities.filter(city => {
      const key = `${city.city}-${city.state}`;
      if (seen.has(key)) {
        // Keep the entry with more complete data
        const existing = seen.get(key);
        if (city.category === 'Both' || (city.annualVisitors && !existing.annualVisitors)) {
          seen.set(key, city);
          return false; // Remove the existing one from filter
        }
        return false; // Keep existing, remove current
      }
      seen.set(key, city);
      return true;
    });
  }
  
  generateExecutionPlan(): void {
    console.log('\n🚀 EXECUTION STRATEGY:');
    console.log('=' .repeat(40));
    
    console.log('\nPhase 1: Tier 1 Cities (Immediate Priority)');
    console.log('• Focus on highest sourdough likelihood markets');
    console.log('• ~25-30 cities with strongest food cultures');
    console.log('• Expected outcome: 200-600 verified sourdough restaurants');
    
    console.log('\nPhase 2: Tier 2 Cities (Major Markets)');
    console.log('• Large population centers and tourist destinations');
    console.log('• ~40-50 cities with significant pizza markets');
    console.log('• Expected outcome: 300-800 additional restaurants');
    
    console.log('\nPhase 3: Tier 3 Cities (Comprehensive Coverage)');
    console.log('• Complete remaining cities within free API limit');
    console.log('• ~25-45 cities for full nationwide coverage');
    console.log('• Expected outcome: 200-400 additional restaurants');
    
    console.log('\n📈 TOTAL EXPECTED OUTCOME:');
    console.log('• 700-1,800 verified sourdough restaurants nationwide');
    console.log('• Complete coverage of major US pizza markets');
    console.log('• Real sourdough adoption data across diverse regions');
    console.log('• Foundation for the most comprehensive sourdough directory in America');
  }
}

// Main execution
async function main() {
  const planner = new StrategicCityPlanner();
  
  planner.analyzeComprehensiveLists();
  planner.displayTier1Cities();
  planner.generateExecutionPlan();
}

main().catch(console.error);