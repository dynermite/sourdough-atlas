import { db } from './db';
import { restaurants } from '@shared/schema';
import { searchYelp } from './enhanced-yelp-details';

// Fast processing like original Portland/LA system
export async function fastCityProcessor(city: string, state: string): Promise<number> {
  console.log(`⚡ FAST PROCESSING: ${city}, ${state}`);
  console.log('Using streamlined verification (no slow social media checks)');
  
  try {
    // Quick Yelp search for sourdough pizza
    const results = await searchYelp(`sourdough pizza ${city} ${state}`, {
      location: `${city}, ${state}`,
      categories: 'pizza,italian',
      limit: 50
    });

    let addedCount = 0;
    
    for (const business of results.businesses || []) {
      if (!business.name || !business.location?.address1) continue;
      
      // Quick keyword check (no extensive verification)
      const hasKeywords = business.name.toLowerCase().includes('sourdough') ||
                         (business.categories || []).some(cat => 
                           cat.title?.toLowerCase().includes('sourdough')) ||
                         (business.url && business.url.includes('sourdough'));
      
      if (hasKeywords) {
        // Add to database immediately
        const existingCheck = await db.select()
          .from(restaurants)
          .where(sql`name = ${business.name} AND city = ${city} AND state = ${state}`)
          .limit(1);
          
        if (existingCheck.length === 0) {
          await db.insert(restaurants).values({
            name: business.name,
            address: business.location.address1,
            city: city,
            state: state,
            phone: business.phone || '',
            website: business.url || '',
            rating: business.rating || 0,
            reviewCount: business.review_count || 0,
            latitude: business.coordinates?.latitude || 0,
            longitude: business.coordinates?.longitude || 0,
            keywords: ['sourdough'],
            verificationSources: ['yelp_quick_check']
          });
          
          addedCount++;
          console.log(`  ✅ Added: ${business.name}`);
        }
      }
    }
    
    console.log(`✅ ${city}, ${state} complete: ${addedCount} establishments added`);
    return addedCount;
    
  } catch (error) {
    console.log(`❌ Error processing ${city}, ${state}: ${error.message}`);
    return 0;
  }
}

// Process multiple cities fast
export async function runFastProcessor(): Promise<void> {
  console.log('🚀 FAST PROCESSOR SYSTEM');
  console.log('========================');
  console.log('Using original Portland/LA speed approach');
  console.log('');

  const currentCount = await db.select().from(restaurants);
  console.log(`Starting with: ${currentCount.length} establishments`);

  const cities = [
    ['Boston', 'MA'], ['Denver', 'CO'], ['Philadelphia', 'PA'], 
    ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Dallas', 'TX'], 
    ['Atlanta', 'GA'], ['Houston', 'TX'], ['Detroit', 'MI'], 
    ['Minneapolis', 'MN'], ['Tampa', 'FL'], ['St. Louis', 'MO'],
    ['Baltimore', 'MD'], ['San Diego', 'CA'], ['Nashville', 'TN'],
    ['Charlotte', 'NC'], ['Las Vegas', 'NV'], ['Orlando', 'FL'],
    ['Cleveland', 'OH'], ['Pittsburgh', 'PA']
  ];
  
  let totalAdded = 0;
  
  for (let i = 0; i < cities.length; i++) {
    const [city, state] = cities[i];
    console.log(`\n[${i + 1}/${cities.length}] Processing ${city}, ${state}`);
    
    const added = await fastCityProcessor(city, state);
    totalAdded += added;
    
    const updatedCount = await db.select().from(restaurants);
    console.log(`📊 Total: ${updatedCount.length} establishments (+${totalAdded} this session)`);
    
    if (updatedCount.length >= 1000) {
      console.log('🎉 TARGET ACHIEVED! 1,000+ establishments reached!');
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🌟 FAST PROCESSING COMPLETE!');
}