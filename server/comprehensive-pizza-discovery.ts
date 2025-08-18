#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_PATTERNS = [
  'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented',
  'sourdough-crust', 'sourdough-pizza', 'sourdough-dough', 'sourdough-bread',
  'naturally-leavened', 'wild-yeast', 'naturally-fermented'
];

class ComprehensivePizzaDiscovery {
  private totalFound = 0;
  private totalVerified = 0;
  private totalProcessed = 0;
  private apiKey: string;
  private allPizzaEstablishments: any[] = [];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async discoverAllPizzaInCity(city: string, state: string) {
    console.log('🍕 COMPREHENSIVE PIZZA DISCOVERY SYSTEM');
    console.log('=' .repeat(60));
    console.log(`Target: ${city}, ${state}`);
    console.log('Strategy: Two-phase comprehensive search');
    
    if (!this.apiKey) {
      console.log('❌ No API key available - cannot proceed');
      return { found: 0, verified: 0 };
    }

    // PHASE 1: Find ALL pizza restaurants
    console.log('\n📋 PHASE 1: COMPREHENSIVE PIZZA RESTAURANT DISCOVERY');
    console.log('Finding every single pizza establishment...');
    
    await this.searchAllPizzaRestaurants(city, state);
    
    // PHASE 2: Targeted sourdough verification
    console.log('\n🔍 PHASE 2: SOURDOUGH VERIFICATION');
    console.log('Verifying sourdough claims from all discovered establishments...');
    
    await this.verifyAllEstablishments();
    
    // PHASE 3: Direct sourdough search as backup
    console.log('\n🎯 PHASE 3: DIRECT SOURDOUGH SEARCH');
    console.log('Searching specifically for sourdough establishments...');
    
    await this.directSourdoughSearch(city, state);
    
    return {
      found: this.totalFound,
      verified: this.totalVerified,
      processed: this.totalProcessed
    };
  }

  async searchAllPizzaRestaurants(city: string, state: string) {
    const searchQueries = [
      // Broad pizza searches
      `pizza restaurants ${city} ${state}`,
      `pizzeria ${city} ${state}`,
      `pizza places ${city} ${state}`,
      `pizza delivery ${city} ${state}`,
      
      // Category-based searches
      `pizza ${city} ${state}`,
      `Italian restaurants ${city} ${state}`,
      
      // Style-specific searches
      `wood fired pizza ${city} ${state}`,
      `thin crust pizza ${city} ${state}`,
      `artisan pizza ${city} ${state}`,
      `neapolitan pizza ${city} ${state}`,
      
      // Size-based searches
      `pizza chains ${city} ${state}`,
      `local pizza ${city} ${state}`,
      `independent pizza ${city} ${state}`
    ];

    console.log(`   Running ${searchQueries.length} comprehensive searches...`);
    
    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      console.log(`\n   [${i + 1}/${searchQueries.length}] Searching: "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 20); // Higher limit for comprehensive coverage
        
        if (results && results.length > 0) {
          console.log(`     Found: ${results.length} establishments`);
          
          for (const result of results) {
            if (this.isPizzaEstablishment(result)) {
              const existing = this.allPizzaEstablishments.find(e => 
                e.name === result.name && 
                Math.abs(e.latitude - result.latitude) < 0.001
              );
              
              if (!existing) {
                this.allPizzaEstablishments.push(result);
                this.totalFound++;
              }
            }
          }
        } else {
          console.log(`     No results found`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ PHASE 1 COMPLETE: Found ${this.allPizzaEstablishments.length} unique pizza establishments`);
    
    // Show sample of discoveries
    console.log(`\nSample discoveries:`);
    this.allPizzaEstablishments.slice(0, 10).forEach((est, index) => {
      console.log(`${index + 1}. ${est.name} - ${est.full_address || est.address}`);
    });
    
    if (this.allPizzaEstablishments.length > 10) {
      console.log(`... and ${this.allPizzaEstablishments.length - 10} more`);
    }
  }

