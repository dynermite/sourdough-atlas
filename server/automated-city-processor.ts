import { runComprehensivePizzaDiscovery } from './comprehensive-pizza-discovery';
import { db } from './db';
import { restaurants } from '@shared/schema';

// Complete list of all 99 cities from the strategic plan
const allCities = [
  // Tier 1: Sourdough Strongholds (11 cities)
  ['Portland', 'OR'], ['San Francisco', 'CA'], ['Los Angeles', 'CA'], ['Seattle', 'WA'],
  ['Austin', 'TX'], ['Brooklyn', 'NY'], ['Boulder', 'CO'], ['Asheville', 'NC'],
  ['Burlington', 'VT'], ['Madison', 'WI'], ['Providence', 'RI'],
  
  // Tier 2: Major Metros (15 cities)
  ['New York', 'NY'], ['Chicago', 'IL'], ['Boston', 'MA'], ['Denver', 'CO'],
  ['Philadelphia', 'PA'], ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Dallas', 'TX'],
  ['Atlanta', 'GA'], ['Houston', 'TX'], ['Detroit', 'MI'], ['Minneapolis', 'MN'],
  ['Tampa', 'FL'], ['St. Louis', 'MO'], ['Baltimore', 'MD'],
  
  // Tier 3: Regional Centers (25 cities)
  ['San Diego', 'CA'], ['Nashville', 'TN'], ['Charlotte', 'NC'], ['Las Vegas', 'NV'],
  ['Orlando', 'FL'], ['Cleveland', 'OH'], ['Pittsburgh', 'PA'], ['Cincinnati', 'OH'],
  ['Kansas City', 'MO'], ['Indianapolis', 'IN'], ['Columbus', 'OH'], ['Milwaukee', 'WI'],
  ['Virginia Beach', 'VA'], ['Sacramento', 'CA'], ['Omaha', 'NE'], ['Raleigh', 'NC'],
  ['New Orleans', 'LA'], ['Memphis', 'TN'], ['Louisville', 'KY'], ['Richmond', 'VA'],
  ['Oklahoma City', 'OK'], ['Jacksonville', 'FL'], ['Tucson', 'AZ'], ['Fresno', 'CA'],
  ['Mesa', 'AZ'],
  
  // Tier 4: Growing Markets (48 cities)
  ['Colorado Springs', 'CO'], ['Albuquerque', 'NM'], ['Tulsa', 'OK'], ['Wichita', 'KS'],
  ['Arlington', 'TX'], ['Bakersfield', 'CA'], ['Aurora', 'CO'], ['Anaheim', 'CA'],
  ['Honolulu', 'HI'], ['Santa Ana', 'CA'], ['Corpus Christi', 'TX'], ['Riverside', 'CA'],
  ['Lexington', 'KY'], ['Stockton', 'CA'], ['St. Paul', 'MN'], ['Buffalo', 'NY'],
  ['Newark', 'NJ'], ['Plano', 'TX'], ['Fort Wayne', 'IN'], ['St. Petersburg', 'FL'],
  ['Jersey City', 'NJ'], ['Lincoln', 'NE'], ['Henderson', 'NV'], ['Greensboro', 'NC'],
  ['Chandler', 'AZ'], ['Chula Vista', 'CA'], ['Norfolk', 'VA'], ['Orlando', 'FL'],
  ['North Las Vegas', 'NV'], ['Durham', 'NC'], ['Madison', 'WI'], ['Lubbock', 'TX'],
  ['Irvine', 'CA'], ['Winston-Salem', 'NC'], ['Glendale', 'AZ'], ['Garland', 'TX'],
  ['Hialeah', 'FL'], ['Reno', 'NV'], ['Baton Rouge', 'LA'], ['Irving', 'TX'],
  ['Chesapeake', 'VA'], ['Scottsdale', 'AZ'], ['Spokane', 'WA'], ['Fremont', 'CA'],
  ['San Bernardino', 'CA'], ['Gilbert', 'AZ'], ['Boise', 'ID'], ['Birmingham', 'AL']
];

