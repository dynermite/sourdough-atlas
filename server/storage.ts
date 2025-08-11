import { type Restaurant, type InsertRestaurant } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export const storage = new MemStorage();
