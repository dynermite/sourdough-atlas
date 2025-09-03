import { db } from './db';
import { restaurants } from '@shared/schema';
import { sql } from 'drizzle-orm';

// ORIGINAL SIMPLE APPROACH: Just search for sourdough/artisan and filter
export async function simpleSearchCity(city: string, state: string): Promise<number> {
  console.log(`🎯 SIMPLE SEARCH: ${city}, ${state}`);
  
  let totalAdded = 0;
  
  // Search 1: "sourdough pizza [city] [state]"
  try {
    console.log(`   [1/2] Searching: "sourdough pizza ${city} ${state}"`);
    const response1 = await fetch('https://api.outscraper.com/maps/search-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      },
      body: JSON.stringify({
        query: [`sourdough pizza ${city} ${state}`],
        limit: 20,
        language: 'en'
      })
    });

    if (response1.ok) {
      const data1 = await response1.json();
      if (data1?.[0]) {
        console.log(`     Found: ${data1[0].length} results`);
        totalAdded += await processResults(data1[0], city, state);
      }
    }
  } catch (error) {
    console.log(`     Error: ${error.message}`);
  }

  // Search 2: "artisan pizza [city] [state]"
  try {
    console.log(`   [2/2] Searching: "artisan pizza ${city} ${state}"`);
    const response2 = await fetch('https://api.outscraper.com/maps/search-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      },
      body: JSON.stringify({
        query: [`artisan pizza ${city} ${state}`],
        limit: 20,
        language: 'en'
      })
    });

    if (response2.ok) {
      const data2 = await response2.json();
      if (data2?.[0]) {
        console.log(`     Found: ${data2[0].length} results`);
        totalAdded += await processResults(data2[0], city, state);
      }
    }
  } catch (error) {
    console.log(`     Error: ${error.message}`);
  }

  console.log(`   ✅ ${city}: +${totalAdded} verified establishments`);
  return totalAdded;
}

async function processResults(results: any[], city: string, state: string): Promise<number> {
  let added = 0;
  
  for (const place of results) {
    if (!place.name || !place.full_address) continue;
    
    // Simple sourdough keyword filter
    const hasKeywords = place.name.toLowerCase().includes('sourdough') ||
                       place.description?.toLowerCase().includes('sourdough') ||
                       place.description?.toLowerCase().includes('naturally leavened') ||
                       place.description?.toLowerCase().includes('wild yeast');
    
    if (hasKeywords && place.category?.toLowerCase().includes('pizza')) {
      // Check for duplicates
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
          verificationSources: ['simple_search']
        });
        
        added++;
        console.log(`     ✅ ${place.name}`);
      }
    }
  }
  
  return added;
}

export async function runSimpleSearch(): Promise<void> {
  console.log('🎯 SIMPLE SOURDOUGH SEARCH');
  console.log('==========================');
  console.log('Back to original plan: Just "sourdough pizza" + "artisan pizza" searches');
  console.log('');

  const cities = [
    ['Chicago', 'IL'], ['Boston', 'MA'], ['Denver', 'CO'], ['Philadelphia', 'PA'],
    ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Dallas', 'TX'], ['Atlanta', 'GA'],
    ['Houston', 'TX'], ['Detroit', 'MI'], ['Minneapolis', 'MN'], ['Tampa', 'FL'],
    ['St. Louis', 'MO'], ['Baltimore', 'MD'], ['San Diego', 'CA'], ['Nashville', 'TN'],
    ['Charlotte', 'NC'], ['Las Vegas', 'NV'], ['Orlando', 'FL'], ['Cleveland', 'OH']
  ];
  
  let total = 0;
  const start = Date.now();
  
  for (let i = 0; i < cities.length; i++) {
    const [city, state] = cities[i];
    const added = await simpleSearchCity(city, state);
    total += added;
    
    const current = await db.select().from(restaurants);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    
    console.log(`📊 [${i+1}/${cities.length}] Total: ${current.length} (+${total}) | ${elapsed}s`);
    
    if (current.length >= 1000) {
      console.log('🎉 1,000+ REACHED!');
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n🌟 SIMPLE SEARCH COMPLETE: +${total} establishments`);
}