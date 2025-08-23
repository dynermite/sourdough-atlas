#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import type { InsertRestaurant } from '@shared/schema';

class ComprehensiveLASearch {
  private outscraper_api_key: string;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];

  private laNeighborhoods = [
    'Hollywood', 'Beverly Hills', 'Santa Monica', 'Venice', 'West Hollywood',
    'Downtown Los Angeles', 'Pasadena', 'Glendale', 'Burbank', 'Culver City',
    'Manhattan Beach', 'Hermosa Beach', 'Redondo Beach', 'Torrance', 'Long Beach',
    'Westwood', 'Brentwood', 'Pacific Palisades', 'Marina del Rey', 'El Segundo',
    'Silver Lake', 'Echo Park', 'Los Feliz', 'Griffith Park', 'Koreatown',
    'Mid-City', 'Miracle Mile', 'Melrose', 'Fairfax', 'West Adams'
  ];

  private searchVariations = [
    'sourdough pizza',
    'naturally leavened pizza', 
    'wild yeast pizza',
    'artisan pizza',
    'sourdough crust pizza'
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

  private isPizzaRestaurant(name: string, businessType?: string): boolean {
    const lowerName = name.toLowerCase();
    const lowerType = (businessType || '').toLowerCase();
    
    const pizzaTerms = ['pizza', 'pizzeria', 'pizzette', 'pie'];
    const hasPizzaTerm = pizzaTerms.some(term => 
      lowerName.includes(term) || lowerType.includes(term)
    );
    
    const excludeTerms = ['bakery', 'deli', 'bread', 'market', 'grocery'];
    const hasExcludeTerm = excludeTerms.some(term => 
      lowerName.includes(term) || lowerType.includes(term)
    );
    
    return hasPizzaTerm && !hasExcludeTerm;
  }

  private async scrapeWebsiteForSourdough(url: string): Promise<{ 
    hasSourdough: boolean; 
    content?: string; 
  }> {
    try {
      console.log(`     🌐 Checking website: ${url}`);
      
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const response = await axios.get(cleanUrl, {
        timeout: 8000,
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
        content: hasSourdough ? allContent.substring(0, 300) : undefined
      };

    } catch (error: any) {
      console.log(`     ⚠️  Website check failed: ${error.message}`);
      return { hasSourdough: false };
    }
  }

  private async searchGoogleForArea(searchQuery: string, area: string): Promise<any[]> {
    try {
      console.log(`🔍 Searching: "${searchQuery}" in ${area}...`);
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: `${searchQuery} ${area} Los Angeles CA`,
          language: 'en',
          region: 'US',
          limit: 50,
          async: false
        },
        headers: {
          'X-API-KEY': this.outscraper_api_key
        },
        timeout: 60000
      });

      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.log('   No results found');
        return [];
      }

      const results = response.data.data.flat();
      console.log(`   📍 Found ${results.length} results`);

      // Filter to LA pizza restaurants only
      const laResults = results.filter(r => {
        const isInLA = r.full_address && (
          r.full_address.includes('Los Angeles, CA') ||
          r.full_address.includes('Hollywood, CA') ||
          r.full_address.includes('Beverly Hills, CA') ||
          r.full_address.includes('Santa Monica, CA') ||
          r.full_address.includes('Venice, CA') ||
          r.full_address.includes('West Hollywood, CA')
        );
        return isInLA && this.isPizzaRestaurant(r.name, r.type);
      });

      console.log(`   🍕 LA pizza restaurants: ${laResults.length}`);
      return laResults;

    } catch (error: any) {
      console.error(`   ❌ Search failed: ${error.message}`);
      return [];
    }
  }

  async executeComprehensiveLASearch(): Promise<number> {
    console.log(`\n🚀 COMPREHENSIVE LOS ANGELES SOURDOUGH PIZZA SEARCH`);
    console.log('📋 Strategy: Multiple search terms × Multiple neighborhoods');
    
    let allResults: any[] = [];
    let searchCount = 0;
    
    try {
      // Search with different terms across key neighborhoods
      const keyNeighborhoods = [
        'Downtown Los Angeles', 'Hollywood', 'Beverly Hills', 'Santa Monica', 
        'Venice', 'West Hollywood', 'Pasadena', 'Culver City', 'Silver Lake',
        'Westwood', 'Koreatown'
      ];
      
      for (const searchTerm of this.searchVariations) {
        for (const neighborhood of keyNeighborhoods) {
          if (searchCount >= 20) { // Limit to avoid API overuse
            console.log('⚠️  Reached search limit to conserve API calls');
            break;
          }
          
          const results = await this.searchGoogleForArea(searchTerm, neighborhood);
          allResults.push(...results);
          searchCount++;
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        if (searchCount >= 20) break;
      }

      // Remove duplicates
      const uniqueResults = allResults.filter((business, index, self) => {
        const key = `${business.name}-${business.full_address}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        return index === self.findIndex(b => 
          `${b.name}-${b.full_address}`.toLowerCase().replace(/[^a-z0-9]/g, '') === key
        );
      });

      console.log(`\n📊 Search Summary:`);
      console.log(`🔍 Total searches performed: ${searchCount}`);
      console.log(`📍 Total results found: ${allResults.length}`);
      console.log(`🍕 Unique LA pizza restaurants: ${uniqueResults.length}`);
      
      if (uniqueResults.length === 0) {
        console.log('❌ No pizza restaurants found');
        return 0;
      }

      // Verify each restaurant for sourdough
      console.log(`\n🔍 Verifying ${uniqueResults.length} pizza restaurants...`);
      let verifiedCount = 0;
      
      for (let i = 0; i < uniqueResults.length; i++) {
        const business = uniqueResults[i];
        console.log(`\n[${i + 1}/${uniqueResults.length}] 🍕 ${business.name}`);
        console.log(`   📍 ${business.full_address}`);
        
        let isVerified = false;
        let verificationSource = '';
        let verificationContent = '';
        
        // Step 1: Check Google Business description first
        if (business.description && this.containsSourdoughKeywords(business.description)) {
          isVerified = true;
          verificationSource = 'Google Business Profile';
          verificationContent = business.description;
          console.log(`   ✅ SOURDOUGH FOUND in business description!`);
        }
        
        // Step 2: Only check website if NOT found in business description
        else if (business.site) {
          const websiteResult = await this.scrapeWebsiteForSourdough(business.site);
          if (websiteResult.hasSourdough) {
            isVerified = true;
            verificationSource = 'Restaurant Website';
            verificationContent = websiteResult.content || '';
            console.log(`   ✅ SOURDOUGH FOUND on website!`);
          } else {
            console.log(`   ❌ No sourdough keywords found`);
          }
        } else {
          console.log(`   ❌ No business description or website to check`);
        }
        
        if (isVerified && business.full_address) {
          try {
            const insertData: InsertRestaurant = {
              name: business.name,
              address: business.full_address,
              phone: business.phone || null,
              website: business.site || null,
              latitude: business.latitude || 34.0522,
              longitude: business.longitude || -118.2437,
              description: `Verified sourdough pizza from ${verificationSource}: ${verificationContent?.substring(0, 200)}...`,
              cuisine: 'Italian',
              priceRange: '$-$$',
              rating: business.rating || null,
              city: 'Los Angeles',
              state: 'CA'
            };

            await db.insert(restaurants).values(insertData);
            console.log(`   💾 SAVED to database`);
            verifiedCount++;
            
          } catch (error: any) {
            if (error.message?.includes('duplicate')) {
              console.log(`   ⚠️  Already exists in database`);
            } else {
              console.error(`   ❌ Error saving: ${error.message}`);
            }
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Final summary
      console.log(`\n📊 COMPREHENSIVE LA SEARCH COMPLETE`);
      console.log(`🔍 Searches performed: ${searchCount}`);
      console.log(`🍕 Pizza restaurants analyzed: ${uniqueResults.length}`);
      console.log(`✅ Verified sourdough restaurants: ${verifiedCount}`);
      console.log(`📈 Success rate: ${((verifiedCount / uniqueResults.length) * 100).toFixed(1)}%`);

      return verifiedCount;

    } catch (error: any) {
      console.error('❌ Comprehensive search failed:', error.message);
      throw error;
    }
  }
}

// Execute directly
const searcher = new ComprehensiveLASearch();
searcher.executeComprehensiveLASearch()
  .then((count) => {
    console.log(`\n✅ Comprehensive LA search completed!`);
    console.log(`🥖 Found and verified ${count} additional sourdough pizza restaurants`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Search failed:', error);
    process.exit(1);
  });