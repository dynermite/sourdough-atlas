#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import type { InsertRestaurant } from '@shared/schema';

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

class TargetedSourdoughSearch {
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
      console.log(`   🌐 Verifying website: ${url}`);
      
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
      $('script, style, noscript').remove();
      
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
      console.log(`   ⚠️  Website check failed: ${error.message}`);
      return {
        hasSourdough: false,
        error: error.message
      };
    }
  }

  private async searchSourdoughPizzerias(city: string, state: string): Promise<OutscraperResult[]> {
    try {
      console.log(`\n🎯 Searching specifically for sourdough pizzerias in ${city}, ${state}...`);
      
      // Direct sourdough searches - let Outscraper's Google API find businesses that mention sourdough
      const sourdoughQueries = [
        `sourdough pizza ${city} ${state}`,
        `naturally leavened pizza ${city} ${state}`,
        `wild yeast pizza ${city} ${state}`,
        `artisan sourdough pizza ${city} ${state}`,
        `sourdough crust pizza ${city} ${state}`,
        `naturally fermented pizza ${city} ${state}`
      ];
      
      const allResults: OutscraperResult[] = [];
      
      for (const query of sourdoughQueries) {
        console.log(`   🔍 Searching: "${query}"`);
        
        try {
          const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
            params: {
              query: query,
              language: 'en',
              region: 'US',
              limit: 100,
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
            console.log(`   📍 Found ${results.length} potentially sourdough establishments`);
          }
          
          // Rate limiting between API calls
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error: any) {
          console.log(`   ⚠️  Search failed for "${query}": ${error.message}`);
        }
      }

      // Deduplicate by name and address
      const uniqueResults = allResults.filter((restaurant, index, self) => {
        const key = `${restaurant.name}-${restaurant.address}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        return index === self.findIndex(r => 
          `${r.name}-${r.address}`.toLowerCase().replace(/[^a-z0-9]/g, '') === key
        );
      });

      console.log(`📊 Total found: ${allResults.length}, After deduplication: ${uniqueResults.length} unique establishments`);
      return uniqueResults;

    } catch (error: any) {
      console.error('❌ Error in targeted sourdough search:', error.message);
      return [];
    }
  }

  private async verifyAndSaveResults(results: OutscraperResult[], city: string, state: string): Promise<number> {
    console.log(`\n🔍 Verifying ${results.length} sourdough candidates...`);
    
    let verifiedCount = 0;
    
    for (let i = 0; i < results.length; i++) {
      const restaurant = results[i];
      console.log(`\n[${i + 1}/${results.length}] 🍕 ${restaurant.name}`);
      console.log(`   📍 ${restaurant.address || 'Address not provided'}`);
      
      let isVerified = false;
      let verificationSource = '';
      let verificationContent = '';
      
      // Check Google Business description first (likely already contains sourdough if found via search)
      if (restaurant.description && this.containsSourdoughKeywords(restaurant.description)) {
        isVerified = true;
        verificationSource = 'Google Business Profile';
        verificationContent = restaurant.description;
        console.log(`   ✅ Verified via Google Business Profile`);
      }
      
      // Also check website for additional verification
      if (restaurant.website) {
        const websiteResult = await this.scrapeWebsiteForSourdough(restaurant.website);
        if (websiteResult.hasSourdough) {
          isVerified = true;
          if (!verificationSource) {
            verificationSource = 'Restaurant Website';
            verificationContent = websiteResult.content || '';
          }
          console.log(`   ✅ Also verified via restaurant website`);
        }
      }
      
      if (isVerified) {
        // Skip if no address (required field)
        if (!restaurant.address) {
          console.log(`   ⚠️  Skipping - no address provided`);
          continue;
        }
        
        try {
          const insertData: InsertRestaurant = {
            name: restaurant.name,
            address: restaurant.address,
            phone: restaurant.phone || null,
            website: restaurant.website || null,
            latitude: restaurant.latitude || null,
            longitude: restaurant.longitude || null,
            description: `${restaurant.description || ''}\n\nSourdough verified from ${verificationSource}: ${verificationContent?.substring(0, 200)}...`.trim(),
            cuisine: 'Italian',
            priceRange: '$-$$',
            rating: restaurant.rating || null,
            city: city,
            state: state
          };

          await db.insert(restaurants).values(insertData);
          console.log(`   💾 Saved to database`);
          verifiedCount++;
          
        } catch (error: any) {
          if (error.message?.includes('duplicate')) {
            console.log(`   ⚠️  Already exists in database`);
          } else {
            console.error(`   ❌ Error saving: ${error.message}`);
          }
        }
      } else {
        console.log(`   ❌ Could not verify sourdough claims`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    return verifiedCount;
  }

  async executeTargetedSearch(city: string = 'San Francisco', state: string = 'CA'): Promise<number> {
    console.log(`\n🚀 TARGETED SOURDOUGH SEARCH for ${city}, ${state}`);
    console.log('📋 Strategy: Use Outscraper to directly find sourdough pizzerias, then verify');
    
    try {
      // Step 1: Search specifically for sourdough establishments
      const sourdoughCandidates = await this.searchSourdoughPizzerias(city, state);
      
      if (sourdoughCandidates.length === 0) {
        console.log('❌ No sourdough candidates found');
        return 0;
      }

      // Step 2: Verify and save results
      const verifiedCount = await this.verifyAndSaveResults(sourdoughCandidates, city, state);

      // Step 3: Final summary
      console.log(`\n📊 TARGETED SEARCH COMPLETE`);
      console.log(`🎯 Sourdough candidates found: ${sourdoughCandidates.length}`);
      console.log(`✅ Verified and saved: ${verifiedCount}`);
      console.log(`📈 Verification rate: ${((verifiedCount / sourdoughCandidates.length) * 100).toFixed(1)}%`);

      return verifiedCount;

    } catch (error: any) {
      console.error('❌ Targeted search failed:', error.message);
      throw error;
    }
  }
}

// Execute directly
const searcher = new TargetedSourdoughSearch();
searcher.executeTargetedSearch('San Francisco', 'CA')
  .then((count) => {
    console.log(`\n✅ Targeted search completed successfully!`);
    console.log(`🥖 Found and verified ${count} new sourdough establishments`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Search failed:', error);
    process.exit(1);
  });