#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

class SanFranciscoSourdoughDiscovery {
  private apiKey: string;
  private verified = 0;
  private failed = 0;
  private processed = 0;
  private allResults: any[] = [];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async comprehensiveSearch() {
    console.log('🍕 SAN FRANCISCO SOURDOUGH PIZZA DISCOVERY');
    console.log('=' .repeat(60));
    console.log('Comprehensive search using multiple strategies');
    console.log('Enhanced dual verification: Website + Google Business');
    
    // Multiple search strategies for maximum coverage
    const searchQueries = [
      // Direct sourdough searches
      'sourdough pizza San Francisco CA',
      'sourdough pizzeria San Francisco CA',
      'naturally leavened pizza San Francisco CA',
      'wild yeast pizza San Francisco CA',
      
      // Artisan and craft searches
      'artisan pizza San Francisco CA',
      'craft pizza San Francisco CA',
      'wood fired pizza San Francisco CA',
      'stone oven pizza San Francisco CA',
      
      // Bakery searches (many bakeries serve pizza)
      'sourdough bakery San Francisco CA',
      'artisan bakery pizza San Francisco CA',
      'naturally leavened bakery San Francisco CA',
      
      // Neighborhood-specific searches
      'sourdough pizza North Beach San Francisco',
      'sourdough pizza Mission District San Francisco',
      'sourdough pizza Castro San Francisco',
      'sourdough pizza SOMA San Francisco',
      'sourdough pizza Nob Hill San Francisco',
      
      // Generic pizza searches for comprehensive coverage
      'pizza restaurant San Francisco CA',
      'pizzeria San Francisco CA',
      'pizza bakery San Francisco CA'
    ];

    console.log(`Executing ${searchQueries.length} targeted searches...`);

    for (const query of searchQueries) {
      try {
        console.log(`\n🔍 Searching: ${query}`);
        await this.executeSearch(query);
        
        // Respectful pause between searches
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   Search error: ${error.message}`);
      }
    }

    // Remove duplicates
    const uniqueResults = this.removeDuplicates();
    console.log(`\n📊 SEARCH SUMMARY:`);
    console.log(`   Total raw results: ${this.allResults.length}`);
    console.log(`   Unique establishments: ${uniqueResults.length}`);
    
    // Verify each unique establishment
    console.log(`\n🔬 VERIFICATION PHASE:`);
    for (const business of uniqueResults) {
      await this.verifyEstablishment(business);
    }
  }

  async executeSearch(query: string) {
    if (!this.apiKey) {
      console.log('   No API key - skipping search');
      return;
    }

    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 10, // Get more results per search
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
          this.allResults.push(...results);
        }
      }
    } catch (error) {
      console.log(`   API error: ${error.message}`);
    }
  }

  removeDuplicates() {
    const seen = new Set();
    return this.allResults.filter(result => {
      if (!result.name) return false;
      
      const key = result.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      
      seen.add(key);
      return true;
    });
  }

  async verifyEstablishment(business: any) {
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
            console.log(`   Website keywords: [${websiteKeywords.join(', ')}]`);
          }
        } catch (error) {
          console.log(`   Website error: ${error.message}`);
        }
      }
      
      // 2. Check Google Business profile
      if (business.description) {
        console.log(`   Checking business description...`);
        const businessContent = business.description.toLowerCase();
        businessKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
          businessContent.includes(keyword.toLowerCase())
        );
        
        if (businessKeywords.length > 0) {
          console.log(`   Business profile keywords: [${businessKeywords.join(', ')}]`);
        }
      }
      
      // 3. Combine all keywords
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`   ❌ No sourdough keywords found`);
        this.failed++;
        return;
      }
      
      // 4. Verify pizza service
      const hasPizza = this.verifyPizzaService(business);
      if (!hasPizza) {
        console.log(`   Has sourdough but no pizza service confirmed`);
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
      console.log(`   ADDED TO DATABASE - SF Total: ${this.verified}`);
      
      if (business.address) {
        console.log(`   Address: ${business.address}`);
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
  }

  verifyPizzaService(business: any): boolean {
    const name = (business.name || '').toLowerCase();
    const description = (business.description || '').toLowerCase();
    const categories = business.categories || [];
    
    // Check name
    if (name.includes('pizza') || name.includes('pizzeria') || name.includes('bakery')) {
      return true;
    }
    
    // Check description
    if (description.includes('pizza') || description.includes('flatbread') || 
        description.includes('wood fired') || description.includes('wood-fired') ||
        description.includes('stone oven') || description.includes('bakery')) {
      return true;
    }
    
    // Check categories
    const hasPizzaCategory = categories.some((cat: string) => 
      cat.toLowerCase().includes('pizza') ||
      cat.toLowerCase().includes('bakery') ||
      cat.toLowerCase().includes('restaurant') ||
      cat.toLowerCase().includes('italian')
    );
    
    return hasPizzaCategory;
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

export async function discoverSanFranciscoSourdough() {
  const discovery = new SanFranciscoSourdoughDiscovery();
  
  await discovery.comprehensiveSearch();
  
  const stats = discovery.getStats();
  
  console.log(`\n🎉 SAN FRANCISCO DISCOVERY COMPLETE:`);
  console.log(`   Establishments processed: ${stats.processed}`);
  console.log(`   Sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  // Show San Francisco specific results
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  
  console.log(`\n🌉 SAN FRANCISCO SOURDOUGH PIZZERIAS:`);
  sfRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address}`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   📝 ${restaurant.description?.substring(0, 120)}...`);
  });
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`\n📊 TOTAL DATABASE: ${totalRestaurants.length} restaurants`);
  console.log(`   San Francisco: ${sfRestaurants.length} sourdough pizzerias`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  discoverSanFranciscoSourdough().catch(console.error);
}