  async verifyAllEstablishments() {
    console.log(`\nVerifying ${this.allPizzaEstablishments.length} establishments for sourdough...`);
    
    for (let i = 0; i < this.allPizzaEstablishments.length; i++) {
      const establishment = this.allPizzaEstablishments[i];
      this.totalProcessed++;
      
      console.log(`\n[${i + 1}/${this.allPizzaEstablishments.length}] ${establishment.name}`);
      
      try {
        const isVerified = await this.verifyEstablishment(establishment);
        if (isVerified) {
          this.totalVerified++;
        }
      } catch (error) {
        console.log(`   Error verifying: ${error.message}`);
      }
      
      // Rate limiting for website requests
      if (i % 5 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  async directSourdoughSearch(city: string, state: string) {
    const sourdoughQueries = [
      `sourdough pizza ${city} ${state}`,
      `naturally leavened pizza ${city} ${state}`,
      `wild yeast pizza ${city} ${state}`,
      `artisan sourdough ${city} ${state}`,
      `sourdough crust pizza ${city} ${state}`
    ];

    console.log(`\nExecuting ${sourdoughQueries.length} targeted sourdough searches...`);
    
    for (const query of sourdoughQueries) {
      console.log(`\n   Searching: "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 10);
        
        if (results && results.length > 0) {
          console.log(`     Found: ${results.length} potential sourdough establishments`);
          
          for (const result of results) {
            if (this.isPizzaEstablishment(result)) {
              // Check if we already processed this one
              const existing = await db.select().from(restaurants).where(eq(restaurants.name, result.name));
              
              if (existing.length === 0) {
                console.log(`     New discovery: ${result.name}`);
                const isVerified = await this.verifyEstablishment(result);
                if (isVerified) {
                  this.totalVerified++;
                }
                this.totalProcessed++;
              }
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }
  }

  async executeSearch(query: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit,
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
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
        }
      }
      
      return [];
    } catch (error) {
      console.log(`Search error for "${query}": ${error.message}`);
      return [];
    }
  }

  isPizzaEstablishment(result: any): boolean {
    if (!result.name) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    const categories = (result.categories || []).join(' ').toLowerCase();
    
    // Pizza keywords
    const pizzaKeywords = [
      'pizza', 'pizzeria', 'pizzas', 'pie', 'pies',
      'italian restaurant', 'trattoria', 'ristorante'
    ];
    
    // Exclude non-pizza places
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience store',
      'delivery service', 'courier', 'driver'
    ];
    
    // Check exclusions first
    for (const exclude of excludeKeywords) {
      if (name.includes(exclude) || description.includes(exclude)) {
        return false;
      }
    }
    
    // Check pizza keywords
    for (const keyword of pizzaKeywords) {
      if (name.includes(keyword) || description.includes(keyword) || categories.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  async verifyEstablishment(establishment: any): Promise<boolean> {
    // Check if already exists
    const existing = await db.select().from(restaurants).where(eq(restaurants.name, establishment.name));
    if (existing.length > 0) {
      console.log(`   Already in database`);
      return false;
    }

    let websiteKeywords: string[] = [];
    let businessKeywords: string[] = [];
    
    // Check business description first
    if (establishment.description) {
      businessKeywords = this.findSourdoughPatterns(establishment.description.toLowerCase());
      if (businessKeywords.length > 0) {
        console.log(`   🎯 Business keywords: [${businessKeywords.join(', ')}]`);
      }
    }
    
    // Check website if available
    const website = establishment.site || establishment.website;
    if (website) {
      try {
        const response = await axios.get(website, {
          timeout: 12000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        const content = $('body').text().toLowerCase();
        
        websiteKeywords = this.findSourdoughPatterns(content);
        
        if (websiteKeywords.length > 0) {
          console.log(`   🎯 Website keywords: [${websiteKeywords.join(', ')}]`);
        }
      } catch (error) {
        console.log(`   Website check failed: ${error.message}`);
      }
    }
    
    // Combine results
    const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
    
    if (allKeywords.length === 0) {
      console.log(`   ❌ No sourdough verification`);
      return false;
    }
    
    console.log(`   ✅ SOURDOUGH VERIFIED: [${allKeywords.join(', ')}]`);
    
    // Add to database
    const description = establishment.description || `${establishment.name} - verified sourdough pizza establishment`;
    
    await db.insert(restaurants).values({
      name: establishment.name,
      address: establishment.full_address || establishment.address || '',
      city: establishment.city || 'San Francisco',
      state: establishment.state || 'CA',
      zipCode: establishment.postal_code || '',
      phone: establishment.phone || '',
      website: website || '',
      description: description.length > 240 ? description.substring(0, 240) + '...' : description,
      sourdoughVerified: 1,
      sourdoughKeywords: allKeywords,
      rating: establishment.rating || 0,
      reviewCount: establishment.reviews || establishment.reviews_count || 0,
      latitude: establishment.latitude || 0,
      longitude: establishment.longitude || 0,
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
    });
    
    console.log(`   💾 Added to database`);
    return true;
  }

  findSourdoughPatterns(text: string): string[] {
    const found: string[] = [];
    
    for (const pattern of SOURDOUGH_PATTERNS) {
      if (text.includes(pattern.toLowerCase())) {
        found.push(pattern);
      }
    }
    
    return found;
  }
}

export async function runComprehensivePizzaDiscovery(city: string = 'San Francisco', state: string = 'CA') {
  const discovery = new ComprehensivePizzaDiscovery();
  
  const results = await discovery.discoverAllPizzaInCity(city, state);
  
  console.log(`\n🎉 COMPREHENSIVE DISCOVERY COMPLETE:`);
  console.log(`   Total pizza establishments found: ${results.found}`);
  console.log(`   Total establishments processed: ${results.processed}`);
  console.log(`   New sourdough verified: ${results.verified}`);
  console.log(`   Success rate: ${results.processed > 0 ? ((results.verified / results.processed) * 100).toFixed(1) : '0'}%`);
  
  // Show final results
  const allRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, city));
  console.log(`\n🌉 TOTAL ${city.toUpperCase()} SOURDOUGH ESTABLISHMENTS: ${allRestaurants.length}`);
  
  allRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address || 'Address TBD'}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   ⭐ ${restaurant.rating || 'No rating'} (${restaurant.reviewCount || 0} reviews)`);
  });
  
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runComprehensivePizzaDiscovery().catch(console.error);
}