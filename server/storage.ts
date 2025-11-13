import { restaurants, type Restaurant, type InsertRestaurant } from "@shared/schema";
import { db } from "./db.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Sample data for development mode when database is not configured
const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    id: "1",
    name: "Tony's Little Star Pizza",
    address: "846 Divisadero St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94117",
    phone: "(415) 441-1118",
    website: "https://www.tonys-pizza.com",
    description: "Authentic sourdough deep dish pizza in the heart of San Francisco. Known for their naturally leavened dough and quality ingredients.",
    sourdoughVerified: true,
    sourdoughKeywords: "sourdough, naturally leavened, wild yeast",
    rating: 4.5,
    reviewCount: 1250,
    latitude: 37.7749,
    longitude: -122.4394,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
    hours: "Mon-Thu: 5-10pm, Fri-Sat: 5-11pm, Sun: 4-10pm",
    googlePlaceId: "ChIJd8BlQ2ASAHARxo_bb6-rVHA",
    lastScraped: new Date().toISOString(),
    reviews: "Customers rave about the authentic sourdough crust and high-quality toppings."
  },
  {
    id: "2", 
    name: "Arizmendi Bakery",
    address: "1331 9th Ave",
    city: "San Francisco",
    state: "CA",
    zipCode: "94122",
    phone: "(415) 566-3117",
    website: "https://arizmendibakery.com",
    description: "Worker-owned cooperative bakery specializing in sourdough pizza and bread. Famous for their daily rotating pizza flavors.",
    sourdoughVerified: true,
    sourdoughKeywords: "sourdough, artisan, naturally fermented",
    rating: 4.3,
    reviewCount: 890,
    latitude: 37.7629,
    longitude: -122.4661,
    imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b",
    hours: "Mon-Fri: 7am-7pm, Sat-Sun: 8am-6pm",
    googlePlaceId: "ChIJpfFQGHk5Ah4RFaJ_EwFGwaE",
    lastScraped: new Date().toISOString(),
    reviews: "Known for incredible sourdough pizza with unique daily combinations."
  },
  {
    id: "3",
    name: "Gialina",
    address: "2842 Diamond St", 
    city: "San Francisco",
    state: "CA",
    zipCode: "94131",
    phone: "(415) 239-8500",
    website: "https://www.gialina.com",
    description: "Neighborhood gem serving Neapolitan-style pizza with naturally leavened sourdough crust. Wood-fired oven creates perfect char.",
    sourdoughVerified: true,
    sourdoughKeywords: "sourdough, naturally leavened, wood-fired",
    rating: 4.4,
    reviewCount: 670,
    latitude: 37.7359,
    longitude: -122.4336,
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
    hours: "Tue-Sun: 5-10pm, Closed Mon",
    googlePlaceId: "ChIJd8BlQ2ASAHARxo_bb6-rVHB",
    lastScraped: new Date().toISOString(),
    reviews: "Exceptional sourdough crust with perfect texture and flavor from natural fermentation."
  },
  {
    id: "4",
    name: "Ken's Artisan Pizza",
    address: "304 SE 28th Ave",
    city: "Portland", 
    state: "OR",
    zipCode: "97214",
    phone: "(503) 517-9951",
    website: "https://kensartisan.com",
    description: "Pioneer of artisan pizza in Portland. Master baker Ken Forkish creates exceptional sourdough pizza crusts using wild yeast starters.",
    sourdoughVerified: true,
    sourdoughKeywords: "sourdough, artisan, wild yeast starter",
    rating: 4.6,
    reviewCount: 1540,
    latitude: 45.5088,
    longitude: -122.6370,
    imageUrl: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e",
    hours: "Wed-Sun: 5-10pm, Closed Mon-Tue",
    googlePlaceId: "ChIJd8BlQ2ASAHARxo_bb6-rVHC",
    lastScraped: new Date().toISOString(),
    reviews: "Legendary sourdough pizza from the master of natural fermentation."
  },
  {
    id: "5",
    name: "Roberta's Pizza",
    address: "261 Moore St",
    city: "Brooklyn",
    state: "NY", 
    zipCode: "11206",
    phone: "(718) 417-1118",
    website: "https://www.robertaspizza.com",
    description: "Brooklyn institution known for wood-fired sourdough pizza. Garden-to-table ingredients meet traditional fermentation techniques.",
    sourdoughVerified: true,
    sourdoughKeywords: "sourdough, wood-fired, naturally fermented",
    rating: 4.3,
    reviewCount: 2100,
    latitude: 40.7056,
    longitude: -73.9442,
    imageUrl: "https://images.unsplash.com/photo-1571407982841-4adeb3b4ae3c",
    hours: "Sun-Thu: 11am-12am, Fri-Sat: 11am-1am",
    googlePlaceId: "ChIJd8BlQ2ASAHARxo_bb6-rVHD", 
    lastScraped: new Date().toISOString(),
    reviews: "Amazing sourdough crust with perfect leopard spotting from their wood-fired oven."
  }
];

export interface IStorage {
  getUser(id: string): Promise<any | undefined>;
  getUserByUsername(username: string): Promise<any | undefined>;
  createUser(user: any): Promise<any>;
  
