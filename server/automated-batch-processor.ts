import { runComprehensivePizzaDiscovery } from './comprehensive-pizza-discovery';
import { notifyBatchCompletion } from './batch-completion-notifier';

// Complete list of all 99 cities from the strategic plan
const allCities: [string, string][] = [
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

export async function processAllCitiesWithNotification() {
  console.log('🚀 AUTOMATED NATIONWIDE SOURDOUGH DISCOVERY SYSTEM');
  console.log('==================================================');
  console.log('');
  console.log(`📊 PROCESSING ALL ${allCities.length} STRATEGIC CITIES`);
  console.log('🎯 Target: 1,000-1,500 authentic sourdough pizza establishments');
  console.log('⚡ Enhanced 5-step verification system operational');
  console.log('');
  console.log('🔔 NOTIFICATION: You will be automatically notified when processing is complete!');
  console.log('');

  let processedCount = 0;
  const results: Array<{city: string, state: string, status: 'success' | 'error', error?: string}> = [];

  console.log('🔄 STARTING COMPREHENSIVE BATCH PROCESSING...');
  console.log('');
  
  for (const [city, state] of allCities) {
    try {
      console.log(`[${processedCount + 1}/${allCities.length}] Processing: ${city}, ${state}`);
      console.log('━'.repeat(60));
      
      await runComprehensivePizzaDiscovery(city, state);
      
      results.push({ city, state, status: 'success' });
      processedCount++;
      
      console.log(`✅ ${city}, ${state} COMPLETE`);
      console.log(`📊 Progress: ${processedCount}/${allCities.length} cities (${((processedCount/allCities.length)*100).toFixed(1)}%)`);
      console.log('');
      
      // Brief pause between cities to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ Error processing ${city}, ${state}: ${error}`);
      results.push({ city, state, status: 'error', error: String(error) });
      console.log('▶️ Continuing with next city...');
      console.log('');
      processedCount++;
    }
  }
  
  // Processing complete - send notification
  console.log('');
  console.log('🎊 ALL 99 CITIES PROCESSED! SENDING COMPLETION NOTIFICATION...');
  console.log('');
  
  const completionResults = await notifyBatchCompletion();
  
  console.log('📧 COMPLETION SUMMARY:');
  console.log(`✅ Successfully processed: ${results.filter(r => r.status === 'success').length} cities`);
  console.log(`❌ Errors encountered: ${results.filter(r => r.status === 'error').length} cities`);
  console.log(`🍕 Total establishments: ${completionResults.totalEstablishments}`);
  console.log(`🍞 Verified sourdough: ${completionResults.verifiedSourdough}`);
  console.log(`🎯 Goal status: ${completionResults.goalAchieved ? 'ACHIEVED' : 'In Progress'}`);
  
  return {
    processed: processedCount,
    results,
    completion: completionResults
  };
}