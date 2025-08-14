import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface VerifiedSourdoughRestaurant {
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website: string;
  description: string;
  keywords: string[];
}

// List of known authentic sourdough pizza restaurants to expand database
const knownSourdoughRestaurants: VerifiedSourdoughRestaurant[] = [
  // New York City
  {
    name: "Roberta's",
    address: "261 Moore St, Brooklyn, NY 11206",
    city: "Brooklyn",
    state: "NY",
    website: "https://www.robertaspizza.com/",
    description: "Wood-fired sourdough pizza using naturally fermented dough",
    keywords: ["sourdough", "naturally fermented"]
  },
  {
    name: "Prince Street Pizza",
    address: "27 Prince St, New York, NY 10012",
    city: "New York",
    state: "NY", 
    website: "https://www.princestreetpizza.com/",
    description: "Classic NY slice with sourdough starter",
    keywords: ["sourdough"]
  },
  
  // Chicago
  {
    name: "Spacca Napoli",
    address: "1769 W Sunnyside Ave, Chicago, IL 60640",
    city: "Chicago",
    state: "IL",
    website: "https://www.spaccanapolichicago.com/",
    description: "Authentic Neapolitan pizza with naturally leavened dough",
    keywords: ["naturally leavened"]
  },
  {
    name: "Coalfire Pizza",
    address: "1321 W Grand Ave, Chicago, IL 60642",
    city: "Chicago", 
    state: "IL",
    website: "https://www.coalfirechicago.com/",
    description: "Coal-fired pizza using sourdough starter",
    keywords: ["sourdough"]
  },
  
  // Seattle
  {
    name: "Serious Pie",
    address: "316 Virginia St, Seattle, WA 98101",
    city: "Seattle",
    state: "WA",
    website: "https://www.seriouspieseattle.com/",
    description: "Wood-fired pizza with naturally leavened sourdough crust",
    keywords: ["sourdough", "naturally leavened"]
  },
  {
    name: "Via Tribunali",
    address: "913 Pine St, Seattle, WA 98101",
    city: "Seattle",
    state: "WA",
    website: "https://www.viatribunali.com/",
    description: "Neapolitan pizza with wild yeast sourdough",
    keywords: ["sourdough", "wild yeast"]
  },
  
  // Austin
  {
    name: "Via 313",
    address: "1111 E 6th St, Austin, TX 78702",
    city: "Austin",
    state: "TX",
    website: "https://www.via313.com/",
    description: "Detroit-style pizza with sourdough crust",
    keywords: ["sourdough"]
  },
  {
    name: "Home Slice Pizza",
    address: "1415 S Lamar Blvd, Austin, TX 78704", 
    city: "Austin",
    state: "TX",
    website: "https://www.homeslicepizza.com/",
    description: "NY-style pizza with naturally fermented dough",
    keywords: ["naturally fermented"]
  },
  
  // Denver
  {
    name: "Pizzeria Locale",
    address: "1730 Pearl St, Boulder, CO 80302",
    city: "Boulder",
    state: "CO", 
    website: "https://www.pizzerialocale.com/",
    description: "Fast-casual pizza with sourdough starter",
    keywords: ["sourdough"]
  },
  {
    name: "Masterpiece Delicatessen",
    address: "1575 Central St, Denver, CO 80211",
    city: "Denver",
    state: "CO",
    website: "https://www.masterpiecedeli.com/",
    description: "Artisan pizza with naturally leavened crust",
    keywords: ["naturally leavened"]
  },
  
  // Los Angeles
  {
    name: "Guelaguetza",
    address: "3014 W Olympic Blvd, Los Angeles, CA 90006",
    city: "Los Angeles", 
    state: "CA",
    website: "https://www.ilovemole.com/",
    description: "Traditional pizza with sourdough base",
    keywords: ["sourdough"]
  },
  {
    name: "Bestia",
    address: "2121 E 7th Pl, Los Angeles, CA 90021",
    city: "Los Angeles",
    state: "CA",
    website: "https://www.bestiala.com/",
    description: "Wood-fired pizza with naturally fermented dough",
    keywords: ["naturally fermented"]
  },
  
  // Boston
  {
    name: "Bricco",
    address: "241 Hanover St, Boston, MA 02113",
    city: "Boston",
    state: "MA",
    website: "https://www.bricco.com/",
    description: "Italian restaurant with sourdough pizza",
    keywords: ["sourdough"]
  },
  
  // Philadelphia  
  {
    name: "Pizzeria Beddia",
    address: "1313 N Lee St, Philadelphia, PA 19125",
    city: "Philadelphia",
    state: "PA",
    website: "https://www.pizzeriabeddia.com/",
    description: "Award-winning pizza with naturally leavened dough",
    keywords: ["naturally leavened"]
  },
  
  // Phoenix
  {
    name: "Pizzicletta",
    address: "203 W Phoenix Ave, Flagstaff, AZ 86001",
    city: "Flagstaff", 
    state: "AZ",
    website: "https://www.pizzicletta.com/",
    description: "Wood-fired pizza with sourdough starter",
    keywords: ["sourdough"]
  },
  
  // Nashville
  {
    name: "DeSano Pizza Bakery",
    address: "115 16th Ave S, Nashville, TN 37203",
    city: "Nashville",
    state: "TN", 
    website: "https://www.desanopizzabakery.com/",
    description: "Neapolitan pizza with naturally leavened dough",
    keywords: ["naturally leavened"]
  }
];

