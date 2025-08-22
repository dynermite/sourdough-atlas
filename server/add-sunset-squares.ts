#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '@shared/schema';
import type { InsertRestaurant } from '@shared/schema';

async function addSunsetSquares() {
  console.log('🌅 Adding Sunset Squares to database...');
  
  try {
    const sunsetSquares: InsertRestaurant = {
      name: "Sunset Squares",
      address: "1725 Noriega St, San Francisco, CA 94122",
      phone: null,
      website: "https://www.sunsetsquares.com/",
      latitude: 37.7531,
      longitude: -122.4709,
      description: "Verified sourdough pizza from restaurant website FAQ: 'Our dough is naturally leavened using a sourdough starter that we maintain daily.'",
      cuisine: "Italian",
      priceRange: "$-$$",
      rating: null,
      city: "San Francisco",
      state: "CA"
    };

    await db.insert(restaurants).values(sunsetSquares);
    console.log('✅ Successfully added Sunset Squares to database');
    
  } catch (error: any) {
    if (error.message?.includes('duplicate')) {
      console.log('⚠️  Sunset Squares already exists in database');
    } else {
      console.error('❌ Error adding Sunset Squares:', error.message);
      throw error;
    }
  }
}

// Execute directly
addSunsetSquares()
  .then(() => {
    console.log('✅ Completed adding Sunset Squares');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });