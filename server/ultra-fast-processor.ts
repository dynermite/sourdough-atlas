import { runComprehensivePizzaDiscovery } from './comprehensive-pizza-discovery';
import { db } from './db';
import { restaurants } from '@shared/schema';

const allCities = [
  ['Portland', 'OR'], ['San Francisco', 'CA'], ['Los Angeles', 'CA'], ['Seattle', 'WA'],
  ['Austin', 'TX'], ['Brooklyn', 'NY'], ['Boulder', 'CO'], ['Asheville', 'NC'],
  ['Burlington', 'VT'], ['Madison', 'WI'], ['Providence', 'RI'], ['New York', 'NY'], 
  ['Chicago', 'IL'], ['Boston', 'MA'], ['Denver', 'CO'], ['Philadelphia', 'PA'], 
  ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Dallas', 'TX'], ['Atlanta', 'GA'], 
  ['Houston', 'TX'], ['Detroit', 'MI'], ['Minneapolis', 'MN'], ['Tampa', 'FL'], 
  ['St. Louis', 'MO'], ['Baltimore', 'MD'], ['San Diego', 'CA'], ['Nashville', 'TN'], 
  ['Charlotte', 'NC'], ['Las Vegas', 'NV'], ['Orlando', 'FL'], ['Cleveland', 'OH'], 
  ['Pittsburgh', 'PA'], ['Cincinnati', 'OH'], ['Kansas City', 'MO'], ['Indianapolis', 'IN'], 
  ['Columbus', 'OH'], ['Milwaukee', 'WI'], ['Virginia Beach', 'VA'], ['Sacramento', 'CA'], 
  ['Omaha', 'NE'], ['Raleigh', 'NC'], ['New Orleans', 'LA'], ['Memphis', 'TN'], 
  ['Louisville', 'KY'], ['Richmond', 'VA'], ['Oklahoma City', 'OK'], ['Jacksonville', 'FL'], 
  ['Tucson', 'AZ'], ['Fresno', 'CA'], ['Mesa', 'AZ'], ['Colorado Springs', 'CO'], 
  ['Albuquerque', 'NM'], ['Tulsa', 'OK'], ['Wichita', 'KS'], ['Arlington', 'TX'], 
  ['Bakersfield', 'CA'], ['Aurora', 'CO'], ['Anaheim', 'CA'], ['Honolulu', 'HI'], 
  ['Santa Ana', 'CA'], ['Corpus Christi', 'TX'], ['Riverside', 'CA'], ['Lexington', 'KY'], 
  ['Stockton', 'CA'], ['St. Paul', 'MN'], ['Buffalo', 'NY'], ['Newark', 'NJ'], 
  ['Plano', 'TX'], ['Fort Wayne', 'IN'], ['St. Petersburg', 'FL'], ['Jersey City', 'NJ'], 
  ['Lincoln', 'NE'], ['Henderson', 'NV'], ['Greensboro', 'NC'], ['Chandler', 'AZ'], 
  ['Chula Vista', 'CA'], ['Norfolk', 'VA'], ['North Las Vegas', 'NV'], ['Durham', 'NC'], 
  ['Lubbock', 'TX'], ['Irvine', 'CA'], ['Winston-Salem', 'NC'], ['Glendale', 'AZ'], 
  ['Garland', 'TX'], ['Hialeah', 'FL'], ['Reno', 'NV'], ['Baton Rouge', 'LA'], 
  ['Irving', 'TX'], ['Chesapeake', 'VA'], ['Scottsdale', 'AZ'], ['Spokane', 'WA'], 
  ['Fremont', 'CA'], ['San Bernardino', 'CA'], ['Gilbert', 'AZ'], ['Boise', 'ID'], 
  ['Birmingham', 'AL']
];

export async function ultraFastProcess(): Promise<void> {
  console.log('🚀 ULTRA-FAST NATIONWIDE PROCESSOR');
  console.log('==================================');
  console.log('Processing ALL 99 cities with maximum speed optimization');
  console.log('');
  
  const existing = await db.select().from(restaurants);
  const processed = new Set(existing.map(r => `${r.city}, ${r.state}`));
  const remaining = allCities.filter(([city, state]) => !processed.has(`${city}, ${state}`));
  
  console.log(`📊 Current: ${existing.length} establishments`);
  console.log(`🎯 Remaining: ${remaining.length} cities to process`);
  console.log('');
  
  if (remaining.length === 0) {
    console.log('🎉 ALL CITIES ALREADY PROCESSED!');
    return;
  }
  
  console.log('⚡ Starting ultra-fast parallel processing...');
  
  // Process ALL remaining cities simultaneously for maximum speed
  const startTime = Date.now();
  const promises = remaining.map(async ([city, state], index) => {
    try {
      // Minimal stagger to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, index * 100));
      
      console.log(`🔄 Processing: ${city}, ${state}`);
      await runComprehensivePizzaDiscovery(city, state);
      console.log(`✅ ${city}, ${state} COMPLETE`);
      
      return { city, state, success: true };
    } catch (error) {
      console.log(`❌ ${city}, ${state} failed: ${error.message}`);
      return { city, state, success: false, error: error.message };
    }
  });
  
  console.log(`🚀 Launched ${remaining.length} parallel processes`);
  console.log('⏱️ Processing in progress...');
  console.log('');
  
  // Wait for all to complete
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // Final status
  const finalCount = await db.select().from(restaurants);
  const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
  
  console.log('');
  console.log('🎉 ULTRA-FAST PROCESSING COMPLETE!');
  console.log('==================================');
  console.log(`✅ Successful: ${successful}/${remaining.length} cities`);
  console.log(`❌ Failed: ${failed} cities`);
  console.log(`⏱️ Time: ${elapsed.toFixed(1)} minutes`);
  console.log(`📍 Total establishments: ${finalCount.length}`);
  console.log(`🎯 Goal status: ${finalCount.length >= 1000 ? 'ACHIEVED!' : 'In progress'}`);
  console.log('');
  console.log('🌟 NATIONWIDE SOURDOUGH DIRECTORY READY!');
}

export async function quickStatus(): Promise<void> {
  const restaurants_count = await db.select().from(restaurants);
  const processed = new Set(restaurants_count.map(r => `${r.city}, ${r.state}`));
  const remaining = allCities.filter(([city, state]) => !processed.has(`${city}, ${state}`));
  
  console.log('📊 QUICK STATUS CHECK');
  console.log('====================');
  console.log(`📍 Establishments: ${restaurants_count.length}`);
  console.log(`🏙️ Cities processed: ${allCities.length - remaining.length}/99`);
  console.log(`🎯 Remaining: ${remaining.length} cities`);
  console.log(`🏆 Goal: ${restaurants_count.length >= 1000 ? 'ACHIEVED' : `${restaurants_count.length}/1000`}`);
}