  // Restaurant methods
  getAllRestaurants(): Promise<Restaurant[]>;
  getRestaurantById(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByCity(city: string): Promise<Restaurant[]>;
  getRestaurantsByState(state: string): Promise<Restaurant[]>;
  searchRestaurants(query: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getRestaurantsInBounds(bounds: { north: number; south: number; east: number; west: number }): Promise<Restaurant[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<any | undefined> {
    // TODO: Implement user functionality with proper schema
    return undefined;
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    // TODO: Implement user functionality with proper schema
    return undefined;
  }

  async createUser(insertUser: any): Promise<any> {
    // TODO: Implement user functionality with proper schema
    return insertUser;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants);
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant || undefined;
  }

  async getRestaurantsByCity(city: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.city, city));
  }

  async getRestaurantsByState(state: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.state, state));
  }

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    // Simple search implementation - can be enhanced with proper full-text search
    const allRestaurants = await db.select().from(restaurants);
    const lowercaseQuery = query.toLowerCase();
    return allRestaurants.filter(restaurant =>
      restaurant.name.toLowerCase().includes(lowercaseQuery) ||
      restaurant.city.toLowerCase().includes(lowercaseQuery) ||
      restaurant.state.toLowerCase().includes(lowercaseQuery) ||
      restaurant.description?.toLowerCase().includes(lowercaseQuery)
    );
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db
      .insert(restaurants)
      .values(insertRestaurant)
      .returning();
    return restaurant;
  }

  async getRestaurantsInBounds(bounds: { north: number; south: number; east: number; west: number }): Promise<Restaurant[]> {
    const allRestaurants = await db.select().from(restaurants);
    return allRestaurants.filter(restaurant => {
      const lat = restaurant.latitude;
      const lng = restaurant.longitude;
      
      // Skip restaurants without valid coordinates
      if (!lat || !lng || lat === 0 || lng === 0) return false;
      
      return lat >= bounds.south && 
             lat <= bounds.north && 
             lng >= bounds.west && 
             lng <= bounds.east;
    });
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, any>;
  private restaurants: Map<string, Restaurant>;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.initializeRestaurants();
  }

  private initializeRestaurants() {
    const sampleRestaurants: InsertRestaurant[] = [
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
        })
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
        rating: 4.9,
        reviewCount: 89,
        latitude: 45.5272,
        longitude: -122.6783,
        imageUrl: "https://images.unsplash.com/photo-1571066811602-716837d681de?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
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
        rating: 4.7,
        reviewCount: 203,
        latitude: 40.6958,
        longitude: -73.9975,
        imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
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
        rating: 4.6,
        reviewCount: 156,
        latitude: 30.2500,
        longitude: -97.7500,
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
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
        rating: 4.8,
        reviewCount: 94,
        latitude: 47.6085,
        longitude: -122.3351,
        imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
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
        rating: 4.9,
        reviewCount: 73,
        latitude: 39.7392,
        longitude: -104.9903,
        imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      },
      {
        name: "Sourdough & Co LA",
        address: "1234 Sunset Blvd",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90027",
        phone: "(323) 555-1234",
        website: "https://sourdoughcola.com",
        description: "Authentic sourdough pizza with a West Coast twist. Our naturally leavened dough is fermented for 24 hours using wild yeast starter.",
        sourdoughVerified: 1,
        rating: 4.7,
        reviewCount: 189,
        latitude: 34.0522,
        longitude: -118.2437,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      },
      {
        name: "Wild West Sourdough",
        address: "5678 Melrose Ave",
        city: "Los Angeles", 
        state: "CA",
        zipCode: "90038",
        phone: "(323) 555-5678",
        website: "https://wildwestsourdough.com",
        description: "Traditional sourdough techniques meet California innovation. Long fermentation process creates complex flavors in our naturally leavened crusts.",
        sourdoughVerified: 1,
        rating: 4.5,
        reviewCount: 156,
        latitude: 34.0836,
        longitude: -118.3258,
        imageUrl: "https://images.unsplash.com/photo-1571066811602-716837d681de?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      }
    ];

    sampleRestaurants.forEach(restaurant => {
      const id = randomUUID();
      const fullRestaurant: Restaurant = { ...restaurant, id };
      this.restaurants.set(id, fullRestaurant);
    });
  }

  async getUser(id: string): Promise<any | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<any | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<any> {
    const id = randomUUID();
    const user: any = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllRestaurants(): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values());
  }

  async getRestaurantById(id: string): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async getRestaurantsByCity(city: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      restaurant => restaurant.city.toLowerCase() === city.toLowerCase()
    );
  }

  async getRestaurantsByState(state: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      restaurant => restaurant.state.toLowerCase() === state.toLowerCase()
    );
  }

  async searchRestaurants(query: string): Promise<Restaurant[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.restaurants.values()).filter(restaurant =>
      restaurant.name.toLowerCase().includes(lowercaseQuery) ||
      restaurant.city.toLowerCase().includes(lowercaseQuery) ||
      restaurant.state.toLowerCase().includes(lowercaseQuery) ||
      restaurant.description?.toLowerCase().includes(lowercaseQuery)
    );
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const id = randomUUID();
    const restaurant: Restaurant = { ...insertRestaurant, id };
    this.restaurants.set(id, restaurant);
    return restaurant;
  }

  async getRestaurantsInBounds(bounds: { north: number; south: number; east: number; west: number }): Promise<Restaurant[]> {
    const allRestaurants = Array.from(this.restaurants.values());
    return allRestaurants.filter(restaurant => {
      const lat = restaurant.latitude;
      const lng = restaurant.longitude;
      
      if (!lat || !lng) return false;
      
      return lat >= bounds.south && 
             lat <= bounds.north && 
             lng >= bounds.west && 
             lng <= bounds.east;
    });
  }
}

export const storage = new DatabaseStorage();
