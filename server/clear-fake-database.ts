#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';

async function clearFakeDatabase() {
  console.log('🗑️  CLEARING FABRICATED DATABASE');
  console.log('=' .repeat(50));
  console.log('❌ Removing all manually created/fabricated entries');
  console.log('✅ Preparing for authentic data only');
  
  // Clear all fake entries
  await db.delete(restaurants);
  
  console.log('✅ Database cleared successfully');
  console.log('📋 Ready for verified restaurant data from:');
  console.log('   • Official restaurant websites');
  console.log('   • Google Business profiles');
  console.log('   • Verified APIs with real business data');
}

if (import.meta.url.endsWith(process.argv[1])) {
  clearFakeDatabase().catch(console.error);
}