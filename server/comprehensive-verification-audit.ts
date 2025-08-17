#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Enhanced verification that checks BOTH website AND Google Business profile
class ComprehensiveVerificationAudit {
  private apiKey: string;
  private verified = 0;
  private failed = 0;
  private processed = 0;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async auditRestaurant(restaurant: {
    name: string;
    website?: string;
    city: string;
    state: string;
  }) {
    this.processed++;
    console.log(`\n[${this.processed}] COMPREHENSIVE AUDIT: ${restaurant.name}`);
    
    try {
      let websiteKeywords: string[] = [];
      let businessKeywords: string[] = [];
      
      // 1. Check website if available
      if (restaurant.website) {
        console.log(`   Checking website: ${restaurant.website}`);
        try {
          const response = await axios.get(restaurant.website, {
            timeout: 15000,
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
            console.log(`   Website keywords found: [${websiteKeywords.join(', ')}]`);
          }
        } catch (error) {
          console.log(`   Website error: ${error.message}`);
        }
      }
      
      // 2. Check Google Business profile
      console.log(`   Checking Google Business profile...`);
      const businessData = await this.getBusinessProfile(restaurant.name, restaurant.city, restaurant.state);
      
      if (businessData.description) {
        const businessContent = businessData.description.toLowerCase();
        businessKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
          businessContent.includes(keyword.toLowerCase())
        );
        
        if (businessKeywords.length > 0) {
          console.log(`   Business profile keywords: [${businessKeywords.join(', ')}]`);
        }
      }
      
      // 3. Combine results
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`   ❌ No sourdough keywords found in website or business profile`);
        this.failed++;
        return null;
      }
      
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, restaurant.name));
      if (existing.length > 0) {
        console.log(`   Already in database`);
        return null;
      }
      
      // Check if serves pizza/flatbread
      const websiteHasPizza = restaurant.website ? await this.checkPizzaService(restaurant.website) : false;
      const businessHasPizza = businessData.description ? 
        (businessData.description.toLowerCase().includes('pizza') || 
         businessData.description.toLowerCase().includes('flatbread') ||
         businessData.description.toLowerCase().includes('wood fired') ||
         businessData.categories?.some(cat => cat.toLowerCase().includes('pizza'))) : false;
      
      if (!websiteHasPizza && !businessHasPizza) {
        console.log(`   Has sourdough but no pizza service confirmed`);
        this.failed++;
        return null;
      }
      
      console.log(`   ✅ VERIFIED SOURDOUGH PIZZA: [${allKeywords.join(', ')}]`);
      
      // Extract description
      let description = businessData.description || `${restaurant.name} - verified sourdough pizza establishment`;
      if (description.length > 250) {
        description = description.substring(0, 250) + '...';
      }
      
      // Add to database
      await db.insert(restaurants).values({
        name: restaurant.name,
        address: businessData.address || '',
        city: restaurant.city,
        state: restaurant.state,
        zipCode: '',
        phone: businessData.phone || '',
        website: restaurant.website || '',
        description,
        sourdoughVerified: 1,
        sourdoughKeywords: allKeywords,
        rating: businessData.rating || 0,
        reviewCount: businessData.reviewCount || 0,
        latitude: businessData.latitude || 0,
        longitude: businessData.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`   ADDED TO DATABASE - Total: ${this.verified}`);
      
      if (businessData.address) {
        console.log(`   Address: ${businessData.address}`);
      }
      
      return {
        name: restaurant.name,
        keywords: allKeywords,
        source: websiteKeywords.length > 0 ? 'website+business' : 'business_only'
      };
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      this.failed++;
      return null;
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

  async getBusinessProfile(name: string, city: string, state: string) {
    if (!this.apiKey) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0, description: '', categories: [] };
    }
    
    try {
      const query = `${name} ${city} ${state}`;
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 1,
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
          if (results.length > 0) {
            const business = results[0];
            return {
              address: business.address || '',
              phone: business.phone || '',
              rating: business.rating || 0,
              reviewCount: business.reviews_count || 0,
              latitude: business.latitude || 0,
              longitude: business.longitude || 0,
              description: business.description || '',
              categories: business.categories || []
            };
          }
        }
      }
      
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0, description: '', categories: [] };
    } catch (error) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0, description: '', categories: [] };
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

