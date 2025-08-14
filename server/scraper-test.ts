// Scraper accuracy testing - compare scraper results vs verified authentic restaurants

import { startScraping } from './scraper';
import { storage } from './storage';
import { verifiedSourdoughRestaurants } from './verified-restaurants';

interface TestResult {
  city: string;
  state: string;
  verifiedCount: number;
  scraperFoundCount: number;
  verifiedRestaurants: string[];
  scraperFoundRestaurants: string[];
  missed: string[];
  falsePositives: string[];
  accuracy: number;
}

export async function testScraperAccuracy(cityQuery: string): Promise<TestResult> {
  console.log(`\n🔍 Testing scraper accuracy for: ${cityQuery}`);
  
  // Get verified restaurants for this city
  const [city, state] = cityQuery.split(',').map(s => s.trim());
  const verified = verifiedSourdoughRestaurants.filter(r => 
    r.city.toLowerCase().includes(city.toLowerCase()) || 
    (state && r.state.toLowerCase() === state.toLowerCase())
  );
  
  console.log(`📚 Found ${verified.length} verified sourdough restaurants in our baseline`);
  verified.forEach(r => console.log(`   ✓ ${r.name} - ${r.sourdoughKeywords.join(', ')}`));
  
  // Run the scraper
  console.log(`\n🤖 Running scraper for "${cityQuery}"...`);
  await startScraping(cityQuery, 10); // Allow up to 10 results
  
  // Wait for scraper to complete
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get what the scraper found
  const scraperResults = await storage.searchRestaurants(city);
  const scraperSourdoughResults = scraperResults.filter(r => r.sourdoughVerified === 1);
  
  console.log(`\n🎯 Scraper found ${scraperSourdoughResults.length} sourdough restaurants`);
  scraperSourdoughResults.forEach(r => 
    console.log(`   🤖 ${r.name} - ${r.sourdoughKeywords?.join(', ') || 'No keywords'}`));
  
  // Analysis
  const verifiedNames = verified.map(r => r.name.toLowerCase());
  const scraperNames = scraperSourdoughResults.map(r => r.name.toLowerCase());
  
  const missed = verified.filter(v => 
    !scraperNames.some(s => s.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(s))
  ).map(v => v.name);
  
  const falsePositives = scraperSourdoughResults.filter(s => 
    !verifiedNames.some(v => v.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(v))
  ).map(s => s.name);
  
  const correctMatches = verified.length - missed.length;
  const accuracy = verified.length > 0 ? (correctMatches / verified.length) * 100 : 0;
  
  const result: TestResult = {
    city: cityQuery,
    state: state || '',
    verifiedCount: verified.length,
    scraperFoundCount: scraperSourdoughResults.length,
    verifiedRestaurants: verified.map(r => r.name),
    scraperFoundRestaurants: scraperSourdoughResults.map(r => r.name),
    missed,
    falsePositives,
    accuracy: Math.round(accuracy)
  };
  
  console.log(`\n📊 ACCURACY REPORT for ${cityQuery}:`);
  console.log(`   Verified restaurants: ${result.verifiedCount}`);
  console.log(`   Scraper found: ${result.scraperFoundCount}`);
  console.log(`   Correctly identified: ${correctMatches}/${verified.length}`);
  console.log(`   Accuracy: ${result.accuracy}%`);
  
  if (missed.length > 0) {
    console.log(`   ❌ Missed: ${missed.join(', ')}`);
  }
  
  if (falsePositives.length > 0) {
    console.log(`   ⚠️  False positives: ${falsePositives.join(', ')}`);
  }
  
  return result;
}

// Test multiple cities
export async function runComprehensiveTest(): Promise<TestResult[]> {
  const testCities = [
    'Portland, OR',
    'San Francisco, CA', 
    'Berkeley, CA',
    'Seattle, WA',
    'Sandpoint, ID'
  ];
  
  const results: TestResult[] = [];
  
  console.log('🧪 Starting comprehensive scraper accuracy test...\n');
  
  for (const city of testCities) {
    try {
      const result = await testScraperAccuracy(city);
      results.push(result);
      console.log('\n' + '='.repeat(60));
    } catch (error) {
      console.error(`❌ Test failed for ${city}:`, error);
    }
  }
  
  // Overall summary
  const totalVerified = results.reduce((sum, r) => sum + r.verifiedCount, 0);
  const totalFound = results.reduce((sum, r) => sum + r.scraperFoundCount, 0);
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  
  console.log('\n🏆 COMPREHENSIVE TEST SUMMARY:');
  console.log(`   Cities tested: ${results.length}`);
  console.log(`   Total verified restaurants: ${totalVerified}`);
  console.log(`   Total found by scraper: ${totalFound}`);
  console.log(`   Average accuracy: ${Math.round(avgAccuracy)}%`);
  
  return results;
}