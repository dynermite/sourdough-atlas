import { db } from './db';
import { restaurants } from '@shared/schema';
import { sql } from 'drizzle-orm';

// ORIGINAL SIMPLE APPROACH: Just search for sourdough/artisan and filter
export async function simpleSearchCity(city: string, state: string): Promise<number> {
  console.log(`🎯 SIMPLE SEARCH: ${city}, ${state}`);
  
  let totalAdded = 0;
  
  // Search 1: Location-first format for better geographic targeting
  try {
    console.log(`   [1/2] Searching: "pizza ${city} ${state} sourdough"`);
    const response1 = await fetch(`https://api.outscraper.com/maps/search-v3?query=${encodeURIComponent(`pizza ${city} ${state} sourdough`)}&limit=20&language=en&region=US`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      }
    });

    if (response1.ok) {
      const data1 = await response1.json();
      if (data1.status === 'Success' && data1.data) {
        let results = data1.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        console.log(`     Found: ${results.length} results`);
        totalAdded += await processResults(results, city, state);
      } else if (data1.status === 'Pending') {
        console.log(`     Request pending (ID: ${data1.id}), waiting for results...`);
        const pendingResults = await waitForResults(data1.id);
        if (pendingResults.length > 0) {
          console.log(`     Found: ${pendingResults.length} results`);
          totalAdded += await processResults(pendingResults, city, state);
        }
      }
    }
  } catch (error) {
    console.log(`     Error: ${error.message}`);
  }

  // Search 2: Location-first format for better geographic targeting  
  try {
    console.log(`   [2/2] Searching: "pizza ${city} ${state} artisan"`);
    const response2 = await fetch(`https://api.outscraper.com/maps/search-v3?query=${encodeURIComponent(`pizza ${city} ${state} artisan`)}&limit=20&language=en&region=US`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      }
    });

    if (response2.ok) {
      const data2 = await response2.json();
      if (data2.status === 'Success' && data2.data) {
        let results = data2.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        console.log(`     Found: ${results.length} results`);
        totalAdded += await processResults(results, city, state);
      } else if (data2.status === 'Pending') {
        console.log(`     Request pending (ID: ${data2.id}), waiting for results...`);
        const pendingResults = await waitForResults(data2.id);
        if (pendingResults.length > 0) {
          console.log(`     Found: ${pendingResults.length} results`);
          totalAdded += await processResults(pendingResults, city, state);
        }
      }
    }
  } catch (error) {
    console.log(`     Error: ${error.message}`);
  }

  console.log(`   ✅ ${city}: +${totalAdded} verified establishments`);
  return totalAdded;
}

async function waitForResults(requestId: string): Promise<any[]> {
  for (let i = 0; i < 12; i++) { // Wait up to 2 minutes
    try {
      const response = await fetch(`https://api.outscraper.com/requests/${requestId}`, {
        headers: {
          'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'Success' && data.data) {
          let results = data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
        } else if (data.status === 'Pending') {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          continue;
        } else {
          console.log(`     Request failed: ${data.status}`);
          return [];
        }
      }
    } catch (error) {
      console.log(`     Polling error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log(`     Timeout waiting for results`);
  return [];
}

async function processResults(results: any[], city: string, state: string): Promise<number> {
  let added = 0;
  
  console.log(`     🔍 Processing ${results.length} results...`);
  
  for (const place of results) {
    if (!place.name) continue;
    
    // Debug: Show what we're looking at
    console.log(`       Checking: ${place.name}`);
    console.log(`         Address: ${place.full_address || place.address || 'No address'}`);
    console.log(`         Category: ${place.category}`);
    
    // Geographic filtering: ensure restaurant is actually in the target city
    const address = (place.full_address || place.address || '').toLowerCase();
    const isInTargetCity = address.includes(city.toLowerCase()) || 
                          address.includes(state.toLowerCase());
    
    // Pizza restaurant filter  
    const isPizzaRelated = place.name.toLowerCase().includes('pizza') ||
                          place.category?.toLowerCase().includes('pizza') ||
                          place.description?.toLowerCase().includes('pizza');
    
    if (isPizzaRelated && isInTargetCity) {
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