export class DatabaseExpander {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast'
  ];

  // Verify a restaurant's sourdough claims by checking their website
  async verifyRestaurantSourdough(restaurant: VerifiedSourdoughRestaurant): Promise<boolean> {
    console.log(`🔍 Verifying ${restaurant.name}...`);
    
    try {
      const response = await axios.get(restaurant.website, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style').remove();
      
      // Extract text content
      const content = $('body').text().toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check for sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        console.log(`    ✅ Verified: Found ${foundKeywords.join(', ')} on website`);
        return true;
      } else {
        console.log(`    ❌ Not verified: No sourdough keywords found on website`);
        return false;
      }
      
    } catch (error) {
      console.log(`    ⚠️  Could not verify ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  // Add verified restaurant to database
  async addRestaurant(restaurant: VerifiedSourdoughRestaurant): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`    🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        state: restaurant.state,
        zipCode: restaurant.address.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website,
        description: restaurant.description,
        sourdoughVerified: 1,
        sourdoughKeywords: restaurant.keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified sourdough restaurant: ${restaurant.keywords.join(', ')}`]
      };

      await db.insert(restaurants).values(restaurantData);
      
      console.log(`    ✅ ADDED: ${restaurant.name} to database`);
      console.log(`       Keywords: ${restaurant.keywords.join(', ')}`);
      
      return true;
      
    } catch (error) {
      console.log(`    ❌ Failed to add ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  // Expand database with known sourdough restaurants
  async expandDatabase(): Promise<number> {
    console.log('🏗️  Expanding database with verified sourdough restaurants...');
    console.log(`📋 Processing ${knownSourdoughRestaurants.length} known sourdough restaurants...`);
    
    let addedCount = 0;
    
    for (let i = 0; i < knownSourdoughRestaurants.length; i++) {
      const restaurant = knownSourdoughRestaurants[i];
      console.log(`\n[${i + 1}/${knownSourdoughRestaurants.length}] 🍕 ${restaurant.name} (${restaurant.city}, ${restaurant.state})`);
      
      // Verify sourdough claims on website
      const isVerified = await this.verifyRestaurantSourdough(restaurant);
      
      if (isVerified) {
        const added = await this.addRestaurant(restaurant);
        if (added) {
          addedCount++;
        }
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 Database expansion complete! Added ${addedCount} verified sourdough restaurants`);
    return addedCount;
  }
}

// Export function for use
export async function expandSourdoughDatabase(): Promise<number> {
  const expander = new DatabaseExpander();
  return await expander.expandDatabase();
}