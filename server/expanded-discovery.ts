import { runComprehensivePizzaDiscovery } from './comprehensive-pizza-discovery';
import { db } from './db';
import { restaurants } from '@shared/schema';

// Expand to more comprehensive city list - include suburbs and smaller metros
const expandedCities = [
  // Original 99 plus major suburbs and additional metros
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
  ['Birmingham', 'AL'],
  
  // Major suburbs and additional metros for broader coverage
  ['Oakland', 'CA'], ['San Jose', 'CA'], ['Long Beach', 'CA'], ['Santa Monica', 'CA'],
  ['Pasadena', 'CA'], ['Berkeley', 'CA'], ['Manhattan', 'NY'], ['Queens', 'NY'],
  ['Bronx', 'NY'], ['Staten Island', 'NY'], ['Cambridge', 'MA'], ['Somerville', 'MA'],
  ['Alexandria', 'VA'], ['Arlington', 'VA'], ['Bethesda', 'MD'], ['Silver Spring', 'MD'],
  ['Evanston', 'IL'], ['Oak Park', 'IL'], ['Lakewood', 'CO'], ['Fort Collins', 'CO'],
  ['Eugene', 'OR'], ['Salem', 'OR'], ['Bend', 'OR'], ['Tacoma', 'WA'], 
  ['Bellevue', 'WA'], ['Spokane', 'WA'], ['Vancouver', 'WA'], ['Ann Arbor', 'MI'],
  ['Grand Rapids', 'MI'], ['Madison', 'WI'], ['Green Bay', 'WI'], ['Des Moines', 'IA'],
  ['Cedar Rapids', 'IA'], ['Fargo', 'ND'], ['Sioux Falls', 'SD'], ['Billings', 'MT'],
  ['Missoula', 'MT'], ['Salt Lake City', 'UT'], ['Provo', 'UT'], ['Park City', 'UT'],
  ['Santa Fe', 'NM'], ['Flagstaff', 'AZ'], ['Sedona', 'AZ'], ['Key West', 'FL'],
  ['Sarasota', 'FL'], ['Fort Lauderdale', 'FL'], ['West Palm Beach', 'FL'],
  ['Savannah', 'GA'], ['Charleston', 'SC'], ['Wilmington', 'NC'], ['Outer Banks', 'NC'],
  ['Virginia Beach', 'VA'], ['Williamsburg', 'VA'], ['Annapolis', 'MD'],
  ['Cape May', 'NJ'], ['Princeton', 'NJ'], ['New Haven', 'CT'], ['Hartford', 'CT'],
  ['Burlington', 'VT'], ['Portsmouth', 'NH'], ['Bar Harbor', 'ME'], ['Portland', 'ME']
];

export async function expandedDiscovery(): Promise<void> {
  console.log('🌟 EXPANDED NATIONWIDE DISCOVERY');
  console.log('================================');
  console.log('Processing additional cities and suburbs for comprehensive coverage');
  console.log(`Target: ${expandedCities.length} total locations`);
  console.log('Goal: Find 800+ additional establishments to reach 1,000+ target');
  console.log('');
  
  // Check current status
  const existing = await db.select().from(restaurants);
  const processedCities = new Set(existing.map(r => `${r.city}, ${r.state}`));
  const remainingCities = expandedCities.filter(([city, state]) => 
    !processedCities.has(`${city}, ${state}`)
  );
  
  console.log(`📊 Current: ${existing.length} establishments`);
  console.log(`🏙️ Already processed: ${expandedCities.length - remainingCities.length} cities`);
  console.log(`🎯 Remaining: ${remainingCities.length} cities to process`);
  console.log('');
  
  if (remainingCities.length === 0) {
    console.log('🎉 ALL EXPANDED CITIES ALREADY PROCESSED!');
    return;
  }
  
  // Process in batches for speed
  const batchSize = 15;
  let totalProcessed = 0;
  
  for (let i = 0; i < remainingCities.length; i += batchSize) {
    const batch = remainingCities.slice(i, i + batchSize);
    console.log(`🚀 BATCH ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} cities`);
    
    const promises = batch.map(async ([city, state], index) => {
      try {
        await new Promise(resolve => setTimeout(resolve, index * 500));
        await runComprehensivePizzaDiscovery(city, state);
        return { city, state, success: true };
      } catch (error) {
        return { city, state, success: false };
      }
    });
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    totalProcessed += successful;
    
    // Check progress
    const currentCount = await db.select().from(restaurants);
    console.log(`✅ Batch complete: ${successful}/${batch.length} cities processed`);
    console.log(`📊 Database: ${currentCount.length} total establishments`);
    console.log(`🎯 Goal progress: ${currentCount.length}/1000 (${(currentCount.length/1000*100).toFixed(1)}%)`);
    
    if (currentCount.length >= 1000) {
      console.log('');
      console.log('🎉 TARGET ACHIEVED! 1,000+ establishments reached!');
      break;
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Final status
  const finalCount = await db.select().from(restaurants);
  console.log('');
  console.log('🌟 EXPANDED DISCOVERY COMPLETE!');
  console.log('===============================');
  console.log(`📍 Total establishments: ${finalCount.length}`);
  console.log(`🎯 Goal status: ${finalCount.length >= 1000 ? 'ACHIEVED!' : 'In progress'}`);
  console.log('🍞 Comprehensive sourdough pizza directory ready!');
}