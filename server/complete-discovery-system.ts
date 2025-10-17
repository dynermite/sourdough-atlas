#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface RestaurantData {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
  category?: string[];
}

interface VerificationResult {
  verified: boolean;
  keywords: string[];
  sources: string[];
  confidence: number;
  description: string;
}

interface SocialProfile {
  platform: string;
  username: string;
  url: string;
  bio: string;
  hasKeywords: boolean;
  foundKeywords: string[];
}

export class CompleteSourdoughDiscoverySystem {
  private apiKey: string;
  private sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
    if (!this.apiKey) {
      console.log('⚠️  OUTSCRAPER_API_KEY not found in environment');
      console.log('📋 To run discovery:');
      console.log('   1. Visit https://outscraper.com/');
      console.log('   2. Sign up for free account');
      console.log('   3. Add OUTSCRAPER_API_KEY to environment');
    }
  }

  /**
   * STEP 1: Create master list by searching city for both "sourdough pizza" and "artisan pizza"
   */
  async createMasterList(city: string, state: string): Promise<RestaurantData[]> {
    console.log(`\n🔍 STEP 1: Creating master list for ${city}, ${state}`);
    console.log('=' .repeat(60));
    
    if (!this.apiKey) {
      console.log('❌ API key required for Step 1');
      return [];
    }

    const searches = [
      `sourdough pizza ${city} ${state}`,
      `artisan pizza ${city} ${state}`
    ];

    const allRestaurants = new Map<string, RestaurantData>();

    for (const query of searches) {
      console.log(`🔎 Searching: ${query}`);
      
      try {
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query,
            limit: 30,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (response.data.status === 'Pending') {
          console.log(`⏳ Request pending: ${response.data.id}`);
          
          // Wait for results
          let attempts = 0;
          while (attempts < 4) {
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            try {
              const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
                headers: {
                  'X-API-KEY': this.apiKey
                }
              });

              if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
                console.log(`✅ Found ${resultResponse.data.data.length} restaurants for "${query}"`);
                
                resultResponse.data.data.forEach((restaurant: any) => {
                  if (restaurant.name && restaurant.address) {
                    const key = `${restaurant.name}-${restaurant.address}`;
                    if (!allRestaurants.has(key)) {
                      allRestaurants.set(key, {
                        name: restaurant.name,
                        address: restaurant.address,
                        phone: restaurant.phone,
                        website: restaurant.website,
                        rating: restaurant.rating,
                        reviews_count: restaurant.reviews_count,
                        latitude: restaurant.latitude,
                        longitude: restaurant.longitude,
                        description: restaurant.description,
                        category: restaurant.category
                      });
                    }
                  }
                });
                break;
              } else if (resultResponse.data.status === 'Pending') {
                console.log(`⏳ Still pending, attempt ${attempts + 1}/4`);
                attempts++;
              } else {
                console.log(`❌ Request failed: ${resultResponse.data.status}`);
                break;
              }
            } catch (error) {
              console.log(`❌ Error fetching results: ${error.message}`);
              break;
            }
          }
        }
      } catch (error) {
        console.log(`❌ Search failed for "${query}": ${error.message}`);
      }

      // Brief pause between searches
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const masterList = Array.from(allRestaurants.values());
    console.log(`📊 Master list complete: ${masterList.length} unique restaurants found`);
    
    return masterList;
  }

  /**
   * STEP 2: Use Outscraper API to search Google Business Profile for keywords
   */
  async searchGoogleBusinessProfile(restaurant: RestaurantData): Promise<VerificationResult> {
    console.log(`    📋 Checking Google Business Profile: ${restaurant.name}`);
    
    const foundKeywords: string[] = [];
    let confidence = 0;

    if (restaurant.description) {
      const description = restaurant.description.toLowerCase();
      
      for (const keyword of this.sourdoughKeywords) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        if (regex.test(description)) {
          foundKeywords.push(keyword);
          confidence += keyword === 'sourdough' ? 4 : keyword === 'naturally leavened' ? 4 : 2;
        }
      }
    }

    const verified = foundKeywords.length > 0 && confidence >= 2;
    
    if (verified) {
      console.log(`       ✅ Google Business keywords: ${foundKeywords.join(', ')}`);
    }

    return {
      verified,
      keywords: foundKeywords,
      sources: verified ? ['Google Business Profile'] : [],
      confidence: Math.min(confidence / 6, 1.0),
      description: verified ? `Keywords found in Google Business Profile: ${foundKeywords.join(', ')}` : ''
    };
  }

  /**
   * STEP 3: Scrape restaurant website for keywords
   */
  async scrapeWebsiteForKeywords(restaurant: RestaurantData): Promise<VerificationResult> {
    if (!restaurant.website) {
      return {
        verified: false,
        keywords: [],
        sources: [],
        confidence: 0,
        description: ''
      };
    }

    console.log(`    🌐 Scraping website: ${restaurant.website}`);
    
    try {
      const response = await axios.get(restaurant.website, {
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract comprehensive text content
      const title = $('title').text().toLowerCase();
      const metaDesc = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      const bodyText = $('body').text().toLowerCase();
      const menuText = $('.menu, #menu, [class*="menu"], [id*="menu"]').text().toLowerCase();
      
      const allText = `${title} ${metaDesc} ${bodyText} ${menuText}`;
      
      const foundKeywords: string[] = [];
      let score = 0;

      // Check for sourdough keywords
      for (const keyword of this.sourdoughKeywords) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = allText.match(regex);
        
        if (matches) {
          foundKeywords.push(keyword);
          score += matches.length * (keyword === 'sourdough' ? 4 : keyword === 'naturally leavened' ? 4 : 2);
        }
      }

      const confidence = Math.min(score / 6, 1.0);
      const verified = foundKeywords.length > 0 && confidence > 0.3;

      if (verified) {
        console.log(`       ✅ Website keywords: ${foundKeywords.join(', ')}`);
      }

      return {
        verified,
        keywords: foundKeywords,
        sources: verified ? ['Restaurant Website'] : [],
        confidence,
        description: verified ? 
          `Keywords found on restaurant website: ${foundKeywords.join(', ')}` : ''
      };

    } catch (error) {
      console.log(`       ❌ Website scraping failed: ${error.message}`);
      return {
        verified: false,
        keywords: [],
        sources: [],
        confidence: 0,
        description: ''
      };
    }
  }

  /**
   * STEP 4: Visit Instagram, Facebook, and Yelp for keywords in bios
   */
  async scrapeSocialMediaProfiles(restaurant: RestaurantData): Promise<VerificationResult> {
    console.log(`    📱 Checking social media profiles: ${restaurant.name}`);
    
    const allKeywords: string[] = [];
    const sources: string[] = [];
    let maxConfidence = 0;

    // Generate potential usernames
    const potentialUsernames = this.generateSocialUsernames(restaurant.name);
    
    // Check Instagram
    for (const username of potentialUsernames.slice(0, 3)) { // Limit to prevent rate limiting
      try {
        const instagramResult = await this.checkInstagramProfile(username);
        if (instagramResult.verified) {
          allKeywords.push(...instagramResult.keywords);
          sources.push('Instagram');
          maxConfidence = Math.max(maxConfidence, instagramResult.confidence);
          console.log(`       ✅ Instagram @${username}: ${instagramResult.keywords.join(', ')}`);
          break; // Found one, stop searching
        }
      } catch (error) {
        // Continue to next username
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }

    // Check Facebook
    for (const username of potentialUsernames.slice(0, 3)) {
      try {
        const facebookResult = await this.checkFacebookProfile(username);
        if (facebookResult.verified) {
          allKeywords.push(...facebookResult.keywords);
          sources.push('Facebook');
          maxConfidence = Math.max(maxConfidence, facebookResult.confidence);
          console.log(`       ✅ Facebook ${username}: ${facebookResult.keywords.join(', ')}`);
          break;
        }
      } catch (error) {
        // Continue to next username
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }

    const uniqueKeywords = [...new Set(allKeywords)];
    const verified = uniqueKeywords.length > 0;

    return {
      verified,
      keywords: uniqueKeywords,
      sources,
      confidence: maxConfidence,
      description: verified ? 
        `Keywords found on social media (${sources.join(', ')}): ${uniqueKeywords.join(', ')}` : ''
    };
  }

  /**
   * STEP 5: Compile results and add to database
   */
  async compileAndSaveResults(
    restaurant: RestaurantData,
    businessResult: VerificationResult,
    websiteResult: VerificationResult,
    socialResult: VerificationResult,
    city: string,
    state: string
  ): Promise<boolean> {
    
    // Combine all results
    const allKeywords = [...new Set([
      ...businessResult.keywords,
      ...websiteResult.keywords,
      ...socialResult.keywords
    ])];

    const allSources = [...new Set([
      ...businessResult.sources,
      ...websiteResult.sources,
      ...socialResult.sources
    ])];

    const maxConfidence = Math.max(
      businessResult.confidence,
      websiteResult.confidence,
      socialResult.confidence
    );

    const isVerified = allKeywords.length > 0;
    
    let combinedDescription = '';
    if (isVerified) {
      combinedDescription = `Sourdough verified through: ${allSources.join(', ')}. Keywords found: ${allKeywords.join(', ')}`;
    } else {
      combinedDescription = restaurant.description || `${restaurant.name} - Pizza restaurant in ${city}, ${state}`;
    }

    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`        🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      // Add to database
      await db.insert(restaurants).values({
        name: restaurant.name,
        address: restaurant.address,
        city,
        state,
        zipCode: restaurant.address.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: combinedDescription,
        sourdoughVerified: isVerified ? 1 : 0,
        sourdoughKeywords: allKeywords,
        rating: restaurant.rating || 0,
        reviewCount: restaurant.reviews_count || 0,
        latitude: restaurant.latitude || 0,
        longitude: restaurant.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });

      if (isVerified) {
        console.log(`        ✅ SOURDOUGH VERIFIED: ${restaurant.name}`);
        console.log(`           Sources: ${allSources.join(', ')}`);
        console.log(`           Keywords: ${allKeywords.join(', ')}`);
      } else {
        console.log(`        ➕ Added to directory: ${restaurant.name} (no sourdough found)`);
      }

      return isVerified;
      
    } catch (error) {
      console.log(`        ❌ Failed to save ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  /**
   * Run the complete 5-step discovery process for a city
   */
  async discoverSourdoughRestaurants(city: string, state: string): Promise<{
    total: number;
    verified: number;
    success_rate: number;
  }> {
    console.log(`\n🚀 COMPLETE 5-STEP SOURDOUGH DISCOVERY SYSTEM`);
    console.log(`🎯 Target: ${city}, ${state}`);
    console.log('=' .repeat(70));
    
    let totalProcessed = 0;
    let verifiedCount = 0;

    try {
      // STEP 1: Create master list
      const masterList = await this.createMasterList(city, state);
      
      if (masterList.length === 0) {
        console.log('❌ No restaurants found in Step 1');
        return { total: 0, verified: 0, success_rate: 0 };
      }

      console.log(`\n🔄 PROCESSING ${masterList.length} RESTAURANTS THROUGH 5-STEP VERIFICATION`);
      console.log('=' .repeat(70));

      // Process each restaurant through all 5 steps
      for (const restaurant of masterList) {
        console.log(`\n  🏪 Processing: ${restaurant.name}`);
        
        // STEP 2: Check Google Business Profile
        const businessResult = await this.searchGoogleBusinessProfile(restaurant);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
        
        // STEP 3: Scrape website
        const websiteResult = await this.scrapeWebsiteForKeywords(restaurant);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
        
        // STEP 4: Check social media
        const socialResult = await this.scrapeSocialMediaProfiles(restaurant);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Rate limiting
        
        // STEP 5: Compile and save
        const wasVerified = await this.compileAndSaveResults(
          restaurant,
          businessResult,
          websiteResult,
          socialResult,
          city,
          state
        );
        
        if (wasVerified) verifiedCount++;
        totalProcessed++;
      }

      const successRate = totalProcessed > 0 ? (verifiedCount / totalProcessed) * 100 : 0;

      console.log(`\n🎉 DISCOVERY COMPLETE FOR ${city}, ${state}`);
      console.log('=' .repeat(70));
      console.log(`📊 Total restaurants processed: ${totalProcessed}`);
      console.log(`✅ Sourdough restaurants verified: ${verifiedCount}`);
      console.log(`📈 Success rate: ${successRate.toFixed(1)}%`);
      console.log(`🎯 All restaurants added to map (verified and non-verified)`);

      return {
        total: totalProcessed,
        verified: verifiedCount,
        success_rate: successRate
      };

    } catch (error) {
      console.error('❌ Discovery system error:', error);
      return { total: totalProcessed, verified: verifiedCount, success_rate: 0 };
    }
  }

  // Helper methods

  private generateSocialUsernames(restaurantName: string): string[] {
    const clean = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '');
    
    const withUnderscore = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    
    return [
      clean,
      withUnderscore,
      `${clean}pizza`,
      clean.replace('pizza', '').replace('pie', '').trim(),
      `${clean}pdx`,
      `${clean}sf`
    ].filter(u => u.length > 2);
  }

  private async checkInstagramProfile(username: string): Promise<VerificationResult> {
    if (!this.apiKey) return { verified: false, keywords: [], sources: [], confidence: 0, description: '' };
    
    try {
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: `site:instagram.com/${username}`,
          limit: 1
        },
        headers: {
          'X-API-KEY': this.apiKey
        },
        timeout: 8000
      });
      
      if (response.data?.data?.[0]?.[0]) {
        const result = response.data.data[0][0];
        const bio = (result.description || result.snippet || '').toLowerCase();
        
        const foundKeywords = this.sourdoughKeywords.filter(keyword =>
          bio.includes(keyword.toLowerCase())
        );
        
        return {
          verified: foundKeywords.length > 0,
          keywords: foundKeywords,
          sources: foundKeywords.length > 0 ? ['Instagram'] : [],
          confidence: foundKeywords.length > 0 ? 0.8 : 0,
          description: foundKeywords.length > 0 ? `Instagram bio contains: ${foundKeywords.join(', ')}` : ''
        };
      }
    } catch (error) {
      // Silent fail
    }
    
    return { verified: false, keywords: [], sources: [], confidence: 0, description: '' };
  }

  private async checkFacebookProfile(username: string): Promise<VerificationResult> {
    if (!this.apiKey) return { verified: false, keywords: [], sources: [], confidence: 0, description: '' };
    
    try {
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: `site:facebook.com/${username}`,
          limit: 1
        },
        headers: {
          'X-API-KEY': this.apiKey
        },
        timeout: 8000
      });
      
      if (response.data?.data?.[0]?.[0]) {
        const result = response.data.data[0][0];
        const bio = (result.description || result.snippet || '').toLowerCase();
        
        const foundKeywords = this.sourdoughKeywords.filter(keyword =>
          bio.includes(keyword.toLowerCase())
        );
        
        return {
          verified: foundKeywords.length > 0,
          keywords: foundKeywords,
          sources: foundKeywords.length > 0 ? ['Facebook'] : [],
          confidence: foundKeywords.length > 0 ? 0.8 : 0,
          description: foundKeywords.length > 0 ? `Facebook page contains: ${foundKeywords.join(', ')}` : ''
        };
      }
    } catch (error) {
      // Silent fail
    }
    
    return { verified: false, keywords: [], sources: [], confidence: 0, description: '' };
  }
}

// Main execution function
export async function runCompleteDiscovery(city: string, state: string) {
  const system = new CompleteSourdoughDiscoverySystem();
  return await system.discoverSourdoughRestaurants(city, state);
}

// CLI execution
if (import.meta.url.endsWith(process.argv[1])) {
  const city = process.argv[2] || 'Portland';
  const state = process.argv[3] || 'OR';
  
  runCompleteDiscovery(city, state)
    .then(results => {
      console.log('\n📈 FINAL RESULTS:');
      console.log(`   Restaurants processed: ${results.total}`);
      console.log(`   Sourdough verified: ${results.verified}`);
      console.log(`   Success rate: ${results.success_rate.toFixed(1)}%`);
    })
    .catch(console.error);
}