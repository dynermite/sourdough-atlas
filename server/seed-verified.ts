import { db } from './db';
import { restaurants } from '@shared/schema';
import { verifiedSourdoughRestaurants } from './verified-restaurants';
import { sql } from 'drizzle-orm';

export async function seedVerifiedRestaurants() {
  console.log('Seeding database with verified sourdough restaurants...');
  
  let addedCount = 0;
  
  for (const restaurant of verifiedSourdoughRestaurants) {
    try {
      // Check if restaurant already exists
      const existing = await db
        .select()
        .from(restaurants)
        .where(sql`name = ${restaurant.name} AND city = ${restaurant.city}`)
        .limit(1);
        
      if (existing.length === 0) {
        await db.insert(restaurants).values({
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode: restaurant.address.match(/\d{5}(-\d{4})?/)?.[0] || '',
          phone: restaurant.phone,
          website: restaurant.website,
          description: restaurant.description,
          sourdoughVerified: 1,
          sourdoughKeywords: restaurant.sourdoughKeywords,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
          lastScraped: new Date().toISOString(),
          reviews: [`Verified authentic sourdough - ${restaurant.verificationSource}`]
        });
        
        console.log(`Added: ${restaurant.name} in ${restaurant.city}, ${restaurant.state}`);
        addedCount++;
      } else {
        console.log(`Skipped (exists): ${restaurant.name} in ${restaurant.city}, ${restaurant.state}`);
      }
    } catch (error) {
      console.error(`Error adding ${restaurant.name}:`, error);
    }
  }
  
  console.log(`Seeding complete. Added ${addedCount} new verified restaurants.`);
  return addedCount;
}

// CLI script to run seeding
if (require.main === module) {
  seedVerifiedRestaurants()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}