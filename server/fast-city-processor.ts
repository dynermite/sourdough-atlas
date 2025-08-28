import { runComprehensivePizzaDiscovery } from './comprehensive-pizza-discovery';
import { db } from './db';
import { restaurants } from '@shared/schema';

// All 99 cities - streamlined for speed
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

export async function fastProcessAllCities(): Promise<void> {
  console.log('⚡ FAST BATCH PROCESSOR - ALL 99 CITIES');
  console.log('=======================================');
  
  // Check what we've already done
  const existing = await db.select().from(restaurants);
  const processed = new Set(existing.map(r => `${r.city}, ${r.state}`));
  const remaining = allCities.filter(([city, state]) => !processed.has(`${city}, ${state}`));
  
  console.log(`📊 Starting: ${existing.length} establishments already discovered`);
  console.log(`🎯 Processing: ${remaining.length} remaining cities`);
  console.log('⚡ Using aggressive parallel processing for speed');
  console.log('');
  
  // Process in large batches of 20 cities at once
  const batchSize = 20;
  for (let i = 0; i < remaining.length; i += batchSize) {
    const batch = remaining.slice(i, i + batchSize);
    console.log(`🚀 BATCH ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} cities simultaneously`);
    
    const promises = batch.map(async ([city, state], index) => {
      try {
        await new Promise(resolve => setTimeout(resolve, index * 500)); // Quick stagger
        await runComprehensivePizzaDiscovery(city, state);
        return { city, state, success: true };
      } catch (error) {
        return { city, state, success: false };
      }
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    console.log(`✅ Batch complete: ${successful}/${batch.length} cities processed`);
    console.log(`📊 Progress: ${i + batch.length}/${remaining.length} cities (${((i + batch.length)/remaining.length*100).toFixed(1)}%)`);
    
    // Quick status check
    const current = await db.select().from(restaurants);
    console.log(`📍 Database: ${current.length} total establishments`);
    console.log('');
    
    // Brief pause between batches
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final count
  const final = await db.select().from(restaurants);
  console.log('🎉 FAST PROCESSING COMPLETE!');
  console.log(`✅ Total establishments: ${final.length}`);
  console.log(`🎯 Goal ${final.length >= 1000 ? 'ACHIEVED' : 'in progress'}: 1,000-1,500 establishments`);
}