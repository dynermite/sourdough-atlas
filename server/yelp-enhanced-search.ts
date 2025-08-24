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
  rating?: number;
  source: 'Google' | 'Yelp';
  businessType?: string;
  latitude?: number;
  longitude?: number;
}

class YelpEnhancedSearch {
  private outscraper_api_key: string;
  private yelp_api_key: string;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];

  constructor() {
    this.outscraper_api_key = process.env.OUTSCRAPER_API_KEY!;
    this.yelp_api_key = process.env.YELP_API_KEY!;
    
    if (!this.outscraper_api_key) {
      throw new Error('OUTSCRAPER_API_KEY is required');
    }
    if (!this.yelp_api_key) {
      console.log('⚠️  YELP_API_KEY not found - Yelp search will be skipped');
    }
  }

  private containsSourdoughKeywords(text: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return this.sourdoughKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  private isPizzaRestaurant(name: string, businessType?: string, categories?: string[]): boolean {
    const lowerName = name.toLowerCase();
    const lowerType = (businessType || '').toLowerCase();
    const allCategories = (categories || []).join(' ').toLowerCase();
    
    const pizzaTerms = ['pizza', 'pizzeria', 'pizzette', 'pie'];
    const hasPizzaTerm = pizzaTerms.some(term => 
      lowerName.includes(term) || lowerType.includes(term) || allCategories.includes(term)
    );
    
    const excludeTerms = ['bakery', 'deli', 'bread', 'market', 'grocery'];
    const hasExcludeTerm = excludeTerms.some(term => 
      lowerName.includes(term) || lowerType.includes(term) || allCategories.includes(term)
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

  private async checkAlternativeSourcesForSourdough(businessName: string, address: string): Promise<{
    hasSourdough: boolean;
    source?: string;
    content?: string;
  }> {
    try {
      // Strategy 1: Search for restaurant + sourdough mentions online
      const sourdoughSearchQuery = `"${businessName}" sourdough pizza ${address.split(',')[0]}`;
      
      console.log(`     🔍 Searching: "${sourdoughSearchQuery}"`);
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: sourdoughSearchQuery,
          language: 'en',
          region: 'US',
          limit: 10,
          async: false
        },
        headers: {
          'X-API-KEY': this.outscraper_api_key
        },
        timeout: 30000
      });

      if (response.data?.data?.[0]) {
        const results = response.data.data[0];
        
        for (const result of results) {
          // Check if this result mentions both the restaurant and sourdough
          const title = result.title || '';
          const snippet = result.snippet || '';
          const description = result.description || '';
          
          const allText = `${title} ${snippet} ${description}`.toLowerCase();
          
          // Verify this is about our restaurant
          const restaurantNameWords = businessName.toLowerCase().split(' ');
          const hasRestaurantName = restaurantNameWords.some(word => 
            word.length > 3 && allText.includes(word)
          );
          
          if (hasRestaurantName && this.containsSourdoughKeywords(allText)) {
            return {
              hasSourdough: true,
              source: 'Web Search Results',
              content: `${title}: ${snippet}`.substring(0, 200)
            };
          }
        }
      }
      
      return { hasSourdough: false };
      
    } catch (error: any) {
      console.log(`     ⚠️  Alternative search failed: ${error.message}`);
      return { hasSourdough: false };
    }
  }

  private async scrapeSocialMediaForSourdough(url: string, platform: string): Promise<{
    hasSourdough: boolean;
    content?: string;
  }> {
    try {
      console.log(`     📱 Checking ${platform}: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      $('script, style, noscript').remove();
      
      // Extract text content from the page
      const bodyText = $('body').text();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const metaProperty = $('meta[property="og:description"]').attr('content') || '';
      const title = $('title').text() || '';
      
      const allContent = `${title} ${metaDescription} ${metaProperty} ${bodyText}`.toLowerCase();
      const hasSourdough = this.containsSourdoughKeywords(allContent);
      
      return {
        hasSourdough,
        content: hasSourdough ? allContent.substring(0, 300) : undefined
      };

    } catch (error: any) {
      console.log(`     ⚠️  ${platform} check failed: ${error.message}`);
      return { hasSourdough: false };
    }
  }

  private async searchGoogleForArtisanPizza(city: string, state: string): Promise<BusinessResult[]> {
    try {
      console.log(`🔍 Google: Searching "artisan pizza ${city} ${state}"...`);
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: `artisan pizza ${city} ${state}`,
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
        console.log('   No Google results found');
        return [];
      }

      const results = response.data.data.flat();
      console.log(`   📍 Found ${results.length} Google results`);

      // Filter to pizza restaurants only
      const pizzaResults: BusinessResult[] = results
        .filter(r => this.isPizzaRestaurant(r.name, r.type))
        .map(r => ({
          name: r.name,
          address: r.full_address,
          phone: r.phone,
          website: r.site,
          description: r.description,
          rating: r.rating,
          source: 'Google' as const,
          businessType: r.type,
          latitude: r.latitude,
          longitude: r.longitude
        }));

      console.log(`   🍕 Filtered to ${pizzaResults.length} pizza restaurants`);
      return pizzaResults;

    } catch (error: any) {
      console.error('   ❌ Google search failed:', error.message);
      return [];
    }
  }

  private async searchYelpForArtisanPizza(city: string, state: string): Promise<BusinessResult[]> {
    if (!this.yelp_api_key) {
      console.log('🔍 Yelp: Skipping (no API key provided)');
      return [];
    }

    try {
      console.log(`🔍 Yelp: Searching "artisan pizza" in ${city}, ${state}...`);
      
      // Search for artisan pizza
      const searchTerms = ['artisan pizza', 'gourmet pizza', 'wood fired pizza', 'neapolitan pizza'];
      let allYelpResults: any[] = [];

      for (const term of searchTerms) {
        try {
          const response = await axios.get('https://api.yelp.com/v3/businesses/search', {
            headers: {
              'Authorization': `Bearer ${this.yelp_api_key}`,
              'Accept': 'application/json'
            },
            params: {
              term: term,
              location: `${city}, ${state}`,
              categories: 'pizza',
              limit: 50,
              sort_by: 'rating'
            },
            timeout: 8000
          });

          if (response.data && response.data.businesses) {
            allYelpResults.push(...response.data.businesses);
            console.log(`   📍 Found ${response.data.businesses.length} results for "${term}"`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  Yelp search failed for "${term}": ${error.message}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Remove duplicates and filter
      const uniqueResults = allYelpResults.filter((business, index, self) => 
        index === self.findIndex(b => b.id === business.id)
      );

      const pizzaResults: BusinessResult[] = uniqueResults
        .filter(business => {
          const categories = business.categories?.map((c: any) => c.title) || [];
          return this.isPizzaRestaurant(business.name, '', categories);
        })
        .map(business => ({
          name: business.name,
          address: business.location?.display_address?.join(', ') || '',
          phone: business.phone,
          website: business.attributes?.menu_url || business.url, // Extract actual website from menu_url or fallback to Yelp URL
          description: '', // Yelp doesn't provide description in search
          rating: business.rating,
          source: 'Yelp' as const,
          businessType: business.categories?.map((c: any) => c.title).join(', '),
          latitude: business.coordinates?.latitude,
          longitude: business.coordinates?.longitude
        }));

      console.log(`   🍕 Total unique Yelp pizza restaurants: ${pizzaResults.length}`);
      return pizzaResults;

    } catch (error: any) {
      console.error('   ❌ Yelp search failed:', error.message);
      return [];
    }
  }

  private async verifyAndSaveResults(results: BusinessResult[], city: string, state: string): Promise<number> {
    console.log(`\n🔍 Verifying ${results.length} pizza restaurants...`);
    console.log(`📋 Enhanced multi-source verification:`);
    console.log(`   1️⃣ Google Business profiles for sourdough keywords`);
    console.log(`   2️⃣ Restaurant websites for sourdough content`);
    console.log(`   3️⃣ Web search for restaurant + sourdough mentions`);
    console.log(`   4️⃣ Alternative online sources verification`);
    console.log(`⏱️  Estimated time: ${Math.ceil(results.length * 2.5 / 60)} minutes\n`);
    
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
      
      // Step 2: For Yelp results, check if business name contains sourdough keywords
      else if (business.source === 'Yelp' && this.containsSourdoughKeywords(business.name)) {
        isVerified = true;
        verificationSource = 'Yelp Business Name';
        verificationContent = business.name;
        console.log(`   ✅ SOURDOUGH FOUND in Yelp business name!`);
      }
      
      // Step 3: Check website if NOT found in business description/name
      else if (business.website && !business.website.includes('yelp.com')) {
        const websiteResult = await this.scrapeWebsiteForSourdough(business.website);
        if (websiteResult.hasSourdough) {
          isVerified = true;
          verificationSource = 'Restaurant Website';
          verificationContent = websiteResult.content || '';
          console.log(`   ✅ SOURDOUGH FOUND on website!`);
        }
      }
      
      // Step 4: Check alternative web sources if still not found
      if (!isVerified) {
        console.log(`   🔍 Checking alternative sources for sourdough mentions...`);
        const alternativeResult = await this.checkAlternativeSourcesForSourdough(business.name, business.address);
        
        if (alternativeResult.hasSourdough) {
          isVerified = true;
          verificationSource = alternativeResult.source || 'Alternative Web Sources';
          verificationContent = alternativeResult.content || '';
          console.log(`   ✅ SOURDOUGH FOUND in web search results!`);
        } else {
          console.log(`   ❌ No sourdough keywords found in any sources`);
        }
      }
      
      if (isVerified && business.address) {
        try {
          const insertData: InsertRestaurant = {
            name: business.name,
            address: business.address,
            phone: business.phone || null,
            website: business.website || null,
            latitude: business.latitude || 37.7749, // Default coordinates if not provided
            longitude: business.longitude || -122.4194,
            description: `Verified sourdough pizza from ${verificationSource}: ${verificationContent?.substring(0, 200)}...`,
            cuisine: 'Italian',
            priceRange: '$-$$',
            rating: business.rating || null,
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
      
      // Reduced rate limiting for faster processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Progress checkpoint every 25 restaurants
      if ((i + 1) % 25 === 0) {
        console.log(`\n📊 CHECKPOINT: Processed ${i + 1}/${results.length} restaurants`);
        console.log(`✅ Found ${verifiedCount} sourdough establishments so far`);
        console.log(`📈 Current success rate: ${((verifiedCount / (i + 1)) * 100).toFixed(1)}%`);
      }
    }
    
    return verifiedCount;
  }

  async executeArtisanSearch(city: string = 'San Francisco', state: string = 'CA'): Promise<number> {
    console.log(`\n🚀 ARTISAN PIZZA SEARCH for ${city}, ${state}`);
    console.log('📋 Strategy: Search "artisan pizza" → verify for sourdough keywords');
    
    try {
      // Step 1: Search Google for "artisan pizza [city] [state]"
      const googleResults = await this.searchGoogleForArtisanPizza(city, state);
      
      // Step 2: Search Yelp for artisan pizza
      const yelpResults = await this.searchYelpForArtisanPizza(city, state);
      
      // Step 3: Combine and deduplicate results
      const allResults = [...googleResults, ...yelpResults];
      const uniqueResults = allResults.filter((business, index, self) => {
        const key = `${business.name}-${business.address}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        return index === self.findIndex(b => 
          `${b.name}-${b.address}`.toLowerCase().replace(/[^a-z0-9]/g, '') === key
        );
      });

      console.log(`\n📊 Combined results:`);
      console.log(`🔍 Google results: ${googleResults.length}`);
      console.log(`🍽️  Yelp results: ${yelpResults.length}`);
      console.log(`📍 Total combined: ${allResults.length}`);
      console.log(`🍕 Unique pizza restaurants: ${uniqueResults.length}`);
      
      if (uniqueResults.length === 0) {
        console.log('❌ No pizza restaurants found');
        return 0;
      }

      // Step 4: Verify each restaurant for sourdough
      const verifiedCount = await this.verifyAndSaveResults(uniqueResults, city, state);

      // Step 5: Final summary
      console.log(`\n📊 ARTISAN SEARCH COMPLETE`);
      console.log(`🔍 Artisan pizza restaurants found: ${uniqueResults.length}`);
      console.log(`✅ Verified sourdough restaurants: ${verifiedCount}`);
      console.log(`📈 Success rate: ${((verifiedCount / uniqueResults.length) * 100).toFixed(1)}%`);

      return verifiedCount;

    } catch (error: any) {
      console.error('❌ Artisan search failed:', error.message);
      throw error;
    }
  }
}

// Execute directly
const searcher = new YelpEnhancedSearch();
searcher.executeArtisanSearch('Portland', 'OR')
  .then((count) => {
    console.log(`\n✅ Yelp-enhanced search completed successfully!`);
    console.log(`🥖 Found and verified ${count} sourdough pizza restaurants`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Search failed:', error);
    process.exit(1);
  });