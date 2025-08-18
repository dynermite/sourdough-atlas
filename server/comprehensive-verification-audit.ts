#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

// Enhanced sourdough keyword patterns to catch variations
const SOURDOUGH_PATTERNS = [
  // Original keywords
  'sourdough',
  'naturally leavened', 
  'wild yeast',
  'naturally fermented',
  
  // Hyphenated variations
  'sourdough-crust',
  'sourdough-pizza',
  'sourdough-dough',
  'sourdough-bread',
  'naturally-leavened',
  'wild-yeast',
  'naturally-fermented',
  
  // Common compound variations
  'sourdoughcrust',
  'sourdoughpizza',
  'sourdoughdough',
];

class ComprehensiveVerificationAudit {
  private verified = 0;
  private failed = 0;
  private processed = 0;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async auditGoatHillPizza() {
    console.log('🔍 COMPREHENSIVE SOURDOUGH VERIFICATION AUDIT');
    console.log('=' .repeat(60));
    console.log('Enhanced keyword matching including hyphenated variations');
    console.log(`Patterns: [${SOURDOUGH_PATTERNS.slice(0, 8).join(', ')}...]`);
    
    // First, let's specifically check Goat Hill Pizza
    console.log('\n🎯 SPECIFIC AUDIT: Goat Hill Pizza');
    const goatHillData = {
      name: "Goat Hill Pizza",
      address: "170 W Portal Ave, San Francisco, CA 94127",
      description: "Local mini-chain of pizzerias specializing in sourdough-crust slices & pies since 1975, plus soups.",
      website: "https://www.goathillpizza.com",
      latitude: 37.7406,
      longitude: -122.4652,
      phone: "+1 415-242-4628"
    };
    
    await this.verifyEstablishment(goatHillData);
    
    // Now let's re-audit some key SF establishments that might have been missed
    console.log('\n🔍 RE-AUDITING KEY SF ESTABLISHMENTS WITH ENHANCED MATCHING');
    
    const keyEstablishments = [
      "Tony's Pizza Napoletana",
      "Golden Boy Pizza", 
      "Flour + Water Pizzeria",
      "Il Casaro Pizzeria",
      "Pizzetta 211"
    ];
    
    for (const establishmentName of keyEstablishments) {
      await this.reAuditByName(establishmentName);
    }
    
    return this.getStats();
  }

  async verifyEstablishment(data: any) {
    this.processed++;
    console.log(`\n[${this.processed}] VERIFYING: ${data.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, data.name));
      if (existing.length > 0) {
        console.log(`   Already in database`);
        return;
      }

      let websiteKeywords: string[] = [];
      let businessKeywords: string[] = [];
      
      // 1. Check website with enhanced pattern matching
      if (data.website) {
        console.log(`   Checking website: ${data.website}`);
        try {
          const response = await axios.get(data.website, {
            timeout: 12000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const $ = cheerio.load(response.data);
          const content = $('body').text().toLowerCase();
          
          websiteKeywords = this.findSourdoughPatterns(content);
          
          if (websiteKeywords.length > 0) {
            console.log(`   🎯 Website patterns found: [${websiteKeywords.join(', ')}]`);
          }
        } catch (error) {
          console.log(`   Website error: ${error.message}`);
        }
      }
      
      // 2. Check business description with enhanced matching
      if (data.description) {
        console.log(`   Checking business description...`);
        console.log(`   Description: "${data.description}"`);
        
        businessKeywords = this.findSourdoughPatterns(data.description.toLowerCase());
        
        if (businessKeywords.length > 0) {
          console.log(`   🎯 Business patterns found: [${businessKeywords.join(', ')}]`);
        }
      }
      
      // 3. Combine results
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`   ❌ No sourdough patterns found`);
        this.failed++;
        return;
      }
      
      console.log(`   ✅ SOURDOUGH VERIFIED: [${allKeywords.join(', ')}]`);
      console.log(`   Source: ${websiteKeywords.length > 0 ? 'website+business' : 'business_only'}`);
      
      // Add to database
      let description = data.description || `${data.name} - verified sourdough pizza establishment in San Francisco`;
      if (description.length > 240) {
        description = description.substring(0, 240) + '...';
      }
      
      await db.insert(restaurants).values({
        name: data.name,
        address: data.address || '',
        city: "San Francisco",
        state: "CA",
        zipCode: data.zipCode || '',
        phone: data.phone || '',
        website: data.website || '',
        description,
        sourdoughVerified: 1,
        sourdoughKeywords: allKeywords,
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`   💾 ADDED TO DATABASE - Total SF verified: ${this.verified}`);
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      this.failed++;
    }
  }

  async reAuditByName(name: string) {
    console.log(`\n🔍 Re-auditing: ${name}`);
    
    if (!this.apiKey) {
      console.log('   No API key - skipping');
      return;
    }

    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: `${name} San Francisco CA`,
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
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          
          if (results.length > 0) {
            const business = results[0];
            await this.verifyEstablishment({
              name: business.name,
              address: business.full_address || business.street,
              description: business.description,
              website: business.site || business.website,
              latitude: business.latitude,
              longitude: business.longitude,
              phone: business.phone,
              rating: business.rating,
              reviewCount: business.reviews
            });
          }
        }
      }
    } catch (error) {
      console.log(`   Error re-auditing ${name}: ${error.message}`);
    }
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

  getStats() {
    return {
      processed: this.processed,
      verified: this.verified,
      failed: this.failed,
      successRate: this.processed > 0 ? ((this.verified / this.processed) * 100).toFixed(1) : '0'
    };
  }
}

export async function runComprehensiveVerificationAudit() {
  const audit = new ComprehensiveVerificationAudit();
  
  const stats = await audit.auditGoatHillPizza();
  
  console.log(`\n🎉 COMPREHENSIVE VERIFICATION AUDIT COMPLETE:`);
  console.log(`   Establishments processed: ${stats.processed}`);
  console.log(`   New sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  // Show updated SF results
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  console.log(`\n🌉 UPDATED SAN FRANCISCO SOURDOUGH ESTABLISHMENTS: ${sfRestaurants.length}`);
  
  sfRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address || 'Address TBD'}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   ⭐ ${restaurant.rating || 'No rating'} (${restaurant.reviewCount || 0} reviews)`);
  });
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runComprehensiveVerificationAudit().catch(console.error);
}