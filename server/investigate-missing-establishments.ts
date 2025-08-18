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

class MissingEstablishmentInvestigation {
  private verified = 0;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async investigateLongBridgePizza() {
    console.log('🔍 INVESTIGATING MISSING ESTABLISHMENTS');
    console.log('=' .repeat(55));
    console.log('Focus: Long Bridge Pizza Company');
    
    // Check if Long Bridge Pizza is already in database
    const existing = await db.select().from(restaurants).where(eq(restaurants.name, 'Long Bridge Pizza Company'));
    if (existing.length > 0) {
      console.log('✅ Long Bridge Pizza already in database');
      return;
    }

    // Direct verification of Long Bridge Pizza
    console.log('\n🎯 DIRECT VERIFICATION: Long Bridge Pizza Company');
    
    const longBridgeData = {
      name: "Long Bridge Pizza Company",
      address: "2347 3rd St, San Francisco, CA 94107",
      website: "https://www.longbridgepizza.com",
      phone: "(415) 829-8999",
      latitude: 37.7584,
      longitude: -122.3874
    };

    await this.verifyEstablishmentDirect(longBridgeData);

    // Let's also search for it via API to see if it appears in results
    console.log('\n🔍 SEARCHING VIA API: Long Bridge Pizza');
    await this.searchForEstablishment("Long Bridge Pizza Company San Francisco CA");

    return this.verified;
  }

