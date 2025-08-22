#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import type { InsertRestaurant } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface OutscraperResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  google_id?: string;
  description?: string;
  category?: string;
  reviews_count?: number;
  rating?: number;
}

export class ComprehensivePizzaScraper {
  private outscraper_api_key: string;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];

  constructor() {
    this.outscraper_api_key = process.env.OUTSCRAPER_API_KEY!;
    if (!this.outscraper_api_key) {
      throw new Error('OUTSCRAPER_API_KEY is required');
    }
  }

  private containsSourdoughKeywords(text: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return this.sourdoughKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  private async scrapeWebsiteForSourdough(url: string): Promise<{ 
    hasSourdough: boolean; 
    content?: string; 
    error?: string 
  }> {
    try {
      console.log(`   🌐 Checking website: ${url}`);
      
      // Clean and validate URL
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const response = await axios.get(cleanUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, noscript').remove();
      
      // Get all text content
      const bodyText = $('body').text();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const title = $('title').text() || '';
      
      const allContent = `${title} ${metaDescription} ${bodyText}`.toLowerCase();
      
      const hasSourdough = this.containsSourdoughKeywords(allContent);
      
      return {
        hasSourdough,
        content: hasSourdough ? allContent.substring(0, 500) : undefined
      };

    } catch (error: any) {
      console.log(`   ⚠️  Failed to scrape ${url}: ${error.message}`);
      return {
        hasSourdough: false,
        error: error.message
      };
    }
  }

  private async getAllPizzaRestaurants(city: string, state: string): Promise<OutscraperResult[]> {
    try {
      console.log(`\n🍕 Using Outscraper to find ALL pizza restaurants in ${city}, ${state}...`);
      
      // Use comprehensive pizza search to get ALL restaurants
      const queries = [
        `Pizza restaurants in ${city}, ${state}`,
        `Pizza delivery ${city}, ${state}`,
        `Pizzeria ${city}, ${state}`,
        `Italian restaurants pizza ${city}, ${state}`
      ];
      
      const allResults: OutscraperResult[] = [];
      
      for (const query of queries) {
        console.log(`   🔍 Searching: "${query}"`);
        
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query: query,
            language: 'en',
            region: 'US',
            limit: 200, // Get maximum results per query
            async: false
          },
          headers: {
            'X-API-KEY': this.outscraper_api_key
          },
          timeout: 60000
        });

        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const results: OutscraperResult[] = response.data.data.flat();
          allResults.push(...results);
          console.log(`   📍 Found ${results.length} restaurants`);
        }
        
        // Rate limiting between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Filter out duplicates by name and address
      const uniqueResults = allResults.filter((restaurant, index, self) => {
        const key = `${restaurant.name}-${restaurant.address}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        return index === self.findIndex(r => 
          `${r.name}-${r.address}`.toLowerCase().replace(/[^a-z0-9]/g, '') === key
        );
      });

      console.log(`📊 Total found: ${allResults.length}, After deduplication: ${uniqueResults.length} unique restaurants`);
      return uniqueResults;

    } catch (error: any) {
      console.error('❌ Error searching pizza restaurants:', error.response?.data || error.message);
      return [];
    }
  }

  private async verifyRestaurantForSourdough(restaurant: OutscraperResult): Promise<{
    restaurant: OutscraperResult;
    hasSourdough: boolean;
    sourdoughSource: string;
    sourdoughContent?: string;
  }> {
    let hasSourdough = false;
    let sourdoughSource = '';
    let sourdoughContent = '';

    // Check Google Business description first
    if (restaurant.description && this.containsSourdoughKeywords(restaurant.description)) {
      hasSourdough = true;
      sourdoughSource = 'Google Business Profile';
      sourdoughContent = restaurant.description;
      console.log(`   ✅ Sourdough found in Google Business Profile`);
    }

    // Check restaurant website if available and not already found
    if (!hasSourdough && restaurant.website) {
      const websiteResult = await this.scrapeWebsiteForSourdough(restaurant.website);
      if (websiteResult.hasSourdough) {
        hasSourdough = true;
        sourdoughSource = 'Restaurant Website';
        sourdoughContent = websiteResult.content || '';
        console.log(`   ✅ Sourdough found on restaurant website`);
      }
    }

    return {
      restaurant,
      hasSourdough,
      sourdoughSource,
      sourdoughContent
    };
  }

  private async batchVerifyRestaurants(restaurants: OutscraperResult[]): Promise<any[]> {
    const batchSize = 5; // Smaller batches for more reliable processing
    const sourdoughRestaurants = [];
    
    console.log(`\n🔍 Starting verification of ${restaurants.length} restaurants...`);
    
    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(restaurants.length/batchSize)} (${batch.length} restaurants)`);
      
      const verificationPromises = batch.map(restaurant => {
        console.log(`   🍕 Checking: ${restaurant.name}`);
        return this.verifyRestaurantForSourdough(restaurant);
      });
      
      const results = await Promise.all(verificationPromises);
      
      for (const result of results) {
        if (result.hasSourdough) {
          console.log(`🥖 SOURDOUGH VERIFIED: ${result.restaurant.name}`);
          console.log(`   📄 Source: ${result.sourdoughSource}`);
          console.log(`   📍 Address: ${result.restaurant.address}`);
          sourdoughRestaurants.push(result);
        }
      }
      
      // Add delay between batches to avoid overwhelming servers
      if (i + batchSize < restaurants.length) {
        console.log(`   ⏱️  Waiting 3 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    return sourdoughRestaurants;
  }

  private async saveToDatabase(sourdoughRestaurants: any[]): Promise<void> {
    console.log(`\n💾 Saving ${sourdoughRestaurants.length} sourdough restaurants to database...`);
    
    for (const result of sourdoughRestaurants) {
      const { restaurant, sourdoughSource, sourdoughContent } = result;
      
      try {
        const insertData: InsertRestaurant = {
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone || null,
          website: restaurant.website || null,
          latitude: restaurant.latitude || null,
          longitude: restaurant.longitude || null,
          description: `${restaurant.description || ''}\n\nSourdough verified from ${sourdoughSource}: ${sourdoughContent?.substring(0, 200)}...`.trim(),
          cuisine: 'Italian',
          priceRange: '$-$$',
          rating: restaurant.rating || null,
          city: restaurant.address?.split(',').slice(-2)[0]?.trim() || null,
          state: restaurant.address?.split(',').slice(-1)[0]?.trim()?.split(' ')[0] || null
        };

        await db.insert(restaurants).values(insertData);
        console.log(`✅ Saved: ${restaurant.name}`);
        
      } catch (error: any) {
        if (error.message?.includes('duplicate')) {
          console.log(`⚠️  Already exists: ${restaurant.name}`);
        } else {
          console.error(`❌ Error saving ${restaurant.name}:`, error.message);
        }
      }
    }
  }

  async executeComprehensiveDiscovery(city: string = 'San Francisco', state: string = 'CA'): Promise<number> {
    console.log(`\n🚀 COMPREHENSIVE PIZZA DISCOVERY for ${city}, ${state}`);
    console.log('📋 Strategy: Use Outscraper to find ALL pizza restaurants, then verify each for sourdough');
    
    try {
      // Step 1: Get ALL pizza restaurants using multiple comprehensive searches
      const allPizzaRestaurants = await this.getAllPizzaRestaurants(city, state);
      
      if (allPizzaRestaurants.length === 0) {
        console.log('❌ No pizza restaurants found');
        return 0;
      }

      // Step 2: Verify each restaurant for sourdough
      const sourdoughRestaurants = await this.batchVerifyRestaurants(allPizzaRestaurants);
      
      // Step 3: Save verified sourdough restaurants
      if (sourdoughRestaurants.length > 0) {
        await this.saveToDatabase(sourdoughRestaurants);
      }

      // Step 4: Final summary
      console.log(`\n📊 COMPREHENSIVE DISCOVERY COMPLETE`);
      console.log(`🔍 Total pizza restaurants analyzed: ${allPizzaRestaurants.length}`);
      console.log(`🥖 Sourdough restaurants found: ${sourdoughRestaurants.length}`);
      console.log(`📈 Sourdough discovery rate: ${((sourdoughRestaurants.length / allPizzaRestaurants.length) * 100).toFixed(1)}%`);
      
      if (sourdoughRestaurants.length > 0) {
        console.log(`\n🎯 Verified Sourdough Establishments:`);
        sourdoughRestaurants.forEach((result, index) => {
          console.log(`${index + 1}. ${result.restaurant.name} (${result.sourdoughSource})`);
        });
      }

      return sourdoughRestaurants.length;

    } catch (error: any) {
      console.error('❌ Discovery failed:', error.message);
      throw error;
    }
  }

}

// Execute directly
const scraper = new ComprehensivePizzaScraper();
scraper.executeComprehensiveDiscovery('San Francisco', 'CA')
  .then((count) => {
    console.log(`\n✅ Comprehensive discovery completed successfully!`);
    console.log(`🥖 Found and verified ${count} sourdough restaurants`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Discovery failed:', error);
    process.exit(1);
  });