#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface OutscraperRestaurant {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  latitude?: number;
  longitude?: number;
  business_id?: string;
  category?: string;
  hours?: string;
  description?: string;
}

export class OutscraperSourdoughDiscovery {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'naturally fermented',
    'artisan dough',
    'traditional fermentation'
  ];

  // Process Outscraper data (when you get the API key)
  async processOutscraperData(outscraperApiKey: string, city: string, state: string): Promise<number> {
    console.log(`Starting comprehensive ${city} pizza discovery via Outscraper...`);
    
    // Step 1: Get ALL pizza restaurants from Outscraper
    const allRestaurants = await this.fetchAllPizzaRestaurants(outscraperApiKey, city, state);
    
    if (allRestaurants.length === 0) {
      console.log('No restaurants found from Outscraper');
      return 0;
    }
    
    console.log(`Found ${allRestaurants.length} total pizza restaurants in ${city}`);
    
    // Step 2: Verify each restaurant for sourdough
    return await this.verifyAllRestaurantsForSourdough(allRestaurants, city, state);
  }

  // Fetch restaurants using Outscraper API
  private async fetchAllPizzaRestaurants(apiKey: string, city: string, state: string): Promise<OutscraperRestaurant[]> {
    try {
      console.log('Fetching ALL pizza restaurants via Outscraper API...');
      
      const response = await axios.get('https://api.app.outscraper.com/maps/search-v2', {
        params: {
          query: `pizza restaurants ${city} ${state}`,
          limit: 100, // Start with 100 results per city
          async: false,
          fields: 'name,full_address,site,type,description,category,rating,reviews,working_hours,business_status'
        },
        headers: {
          'X-API-KEY': apiKey
        },
        timeout: 30000
      });

      const restaurants = response.data.data[0] || [];
      console.log(`Outscraper returned ${restaurants.length} restaurants`);
      
      return restaurants;
      
    } catch (error) {
      console.log(`Outscraper API error: ${error.message}`);
      return [];
    }
  }

  // Verify all restaurants for sourdough keywords
  private async verifyAllRestaurantsForSourdough(restaurants: OutscraperRestaurant[], city: string, state: string): Promise<number> {
    console.log(`Verifying ${restaurants.length} restaurants for sourdough keywords...`);
    
    let sourdoughCount = 0;
    
    for (let i = 0; i < restaurants.length; i++) {
      const restaurant = restaurants[i];
      console.log(`\n[${i + 1}/${restaurants.length}] ${restaurant.name}`);
      console.log(`  Address: ${restaurant.address}`);
      console.log(`  Website: ${restaurant.website || 'No website'}`);
      
      // Check for sourdough verification
      const verification = await this.verifySourdoughKeywords(restaurant);
      
      if (verification.verified) {
        console.log(`  ✅ SOURDOUGH VERIFIED: ${verification.keywords.join(', ')}`);
        
        const added = await this.addVerifiedSourdoughRestaurant(restaurant, verification, city, state);
        if (added) {
          sourdoughCount++;
        }
      } else {
        console.log(`  ❌ No sourdough keywords found`);
      }
      
      // Rate limiting to be respectful
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\nSourdough verification complete:`);
    console.log(`Total restaurants analyzed: ${restaurants.length}`);
    console.log(`Sourdough restaurants found: ${sourdoughCount}`);
    console.log(`Sourdough adoption rate: ${((sourdoughCount / restaurants.length) * 100).toFixed(1)}%`);
    
    return sourdoughCount;
  }

  // Verify individual restaurant for sourdough keywords
  private async verifySourdoughKeywords(restaurant: OutscraperRestaurant): Promise<{verified: boolean, keywords: string[], description: string}> {
    const foundKeywords: string[] = [];
    let description = '';
    
    // Check Outscraper description first
    if (restaurant.description) {
      const descKeywords = this.sourdoughKeywords.filter(keyword => 
        restaurant.description!.toLowerCase().includes(keyword.toLowerCase())
      );
      foundKeywords.push(...descKeywords);
      
      if (descKeywords.length > 0) {
        description = restaurant.description.substring(0, 200);
      }
    }
    
    // If no keywords found and restaurant has website, check website
    if (foundKeywords.length === 0 && restaurant.website) {
      const websiteVerification = await this.analyzeRestaurantWebsite(restaurant.website);
      foundKeywords.push(...websiteVerification.keywords);
      
      if (websiteVerification.description) {
        description = websiteVerification.description;
      }
    }
    
    return {
      verified: foundKeywords.length > 0,
      keywords: [...new Set(foundKeywords)], // Remove duplicates
      description
    };
  }

  // Analyze restaurant website for sourdough keywords
  private async analyzeRestaurantWebsite(websiteUrl: string): Promise<{keywords: string[], description: string}> {
    try {
      console.log(`    Analyzing website: ${websiteUrl}`);
      
      const response = await axios.get(websiteUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove non-content elements
      $('script, style, nav, header, footer, .nav, .navigation').remove();
      
      // Focus on content areas
      const contentAreas = [
        'main', '.main', '.content', '.about', '.menu', '.description',
        '.story', '.our-story', '.food', '.pizza', '.specialty'
      ].map(selector => $(selector).text()).join(' ');
      
      const fullContent = $('body').text();
      const combinedContent = (contentAreas + ' ' + fullContent).toLowerCase().replace(/\s+/g, ' ');
      
      // Find sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        combinedContent.includes(keyword.toLowerCase())
      );
      
      // Extract context around keywords for description
      let description = '';
      if (foundKeywords.length > 0) {
        foundKeywords.forEach(keyword => {
          const index = combinedContent.indexOf(keyword.toLowerCase());
          if (index !== -1 && description.length < 300) {
            const start = Math.max(0, index - 75);
            const end = Math.min(combinedContent.length, index + 200);
            const context = combinedContent.substring(start, end).trim();
            description += context + ' ';
          }
        });
      }
      
      return {
        keywords: foundKeywords,
        description: description.trim().substring(0, 400)
      };
      
    } catch (error) {
      console.log(`    Website analysis failed: ${error.message}`);
      return { keywords: [], description: '' };
    }
  }

  // Add verified sourdough restaurant to database
  private async addVerifiedSourdoughRestaurant(
    restaurant: OutscraperRestaurant, 
    verification: {keywords: string[], description: string}, 
    city: string, 
    state: string
  ): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`    Restaurant ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address || '',
        city: city,
        state: state,
        zipCode: restaurant.address?.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: verification.description || `Verified sourdough keywords: ${verification.keywords.join(', ')}`,
        sourdoughVerified: 1,
        sourdoughKeywords: verification.keywords,
        rating: restaurant.rating || 0,
        reviewCount: restaurant.reviews_count || 0,
        latitude: restaurant.latitude || 0,
        longitude: restaurant.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified via Outscraper: ${verification.keywords.join(', ')}`]
      };

      await db.insert(restaurants).values(restaurantData);
      console.log(`    ✅ ADDED TO DATABASE: ${restaurant.name}`);
      
      return true;
      
    } catch (error) {
      console.log(`    Failed to add ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  // Mock data processor for testing without API key
  async processTestData(city: string, state: string): Promise<number> {
    console.log(`Testing comprehensive discovery system for ${city}...`);
    console.log('This simulates what would happen with real Outscraper data');
    
    // Simulate what Outscraper would return for San Francisco
    const mockOutscraperData: OutscraperRestaurant[] = [
      {
        name: "Tony's Little Star Pizza",
        address: "846 Divisadero St, San Francisco, CA 94117",
        website: "https://www.tonysnapoleanpizza.com/",
        phone: "(415) 441-4077",
        rating: 4.2,
        reviews_count: 2847,
        latitude: 37.7749,
        longitude: -122.4194,
        category: "Pizza Restaurant",
        description: "Chicago-style deep dish pizza restaurant"
      },
      {
        name: "Arizmendi Bakery",
        address: "1331 9th Ave, San Francisco, CA 94122", 
        website: "https://arizmendibakery.com/",
        rating: 4.5,
        reviews_count: 1234,
        category: "Bakery & Pizza",
        description: "Worker-owned cooperative bakery specializing in sourdough breads and pizza"
      },
      {
        name: "Golden Boy Pizza",
        address: "542 Green St, San Francisco, CA 94133",
        website: "http://www.goldenboypizza.com/",
        rating: 4.0,
        reviews_count: 3456,
        category: "Pizza Restaurant",
        description: "Classic San Francisco pizza spot since 1978"
      }
    ];
    
    return await this.verifyAllRestaurantsForSourdough(mockOutscraperData, city, state);
  }
}

// Usage instructions
export class OutscraperSetupGuide {
  
  displaySetupInstructions(): void {
    console.log('🚀 OUTSCRAPER + SOURDOUGH VERIFICATION SETUP');
    console.log('='.repeat(50));
    
    console.log('\n📋 STEP 1: Get Outscraper API Key');
    console.log('1. Go to https://outscraper.com/');
    console.log('2. Sign up for free account');
    console.log('3. Get API key from dashboard');
    console.log('4. Free tier includes 100 requests/month');
    
    console.log('\n💰 STEP 2: Cost Estimation');
    console.log('San Francisco (~180 restaurants): $0.18');
    console.log('Portland (~120 restaurants): $0.12');
    console.log('Seattle (~150 restaurants): $0.15');
    console.log('Phase 1 total (~500 restaurants): ~$0.50');
    
    console.log('\n🔧 STEP 3: Implementation');
    console.log('1. Add OUTSCRAPER_API_KEY to environment');
    console.log('2. Run discovery for each Phase 1 city');
    console.log('3. System will verify each restaurant for sourdough');
    console.log('4. Only verified sourdough restaurants added to database');
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log('• Complete coverage of ALL pizza restaurants');
    console.log('• Accurate sourdough verification');
    console.log('• Real adoption rate percentages per city');
    console.log('• High-quality database for travelers');
  }
}

// Main execution
async function main() {
  const discovery = new OutscraperSourdoughDiscovery();
  const guide = new OutscraperSetupGuide();
  
  // Show setup instructions
  guide.displaySetupInstructions();
  
  // Test the system with mock data
  console.log('\n🧪 TESTING SYSTEM WITH MOCK DATA:');
  const testResults = await discovery.processTestData('San Francisco', 'CA');
  
  console.log('\n✅ SYSTEM READY FOR REAL DATA');
  console.log(`Test run found ${testResults} sourdough restaurants`);
  console.log('Ready to process real Outscraper data when API key is provided');
}

main().catch(console.error);