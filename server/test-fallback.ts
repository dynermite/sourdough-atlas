// Test script to verify the fallback scraper works
import { simpleScrape } from './simple-scraper';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function testFallbackScraper() {
  console.log('Testing fallback scraper directly...');
  
  try {
    const results = await simpleScrape('Portland Oregon', 5);
    console.log(`Fallback scraper found ${results.length} restaurants:`);
    
    for (const restaurant of results) {
      console.log(`- ${restaurant.name} (${restaurant.city}, ${restaurant.state})`);
      console.log(`  Sourdough verified: ${restaurant.sourdoughVerified ? 'Yes' : 'No'}`);
      console.log(`  Keywords: ${restaurant.sourdoughKeywords.join(', ')}`);
      console.log(`  Website: ${restaurant.website || 'None'}`);
      console.log('');
      
      // Try to save to database
      try {
        const existing = await db.select()
          .from(restaurants)
          .where(eq(restaurants.name, restaurant.name))
          .limit(1);
        
        if (existing.length === 0) {
          const zipCode = restaurant.address.match(/\d{5}(-\d{4})?/)?.[0] || '';
          
          await db.insert(restaurants).values({
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city,
            state: restaurant.state,
            zipCode: zipCode || null,
            phone: restaurant.phone || null,
            website: restaurant.website || null,
            description: restaurant.description || null,
            sourdoughVerified: restaurant.sourdoughVerified,
            sourdoughKeywords: restaurant.sourdoughKeywords,
            rating: 0,
            reviewCount: 0,
            latitude: 0,
            longitude: 0,
            googlePlaceId: null,
            imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
            lastScraped: new Date().toISOString(),
            reviews: []
          });
          
          console.log(`✅ Saved ${restaurant.name} to database`);
        } else {
          console.log(`⚠️ ${restaurant.name} already exists in database`);
        }
      } catch (dbError) {
        console.error(`❌ Error saving ${restaurant.name}:`, dbError);
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url.includes(process.argv[1])) {
  testFallbackScraper().catch(console.error);
}