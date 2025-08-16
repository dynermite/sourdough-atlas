import { db } from "./db";
import { restaurants } from "@shared/schema";
import { eq } from "drizzle-orm";

// Add proper coordinates for Portland restaurants
const portlandRestaurants = [
  { name: "Ken's Artisan Pizza", lat: 45.5152, lng: -122.6784 },
  { name: "Lovely's Fifty Fifty", lat: 45.5424, lng: -122.6530 },
  { name: "Apizza Scholls", lat: 45.4695, lng: -122.6689 },
  { name: "Pizza Jerk", lat: 45.5152, lng: -122.6445 },
  { name: "Dove Vivi Pizza", lat: 45.5376, lng: -122.6585 },
  { name: "Scottie's Pizza Parlor", lat: 45.5152, lng: -122.6534 },
  { name: "Nostrana", lat: 45.5051, lng: -122.6540 },
  { name: "Pizzicato Gourmet Pizza", lat: 45.5152, lng: -122.6789 },
  { name: "Baby Doll Pizza", lat: 45.5420, lng: -122.6634 },
  { name: "Hotlips Pizza", lat: 45.5152, lng: -122.6445 },
  { name: "Sizzle Pie", lat: 45.5230, lng: -122.6587 },
  { name: "Portland House of Pizza", lat: 45.5152, lng: -122.6234 },
  { name: "Antonio's Flying Pizza", lat: 45.5342, lng: -122.6756 }
];

// Add proper coordinates for San Francisco restaurants  
const sfRestaurants = [
  { name: "Tony's Little Star Pizza", lat: 37.7749, lng: -122.4194 },
  { name: "Flour + Water", lat: 37.7599, lng: -122.4148 },
  { name: "Arizmendi Bakery", lat: 37.7629, lng: -122.4664 },
  { name: "Goat Hill Pizza", lat: 37.7587, lng: -122.3920 },
  { name: "Gusto Pinsa Romana", lat: 37.7849, lng: -122.4194 }
];

// Add coordinates for other cities
const otherCityRestaurants = [
  // Seattle restaurants
  { name: "Serious Pie", lat: 47.6097, lng: -122.3331 },
  { name: "Via Tribunali", lat: 47.6205, lng: -122.3493 },
  
  // Chicago restaurants  
  { name: "Spacca Napoli", lat: 41.8781, lng: -87.6298 },
  { name: "Pequod's Pizza", lat: 41.9200, lng: -87.6687 },
  
  // Austin restaurants
  { name: "Via 313", lat: 30.2672, lng: -97.7431 },
  { name: "Home Slice Pizza", lat: 30.2672, lng: -97.7431 },
  
  // Denver restaurant
  { name: "Sourdough Ridge Pizzeria", lat: 39.7392, lng: -104.9903 },
  
  // New York restaurant  
  { name: "Roberta's", lat: 40.7282, lng: -73.9442 },
  
  // Remaining Portland restaurants that might need coordinates
  { name: "Pizzicato Gourmet Pizza", lat: 45.5152, lng: -122.6789 },
  { name: "Baby Doll Pizza", lat: 45.5420, lng: -122.6634 },
  { name: "Hotlips Pizza", lat: 45.5152, lng: -122.6445 }
];

async function fixCoordinates() {
  console.log('Fixing restaurant coordinates...');
  
  // Update Portland restaurants
  for (const restaurant of portlandRestaurants) {
    try {
      const result = await db
        .update(restaurants)
        .set({ 
          latitude: restaurant.lat, 
          longitude: restaurant.lng 
        })
        .where(eq(restaurants.name, restaurant.name));
      console.log(`Updated coordinates for ${restaurant.name}`);
    } catch (error) {
      console.log(`Could not update ${restaurant.name}:`, error);
    }
  }
  
  // Update San Francisco restaurants
  for (const restaurant of sfRestaurants) {
    try {
      const result = await db
        .update(restaurants)
        .set({ 
          latitude: restaurant.lat, 
          longitude: restaurant.lng 
        })
        .where(eq(restaurants.name, restaurant.name));
      console.log(`Updated coordinates for ${restaurant.name}`);
    } catch (error) {
      console.log(`Could not update ${restaurant.name}:`, error);
    }
  }
  
  // Update other city restaurants
  for (const restaurant of otherCityRestaurants) {
    try {
      const result = await db
        .update(restaurants)
        .set({ 
          latitude: restaurant.lat, 
          longitude: restaurant.lng 
        })
        .where(eq(restaurants.name, restaurant.name));
      console.log(`Updated coordinates for ${restaurant.name}`);
    } catch (error) {
      console.log(`Could not update ${restaurant.name}:`, error);
    }
  }
  
  console.log('Coordinate fixing complete!');
}

if (import.meta.url.endsWith(process.argv[1])) {
  fixCoordinates();
}

export { fixCoordinates };