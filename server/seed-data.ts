import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

const sampleRestaurants = [
  {
    name: "Tony's Sourdough Kitchen",
    address: "123 Lombard Street",
    city: "San Francisco",
    state: "CA",
    zipCode: "94133",
    phone: "(415) 555-0123",
    website: "https://tonyssourdough.com",
    description: "Our naturally leavened sourdough crust is fermented for 72 hours using a 100-year-old starter.",
    sourdoughVerified: 1,
    sourdoughKeywords: ["sourdough", "naturally leavened", "starter"],
    rating: 4.8,
    reviewCount: 127,
    latitude: 37.8024,
    longitude: -122.4058,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    hours: JSON.stringify({
      monday: "11:00-22:00",
      tuesday: "11:00-22:00",
      wednesday: "11:00-22:00",
      thursday: "11:00-22:00",
      friday: "11:00-23:00",
      saturday: "11:00-23:00",
      sunday: "12:00-21:00"
    }),
    googlePlaceId: "sample_place_1",
    lastScraped: new Date().toISOString(),
    reviews: [
      "Amazing sourdough pizza! The crust has such complex flavors from the long fermentation.",
      "Best naturally leavened pizza in the city. You can taste the quality of their starter."
    ]
  },
  {
    name: "Naturally Leavened Co.",
    address: "456 Pearl District Ave",
    city: "Portland",
    state: "OR",
    zipCode: "97209",
    phone: "(503) 555-0456",
    website: "https://naturallyleavened.com",
    description: "Wild yeast sourdough starter cultivated over 15 years creates our signature naturally leavened crust.",
    sourdoughVerified: 1,
    sourdoughKeywords: ["naturally leavened", "wild yeast", "sourdough starter"],
    rating: 4.9,
    reviewCount: 89,
    latitude: 45.5272,
    longitude: -122.6783,
    imageUrl: "https://images.unsplash.com/photo-1571066811602-716837d681de?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    googlePlaceId: "sample_place_2",
    lastScraped: new Date().toISOString(),
    reviews: [
      "The fermentation process here is incredible. True artisan sourdough pizza.",
      "15-year-old starter makes all the difference. Naturally leavened perfection."
    ]
  },
  {
    name: "Heritage Crust",
    address: "789 Brooklyn Heights Blvd",
    city: "Brooklyn",
    state: "NY",
    zipCode: "11201",
    phone: "(718) 555-0789",
    website: "https://heritagecrust.nyc",
    description: "Traditional sourdough methods passed down through generations. Our naturally leavened dough ferments slowly for complex flavors.",
    sourdoughVerified: 1,
    sourdoughKeywords: ["sourdough", "naturally leavened", "fermentation"],
    rating: 4.7,
    reviewCount: 203,
    latitude: 40.6958,
    longitude: -73.9975,
    imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    googlePlaceId: "sample_place_3",
    lastScraped: new Date().toISOString(),
    reviews: [
      "Traditional sourdough techniques create amazing flavors. Worth the trip to Brooklyn.",
      "Slow fermentation process results in the most complex crust I've ever tasted."
    ]
  },
  {
    name: "Wild Yeast Pizzeria",
    address: "321 South Lamar Blvd",
    city: "Austin",
    state: "TX",
    zipCode: "78704",
    phone: "(512) 555-0321",
    website: "https://wildyeastpizza.com",
    description: "Exclusively sourdough - no commercial yeast ever used. Our wild yeast starter creates unique flavors in every naturally leavened pizza.",
    sourdoughVerified: 1,
    sourdoughKeywords: ["sourdough", "wild yeast", "naturally leavened"],
    rating: 4.6,
    reviewCount: 156,
    latitude: 30.2500,
    longitude: -97.7500,
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    googlePlaceId: "sample_place_4",
    lastScraped: new Date().toISOString(),
    reviews: [
      "Only place in Austin that uses exclusively sourdough. No commercial yeast here!",
      "Wild yeast starter gives each pizza a unique character. Amazing naturally leavened crust."
    ]
  },
  {
    name: "Fermented & Fresh",
    address: "654 Pike Place Market",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    phone: "(206) 555-0654",
    website: "https://fermentedandfresh.com",
    description: "Long fermentation sourdough base with local Pacific Northwest ingredients. Our naturally leavened crust is aged 48+ hours.",
    sourdoughVerified: 1,
    sourdoughKeywords: ["sourdough", "naturally leavened", "fermentation"],
    rating: 4.8,
    reviewCount: 94,
    latitude: 47.6085,
    longitude: -122.3351,
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    googlePlaceId: "sample_place_5",
    lastScraped: new Date().toISOString(),
    reviews: [
      "48+ hour fermentation creates incredible depth of flavor. Best sourdough in Seattle.",
      "Long fermentation process with local ingredients. Naturally leavened perfection."
    ]
  },
  {
    name: "Old World Sourdough",
    address: "987 Cherry Creek Dr",
    city: "Denver",
    state: "CO",
    zipCode: "80206",
    phone: "(303) 555-0987",
    website: "https://oldworldsourdough.com",
    description: "European-style naturally leavened crust with alpine cheeses. Traditional sourdough techniques meet Rocky Mountain ingredients.",
    sourdoughVerified: 1,
    sourdoughKeywords: ["sourdough", "naturally leavened"],
    rating: 4.9,
    reviewCount: 73,
    latitude: 39.7392,
    longitude: -104.9903,
    imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
    googlePlaceId: "sample_place_6",
    lastScraped: new Date().toISOString(),
    reviews: [
      "European-style sourdough techniques with Rocky Mountain flair. Outstanding naturally leavened crust.",
      "Traditional methods create authentic sourdough flavors. Alpine cheeses pair perfectly."
    ]
  }
];

export async function seedDatabase() {
  try {
    console.log('Checking if database needs seeding...');
    
    // Check if we already have restaurants
    const existingRestaurants = await db.select().from(restaurants).limit(1);
    
    if (existingRestaurants.length > 0) {
      console.log('Database already contains restaurants, skipping seed');
      return;
    }
    
    console.log('Seeding database with sample sourdough restaurants...');
    
    for (const restaurant of sampleRestaurants) {
      await db.insert(restaurants).values(restaurant);
    }
    
    console.log(`Successfully seeded ${sampleRestaurants.length} restaurants`);
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}