#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import type { InsertRestaurant } from '@shared/schema';

interface BusinessResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  source: 'Google' | 'Yelp';
  businessType?: string;
}

class SimplifiedSourdoughSearch {
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

  private isPizzaRestaurant(name: string, businessType?: string): boolean {
    const lowerName = name.toLowerCase();
    const lowerType = (businessType || '').toLowerCase();
    
    // Include if name or type contains pizza-related terms
    const pizzaTerms = ['pizza', 'pizzeria', 'pizzette', 'pie'];
    const hasPizzaTerm = pizzaTerms.some(term => 
      lowerName.includes(term) || lowerType.includes(term)
    );
    
    // Exclude bakeries, delis, and other non-pizza businesses
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

  private async searchGoogleForSourdoughPizza(city: string, state: string): Promise<BusinessResult[]> {
    try {
      console.log(`🔍 Searching Google for "sourdough pizza ${city} ${state}"...`);
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: `sourdough pizza ${city} ${state}`,
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

      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.log('No Google results found');
        return [];
      }

      const results = response.data.data.flat();
      console.log(`📍 Found ${results.length} Google results`);

      // Filter to pizza restaurants only
      const pizzaResults: BusinessResult[] = results
        .filter(r => this.isPizzaRestaurant(r.name, r.type))
        .map(r => ({
          name: r.name,
          address: r.full_address,
          phone: r.phone,
          website: r.site,
          description: r.description,
          source: 'Google' as const,
          businessType: r.type
        }));

      console.log(`🍕 Filtered to ${pizzaResults.length} pizza restaurants`);
      return pizzaResults;

    } catch (error: any) {
      console.error('❌ Google search failed:', error.message);
      return [];
    }
  }

  private async searchYelpForSourdoughPizza(city: string, state: string): Promise<BusinessResult[]> {
    // Note: We could add Yelp API search here if API key is available
    // For now, return empty array but structure is ready
    console.log(`🔍 Yelp search for sourdough pizza in ${city}, ${state} (would require Yelp API key)`);
    return [];
  }

  private async verifyAndSaveResults(results: BusinessResult[], city: string, state: string): Promise<number> {
    console.log(`\n🔍 Verifying ${results.length} pizza restaurants...`);
    
    let verifiedCount = 0;
    
    for (let i = 0; i < results.length; i++) {
      const business = results[i];
      console.log(`\n[${i + 1}/${results.length}] 🍕 ${business.name}`);
      console.log(`   📍 ${business.address}`);
      console.log(`   📊 Source: ${business.source}`);
      
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
      else if (business.website) {
        const websiteResult = await this.scrapeWebsiteForSourdough(business.website);
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
      
      if (isVerified && business.address) {
        try {
          const insertData: InsertRestaurant = {
            name: business.name,
            address: business.address,
            phone: business.phone || null,
            website: business.website || null,
            latitude: 37.7749, // Default SF coordinates - could extract exact location later
            longitude: -122.4194,
            description: `Verified sourdough pizza from ${verificationSource}: ${verificationContent?.substring(0, 200)}...`,
            cuisine: 'Italian',
            priceRange: '$-$$',
            rating: null,
            city: city,
            state: state
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
    
    return verifiedCount;
  }

  async executeSimplifiedSearch(city: string = 'San Francisco', state: string = 'CA'): Promise<number> {
    console.log(`\n🚀 SIMPLIFIED SOURDOUGH PIZZA SEARCH for ${city}, ${state}`);
    console.log('📋 Strategy: Direct search for "sourdough pizza" → verify pizza restaurants only');
    
    try {
      // Step 1: Search Google for "sourdough pizza [city] [state]"
      const googleResults = await this.searchGoogleForSourdoughPizza(city, state);
      
      // Step 2: Search Yelp (placeholder for now)
      const yelpResults = await this.searchYelpForSourdoughPizza(city, state);
      
      // Step 3: Combine and deduplicate results
      const allResults = [...googleResults, ...yelpResults];
      const uniqueResults = allResults.filter((business, index, self) => {
        const key = `${business.name}-${business.address}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        return index === self.findIndex(b => 
          `${b.name}-${b.address}`.toLowerCase().replace(/[^a-z0-9]/g, '') === key
        );
      });

      console.log(`\n📊 Combined results: ${allResults.length} total, ${uniqueResults.length} unique pizza restaurants`);
      
      if (uniqueResults.length === 0) {
        console.log('❌ No pizza restaurants found');
        return 0;
      }

      // Step 4: Verify each restaurant for sourdough
      const verifiedCount = await this.verifyAndSaveResults(uniqueResults, city, state);

      // Step 5: Final summary
      console.log(`\n📊 SIMPLIFIED SEARCH COMPLETE`);
      console.log(`🍕 Pizza restaurants found: ${uniqueResults.length}`);
      console.log(`✅ Verified sourdough restaurants: ${verifiedCount}`);
      console.log(`📈 Success rate: ${((verifiedCount / uniqueResults.length) * 100).toFixed(1)}%`);

      return verifiedCount;

    } catch (error: any) {
      console.error('❌ Simplified search failed:', error.message);
      throw error;
    }
  }
}

// Execute directly
const searcher = new SimplifiedSourdoughSearch();
searcher.executeSimplifiedSearch('Los Angeles', 'CA')
  .then((count) => {
    console.log(`\n✅ Simplified search completed successfully!`);
    console.log(`🥖 Found and verified ${count} sourdough pizza restaurants`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Search failed:', error);
    process.exit(1);
  });