#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';

interface Restaurant {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  website?: string;
  phone?: string;
  categories?: string[];
  rating?: number;
  reviews?: number;
}

class EnhancedSFDiscovery {
  private apiKey: string;
  private allEstablishments: Map<string, Restaurant> = new Map();
  private totalAPIRequests = 0;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async comprehensiveDiscovery() {
    console.log('🍕 ENHANCED SF PIZZA DISCOVERY');
    console.log('=' .repeat(50));
    console.log('Goal: Find ALL pizza establishments with comprehensive geographic coverage');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Phase 1: Broad city-wide searches with higher limits
    await this.broadCitySearches();
    
    // Phase 2: Neighborhood-specific searches
    await this.neighborhoodSearches();
    
    // Phase 3: ZIP code searches for complete coverage
    await this.zipCodeSearches();
    
    // Phase 4: Specialized searches
    await this.specializedSearches();

    const finalResults = Array.from(this.allEstablishments.values());
    console.log(`\n✅ ENHANCED DISCOVERY COMPLETE`);
    console.log(`Total API requests: ${this.totalAPIRequests}`);
    console.log(`Total unique establishments: ${finalResults.length}`);
    
    // Now verify sourdough claims
    await this.verifySourdoughEstablishments(finalResults);
    
    return finalResults;
  }

  async broadCitySearches() {
    console.log('\n📍 PHASE 1: BROAD CITY-WIDE SEARCHES');
    
    const citySearches = [
      { query: 'pizza restaurants San Francisco California', limit: 100 },
      { query: 'pizza San Francisco CA', limit: 80 },
      { query: 'pizzeria San Francisco CA', limit: 80 },
      { query: 'pizza delivery San Francisco CA', limit: 80 },
      { query: 'pizza takeout San Francisco CA', limit: 80 },
      { query: 'italian restaurant San Francisco CA', limit: 60 }
    ];

    await this.executeSearches(citySearches, 'City-wide');
  }

  async neighborhoodSearches() {
    console.log('\n🏘️  PHASE 2: NEIGHBORHOOD-SPECIFIC SEARCHES');
    
    const neighborhoods = [
      'Potrero Hill', 'Mission Bay', 'Dogpatch', 'SOMA', 'Financial District',
      'North Beach', 'Chinatown', 'Mission District', 'Castro', 'Haight',
      'Richmond', 'Sunset', 'Noe Valley', 'Bernal Heights', 'Glen Park',
      'Pac Heights', 'Marina', 'Russian Hill', 'Telegraph Hill'
    ];

    const neighborhoodSearches = neighborhoods.map(neighborhood => ({
      query: `pizza ${neighborhood} San Francisco`,
      limit: 30
    }));

    await this.executeSearches(neighborhoodSearches, 'Neighborhood');
  }

  async zipCodeSearches() {
    console.log('\n📮 PHASE 3: ZIP CODE SEARCHES');
    
    const zipCodes = [
      '94102', '94103', '94104', '94105', '94107', '94108', '94109', '94110',
      '94111', '94112', '94114', '94115', '94116', '94117', '94118', '94121',
      '94122', '94123', '94124', '94127', '94131', '94132', '94133', '94134'
    ];

    const zipSearches = zipCodes.map(zip => ({
      query: `pizza restaurant ${zip}`,
      limit: 25
    }));

    await this.executeSearches(zipSearches, 'ZIP code');
  }

  async specializedSearches() {
    console.log('\n🎯 PHASE 4: SPECIALIZED SEARCHES');
    
    const specializedSearches = [
      { query: 'wood fired pizza San Francisco', limit: 40 },
      { query: 'artisan pizza San Francisco', limit: 40 },
      { query: 'gourmet pizza San Francisco', limit: 40 },
      { query: 'neapolitan pizza San Francisco', limit: 30 },
      { query: 'sourdough pizza San Francisco', limit: 30 },
      { query: 'brick oven pizza San Francisco', limit: 30 }
    ];

    await this.executeSearches(specializedSearches, 'Specialized');
  }

