#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

class CorrectedSFDiscovery {
  private apiKey: string;
  private allPizzaPlaces: any[] = [];
  private verified = 0;
  private failed = 0;
  private processed = 0;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async findAllSFPizzaPlaces() {
    console.log('🍕 CORRECTED SAN FRANCISCO PIZZA DISCOVERY');
    console.log('=' .repeat(65));
    console.log('Step 1: Find ALL pizza establishments using corrected data parsing');
    console.log('Step 2: Apply dual sourdough verification');
    
    const searches = [
      'pizza San Francisco CA',
      'pizzeria San Francisco CA',  
      'italian restaurant San Francisco CA',
      'bakery San Francisco CA',
      'wood fired pizza San Francisco CA',
      'neapolitan pizza San Francisco CA',
      'pizza North Beach San Francisco',
      'pizza Mission District San Francisco',
      'pizza Castro San Francisco'
    ];

    for (const query of searches) {
      await this.executeSearch(query);
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    console.log(`\n📊 DISCOVERY SUMMARY:`);
    console.log(`   Total establishments found: ${this.allPizzaPlaces.length}`);
    
    // Remove duplicates
    const uniquePlaces = this.removeDuplicates();
    console.log(`   Unique pizza establishments: ${uniquePlaces.length}`);

    // Show sample of found places
    if (uniquePlaces.length > 0) {
      console.log(`\n🔍 FOUND PIZZA ESTABLISHMENTS (sample):`);
      uniquePlaces.slice(0, 10).forEach((place, index) => {
        console.log(`   ${index + 1}. ${place.name}`);
        console.log(`      📍 ${place.full_address || place.street || 'Address TBD'}`);
        console.log(`      📱 ${place.phone || 'No phone'}`);
        console.log(`      🌐 ${place.site || 'No website'}`);
        console.log(`      ⭐ ${place.rating || 'No rating'} (${place.reviews || 0} reviews)`);
      });
    }

    // Verify each for sourdough
    console.log(`\n🔬 SOURDOUGH VERIFICATION PHASE:`);
    for (const place of uniquePlaces) {
      await this.verifySourdough(place);
    }

    return this.getStats();
  }

  async executeSearch(query: string) {
    console.log(`\n🔍 Searching: ${query}`);
    
    if (!this.apiKey) {
      console.log('   No API key - skipping');
      return;
    }

    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 20,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      if (response.data.status === 'Pending') {
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
          // Corrected data parsing - the data is an array of arrays
          let results = resultResponse.data.data;
          
          // If it's an array of arrays, flatten it
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          
          console.log(`   Found ${results.length} establishments`);
          
          // Filter for pizza-related businesses
          const pizzaResults = results.filter(result => this.isPizzaRelated(result));
          console.log(`   Pizza-related: ${pizzaResults.length}`);
          
          this.allPizzaPlaces.push(...pizzaResults);
        } else {
          console.log(`   No data in response`);
        }
      } else {
        console.log(`   Unexpected response status: ${response.data.status}`);
      }
    } catch (error) {
      console.log(`   Search error: ${error.message}`);
    }
  }

  isPizzaRelated(business: any): boolean {
    const name = (business.name || '').toLowerCase();
    const description = (business.description || '').toLowerCase();
    const type = (business.type || '').toLowerCase();
    const subtypes = (business.subtypes || '').toLowerCase();
    
    // Check name for pizza keywords
    if (name.includes('pizza') || name.includes('pizzeria')) {
      return true;
    }
    
    // Check type and subtypes
    if (type.includes('pizza') || subtypes.includes('pizza') || 
        type.includes('italian') || subtypes.includes('italian')) {
      return true;
    }
    
    // Check description
    if (description.includes('pizza') || description.includes('pizzeria') ||
        description.includes('italian') || description.includes('bakery') ||
        description.includes('wood fired') || description.includes('stone oven')) {
      return true;
    }
    
    // Include bakeries that might serve pizza
    if (name.includes('bakery') || type.includes('bakery') || 
        description.includes('bakery')) {
      return true;
    }
    
    return false;
  }

  removeDuplicates() {
    const seen = new Set();
    return this.allPizzaPlaces.filter(place => {
      if (!place.name) return false;
      
      // Use name + address for more accurate deduplication
      const key = `${place.name.toLowerCase().trim()}_${(place.full_address || place.street || '').toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      
      seen.add(key);
      return true;
    });
  }

  async verifySourdough(place: any) {
    if (!place.name) return;

    this.processed++;
    console.log(`\n[${this.processed}] VERIFYING: ${place.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, place.name));
      if (existing.length > 0) {
        console.log(`   Already in database`);
        return;
      }

      let websiteKeywords: string[] = [];
      let businessKeywords: string[] = [];
      
      // 1. Check website if available
      const website = place.site || place.website;
      if (website) {
        console.log(`   Checking website: ${website}`);
        try {
          const response = await axios.get(website, {
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
      
      // 2. Check Google Business description
      if (place.description) {
        console.log(`   Checking business description...`);
        const businessContent = place.description.toLowerCase();
        businessKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
          businessContent.includes(keyword.toLowerCase())
        );
        
        if (businessKeywords.length > 0) {
          console.log(`   🎯 Business keywords: [${businessKeywords.join(', ')}]`);
        }
      }
      
      // 3. Combine results
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`   ❌ No sourdough keywords found`);
        this.failed++;
        return;
      }
      
      console.log(`   ✅ SOURDOUGH VERIFIED: [${allKeywords.join(', ')}]`);
      console.log(`   Source: ${websiteKeywords.length > 0 ? 'website+business' : 'business_only'}`);
      
      // Add to database
      let description = place.description || `${place.name} - verified sourdough pizza establishment in San Francisco`;
      if (description.length > 240) {
        description = description.substring(0, 240) + '...';
      }
      
      await db.insert(restaurants).values({
        name: place.name,
        address: place.full_address || place.street || '',
        city: place.city || "San Francisco",
        state: place.state || place.us_state || "CA",
        zipCode: place.postal_code || '',
        phone: place.phone || '',
        website: website || '',
        description,
        sourdoughVerified: 1,
        sourdoughKeywords: allKeywords,
        rating: place.rating || 0,
        reviewCount: place.reviews || 0,
        latitude: place.latitude || 0,
        longitude: place.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`   💾 ADDED TO DATABASE - Total SF verified: ${this.verified}`);
      
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

export async function runCorrectedSFDiscovery() {
  const discovery = new CorrectedSFDiscovery();
  
  const stats = await discovery.findAllSFPizzaPlaces();
  
  console.log(`\n🎉 CORRECTED SF DISCOVERY COMPLETE:`);
  console.log(`   Pizza establishments processed: ${stats.processed}`);
  console.log(`   Sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  // Show final San Francisco results
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  console.log(`\n🌉 SAN FRANCISCO SOURDOUGH ESTABLISHMENTS: ${sfRestaurants.length}`);
  
  sfRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address || 'Address TBD'}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   ⭐ ${restaurant.rating || 'No rating'} (${restaurant.reviewCount || 0} reviews)`);
  });
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`\n📊 TOTAL DATABASE: ${totalRestaurants.length} restaurants nationwide`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runCorrectedSFDiscovery().catch(console.error);
}