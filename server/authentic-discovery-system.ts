#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

class AuthenticDiscoverySystem {
  private apiKey: string;
  private verified = 0;
  private failed = 0;
  private processed = 0;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async discoverByCategory(city: string, state: string) {
    console.log(`\n🔍 DISCOVERING: ${city}, ${state}`);
    
    // Search for bakeries and pizza places that are more likely to mention sourdough
    const searches = [
      `artisan bakery ${city} ${state}`,
      `sourdough pizza ${city} ${state}`,
      `wood fired pizza ${city} ${state}`,
      `naturally leavened ${city} ${state}`,
      `craft pizza ${city} ${state}`
    ];

    let allResults: any[] = [];

    for (const searchQuery of searches) {
      try {
        console.log(`   Searching: ${searchQuery}`);
        
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query: searchQuery,
            limit: 5,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (response.data.status === 'Pending') {
          await new Promise(resolve => setTimeout(resolve, 8000));
          
          const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
            headers: {
              'X-API-KEY': this.apiKey
            }
          });

          if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
            const results = resultResponse.data.data;
            console.log(`   Found ${results.length} establishments`);
            allResults.push(...results);
          }
        }
        
        // Pause between API calls
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   Search error: ${error.message}`);
      }
    }

    // Remove duplicates based on name
    const uniqueResults = allResults.filter((result, index, arr) => 
      arr.findIndex(r => r.name === result.name) === index
    );

    console.log(`   Processing ${uniqueResults.length} unique establishments`);

    // Verify each establishment
    for (const business of uniqueResults) {
      await this.verifyEstablishment(business, city, state);
    }
  }

  async verifyEstablishment(business: any, city: string, state: string) {
    if (!business.name) return;

    this.processed++;
    console.log(`\n   [${this.processed}] Verifying: ${business.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, business.name));
      if (existing.length > 0) {
        console.log(`     Already in database`);
        return;
      }

      let websiteKeywords: string[] = [];
      let businessKeywords: string[] = [];
      
      // 1. Check website if available
      if (business.website) {
        try {
          const response = await axios.get(business.website, {
            timeout: 12000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const $ = cheerio.load(response.data);
          const content = $('body').text().toLowerCase();
          
          websiteKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
            content.includes(keyword.toLowerCase())
          );
          
        } catch (error) {
          console.log(`     Website check failed: ${error.message}`);
        }
      }
      
      // 2. Check Google Business profile description
      if (business.description) {
        const businessContent = business.description.toLowerCase();
        businessKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
          businessContent.includes(keyword.toLowerCase())
        );
      }
      
      // 3. Combine all keywords found
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`     ❌ No sourdough keywords found`);
        this.failed++;
        return;
      }
      
      // 4. Verify pizza/flatbread service
      const websiteHasPizza = business.website ? await this.checkPizzaService(business.website) : false;
      const businessHasPizza = this.checkBusinessPizza(business);
      
      if (!websiteHasPizza && !businessHasPizza) {
        console.log(`     Has sourdough but no pizza service`);
        this.failed++;
        return;
      }
      
      console.log(`     ✅ VERIFIED: [${allKeywords.join(', ')}]`);
      console.log(`     Source: ${websiteKeywords.length > 0 ? 'website+business' : 'business_only'}`);
      
      // Extract description
      let description = business.description || `${business.name} - verified sourdough pizza establishment`;
      if (description.length > 240) {
        description = description.substring(0, 240) + '...';
      }
      
      // Add to database
      await db.insert(restaurants).values({
        name: business.name,
        address: business.address || '',
        city: city,
        state: state,
        zipCode: business.postal_code || '',
        phone: business.phone || '',
        website: business.website || '',
        description,
        sourdoughVerified: 1,
        sourdoughKeywords: allKeywords,
        rating: business.rating || 0,
        reviewCount: business.reviews_count || 0,
        latitude: business.latitude || 0,
        longitude: business.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`     ADDED TO DATABASE - Total: ${this.verified}`);
      
      if (business.address) {
        console.log(`     Address: ${business.address}`);
      }
      
    } catch (error) {
      console.log(`     Error: ${error.message}`);
      this.failed++;
    }
  }

  async checkPizzaService(website: string): Promise<boolean> {
    try {
      const response = await axios.get(website, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();
      
      return content.includes('pizza') || content.includes('flatbread') || 
             content.includes('wood fired') || content.includes('wood-fired');
      
    } catch (error) {
      return false;
    }
  }

  checkBusinessPizza(business: any): boolean {
    const description = (business.description || '').toLowerCase();
    const categories = business.categories || [];
    
    const hasPizzaDescription = description.includes('pizza') || 
                               description.includes('flatbread') ||
                               description.includes('wood fired') ||
                               description.includes('wood-fired');
    
    const hasPizzaCategory = categories.some((cat: string) => 
      cat.toLowerCase().includes('pizza') ||
      cat.toLowerCase().includes('bakery') ||
      cat.toLowerCase().includes('restaurant')
    );
    
    return hasPizzaDescription || hasPizzaCategory;
  }

  getStats() {
    return {
      processed: this.processed,
      verified: this.verified,
      failed: this.failed,
      successRate: this.processed > 0 ? ((this.verified / this.processed) * 100).toFixed(1) : '0'
    };
  }
}

// Focus on cities with strong artisan/sourdough culture
const TARGET_CITIES = [
  // California sourdough heartland
  { city: "San Francisco", state: "CA" },
  { city: "Berkeley", state: "CA" },
  { city: "Oakland", state: "CA" },
  { city: "Palo Alto", state: "CA" },
  { city: "Santa Cruz", state: "CA" },
  
  // Pacific Northwest
  { city: "Portland", state: "OR" },
  { city: "Seattle", state: "WA" },
  { city: "Bellingham", state: "WA" },
  
  // Vermont/New England
  { city: "Burlington", state: "VT" },
  { city: "Cambridge", state: "MA" },
  { city: "Somerville", state: "MA" },
  
  // Artisan food cities
  { city: "Austin", state: "TX" },
  { city: "Asheville", state: "NC" },
  { city: "Boulder", state: "CO" },
  { city: "Madison", state: "WI" },
  
  // East Coast urban
  { city: "Brooklyn", state: "NY" },
  { city: "Philadelphia", state: "PA" }
];

export async function runAuthenticDiscovery() {
  console.log('🎯 AUTHENTIC SOURDOUGH DISCOVERY SYSTEM');
  console.log('=' .repeat(55));
  console.log('Enhanced dual verification: Website + Google Business');
  console.log(`Targeted search queries for sourdough establishments`);
  console.log(`Keywords: [${SOURDOUGH_KEYWORDS.join(', ')}]`);
  console.log(`Cities: ${TARGET_CITIES.length} artisan food centers`);
  
  const discoverySystem = new AuthenticDiscoverySystem();
  
  // Process cities systematically
  for (const cityData of TARGET_CITIES.slice(0, 8)) { // Process first 8 cities
    try {
      await discoverySystem.discoverByCategory(cityData.city, cityData.state);
      
      // Pause between cities
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.log(`Error processing ${cityData.city}: ${error.message}`);
    }
  }
  
  const stats = discoverySystem.getStats();
  
  console.log(`\n🎉 AUTHENTIC DISCOVERY COMPLETE:`);
  console.log(`   Establishments processed: ${stats.processed}`);
  console.log(`   Sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   🎯 TOTAL DATABASE SIZE: ${totalRestaurants.length} restaurants`);
  console.log(`   Progress toward 1,000 goal: ${((totalRestaurants.length / 1000) * 100).toFixed(1)}%`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runAuthenticDiscovery().catch(console.error);
}