#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

class ComprehensiveSFPizzaDiscovery {
  private apiKey: string;
  private allPizzaPlaces: any[] = [];
  private verified = 0;
  private failed = 0;
  private processed = 0;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async findAllPizzaRestaurants() {
    console.log('🔍 STEP 1: FINDING ALL PIZZA RESTAURANTS IN SAN FRANCISCO');
    console.log('=' .repeat(70));
    
    const pizzaSearchQueries = [
      // Generic pizza searches to find ALL pizza places
      'pizza restaurant San Francisco CA',
      'pizzeria San Francisco CA', 
      'pizza delivery San Francisco CA',
      'pizza takeout San Francisco CA',
      'italian restaurant pizza San Francisco CA',
      
      // Neighborhood-specific searches for complete coverage
      'pizza North Beach San Francisco CA',
      'pizza Mission District San Francisco CA',
      'pizza Castro San Francisco CA',
      'pizza SOMA San Francisco CA',
      'pizza Nob Hill San Francisco CA',
      'pizza Richmond District San Francisco CA',
      'pizza Sunset District San Francisco CA',
      'pizza Financial District San Francisco CA',
      'pizza Chinatown San Francisco CA',
      'pizza Haight Ashbury San Francisco CA',
      
      // Different pizza styles to catch specialty places
      'wood fired pizza San Francisco CA',
      'neapolitan pizza San Francisco CA',
      'deep dish pizza San Francisco CA',
      'new york style pizza San Francisco CA',
      'sicilian pizza San Francisco CA',
      
      // Bakeries that might serve pizza
      'bakery pizza San Francisco CA',
      'bread bakery San Francisco CA'
    ];

    console.log(`Executing ${pizzaSearchQueries.length} comprehensive pizza searches...`);

    for (const query of pizzaSearchQueries) {
      try {
        console.log(`\n🔍 Searching: ${query}`);
        await this.executePizzaSearch(query);
        
        // Pause between searches
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   Search error: ${error.message}`);
      }
    }

    // Remove duplicates based on name and address
    const uniquePizzaPlaces = this.removeDuplicates();
    
    console.log(`\n📊 PIZZA DISCOVERY SUMMARY:`);
    console.log(`   Total raw results: ${this.allPizzaPlaces.length}`);
    console.log(`   Unique pizza establishments: ${uniquePizzaPlaces.length}`);
    
    return uniquePizzaPlaces;
  }

  async executePizzaSearch(query: string) {
    if (!this.apiKey) {
      console.log('   No API key - skipping search');
      return;
    }

    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 20, // Get many results per search
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
          
          // Filter to only include pizza-related businesses
          const pizzaResults = results.filter(result => this.isPizzaRelated(result));
          console.log(`   Pizza-related: ${pizzaResults.length}`);
          
          this.allPizzaPlaces.push(...pizzaResults);
        }
      }
    } catch (error) {
      console.log(`   API error: ${error.message}`);
    }
  }

  isPizzaRelated(business: any): boolean {
    const name = (business.name || '').toLowerCase();
    const description = (business.description || '').toLowerCase();
    const categories = business.categories || [];
    
    // Check name for pizza keywords
    const nameHasPizza = name.includes('pizza') || name.includes('pizzeria') || 
                        name.includes('bakery') || name.includes('italian');
    
    // Check description for pizza keywords
    const descriptionHasPizza = description.includes('pizza') || description.includes('pizzeria') ||
                               description.includes('italian') || description.includes('bakery') ||
                               description.includes('wood fired') || description.includes('stone oven');
    
    // Check categories
    const categoryHasPizza = categories.some((cat: string) => 
      cat.toLowerCase().includes('pizza') ||
      cat.toLowerCase().includes('italian') ||
      cat.toLowerCase().includes('bakery') ||
      cat.toLowerCase().includes('restaurant')
    );
    
    return nameHasPizza || descriptionHasPizza || categoryHasPizza;
  }

  removeDuplicates() {
    const seen = new Map();
    return this.allPizzaPlaces.filter(result => {
      if (!result.name) return false;
      
      const key = `${result.name.toLowerCase().trim()}_${(result.address || '').toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      
      seen.set(key, true);
      return true;
    });
  }

  async verifySourdoughForAllPizzaPlaces(pizzaPlaces: any[]) {
    console.log(`\n🔬 STEP 2: SOURDOUGH VERIFICATION FOR ALL PIZZA PLACES`);
    console.log('=' .repeat(70));
    console.log(`Verifying ${pizzaPlaces.length} pizza establishments for sourdough keywords`);
    console.log(`Keywords: [${SOURDOUGH_KEYWORDS.join(', ')}]`);
    
    for (const pizzaPlace of pizzaPlaces) {
      await this.verifySourdoughEstablishment(pizzaPlace);
    }
  }

  async verifySourdoughEstablishment(business: any) {
    if (!business.name) return;

    this.processed++;
    console.log(`\n[${this.processed}] VERIFYING: ${business.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, business.name));
      if (existing.length > 0) {
        console.log(`   Already in database`);
        return;
      }

      let websiteKeywords: string[] = [];
      let businessKeywords: string[] = [];
      
      // 1. Check website if available
      if (business.website) {
        console.log(`   Analyzing website: ${business.website}`);
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
          
          if (websiteKeywords.length > 0) {
            console.log(`   🎯 Website keywords: [${websiteKeywords.join(', ')}]`);
          }
        } catch (error) {
          console.log(`   Website error: ${error.message}`);
        }
      }
      
      // 2. Check Google Business profile description
      if (business.description) {
        console.log(`   Checking business description...`);
        const businessContent = business.description.toLowerCase();
        businessKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
          businessContent.includes(keyword.toLowerCase())
        );
        
        if (businessKeywords.length > 0) {
          console.log(`   🎯 Business profile keywords: [${businessKeywords.join(', ')}]`);
        }
      }
      
      // 3. Combine all keywords
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`   ❌ No sourdough keywords found`);
        this.failed++;
        return;
      }
      
      console.log(`   ✅ VERIFIED SOURDOUGH PIZZA: [${allKeywords.join(', ')}]`);
      console.log(`   Source: ${websiteKeywords.length > 0 ? 'website+business' : 'business_only'}`);
      
      // Extract description
      let description = business.description || `${business.name} - verified sourdough pizza establishment in San Francisco`;
      if (description.length > 240) {
        description = description.substring(0, 240) + '...';
      }
      
      // Add to database
      await db.insert(restaurants).values({
        name: business.name,
        address: business.address || '',
        city: "San Francisco",
        state: "CA",
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
      console.log(`   💾 ADDED TO DATABASE - Total SF verified: ${this.verified}`);
      
      if (business.address) {
        console.log(`   📍 Address: ${business.address}`);
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
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

export async function runComprehensiveSFPizzaDiscovery() {
  console.log('🍕 COMPREHENSIVE SAN FRANCISCO PIZZA DISCOVERY');
  console.log('=' .repeat(70));
  console.log('Two-step process: Find ALL pizza restaurants, then verify sourdough');
  console.log('Enhanced dual verification: Website + Google Business profile');
  
  const discovery = new ComprehensiveSFPizzaDiscovery();
  
  // Step 1: Find all pizza restaurants
  const allPizzaPlaces = await discovery.findAllPizzaRestaurants();
  
  if (allPizzaPlaces.length === 0) {
    console.log('\n❌ No pizza establishments found. Check API configuration.');
    return 0;
  }
  
  // Step 2: Verify each pizza place for sourdough
  await discovery.verifySourdoughForAllPizzaPlaces(allPizzaPlaces);
  
  const stats = discovery.getStats();
  
  console.log(`\n🎉 COMPREHENSIVE SF DISCOVERY COMPLETE:`);
  console.log(`   Total pizza establishments found: ${allPizzaPlaces.length}`);
  console.log(`   Sourdough establishments verified: ${stats.verified}`);
  console.log(`   Non-sourdough establishments: ${stats.failed}`);
  console.log(`   Sourdough success rate: ${stats.successRate}%`);
  
  // Show final San Francisco results
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  
  console.log(`\n🌉 FINAL SAN FRANCISCO SOURDOUGH SUMMARY:`);
  console.log(`   Total verified sourdough establishments: ${sfRestaurants.length}`);
  
  sfRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address || 'Address not available'}`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   ⭐ Rating: ${restaurant.rating || 'N/A'} (${restaurant.reviewCount || 0} reviews)`);
  });
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`\n📊 TOTAL DATABASE: ${totalRestaurants.length} restaurants nationwide`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runComprehensiveSFPizzaDiscovery().catch(console.error);
}