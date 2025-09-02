import { db } from './db';
import { restaurants } from '@shared/schema';
import { sql } from 'drizzle-orm';

// SIMPLE FAST SYSTEM - like original Portland/LA (no comprehensive discovery!)
export async function simpleFastCity(city: string, state: string): Promise<number> {
  console.log(`⚡ ${city}, ${state}`);
  
  try {
    // Direct OutScraper call - no complex verification
    const response = await fetch('https://api.outscraper.com/maps/search-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      },
      body: JSON.stringify({
        query: [`sourdough pizza ${city} ${state}`],
        limit: 15,
        language: 'en'
      })
    });

    if (!response.ok) {
      console.log(`  ❌ API error: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    let added = 0;
    
    if (data?.[0]) {
      for (const place of data[0]) {
        if (!place.name || !place.full_address) continue;
        
        // Simple check - if it's already a sourdough search result, it's likely valid
        if (place.category?.toLowerCase().includes('pizza') || 
            place.name.toLowerCase().includes('pizza')) {
          
          // Quick duplicate check
          const existing = await db.select()
            .from(restaurants)
            .where(sql`LOWER(name) = LOWER(${place.name}) AND city = ${city}`)
            .limit(1);
            
          if (existing.length === 0) {
            await db.insert(restaurants).values({
              name: place.name,
              address: place.full_address,
              city: city,
              state: state,
              phone: place.phone || '',
              website: place.site || '',
              rating: place.rating || 0,
              reviewCount: place.reviews_count || 0,
              latitude: place.latitude || 0,
              longitude: place.longitude || 0,
              keywords: ['sourdough'],
              verificationSources: ['outscraper_simple']
            });
            
            added++;
            console.log(`    ✅ ${place.name}`);
          }
        }
      }
    }
    
    console.log(`  📊 ${city}: +${added}`);
    return added;
    
  } catch (error) {
    console.log(`  ❌ ${city} error: ${error.message}`);
    return 0;
  }
}

export async function runSimpleFast(): Promise<void> {
  console.log('⚡ SIMPLE FAST PROCESSOR');
  console.log('========================');
  console.log('Back to original Portland/LA speed - no complex verification!');
  
  const startCount = await db.select().from(restaurants);
  console.log(`Starting: ${startCount.length} establishments`);
  console.log('');

  const cities = [
    ['Chicago', 'IL'], ['Boston', 'MA'], ['Denver', 'CO'], ['Philadelphia', 'PA'],
    ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Dallas', 'TX'], ['Atlanta', 'GA'],
    ['Houston', 'TX'], ['Detroit', 'MI'], ['Minneapolis', 'MN'], ['Tampa', 'FL'],
    ['St. Louis', 'MO'], ['Baltimore', 'MD'], ['San Diego', 'CA'], ['Nashville', 'TN'],
    ['Charlotte', 'NC'], ['Las Vegas', 'NV'], ['Orlando', 'FL'], ['Cleveland', 'OH'],
    ['Pittsburgh', 'PA'], ['Cincinnati', 'OH'], ['Kansas City', 'MO'],
    ['Indianapolis', 'IN'], ['Columbus', 'OH'], ['Milwaukee', 'WI'],
    ['Virginia Beach', 'VA'], ['Sacramento', 'CA'], ['Raleigh', 'NC'],
    ['New Orleans', 'LA'], ['Memphis', 'TN'], ['Louisville', 'KY'],
    ['Richmond', 'VA'], ['Oklahoma City', 'OK'], ['Jacksonville', 'FL'],
    ['Tucson', 'AZ'], ['Fresno', 'CA'], ['Mesa', 'AZ'], ['Colorado Springs', 'CO']
  ];
  
  let total = 0;
  const start = Date.now();
  
  for (let i = 0; i < cities.length; i++) {
    const [city, state] = cities[i];
    const added = await simpleFastCity(city, state);
    total += added;
    
    const current = await db.select().from(restaurants);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    
    console.log(`[${i+1}/${cities.length}] Total: ${current.length} (+${total}) | ${elapsed}s`);
    
    if (current.length >= 1000) {
      console.log('🎉 1,000+ REACHED!');
      break;
    }
    
    // Very brief pause - much faster than before
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const final = await db.select().from(restaurants);
  const totalTime = ((Date.now() - start) / 1000 / 60).toFixed(1);
  
  console.log('');
  console.log('🌟 SIMPLE FAST COMPLETE!');
  console.log(`📊 Final: ${final.length} establishments`);
  console.log(`⏱️ Time: ${totalTime} minutes`);
  console.log(`🚀 Added: ${total} new establishments`);
}