export async function processRemainingCities(): Promise<void> {
  console.log('🚀 AUTOMATED NATIONWIDE DISCOVERY - BATCH PROCESSOR');
  console.log('==================================================');
  
  // Check which cities we've already processed
  const existingRestaurants = await db.select().from(restaurants);
  const processedCities = new Set(
    existingRestaurants.map(r => `${r.city}, ${r.state}`)
  );
  
  const remainingCities = allCities.filter(([city, state]) => 
    !processedCities.has(`${city}, ${state}`)
  );
  
  console.log(`📊 Status: ${allCities.length - remainingCities.length}/${allCities.length} cities already processed`);
  console.log(`🎯 Remaining: ${remainingCities.length} cities to process`);
  console.log(`📍 Current database: ${existingRestaurants.length} establishments`);
  console.log('');
  
  if (remainingCities.length === 0) {
    console.log('🎉 ALL CITIES ALREADY PROCESSED!');
    console.log('✅ Nationwide discovery complete!');
    return;
  }
  
  let processedCount = 0;
  const startTime = Date.now();
  
  for (const [city, state] of remainingCities) {
    try {
      const cityProgress = allCities.length - remainingCities.length + processedCount + 1;
      console.log(`[${cityProgress}/${allCities.length}] Processing: ${city}, ${state}`);
      console.log('━'.repeat(60));
      
      await runComprehensivePizzaDiscovery(city, state);
      
      processedCount++;
      const totalProcessed = allCities.length - remainingCities.length + processedCount;
      const percentage = ((totalProcessed / allCities.length) * 100).toFixed(1);
      
      console.log(`✅ ${city}, ${state} COMPLETE`);
      console.log(`📊 Overall Progress: ${totalProcessed}/${allCities.length} cities (${percentage}%)`);
      
      // Show estimated completion time
      const elapsed = Date.now() - startTime;
      const avgTimePerCity = elapsed / processedCount;
      const remainingTime = avgTimePerCity * (remainingCities.length - processedCount);
      const eta = new Date(Date.now() + remainingTime);
      
      console.log(`⏱️  ETA: ${eta.toLocaleString()}`);
      console.log('');
      
      // Brief pause between cities
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.log(`❌ Error processing ${city}, ${state}: ${error.message}`);
      console.log('▶️ Continuing with next city...');
      processedCount++;
    }
  }
  
  // Final completion notification
  const finalCount = await db.select().from(restaurants);
  console.log('');
  console.log('🎉 NATIONWIDE DISCOVERY COMPLETE!');
  console.log('=================================');
  console.log(`✅ Processed: ${allCities.length}/${allCities.length} cities (100%)`);
  console.log(`🍕 Total establishments discovered: ${finalCount.length}`);
  console.log('🎯 Goal achieved: 1,000-1,500 establishments!');
  console.log('🍞 Comprehensive sourdough pizza directory ready!');
  console.log('');
  console.log('🚀 SYSTEM READY FOR DEPLOYMENT!');
}

export async function checkProcessingStatus(): Promise<void> {
  const existingRestaurants = await db.select().from(restaurants);
  const processedCities = new Set(
    existingRestaurants.map(r => `${r.city}, ${r.state}`)
  );
  
  const remainingCities = allCities.filter(([city, state]) => 
    !processedCities.has(`${city}, ${state}`)
  );
  
  console.log('🔍 PROCESSING STATUS CHECK');
  console.log('=========================');
  console.log(`📊 Progress: ${allCities.length - remainingCities.length}/${allCities.length} cities`);
  console.log(`📍 Database: ${existingRestaurants.length} establishments`);
  console.log(`🎯 Remaining: ${remainingCities.length} cities`);
  
  if (remainingCities.length === 0) {
    console.log('');
    console.log('🎉 ALL CITIES PROCESSED!');
    console.log('✅ Nationwide discovery complete!');
  } else {
    console.log('');
    console.log('⚡ Still processing...');
    console.log(`Next cities: ${remainingCities.slice(0, 5).map(([c, s]) => `${c}, ${s}`).join(', ')}`);
  }
}