#!/usr/bin/env tsx

import { db } from './db';
import { restaurants, type InsertRestaurant } from '../shared/schema';

const verifiedSourdoughEstablishments: InsertRestaurant[] = [
  {
    name: "Long Bridge Pizza Company",
    address: "2347 3rd St, San Francisco, CA 94107",
    city: "San Francisco",
    state: "CA",
    zipCode: "94107",
    latitude: 37.7638,
    longitude: -122.3911,
    phone: "(415) 626-3600",
    website: "https://www.longbridgepizza.com/",
    description: "Gourmet thin-crust pies, salads & subs served in a simple, industrial-chic space. Known for naturally leavened sourdough crust.",
    cuisineType: "Pizza",
    priceRange: "$$",
    rating: 4.3,
    isVerified: true
  },
  {
    name: "Gusto Pinsa Romana",
    address: "1000 Bush St, San Francisco, CA 94109",
    city: "San Francisco", 
    state: "CA",
    zipCode: "94109",
    latitude: 37.7916,
    longitude: -122.4169,
    phone: "(415) 839-5378",
    website: "https://www.gustosf.com/",
    description: "Roman-style pizza with sourdough crust & artisanal toppings in a quaint setting with outdoor seats.",
    cuisineType: "Italian Pizza",
    priceRange: "$$",
    rating: 4.7,
    isVerified: true
  },
  {
    name: "Angie's Pizza",
    address: "3228 16th St, San Francisco, CA 94103", 
    city: "San Francisco",
    state: "CA",
    zipCode: "94103",
    latitude: 37.7655,
    longitude: -122.4188,
    phone: "(415) 829-2040",
    website: "http://www.angiespizzasf.com/",
    description: "Local pizzeria serving sourdough-based pizzas with fresh ingredients and traditional preparation methods.",
    cuisineType: "Pizza",
    priceRange: "$",
    rating: 4.7,
    isVerified: true
  },
  {
    name: "Goat Hill Pizza",
    address: "300 Connecticut St, San Francisco, CA 94107",
    city: "San Francisco",
    state: "CA", 
    zipCode: "94107",
    latitude: 37.7619,
    longitude: -122.3979,
    phone: "(415) 641-1440",
    website: "https://www.goathillpizza.com/",
    description: "Old-school pizzeria offering a San Franciscan twist via sourdough-crusted pies since 1975.",
    cuisineType: "Pizza",
    priceRange: "$$",
    rating: 4.3,
    isVerified: true
  },
  {
    name: "Goat Hill Pizza",
    address: "170 W Portal Ave, San Francisco, CA 94127",
    city: "San Francisco",
    state: "CA",
    zipCode: "94127", 
    latitude: 37.7401,
    longitude: -122.4665,
    phone: "(415) 242-4628",
    website: "http://goathillpizza.com/",
    description: "Local mini-chain of pizzerias specializing in sourdough-crust slices & pies since 1975, plus soups.",
    cuisineType: "Pizza",
    priceRange: "$$",
    rating: 4.3,
    isVerified: true
  }
];

async function addVerifiedSourdoughEstablishments() {
  console.log('🍞 ADDING VERIFIED SOURDOUGH ESTABLISHMENTS TO DATABASE');
  console.log('=' .repeat(55));
  
  try {
    // Clear existing restaurants to avoid duplicates
    console.log('Clearing existing restaurant data...');
    await db.delete(restaurants);
    
    // Insert verified sourdough establishments
    console.log(`Adding ${verifiedSourdoughEstablishments.length} verified sourdough establishments...`);
    
    for (const establishment of verifiedSourdoughEstablishments) {
      console.log(`Adding: ${establishment.name} - ${establishment.address}`);
      
      await db.insert(restaurants).values(establishment);
    }
    
    console.log('\n✅ SUCCESS: All verified sourdough establishments added to database');
    console.log('The map will now display these authentic sourdough pizzerias:');
    
    verifiedSourdoughEstablishments.forEach((est, index) => {
      console.log(`${index + 1}. ${est.name}`);
      console.log(`   📍 ${est.address}`);
      console.log(`   🌐 ${est.website}`);
      console.log(`   📞 ${est.phone}`);
      console.log(`   ⭐ Rating: ${est.rating}`);
      console.log('');
    });
    
    console.log('🗺️  Visit the map to see all verified sourdough pizza establishments!');
    
  } catch (error) {
    console.error('❌ Error adding establishments:', error);
    throw error;
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  addVerifiedSourdoughEstablishments()
    .then(() => {
      console.log('🎯 Database update complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to update database:', error);
      process.exit(1);
    });
}