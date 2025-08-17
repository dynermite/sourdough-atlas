#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Known San Francisco pizza establishments for manual verification
const SF_PIZZA_CANDIDATES = [
  { name: "Tony's Little Star Pizza", website: "https://tonylittlestar.com" },
  { name: "Arizmendi Bakery", website: "https://arizmendibakery.com" }, // Already verified
  { name: "Zante Indian Pizzeria", website: "https://zantepizza.com" },
  { name: "Escape from New York Pizza", website: "https://efnypizza.com" },
  { name: "Golden Boy Pizza", website: "https://goldenboyitsf.com" },
  { name: "North Beach Pizza", website: "https://northbeachpizza.com" },
  { name: "Pizzetta 211", website: "https://pizzetta211.com" },
  { name: "Del Popolo", website: "https://delpopolosf.com" },
  { name: "Una Pizza Napoletana", website: "https://unapizza.com" },
  { name: "Flour + Water Pizzeria", website: "https://flourandwaterpizzeria.com" },
  { name: "The Pizza Place on Noriega", website: "https://pizzaplacenoriega.com" },
  { name: "Arinell Pizza", website: null },
  { name: "Patxi's Pizza", website: "https://patxispizza.com" },
  { name: "Cheese Board Pizza", website: "https://cheeseboardcollective.coop" },
  { name: "Village Pizzeria", website: null },
  { name: "Nizario's Pizza", website: null },
  { name: "Delfina Pizzeria", website: "https://delfinapizzeria.com" },
  { name: "Gialina Pizzeria", website: "https://gialina.com" },
  { name: "Pauline's Pizza", website: "https://paulinespizza.com" },
  { name: "Blue Barn Gourmet", website: "https://bluebarngourmet.com" }
];

class SFManualAudit {
  private verified = 0;
  private failed = 0;
  private processed = 0;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async auditCandidate(candidate: { name: string; website: string | null }) {
    this.processed++;
    console.log(`\n[${this.processed}/${SF_PIZZA_CANDIDATES.length}] AUDITING: ${candidate.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, candidate.name));
      if (existing.length > 0) {
        console.log(`   ✅ Already verified in database`);
        return { name: candidate.name, status: 'already_verified', keywords: existing[0].sourdoughKeywords };
      }
      
      let websiteKeywords: string[] = [];
      let businessKeywords: string[] = [];
      
      // 1. Check website if available
      if (candidate.website) {
        console.log(`   🌐 Checking website: ${candidate.website}`);
        try {
          const response = await axios.get(candidate.website, {
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
            console.log(`   🎯 Website keywords found: [${websiteKeywords.join(', ')}]`);
          } else {
            console.log(`   ❌ No sourdough keywords on website`);
          }
        } catch (error) {
          console.log(`   ⚠️ Website error: ${error.message}`);
        }
      }
      
      // 2. Check Google Business profile
      console.log(`   📍 Checking Google Business profile...`);
      const businessData = await this.getBusinessProfile(candidate.name);
      
      if (businessData.description) {
        const businessContent = businessData.description.toLowerCase();
        businessKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
          businessContent.includes(keyword.toLowerCase())
        );
        
        if (businessKeywords.length > 0) {
          console.log(`   🎯 Business profile keywords: [${businessKeywords.join(', ')}]`);
        } else {
          console.log(`   ❌ No sourdough keywords in business profile`);
        }
      } else {
        console.log(`   ⚠️ No business description found`);
      }
      
      // 3. Combine results
      const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];
      
      if (allKeywords.length === 0) {
        console.log(`   ❌ NO SOURDOUGH VERIFICATION`);
        this.failed++;
        return { name: candidate.name, status: 'no_sourdough', keywords: [] };
      }
      
      console.log(`   ✅ SOURDOUGH VERIFIED: [${allKeywords.join(', ')}]`);
      console.log(`   📋 Source: ${websiteKeywords.length > 0 ? 'website+business' : 'business_only'}`);
      
      // Extract description
      let description = businessData.description || `${candidate.name} - verified sourdough pizza establishment in San Francisco`;
      if (description.length > 240) {
        description = description.substring(0, 240) + '...';
      }
      
      // Add to database
      await db.insert(restaurants).values({
        name: candidate.name,
        address: businessData.address || '',
        city: "San Francisco",
        state: "CA",
        zipCode: businessData.zipCode || '',
        phone: businessData.phone || '',
        website: candidate.website || '',
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
      console.log(`   💾 ADDED TO DATABASE - Total SF verified: ${this.verified}`);
      
      if (businessData.address) {
        console.log(`   📍 Address: ${businessData.address}`);
      }
      
      return { name: candidate.name, status: 'newly_verified', keywords: allKeywords };
      
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
      this.failed++;
      return { name: candidate.name, status: 'error', keywords: [] };
    }
  }

  async getBusinessProfile(name: string) {
    if (!this.apiKey) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0, description: '', zipCode: '' };
    }
    
    try {
      const query = `${name} San Francisco CA`;
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
              zipCode: business.postal_code || ''
            };
          }
        }
      }
      
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0, description: '', zipCode: '' };
    } catch (error) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0, description: '', zipCode: '' };
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

export async function runSFManualAudit() {
  console.log('🔍 SAN FRANCISCO MANUAL SOURDOUGH AUDIT');
  console.log('=' .repeat(60));
  console.log('Systematic verification of known SF pizza establishments');
  console.log('Enhanced dual verification: Website + Google Business');
  console.log(`Auditing ${SF_PIZZA_CANDIDATES.length} establishments`);
  
  const auditor = new SFManualAudit();
  const results: any[] = [];
  
  for (const candidate of SF_PIZZA_CANDIDATES) {
    const result = await auditor.auditCandidate(candidate);
    results.push(result);
    
    // Respectful pause between audits
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  const stats = auditor.getStats();
  
  console.log(`\n🎯 SAN FRANCISCO AUDIT COMPLETE:`);
  console.log(`   Establishments audited: ${stats.processed}`);
  console.log(`   New sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  // Show results summary
  console.log(`\n📊 AUDIT RESULTS SUMMARY:`);
  const verified = results.filter(r => r.status === 'newly_verified' || r.status === 'already_verified');
  const failed = results.filter(r => r.status === 'no_sourdough');
  
  console.log(`\n✅ VERIFIED SOURDOUGH ESTABLISHMENTS (${verified.length}):`);
  verified.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.name} - [${result.keywords?.join(', ') || 'sourdough'}] ${result.status === 'already_verified' ? '(existing)' : '(new)'}`);
  });
  
  console.log(`\n❌ NO SOURDOUGH FOUND (${failed.length}):`);
  failed.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.name}`);
  });
  
  // Final San Francisco summary
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  console.log(`\n🌉 FINAL SAN FRANCISCO SOURDOUGH COUNT: ${sfRestaurants.length} verified establishments`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runSFManualAudit().catch(console.error);
}