import { runComprehensivePizzaDiscovery } from './comprehensive-pizza-discovery';
import { db } from './db';
import { restaurants } from '@shared/schema';

const remainingCities = [
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

export async function processOneByOne(): Promise<void> {
  console.log('🎯 SEQUENTIAL CITY PROCESSOR');
  console.log('============================');
  console.log('Processing cities one at a time for reliable results');
  console.log(`Cities to process: ${remainingCities.length}`);
  console.log('');

  const currentRestaurants = await db.select().from(restaurants);
  console.log(`Starting with: ${currentRestaurants.length} establishments`);
  console.log('');

  for (let i = 0; i < remainingCities.length; i++) {
    const [city, state] = remainingCities[i];
    
    console.log(`[${i + 1}/${remainingCities.length}] Processing: ${city}, ${state}`);
    console.log('='.repeat(50));
    
    try {
      await runComprehensivePizzaDiscovery(city, state);
      
      // Check progress
      const updatedCount = await db.select().from(restaurants);
      console.log(`✅ ${city}, ${state} complete`);
      console.log(`📊 Total establishments: ${updatedCount.length}`);
      console.log(`🎯 Progress: ${updatedCount.length}/1000 (${(updatedCount.length/1000*100).toFixed(1)}%)`);
      
      if (updatedCount.length >= 1000) {
        console.log('');
        console.log('🎉 TARGET ACHIEVED! 1,000+ establishments reached!');
        break;
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${city}, ${state}: ${error.message}`);
    }
    
    console.log('');
    // Brief pause between cities
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const finalCount = await db.select().from(restaurants);
  console.log('🌟 SEQUENTIAL PROCESSING COMPLETE!');
  console.log(`📍 Final count: ${finalCount.length} establishments`);
}