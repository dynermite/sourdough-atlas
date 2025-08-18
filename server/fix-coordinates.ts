#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Fix coordinates and addresses for SF establishments with missing data
const COORDINATE_FIXES = [
  {
    name: "The Mill",
    address: "736 Divisadero St, San Francisco, CA 94117",
    latitude: 37.7757,
    longitude: -122.4376,
    state: "California",
    zipCode: "94117"
  },
  {
    name: "Boudin Bakery",
    address: "160 Jefferson St, San Francisco, CA 94133",
    latitude: 37.8081,
    longitude: -122.4147,
    state: "California", 
    zipCode: "94133"
  }
];

export async function fixSFCoordinates() {
  console.log('🔧 FIXING SAN FRANCISCO RESTAURANT COORDINATES');
  console.log('=' .repeat(55));
  
  for (const fix of COORDINATE_FIXES) {
    try {
      console.log(`\n📍 Updating: ${fix.name}`);
      console.log(`   Address: ${fix.address}`);
      console.log(`   Coordinates: ${fix.latitude}, ${fix.longitude}`);
      
      const result = await db
        .update(restaurants)
        .set({
          address: fix.address,
          latitude: fix.latitude,
          longitude: fix.longitude,
          state: fix.state,
          zipCode: fix.zipCode
        })
        .where(eq(restaurants.name, fix.name));
      
      console.log(`   ✅ Updated successfully`);
      
    } catch (error) {
      console.log(`   ❌ Error updating ${fix.name}: ${error.message}`);
    }
  }
  
  // Show all SF restaurants after fixes
  console.log(`\n🌉 SAN FRANCISCO RESTAURANTS AFTER COORDINATE FIX:`);
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  
  sfRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address}`);
    console.log(`   🗺️  Coordinates: ${restaurant.latitude}, ${restaurant.longitude}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   ⭐ Rating: ${restaurant.rating || 'No rating'} (${restaurant.reviewCount || 0} reviews)`);
  });
  
  console.log(`\n✅ All ${sfRestaurants.length} San Francisco restaurants now have proper coordinates`);
  return sfRestaurants.length;
}

if (import.meta.url.endsWith(process.argv[1])) {
  fixSFCoordinates().catch(console.error);
}