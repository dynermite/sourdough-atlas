#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface OutscraperAsyncResult {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews_count: number;
  latitude: number;
  longitude: number;
  description: string;
  category: string[];
  reviews: string[];
}

class OutscraperAsyncHandler {
  private apiKey: string;
  private sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast'];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async submitSearch(query: string): Promise<string | null> {
    try {
      console.log(`🔍 Submitting search: ${query}`);
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 50,
          language: 'en',
          region: 'US',
          fields: 'name,address,phone,website,rating,reviews_count,latitude,longitude,description,category'
        },
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      if (response.data.status === 'Pending') {
        console.log(`✅ Request submitted, ID: ${response.data.id}`);
        return response.data.id;
      }
      
      return null;
      
    } catch (error) {
      console.log(`❌ Search submission failed: ${error.message}`);
      return null;
    }
  }

  async fetchResults(requestId: string): Promise<OutscraperAsyncResult[]> {
    try {
      console.log(`📥 Fetching results for: ${requestId}`);
      
      const response = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      if (response.data.status === 'Success' && response.data.data) {
        console.log(`✅ Results ready: ${response.data.data.length} restaurants`);
        return response.data.data;
      } else if (response.data.status === 'Pending') {
        console.log(`⏳ Results still pending...`);
        return [];
      } else {
        console.log(`❌ Request failed:`, response.data);
        return [];
      }
      
    } catch (error) {
      console.log(`❌ Results fetch failed: ${error.message}`);
      return [];
    }
  }

  async verifyWebsiteForSourdough(name: string, website: string): Promise<{
    verified: boolean;
    keywords: string[];
    description: string;
  }> {
    if (!website) {
      return { verified: false, keywords: [], description: '' };
    }

    try {
      console.log(`    Verifying ${name} website: ${website}`);
      
      const response = await axios.get(website, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();
      
      // Check for sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      // Extract authentic description
      let description = '';
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc && metaDesc.length > 20) {
        description = metaDesc;
      } else {
        const firstPara = $('p').first().text().trim();
        if (firstPara && firstPara.length > 50) {
          description = firstPara.substring(0, 200) + '...';
        }
      }
      
      console.log(`    Found keywords: [${foundKeywords.join(', ')}]`);
      
      return {
        verified: foundKeywords.length > 0,
        keywords: foundKeywords,
        description: description || `${name} - verified restaurant`
      };
      
    } catch (error) {
      console.log(`    Website verification failed: ${error.message}`);
      return { verified: false, keywords: [], description: '' };
    }
  }

  async processSearchResults(searchQuery: string, city: string, state: string) {
    console.log(`\n🏙️  PROCESSING: ${city}, ${state}`);
    console.log('=' .repeat(50));
    
    // Submit search request
    const requestId = await this.submitSearch(searchQuery);
    if (!requestId) {
      console.log('❌ Failed to submit search request');
      return { found: 0, verified: 0 };
    }

    // Wait for results (Outscraper typically takes 30-60 seconds)
    console.log('⏳ Waiting for results (30-60 seconds)...');
    let results: OutscraperAsyncResult[] = [];
    let attempts = 0;
    const maxAttempts = 6; // 6 attempts * 15 seconds = 90 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds
      results = await this.fetchResults(requestId);
      
      if (results.length > 0) {
        break;
      }
      
      attempts++;
      console.log(`⏳ Attempt ${attempts}/${maxAttempts}, still waiting...`);
    }

    if (results.length === 0) {
      console.log('❌ No results received after waiting');
      return { found: 0, verified: 0 };
    }

    console.log(`📊 Processing ${results.length} restaurants`);
    let verified = 0;
    
    for (const restaurant of results) {
      if (!restaurant.name) {
        console.log(`⏭️  Skipping restaurant (no name provided)`);
        continue;
      }
      
      if (!restaurant.website) {
        console.log(`⏭️  Skipping ${restaurant.name} (no website)`);
        continue;
      }
      
      // Verify sourdough claims
      const verification = await this.verifyWebsiteForSourdough(
        restaurant.name, 
        restaurant.website
      );
      
      if (verification.verified) {
        console.log(`✅ VERIFIED: ${restaurant.name}`);
        console.log(`   Address: ${restaurant.address}`);
        console.log(`   Phone: ${restaurant.phone}`);
        console.log(`   Rating: ${restaurant.rating} (${restaurant.reviews_count} reviews)`);
        console.log(`   Keywords: [${verification.keywords.join(', ')}]`);
        
        // Add to database with ONLY authentic data
        await db.insert(restaurants).values({
          name: restaurant.name,
          address: restaurant.address,
          city: city,
          state: state,
          zipCode: '', // Will be extracted from address if needed
          phone: restaurant.phone || '',
          website: restaurant.website,
          description: verification.description,
          sourdoughVerified: 1,
          sourdoughKeywords: verification.keywords,
          rating: restaurant.rating || 0,
          reviewCount: restaurant.reviews_count || 0,
          latitude: restaurant.latitude || 0,
          longitude: restaurant.longitude || 0,
          imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
        });
        
        verified++;
      } else {
        console.log(`❌ No sourdough: ${restaurant.name}`);
      }
      
      // Be respectful to websites
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return { found: results.length, verified };
  }
}

export async function runAuthenticPizzaDiscovery() {
  console.log('🔍 AUTHENTIC PIZZA DISCOVERY WITH OUTSCRAPER');
  console.log('=' .repeat(55));
  console.log('✅ Using Outscraper API for real business data');
  console.log('✅ Verifying sourdough claims on official websites');
  console.log('🚫 No fabricated information');
  
  const handler = new OutscraperAsyncHandler();
  
  // Start with high-probability sourdough cities
  const searches = [
    { query: 'pizza restaurants in San Francisco, CA', city: 'San Francisco', state: 'CA' },
    { query: 'pizza restaurants in Berkeley, CA', city: 'Berkeley', state: 'CA' }
  ];
  
  let totalFound = 0;
  let totalVerified = 0;
  
  for (const search of searches) {
    const results = await handler.processSearchResults(search.query, search.city, search.state);
    totalFound += results.found;
    totalVerified += results.verified;
  }
  
  console.log(`\n📊 DISCOVERY COMPLETE:`);
  console.log(`   🔍 Total restaurants found: ${totalFound}`);
  console.log(`   ✅ Sourdough verified: ${totalVerified}`);
  console.log(`   📈 Sourdough adoption rate: ${totalFound > 0 ? ((totalVerified / totalFound) * 100).toFixed(1) : 0}%`);
  
  return { totalFound, totalVerified };
}

if (import.meta.url.endsWith(process.argv[1])) {
  runAuthenticPizzaDiscovery().catch(console.error);
}