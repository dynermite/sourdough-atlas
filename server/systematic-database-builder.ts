#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface RestaurantLead {
  name: string;
  address: string;
  city: string;
  state: string;
  website?: string;
}

export class SystematicDatabaseBuilder {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast'
  ];

  // Search for pizza restaurants using Google search
  async findPizzaRestaurants(city: string, state: string): Promise<RestaurantLead[]> {
    console.log(`🔍 Searching for pizza restaurants in ${city}, ${state}...`);
    
    const restaurants: RestaurantLead[] = [];
    
    try {
      // Search for pizza restaurants in the city
      const searchQuery = `"${city}" "${state}" pizza restaurant`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract restaurant information from search results
      $('.g').each((index, element) => {
        try {
          const $el = $(element);
          const title = $el.find('h3').text();
          const snippet = $el.find('.VwiC3b, .s3v9rd').text();
          const link = $el.find('a').attr('href');
          
          // Look for pizza restaurant patterns
          if (title.toLowerCase().includes('pizza') && 
              (title.includes(city) || snippet.includes(city))) {
            
            // Extract restaurant name
            const nameMatch = title.match(/([^-|]+(?:Pizza|Pizzeria)[^-|]*)/i);
            
            if (nameMatch && link) {
              restaurants.push({
                name: nameMatch[1].trim(),
                address: `${city}, ${state}`,
                city,
                state,
                website: link.startsWith('/url?q=') ? 
                  decodeURIComponent(link.substring(7).split('&')[0]) : link
              });
            }
          }
        } catch (error) {
          // Continue to next result
        }
      });
      
    } catch (error) {
      console.error(`Error searching for restaurants in ${city}:`, error.message);
    }
    
    const uniqueRestaurants = this.removeDuplicates(restaurants);
    console.log(`    📍 Found ${uniqueRestaurants.length} pizza restaurants`);
    
    return uniqueRestaurants;
  }

  // Remove duplicate restaurants
  private removeDuplicates(restaurants: RestaurantLead[]): RestaurantLead[] {
    const seen = new Set();
    return restaurants.filter(restaurant => {
      const key = restaurant.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Verify sourdough keywords on restaurant website
  async verifySourdoughOnWebsite(restaurant: RestaurantLead): Promise<{isVerified: boolean, keywords: string[], description: string}> {
    console.log(`    🔍 Checking ${restaurant.name} for sourdough...`);
    
    if (!restaurant.website) {
      return { isVerified: false, keywords: [], description: '' };
    }
    
    try {
      let websiteUrl = restaurant.website;
      
      // Clean URL
      if (websiteUrl.startsWith('/url?q=')) {
        websiteUrl = decodeURIComponent(websiteUrl.substring(7).split('&')[0]);
      }
      
      if (!websiteUrl.startsWith('http')) {
        websiteUrl = 'https://' + websiteUrl;
      }
      
      const response = await axios.get(websiteUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Extract text content
      const content = $('body').text().toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check for sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        console.log(`        ✅ SOURDOUGH FOUND: ${foundKeywords.join(', ')}`);
        return {
          isVerified: true,
          keywords: foundKeywords,
          description: `Verified sourdough keywords found on website: ${foundKeywords.join(', ')}`
        };
      } else {
        console.log(`        ❌ No sourdough keywords found`);
        return { isVerified: false, keywords: [], description: '' };
      }
      
    } catch (error) {
      console.log(`        ⚠️  Could not verify website: ${error.message}`);
      return { isVerified: false, keywords: [], description: '' };
    }
  }

  // Add verified sourdough restaurant to database
  async addVerifiedRestaurant(restaurant: RestaurantLead, keywords: string[], description: string): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`        🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        state: restaurant.state,
        zipCode: restaurant.address.match(/\d{5}/)?.[0] || '',
        phone: '',
        website: restaurant.website || '',
        description,
        sourdoughVerified: 1,
        sourdoughKeywords: keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [description]
      };

      await db.insert(restaurants).values(restaurantData);
      
      console.log(`        ✅ ADDED TO DATABASE: ${restaurant.name}`);
      console.log(`           Keywords: ${keywords.join(', ')}`);
      
      return true;
      
    } catch (error) {
      console.log(`        ❌ Failed to add ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  // Build database for a specific city
  async buildCityDatabase(city: string, state: string): Promise<number> {
    console.log(`\n🌆 Building sourdough database for ${city}, ${state}`);
    
    let addedCount = 0;
    
    try {
      // Step 1: Find pizza restaurants
      const pizzaRestaurants = await this.findPizzaRestaurants(city, state);
      
      if (pizzaRestaurants.length === 0) {
        console.log(`    ❌ No pizza restaurants found in ${city}`);
        return 0;
      }

      console.log(`\n📋 Analyzing ${pizzaRestaurants.length} restaurants for sourdough verification...`);
      
      // Step 2: Check each restaurant for sourdough
      for (let i = 0; i < Math.min(pizzaRestaurants.length, 15); i++) { // Limit to 15 restaurants per city
        const restaurant = pizzaRestaurants[i];
        console.log(`\n[${i + 1}/${Math.min(pizzaRestaurants.length, 15)}] 🍕 ${restaurant.name}`);
        
        const verification = await this.verifySourdoughOnWebsite(restaurant);
        
        if (verification.isVerified) {
          const added = await this.addVerifiedRestaurant(restaurant, verification.keywords, verification.description);
          if (added) {
            addedCount++;
          }
        }
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ Error building database for ${city}:`, error.message);
    }
    
    console.log(`\n✅ ${city} complete: Added ${addedCount} verified sourdough restaurants`);
    return addedCount;
  }

  // Build comprehensive database across multiple cities
  async buildComprehensiveDatabase(): Promise<void> {
    console.log('🏗️  Building comprehensive sourdough pizza database...');
    
    const cities = [
      { name: 'Chicago', state: 'Illinois' },
      { name: 'Seattle', state: 'Washington' },
      { name: 'Austin', state: 'Texas' },
      { name: 'Denver', state: 'Colorado' },
      { name: 'Boston', state: 'Massachusetts' },
      { name: 'Philadelphia', state: 'Pennsylvania' },
      { name: 'Los Angeles', state: 'California' },
      { name: 'Phoenix', state: 'Arizona' },
      { name: 'Nashville', state: 'Tennessee' },
      { name: 'Atlanta', state: 'Georgia' }
    ];
    
    let totalAdded = 0;
    
    for (const city of cities) {
      const addedCount = await this.buildCityDatabase(city.name, city.state);
      totalAdded += addedCount;
      
      // Wait between cities
      console.log(`\n⏱️  Waiting 10 seconds before next city...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log(`\n🎉 Comprehensive database building complete!`);
    console.log(`📊 Total verified sourdough restaurants added: ${totalAdded}`);
  }
}

// Main execution
async function main() {
  const builder = new SystematicDatabaseBuilder();
  
  // Build database for just a few cities to start
  console.log('🚀 Starting systematic sourdough database building...');
  
  const targetCities = [
    { name: 'Chicago', state: 'Illinois' },
    { name: 'Seattle', state: 'Washington' },
    { name: 'Austin', state: 'Texas' }
  ];
  
  let totalAdded = 0;
  
  for (const city of targetCities) {
    const addedCount = await builder.buildCityDatabase(city.name, city.state);
    totalAdded += addedCount;
    
    if (city !== targetCities[targetCities.length - 1]) {
      console.log(`\n⏱️  Waiting 15 seconds before next city...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  console.log(`\n🎉 Database building complete! Added ${totalAdded} verified sourdough restaurants`);
}

// Run if called directly
main().catch(console.error);