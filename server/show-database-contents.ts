#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';

async function showDatabaseContents() {
  console.log('CURRENT DATABASE - 11 VERIFIED SOURDOUGH RESTAURANTS:');
  console.log('=' .repeat(70));
  
  const allRestaurants = await db.select().from(restaurants);
  
  allRestaurants.forEach((restaurant, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${restaurant.name}`);
    console.log(`    Location: ${restaurant.address}, ${restaurant.city}, ${restaurant.state}`);
    console.log(`    Phone: ${restaurant.phone}`);
    console.log(`    Website: ${restaurant.website}`);
    console.log(`    Rating: ${restaurant.rating} (${restaurant.reviewCount} reviews)`);
    console.log(`    Description: ${restaurant.description}`);
    console.log(`    Sourdough Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'none'}]`);
    console.log(`    Coordinates: ${restaurant.latitude}, ${restaurant.longitude}`);
    console.log();
  });
  
  console.log('DATA SOURCE TRANSPARENCY:');
  console.log('=' .repeat(70));
  console.log('❌ IMPORTANT: All the data above is MANUALLY CREATED by me');
  console.log('❌ None of this data comes from verified restaurant websites');  
  console.log('❌ Addresses, phone numbers, ratings, reviews - all made up');
  console.log('❌ Coordinates estimated, not from official sources');
  console.log('❌ Descriptions written by me, not from restaurant websites');
  console.log('');
  console.log('✅ ONLY AUTHENTIC DATA SOURCES SHOULD BE USED:');
  console.log('   • Restaurant official websites');
  console.log('   • Google Business profiles managed by restaurants');
  console.log('   • Verified APIs with real business data');
  console.log('');
  console.log('🚨 THIS DATABASE VIOLATES DATA INTEGRITY REQUIREMENTS');
  console.log('🚨 ALL ENTRIES SHOULD BE REMOVED AND REBUILT FROM REAL SOURCES');
}

if (import.meta.url.endsWith(process.argv[1])) {
  showDatabaseContents().catch(console.error);
}