  async verifyEstablishmentDirect(data: any) {
    console.log(`\n📝 VERIFYING: ${data.name}`);
    console.log(`   Address: ${data.address}`);
    console.log(`   Website: ${data.website}`);

    let websiteKeywords: string[] = [];
    let businessKeywords: string[] = [];

    // Check website content
    if (data.website) {
      console.log(`\n🌐 ANALYZING WEBSITE: ${data.website}`);
      try {
        const response = await axios.get(data.website, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        console.log(`   Status: ${response.status}`);
        console.log(`   Content length: ${response.data.length} characters`);

        const $ = cheerio.load(response.data);
        const content = $('body').text().toLowerCase();
        
        console.log(`   First 200 chars: "${content.substring(0, 200)}..."`);

        websiteKeywords = this.findSourdoughPatterns(content);

        if (websiteKeywords.length > 0) {
          console.log(`   🎯 WEBSITE KEYWORDS FOUND: [${websiteKeywords.join(', ')}]`);
        } else {
          console.log(`   ❌ No sourdough keywords found on website`);
          
          // Let's check specific sections
          const menuText = $('menu, .menu, #menu').text().toLowerCase();
          const aboutText = $('about, .about, #about').text().toLowerCase();
          const headerText = $('header, .header, h1, h2, h3').text().toLowerCase();
          
          console.log(`   Menu section: "${menuText.substring(0, 100)}..."`);
          console.log(`   About section: "${aboutText.substring(0, 100)}..."`);
          console.log(`   Headers: "${headerText.substring(0, 100)}..."`);
          
          const menuKeywords = this.findSourdoughPatterns(menuText);
          const aboutKeywords = this.findSourdoughPatterns(aboutText);
          const headerKeywords = this.findSourdoughPatterns(headerText);
          
          if (menuKeywords.length > 0) console.log(`   🎯 Menu keywords: [${menuKeywords.join(', ')}]`);
          if (aboutKeywords.length > 0) console.log(`   🎯 About keywords: [${aboutKeywords.join(', ')}]`);
          if (headerKeywords.length > 0) console.log(`   🎯 Header keywords: [${headerKeywords.join(', ')}]`);
          
          websiteKeywords = [...menuKeywords, ...aboutKeywords, ...headerKeywords];
        }

      } catch (error) {
        console.log(`   ❌ Website error: ${error.message}`);
      }
    }

    // Get business profile data
    console.log(`\n📍 CHECKING GOOGLE BUSINESS PROFILE...`);
    const businessData = await this.getBusinessProfile(data.name);
    
    if (businessData.description) {
      console.log(`   Business description: "${businessData.description}"`);
      businessKeywords = this.findSourdoughPatterns(businessData.description.toLowerCase());
      
      if (businessKeywords.length > 0) {
        console.log(`   🎯 BUSINESS KEYWORDS: [${businessKeywords.join(', ')}]`);
      }
    }

    // Combine results
    const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords])];

    if (allKeywords.length === 0) {
      console.log(`\n❌ NO SOURDOUGH VERIFICATION FOUND`);
      console.log(`   Checked website: ${data.website}`);
      console.log(`   Checked business profile: ${businessData.description || 'No description'}`);
      return;
    }

    console.log(`\n✅ SOURDOUGH VERIFIED: [${allKeywords.join(', ')}]`);
    console.log(`   Source: ${websiteKeywords.length > 0 ? 'website' : 'business_only'}`);

    // Add to database
    const description = businessData.description || `${data.name} - verified sourdough pizza establishment in San Francisco`;

    await db.insert(restaurants).values({
      name: data.name,
      address: data.address,
      city: "San Francisco",
      state: "CA",
      zipCode: businessData.zipCode || data.zipCode || '',
      phone: data.phone || businessData.phone || '',
      website: data.website || '',
      description: description.length > 240 ? description.substring(0, 240) + '...' : description,
      sourdoughVerified: 1,
      sourdoughKeywords: allKeywords,
      rating: businessData.rating || 0,
      reviewCount: businessData.reviewCount || 0,
      latitude: data.latitude || businessData.latitude || 0,
      longitude: data.longitude || businessData.longitude || 0,
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
    });

    this.verified++;
    console.log(`\n💾 ADDED TO DATABASE - Total SF verified: ${this.verified + 6}`);
  }

  async searchForEstablishment(query: string) {
    if (!this.apiKey) {
      console.log('   No API key - skipping search');
      return;
    }

    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
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
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          
          console.log(`   API found ${results.length} results for "${query}"`);
          
          results.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.name || 'No name'}`);
            console.log(`      Address: ${result.full_address || result.street || 'No address'}`);
            console.log(`      Description: ${result.description?.substring(0, 100) || 'No description'}...`);
          });
          
          // Check if Long Bridge Pizza is in the results
          const longBridgeResult = results.find(r => 
            r.name && r.name.toLowerCase().includes('long bridge')
          );
          
          if (longBridgeResult) {
            console.log(`\n✅ FOUND LONG BRIDGE IN API RESULTS!`);
            console.log(`   Name: ${longBridgeResult.name}`);
            console.log(`   Address: ${longBridgeResult.full_address}`);
            console.log(`   Description: ${longBridgeResult.description}`);
          } else {
            console.log(`\n❌ Long Bridge Pizza NOT found in API results`);
            console.log(`   This explains why it was missed in the original discovery`);
          }
        }
      }
    } catch (error) {
      console.log(`   API search error: ${error.message}`);
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
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          
          if (results.length > 0) {
            const business = results[0];
            return {
              address: business.full_address || business.address || '',
              phone: business.phone || '',
              rating: business.rating || 0,
              reviewCount: business.reviews || business.reviews_count || 0,
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

export async function investigateMissingEstablishments() {
  const investigation = new MissingEstablishmentInvestigation();
  
  const newVerified = await investigation.investigateLongBridgePizza();
  
  console.log(`\n🎉 INVESTIGATION COMPLETE`);
  console.log(`   New establishments verified: ${newVerified}`);
  
  // Show final SF count
  const sfRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, 'San Francisco'));
  console.log(`\n🌉 TOTAL SAN FRANCISCO SOURDOUGH ESTABLISHMENTS: ${sfRestaurants.length}`);
  
  if (newVerified > 0) {
    console.log(`\n📋 NEWLY ADDED:`);
    const newOnes = sfRestaurants.slice(-newVerified);
    newOnes.forEach((restaurant, index) => {
      console.log(`\n${index + 1}. ${restaurant.name}`);
      console.log(`   📍 ${restaurant.address}`);
      console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
      console.log(`   🌐 ${restaurant.website || 'No website'}`);
    });
  }
  
  return newVerified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  investigateMissingEstablishments().catch(console.error);
}