// Target restaurants with high sourdough likelihood for comprehensive audit
const AUDIT_TARGETS = [
  // San Francisco sourdough heartland
  { name: "Tony's Little Star Pizza", website: "https://tonylittlestar.com", city: "San Francisco", state: "CA" },
  { name: "Golden Boy Pizza", city: "San Francisco", state: "CA" },
  { name: "North Beach Pizza", city: "San Francisco", state: "CA" },
  { name: "Escape from New York Pizza", city: "San Francisco", state: "CA" },
  
  // Portland artisan scene  
  { name: "Scottie's Pizza Parlor", city: "Portland", state: "OR" },
  { name: "Sizzle Pie", city: "Portland", state: "OR" },
  { name: "Ranch Pizza", city: "Portland", state: "OR" },
  { name: "Baby Doll Pizza", city: "Portland", state: "OR" },
  
  // Seattle area
  { name: "Pagliacci Pizza", city: "Seattle", state: "WA" },
  { name: "Zeeks Pizza", city: "Seattle", state: "WA" },
  { name: "Delancey Pizza", city: "Seattle", state: "WA" },
  
  // Brooklyn pizza culture
  { name: "Joe's Pizza", city: "Brooklyn", state: "NY" },
  { name: "Prince Street Pizza", city: "Manhattan", state: "NY" },
  { name: "Di Fara Pizza", city: "Brooklyn", state: "NY" },
  { name: "L'industrie Pizzeria", city: "Brooklyn", state: "NY" },
  
  // Boston area
  { name: "Regina Pizzeria", city: "Boston", state: "MA" },
  { name: "Santarpio's Pizza", city: "Boston", state: "MA" },
  { name: "Posto", city: "Cambridge", state: "MA" },
  
  // Austin food scene
  { name: "Via 313", city: "Austin", state: "TX" },
  { name: "East Side Pies", city: "Austin", state: "TX" },
  { name: "Little Deli & Pizzeria", city: "Austin", state: "TX" },
  
  // Philadelphia
  { name: "Villa di Roma", city: "Philadelphia", state: "PA" },
  { name: "Tacconelli's Pizzeria", city: "Philadelphia", state: "PA" },
  { name: "Santucci's Square Pizza", city: "Philadelphia", state: "PA" },
  
  // Chicago deep dish culture
  { name: "Lou Malnati's", city: "Chicago", state: "IL" },
  { name: "Pequod's Pizza", city: "Chicago", state: "IL" },
  { name: "Art of Pizza", city: "Chicago", state: "IL" },
  
  // Denver/Boulder area
  { name: "Beau Jo's Pizza", city: "Boulder", state: "CO" },
  { name: "Proto's Pizza", city: "Denver", state: "CO" },
  { name: "Fat Sully's Pizza", city: "Denver", state: "CO" },
  
  // Asheville mountain culture
  { name: "Asheville Pizza & Brewing", city: "Asheville", state: "NC" },
  { name: "Pack's Tavern", city: "Asheville", state: "NC" },
  
  // Vermont artisan establishments
  { name: "American Flatbread", city: "Burlington", state: "VT" },
  { name: "Folino's Wood Fired Pizza", city: "Burlington", state: "VT" }
];

export async function runComprehensiveVerificationAudit() {
  console.log('🔍 COMPREHENSIVE VERIFICATION AUDIT');
  console.log('=' .repeat(50));
  console.log('Enhanced verification: Website + Google Business profile');
  console.log(`Auditing ${AUDIT_TARGETS.length} high-probability restaurants`);
  console.log(`Keywords: [${SOURDOUGH_KEYWORDS.join(', ')}]`);
  
  const auditor = new ComprehensiveVerificationAudit();
  
  for (const target of AUDIT_TARGETS) {
    const result = await auditor.auditRestaurant(target);
    
    // Respectful pause between audits
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  const stats = auditor.getStats();
  
  console.log(`\n🎉 COMPREHENSIVE AUDIT COMPLETE:`);
  console.log(`   Restaurants audited: ${stats.processed}`);
  console.log(`   Sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   Total database size: ${totalRestaurants.length}`);
  console.log(`   Progress: ${((totalRestaurants.length / 1000) * 100).toFixed(1)}% toward 1,000 goal`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runComprehensiveVerificationAudit().catch(console.error);
}