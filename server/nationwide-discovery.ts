#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Strategic nationwide approach - target cities with highest likelihood of sourdough culture
const TARGET_CITIES = [
  // West Coast sourdough strongholds
  { city: "San Francisco", state: "CA", priority: "high" },
  { city: "Berkeley", state: "CA", priority: "high" },
  { city: "Oakland", state: "CA", priority: "high" },
  { city: "Los Angeles", state: "CA", priority: "medium" },
  { city: "San Diego", state: "CA", priority: "medium" },
  { city: "Portland", state: "OR", priority: "high" },
  { city: "Seattle", state: "WA", priority: "high" },
  { city: "Eugene", state: "OR", priority: "medium" },
  
  // Northeast artisan culture
  { city: "Brooklyn", state: "NY", priority: "high" },
  { city: "Manhattan", state: "NY", priority: "high" },
  { city: "Philadelphia", state: "PA", priority: "high" },
  { city: "Boston", state: "MA", priority: "high" },
  { city: "Cambridge", state: "MA", priority: "high" },
  { city: "Burlington", state: "VT", priority: "high" },
  { city: "Montpelier", state: "VT", priority: "medium" },
  
  // Midwest artisan cities
  { city: "Chicago", state: "IL", priority: "medium" },
  { city: "Madison", state: "WI", priority: "medium" },
  { city: "Minneapolis", state: "MN", priority: "medium" },
  { city: "Detroit", state: "MI", priority: "low" },
  
  // Southwest growing scenes
  { city: "Austin", state: "TX", priority: "high" },
  { city: "Denver", state: "CO", priority: "medium" },
  { city: "Boulder", state: "CO", priority: "high" },
  { city: "Santa Fe", state: "NM", priority: "medium" },
  { city: "Phoenix", state: "AZ", priority: "low" },
  
  // Southeast emerging areas
  { city: "Asheville", state: "NC", priority: "high" },
  { city: "Atlanta", state: "GA", priority: "medium" },
  { city: "Charleston", state: "SC", priority: "medium" },
  { city: "Nashville", state: "TN", priority: "medium" },
  { city: "New Orleans", state: "LA", priority: "medium" }
];