  async executeSearches(searches: Array<{query: string, limit: number}>, phase: string) {
    for (let i = 0; i < searches.length; i++) {
      const { query, limit } = searches[i];
      console.log(`   [${i + 1}/${searches.length}] ${phase}: "${query}" (limit: ${limit})`);
      
      try {
        const results = await this.robustSearch(query, limit);
        const newCount = this.addUniqueResults(results);
        
        console.log(`      Found: ${results.length}, Added: ${newCount}, Total: ${this.allEstablishments.size}`);
        
        // Rate limiting
        if (i < searches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.log(`      ❌ Search failed: ${error.message}`);
      }
    }
  }

  async robustSearch(query: string, limit: number): Promise<any[]> {
    this.totalAPIRequests++;
    
    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        },
        timeout: 25000
      });

      if (response.data.status === 'Error') {
        throw new Error(response.data.error || 'API returned error status');
      }

      if (response.data.status === 'Pending') {
        return await this.waitForResults(response.data.id);
      }

      if (response.data.status === 'Success') {
        let results = response.data.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        return results || [];
      }

      throw new Error(`Unexpected status: ${response.data.status}`);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async waitForResults(requestId: string): Promise<any[]> {
    const maxAttempts = 8;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      const waitTime = Math.min(8000 + (attempts * 1000), 15000);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      try {
        this.totalAPIRequests++;
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
          headers: {
            'X-API-KEY': this.apiKey
          },
          timeout: 20000
        });

        if (resultResponse.data.status === 'Success') {
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
          
        } else if (resultResponse.data.status === 'Error') {
          throw new Error(resultResponse.data.error || 'Request processing failed');
        }
        
      } catch (error) {
        if (attempts === maxAttempts) throw error;
      }
    }

    throw new Error(`Timeout after ${maxAttempts} attempts`);
  }

  addUniqueResults(results: any[]): number {
    let newCount = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        const key = `${result.name}_${result.latitude}_${result.longitude}`;
        
        if (!this.allEstablishments.has(key)) {
          this.allEstablishments.set(key, {
            name: result.name,
            address: result.full_address || result.address || '',
            latitude: result.latitude,
            longitude: result.longitude,
            description: result.description || '',
            website: result.website || result.site || '',
            phone: result.phone || '',
            categories: result.categories || [],
            rating: result.rating,
            reviews: result.reviews_count
          });
          newCount++;
        }
      }
    }
    
    return newCount;
  }

  isPizzaEstablishment(result: any): boolean {
    if (!result.name || !result.latitude || !result.longitude) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    const categories = (result.categories || []).join(' ').toLowerCase();
    
    const pizzaKeywords = [
      'pizza', 'pizzeria', 'pizzas', 'pie shop', 'pizza place',
      'brick oven', 'wood fired', 'neapolitan', 'pinsa'
    ];
    
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience',
      'delivery service', 'uber eats', 'doordash', 'grubhub'
    ];
    
    // Check exclusions
    for (const exclude of excludeKeywords) {
      if (name.includes(exclude) || description.includes(exclude)) {
        return false;
      }
    }
    
    // Check pizza keywords
    for (const keyword of pizzaKeywords) {
      if (name.includes(keyword) || description.includes(keyword) || categories.includes(keyword)) {
        return true;
      }
    }
    
    // Italian restaurants that likely serve pizza
    if ((name.includes('italian') || description.includes('italian') || categories.includes('italian')) &&
        (description.includes('restaurant') || categories.includes('restaurant'))) {
      return true;
    }
    
    return false;
  }

  async verifySourdoughEstablishments(establishments: Restaurant[]) {
    console.log('\n🔍 SOURDOUGH VERIFICATION PHASE');
    console.log(`Analyzing ${establishments.length} establishments for sourdough claims...`);
    
    const verifiedSourdough = [];
    let processed = 0;
    
    for (const establishment of establishments) {
      processed++;
      
      // Check if this establishment mentions sourdough in Google Business description
      const profileKeywords = this.findSourdoughKeywords(establishment.description || '');
      
      if (profileKeywords.length > 0) {
        console.log(`\n[${processed}/${establishments.length}] ✅ ${establishment.name}`);
        console.log(`   📝 Google profile: ${profileKeywords.join(', ')}`);
        
        // Try to verify with website too
        if (establishment.website && this.isValidWebsite(establishment.website)) {
          try {
            const websiteKeywords = await this.analyzeRestaurantWebsite(establishment.website);
            if (websiteKeywords.length > 0) {
              console.log(`   🌐 Website also mentions: ${websiteKeywords.join(', ')}`);
            }
          } catch (error) {
            // Website check failed, but we still have Google Business profile verification
          }
        }
        
        verifiedSourdough.push({
          restaurant: establishment,
          keywords: profileKeywords,
          verified: true
        });
      }
      
      // Rate limiting for website checks
      if (processed % 10 === 0 && processed < establishments.length) {
        console.log(`   Processed ${processed}/${establishments.length}, pausing...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🍞 VERIFIED SOURDOUGH ESTABLISHMENTS: ${verifiedSourdough.length}`);
    verifiedSourdough.forEach((v, i) => {
      console.log(`${i + 1}. ${v.restaurant.name} - ${v.restaurant.address}`);
      console.log(`   Keywords: ${v.keywords.join(', ')}`);
      if (v.restaurant.website) console.log(`   Website: ${v.restaurant.website}`);
    });
  }

  findSourdoughKeywords(text: string): string[] {
    const foundKeywords: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const keyword of this.sourdoughKeywords) {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
      
      // Check for hyphenated variations
      const hyphenated = keyword.replace(' ', '-');
      if (hyphenated !== keyword && lowerText.includes(hyphenated)) {
        foundKeywords.push(`${keyword} (${hyphenated})`);
      }
    }
    
    return foundKeywords;
  }

  async analyzeRestaurantWebsite(websiteUrl: string): Promise<string[]> {
    try {
      let url = websiteUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 3
      });

      const $ = cheerio.load(response.data);
      
      const textSections = [
        $('title').text(),
        $('meta[name="description"]').attr('content') || '',
        $('.menu, .food-menu, #menu').text(),
        $('.about, .story, #about').text(),
        $('main').text(),
        $('body').text()
      ];

      const fullText = textSections.join(' ').toLowerCase();
      return this.findSourdoughKeywords(fullText);

    } catch (error) {
      throw new Error(`Website analysis failed: ${error.message}`);
    }
  }

  isValidWebsite(url: string): boolean {
    if (!url) return false;
    
    try {
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(cleanUrl);
      
      const excludedDomains = [
        'facebook.com', 'instagram.com', 'twitter.com', 'yelp.com',
        'google.com', 'maps.google.com', 'foursquare.com'
      ];
      
      return !excludedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }
}

export async function enhancedSFDiscovery() {
  const discovery = new EnhancedSFDiscovery();
  const results = await discovery.comprehensiveDiscovery();
  
  console.log(`\n🎯 ENHANCED DISCOVERY COMPLETE: ${results.length} establishments found`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  enhancedSFDiscovery().catch(console.error);
}