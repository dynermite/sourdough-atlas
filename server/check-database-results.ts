#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '@shared/schema';

async function checkNewRestaurants() {
  const allRestaurants = await db.select().from(restaurants);
  console.log(`📊 Total restaurants in database: ${allRestaurants.length}`);
  
  const recentlyAdded = allRestaurants.filter(r => 
    r.name.includes('Gusto') || 
    r.name.includes('Sunset Squares') ||
    r.description?.includes('Verified sourdough')
  );
  
  console.log(`\n🥖 Recently verified sourdough restaurants: ${recentlyAdded.length}`);
  recentlyAdded.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   📍 ${r.address}`);
    console.log(`   🌐 ${r.website || 'No website'}`);
    console.log('');
  });
  
  // Show all restaurants for context
  console.log('📋 All restaurants in database:');
  allRestaurants.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} - ${r.city}, ${r.state}`);
  });
}

checkNewRestaurants().catch(console.error);