class NationwideDiscoverySystem {
  private apiKey: string;
  private processed = 0;
  private verified = 0;
  private failed = 0;
  private apiCallsUsed = 0;
  private maxApiCalls = 90; // Stay under free limit

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async discoverInCity(cityData: { city: string; state: string; priority: string }) {
    if (this.apiCallsUsed >= this.maxApiCalls) {
      console.log(`⚠️  API limit reached (${this.maxApiCalls} calls)`);
      return [];
    }

    console.log(`\n🔍 DISCOVERING: ${cityData.city}, ${cityData.state} (${cityData.priority} priority)`);
    
    try {
      // Search for pizza restaurants in the city using Outscraper
      const query = `pizza restaurant ${cityData.city} ${cityData.state}`;
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 15, // Get more restaurants per city
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        },
        timeout: 20000
      });

      this.apiCallsUsed++;
      console.log(`   API calls used: ${this.apiCallsUsed}/${this.maxApiCalls}`);

      if (response.data.status === 'Pending') {
        console.log(`   Waiting for results...`);
        
        // Wait for results
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
            headers: {
              'X-API-KEY': this.apiKey
            }
          });

          if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
            const results = resultResponse.data.data;
            console.log(`   Found ${results.length} pizza restaurants`);
            
            return await this.processDiscoveredRestaurants(results, cityData);
          }
        }
      }
      
      return [];
      
    } catch (error) {
      console.log(`   Discovery error: ${error.message}`);
      return [];
    }
  }

  async processDiscoveredRestaurants(results: any[], cityData: { city: string; state: string }) {
    const verified = [];
    
    for (const business of results) {
      if (!business.name || !business.website) {
        continue; // Skip businesses without websites
      }
      
      this.processed++;
      console.log(`\n   [${this.processed}] Checking: ${business.name}`);
      
      try {
        // Check if already exists
        const existing = await db.select().from(restaurants).where(eq(restaurants.name, business.name));
        if (existing.length > 0) {
          console.log(`     Already in database`);
          continue;
        }
        
        // Verify sourdough on website
        const isVerified = await this.verifyWebsite(business.website, business.name);
        
        if (isVerified.verified) {
          // Add to database
          await db.insert(restaurants).values({
            name: business.name,
            address: business.address || '',
            city: cityData.city,
            state: cityData.state,
            zipCode: business.postal_code || '',
            phone: business.phone || '',
            website: business.website,
            description: business.description || `${business.name} - verified sourdough pizza restaurant`,
            sourdoughVerified: 1,
            sourdoughKeywords: isVerified.keywords,
            rating: business.rating || 0,
            reviewCount: business.reviews_count || 0,
            latitude: business.latitude || 0,
            longitude: business.longitude || 0,
            imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
          });
          
          this.verified++;
          console.log(`     ✅ VERIFIED & ADDED - Total: ${this.verified}`);
          console.log(`     Keywords: [${isVerified.keywords.join(', ')}]`);
          
          if (business.address) {
            console.log(`     Address: ${business.address}`);
          }
          
          verified.push(business);
        } else {
          this.failed++;
          console.log(`     ❌ No sourdough keywords found`);
        }
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
        this.failed++;
      }
      
      // Respectful pause between verifications
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return verified;
  }

  async verifyWebsite(website: string, name: string): Promise<{ verified: boolean; keywords: string[] }> {
    try {
      const response = await axios.get(website, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();
      
      // Check for approved sourdough keywords
      const foundKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      return {
        verified: foundKeywords.length > 0,
        keywords: foundKeywords
      };
      
    } catch (error) {
      return { verified: false, keywords: [] };
    }
  }

  getStats() {
    return {
      processed: this.processed,
      verified: this.verified,
      failed: this.failed,
      apiCallsUsed: this.apiCallsUsed,
      successRate: this.processed > 0 ? ((this.verified / this.processed) * 100).toFixed(1) : '0'
    };
  }
}

export async function executeNationwideDiscovery() {
  console.log('🌎 NATIONWIDE SOURDOUGH DISCOVERY SYSTEM');
  console.log('=' .repeat(60));
  console.log(`🎯 Targeting ${TARGET_CITIES.length} strategic cities`);
  console.log(`✅ Keywords: [${SOURDOUGH_KEYWORDS.join(', ')}]`);
  console.log(`🔍 Systematic restaurant discovery with website verification`);
  console.log(`📊 Goal: Build toward 1,000+ verified restaurants`);
  
  const discoverySystem = new NationwideDiscoverySystem();
  
  // Process high priority cities first
  const highPriority = TARGET_CITIES.filter(city => city.priority === 'high');
  const mediumPriority = TARGET_CITIES.filter(city => city.priority === 'medium');
  
  console.log(`\n🚀 PHASE 1: HIGH PRIORITY CITIES (${highPriority.length})`);
  
  for (const cityData of highPriority) {
    const discovered = await discoverySystem.discoverInCity(cityData);
    
    if (discoverySystem.getStats().apiCallsUsed >= 90) {
      console.log(`\n⚠️  API limit approached, stopping discovery`);
      break;
    }
    
    // Pause between cities to be respectful
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Continue with medium priority if API calls remaining
  if (discoverySystem.getStats().apiCallsUsed < 85) {
    console.log(`\n🚀 PHASE 2: MEDIUM PRIORITY CITIES`);
    
    for (const cityData of mediumPriority.slice(0, 5)) { // Limit to 5 medium priority
      const discovered = await discoverySystem.discoverInCity(cityData);
      
      if (discoverySystem.getStats().apiCallsUsed >= 90) {
        console.log(`\n⚠️  API limit reached, stopping`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  const finalStats = discoverySystem.getStats();
  
  console.log(`\n🎉 NATIONWIDE DISCOVERY COMPLETE:`);
  console.log(`   🏪 Restaurants processed: ${finalStats.processed}`);
  console.log(`   ✅ Sourdough verified: ${finalStats.verified}`);
  console.log(`   ❌ Failed verification: ${finalStats.failed}`);
  console.log(`   📈 Success rate: ${finalStats.successRate}%`);
  console.log(`   🔧 API calls used: ${finalStats.apiCallsUsed}/100 (free tier)`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   📊 Total database size: ${totalRestaurants.length} restaurants`);
  console.log(`   🎯 Progress toward 1,000+ goal: ${((totalRestaurants.length / 1000) * 100).toFixed(1)}%`);
  
  return finalStats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  executeNationwideDiscovery().catch(console.error);
}