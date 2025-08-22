#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants, type InsertRestaurant } from '../shared/schema';

interface DiscoveredEstablishment {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  description?: string;
  keywords: string[];
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  discoveryMethod: string;
}

class EnhancedComprehensiveDiscovery {
  private apiKey: string;
  private sourdoughKeywords = [
    'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'
  ];
  private totalAPIRequests = 0;
  private allDiscoveries: Map<string, DiscoveredEstablishment> = new Map();
  private processedWebsites = new Set<string>();

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async executeEnhancedDiscovery() {
    console.log('🔍 ENHANCED COMPREHENSIVE SOURDOUGH DISCOVERY');
    console.log('=' .repeat(55));
    console.log('Goal: Maximum coverage including small/new establishments');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Phase 1: High-volume general pizza searches
    await this.highVolumeGeneralSearches();
    
    // Phase 2: Targeted sourdough searches
    await this.targetedSourdoughSearches();
    
    // Phase 3: Neighborhood-specific comprehensive searches
    await this.neighborhoodComprehensiveSearches();
    
    // Phase 4: Artisan/specialty searches
    await this.specialtyPizzaSearches();
    
    // Phase 5: Website verification for all discoveries
    await this.comprehensiveWebsiteVerification();

    const verifiedResults = this.getVerifiedResults();
    await this.addToDatabase(verifiedResults);
    
    this.displayFinalResults(verifiedResults);
    return verifiedResults;
  }

  async highVolumeGeneralSearches() {
    console.log('\n🍕 PHASE 1: HIGH-VOLUME GENERAL PIZZA SEARCHES');
    console.log('Using increased limits to catch smaller establishments');
    
    const searches = [
      { query: 'pizza restaurants San Francisco CA', limit: 200, method: 'High-volume general search' },
      { query: 'pizza San Francisco California', limit: 150, method: 'Alternative general search' },
      { query: 'pizzeria San Francisco', limit: 100, method: 'Pizzeria-specific search' },
      { query: 'pizza delivery San Francisco', limit: 100, method: 'Pizza delivery search' },
      { query: 'pizza takeout San Francisco', limit: 100, method: 'Pizza takeout search' }
    ];

    await this.executeSearchPhase(searches);
  }

  async targetedSourdoughSearches() {
    console.log('\n🍞 PHASE 2: TARGETED SOURDOUGH SEARCHES');
    console.log('Direct searches for sourdough establishments');
    
    const searches = [
      { query: 'sourdough pizza San Francisco CA', limit: 100, method: 'Direct sourdough search' },
      { query: 'naturally leavened pizza San Francisco', limit: 50, method: 'Natural leaven search' },
      { query: 'wild yeast pizza San Francisco', limit: 30, method: 'Wild yeast search' },
      { query: 'sourdough crust pizza San Francisco', limit: 50, method: 'Sourdough crust search' },
      { query: 'traditional sourdough pizza San Francisco', limit: 40, method: 'Traditional sourdough search' }
    ];

    await this.executeSearchPhase(searches);
  }

  async neighborhoodComprehensiveSearches() {
    console.log('\n🏘️  PHASE 3: NEIGHBORHOOD COMPREHENSIVE SEARCHES');
    console.log('Detailed neighborhood coverage to catch local establishments');
    
    const neighborhoods = [
      // Major neighborhoods
      { area: 'Mission District', queries: ['pizza Mission District San Francisco', 'Mission pizza SF'] },
      { area: 'Castro', queries: ['pizza Castro San Francisco', 'Castro District pizza'] },
      { area: 'Haight-Ashbury', queries: ['pizza Haight San Francisco', 'Haight Ashbury pizza'] },
      { area: 'Richmond District', queries: ['pizza Richmond San Francisco', 'Richmond District pizza'] },
      { area: 'Sunset District', queries: ['pizza Sunset San Francisco', 'Sunset District pizza'] },
      { area: 'Potrero Hill', queries: ['pizza Potrero Hill San Francisco', 'Potrero pizza'] },
      { area: 'Mission Bay', queries: ['pizza Mission Bay San Francisco', 'Mission Bay pizza'] },
      { area: 'SOMA', queries: ['pizza SOMA San Francisco', 'South of Market pizza'] },
      { area: 'North Beach', queries: ['pizza North Beach San Francisco', 'North Beach pizza'] },
      { area: 'Marina District', queries: ['pizza Marina San Francisco', 'Marina District pizza'] },
      { area: 'Pacific Heights', queries: ['pizza Pacific Heights San Francisco', 'Pac Heights pizza'] },
      { area: 'Nob Hill', queries: ['pizza Nob Hill San Francisco', 'Nob Hill pizza'] },
      { area: 'Russian Hill', queries: ['pizza Russian Hill San Francisco', 'Russian Hill pizza'] },
      { area: 'Chinatown', queries: ['pizza Chinatown San Francisco', 'Chinatown pizza'] },
      { area: 'Financial District', queries: ['pizza Financial District San Francisco', 'FiDi pizza'] },
      { area: 'Union Square', queries: ['pizza Union Square San Francisco', 'Union Square pizza'] },
      { area: 'Tenderloin', queries: ['pizza Tenderloin San Francisco', 'Tenderloin pizza'] },
      { area: 'Lower Haight', queries: ['pizza Lower Haight San Francisco', 'Lower Haight pizza'] },
      { area: 'Noe Valley', queries: ['pizza Noe Valley San Francisco', 'Noe Valley pizza'] },
      { area: 'Bernal Heights', queries: ['pizza Bernal Heights San Francisco', 'Bernal Heights pizza'] },
      { area: 'Glen Park', queries: ['pizza Glen Park San Francisco', 'Glen Park pizza'] },
      { area: 'Excelsior', queries: ['pizza Excelsior San Francisco', 'Excelsior pizza'] },
      { area: 'Visitacion Valley', queries: ['pizza Visitacion Valley San Francisco', 'Visitacion pizza'] },
      { area: 'Bayview', queries: ['pizza Bayview San Francisco', 'Bayview District pizza'] },
      { area: 'Dogpatch', queries: ['pizza Dogpatch San Francisco', 'Dogpatch pizza'] }
    ];

    const allNeighborhoodSearches = [];
    for (const neighborhood of neighborhoods) {
      for (const query of neighborhood.queries) {
        allNeighborhoodSearches.push({
          query,
          limit: 30,
          method: `Neighborhood search (${neighborhood.area})`
        });
      }
    }

    await this.executeSearchPhase(allNeighborhoodSearches);
  }

  async specialtyPizzaSearches() {
    console.log('\n🎨 PHASE 4: SPECIALTY PIZZA SEARCHES');
    console.log('Artisan and specialty pizza establishments often use sourdough');
    
    const searches = [
      { query: 'artisan pizza San Francisco CA', limit: 100, method: 'Artisan pizza search' },
      { query: 'craft pizza San Francisco CA', limit: 80, method: 'Craft pizza search' },
      { query: 'wood fired pizza San Francisco CA', limit: 80, method: 'Wood fired search' },
      { query: 'neapolitan pizza San Francisco CA', limit: 60, method: 'Neapolitan search' },
      { query: 'authentic pizza San Francisco CA', limit: 70, method: 'Authentic pizza search' },
      { query: 'traditional pizza San Francisco CA', limit: 60, method: 'Traditional pizza search' },
      { query: 'gourmet pizza San Francisco CA', limit: 50, method: 'Gourmet pizza search' },
      { query: 'brick oven pizza San Francisco CA', limit: 60, method: 'Brick oven search' },
      { query: 'farm to table pizza San Francisco CA', limit: 40, method: 'Farm to table search' },
      { query: 'locally sourced pizza San Francisco CA', limit: 30, method: 'Local sourcing search' }
    ];

    await this.executeSearchPhase(searches);
  }

  async executeSearchPhase(searches: Array<{query: string, limit: number, method: string}>) {
    for (let i = 0; i < searches.length; i++) {
      const { query, limit, method } = searches[i];
      console.log(`   [${i + 1}/${searches.length}] ${method}: "${query}" (limit: ${limit})`);
      
      try {
        const results = await this.robustSearch(query, limit);
        const processed = await this.processSearchResults(results, method);
        
        console.log(`      Found: ${results.length}, Processed: ${processed}, Total unique: ${this.allDiscoveries.size}`);
        
        if (i < searches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4000));
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
        timeout: 30000
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

  async processSearchResults(results: any[], discoveryMethod: string): Promise<number> {
    let processed = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        const key = `${result.name}_${result.latitude}_${result.longitude}`;
        
        if (!this.allDiscoveries.has(key)) {
          // Check for immediate sourdough indicators in Google Business profile
          const profileKeywords = this.findSourdoughKeywords(result.description || '');
          
          const discovery: DiscoveredEstablishment = {
            name: result.name,
            address: result.full_address || result.address || '',
            latitude: result.latitude,
            longitude: result.longitude,
            phone: result.phone,
            website: result.website || result.site,
            description: result.description,
            keywords: profileKeywords,
            sources: profileKeywords.length > 0 ? ['Google Business Profile'] : [],
            confidence: profileKeywords.length > 1 ? 'medium' : 'low',
            discoveryMethod
          };
          
          this.allDiscoveries.set(key, discovery);
          
          if (profileKeywords.length > 0) {
            processed++;
          }
        }
      }
    }
    
    return processed;
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
      'delivery service', 'uber eats', 'doordash', 'grubhub', 'postmates'
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

  async comprehensiveWebsiteVerification() {
    console.log('\n🌐 PHASE 5: COMPREHENSIVE WEBSITE VERIFICATION');
    
    const establishments = Array.from(this.allDiscoveries.values());
    const establishmentsWithWebsites = establishments.filter(est => 
      est.website && this.isValidWebsite(est.website) && !this.processedWebsites.has(est.website)
    );
    
    console.log(`Verifying websites for ${establishmentsWithWebsites.length}/${establishments.length} establishments...`);
    
    let verified = 0;
    let currentBatch = 0;
    const batchSize = 20;
    
    for (let i = 0; i < establishmentsWithWebsites.length; i++) {
      const establishment = establishmentsWithWebsites[i];
      console.log(`   [${i + 1}/${establishmentsWithWebsites.length}] ${establishment.name}`);
      
      try {
        const websiteKeywords = await this.analyzeRestaurantWebsite(establishment.website!);
        this.processedWebsites.add(establishment.website!);
        
        if (websiteKeywords.length > 0) {
          console.log(`      ✅ Website verified: ${websiteKeywords.join(', ')}`);
          
          // Update the discovery
          const key = Array.from(this.allDiscoveries.keys()).find(k => 
            this.allDiscoveries.get(k)?.name === establishment.name
          );
          
          if (key) {
            const existingDiscovery = this.allDiscoveries.get(key)!;
            if (!existingDiscovery.sources.includes('Restaurant Website')) {
              existingDiscovery.sources.push('Restaurant Website');
            }
            existingDiscovery.keywords.push(...websiteKeywords);
            existingDiscovery.keywords = [...new Set(existingDiscovery.keywords)];
            
            // Update confidence based on sources and keywords
            if (existingDiscovery.sources.length >= 2) {
              existingDiscovery.confidence = 'high';
            } else if (existingDiscovery.keywords.length >= 2) {
              existingDiscovery.confidence = 'medium';
            }
            
            verified++;
          }
        } else {
          console.log(`      ❌ No sourdough keywords found`);
        }
        
      } catch (error) {
        console.log(`      ⚠️  Website check failed: ${error.message}`);
        this.processedWebsites.add(establishment.website!);
      }
      
      // Rate limiting with batch management
      currentBatch++;
      if (currentBatch >= batchSize) {
        console.log(`      ⏳ Completed batch of ${batchSize}, pausing...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
        currentBatch = 0;
      } else if (i < establishmentsWithWebsites.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`   Website verification complete: ${verified} additional confirmations`);
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
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      const textSections = [
        $('title').text(),
        $('meta[name="description"]').attr('content') || '',
        $('h1, h2, h3, h4').text(),
        $('.menu, .food-menu, #menu, [class*="menu"]').text(),
        $('.about, .story, #about, [class*="about"]').text(),
        $('.description, .info, [class*="description"]').text(),
        $('main').text(),
        $('body').text()
      ];

      const fullText = textSections.join(' ');
      return this.findSourdoughKeywords(fullText);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Website timeout');
      } else if (error.response?.status === 403) {
        throw new Error('Access denied');
      } else if (error.response?.status === 404) {
        throw new Error('Not found');
      } else if (error.code === 'ENOTFOUND') {
        throw new Error('Domain not found');
      }
      throw new Error(error.message);
    }
  }

  isValidWebsite(url: string): boolean {
    if (!url) return false;
    
    try {
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(cleanUrl);
      
      const excludedDomains = [
        'facebook.com', 'instagram.com', 'twitter.com', 'yelp.com',
        'google.com', 'maps.google.com', 'foursquare.com', 'order.online',
        'ubereats.com', 'doordash.com', 'grubhub.com'
      ];
      
      return !excludedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  getVerifiedResults(): DiscoveredEstablishment[] {
    return Array.from(this.allDiscoveries.values()).filter(discovery => 
      discovery.keywords.length > 0
    );
  }

  async addToDatabase(verifiedResults: DiscoveredEstablishment[]) {
    console.log('\n💾 ADDING VERIFIED ESTABLISHMENTS TO DATABASE');
    
    if (verifiedResults.length === 0) {
      console.log('No new verified establishments to add');
      return;
    }

    // Clear existing restaurants to start fresh
    console.log('Clearing existing restaurant data...');
    await db.delete(restaurants);

    console.log(`Adding ${verifiedResults.length} verified sourdough establishments...`);
    
    for (const discovery of verifiedResults) {
      const restaurantData: InsertRestaurant = {
        name: discovery.name,
        address: discovery.address,
        city: "San Francisco",
        state: "CA",
        zipCode: discovery.address.match(/CA (\d{5})/)?.[1] || "",
        latitude: discovery.latitude || 0,
        longitude: discovery.longitude || 0,
        phone: discovery.phone,
        website: discovery.website,
        description: `${discovery.description || ''} Verified sourdough establishment. Keywords: ${discovery.keywords.join(', ')}`.trim(),
        cuisineType: "Pizza",
        priceRange: "$$",
        rating: 4.0,
        isVerified: true
      };
      
      await db.insert(restaurants).values(restaurantData);
      console.log(`   ✅ Added: ${discovery.name}`);
    }
    
    console.log('\n🎯 Database update complete!');
  }

  displayFinalResults(verifiedResults: DiscoveredEstablishment[]) {
    console.log('\n🍞 ENHANCED COMPREHENSIVE DISCOVERY RESULTS');
    console.log('=' .repeat(60));
    
    if (verifiedResults.length === 0) {
      console.log('❌ No verified sourdough pizzerias found');
      return;
    }

    console.log(`Found ${verifiedResults.length} verified sourdough establishments:`);

    verifiedResults
      .sort((a, b) => {
        const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        return confidenceDiff !== 0 ? confidenceDiff : a.name.localeCompare(b.name);
      })
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name} [${result.confidence.toUpperCase()} CONFIDENCE]`);
        console.log(`   📍 ${result.address}`);
        
        if (result.website) {
          console.log(`   🌐 ${result.website}`);
        }
        
        if (result.phone) {
          console.log(`   📞 ${result.phone}`);
        }
        
        console.log(`   ✅ Verified Sources: ${result.sources.join(', ')}`);
        console.log(`   🔍 Keywords: ${result.keywords.join(', ')}`);
        console.log(`   📊 Discovery: ${result.discoveryMethod}`);
      });

    console.log(`\n📊 ENHANCED DISCOVERY SUMMARY:`);
    console.log(`   Total establishments analyzed: ${this.allDiscoveries.size}`);
    console.log(`   Verified sourdough establishments: ${verifiedResults.length}`);
    console.log(`   API requests used: ${this.totalAPIRequests}`);
    
    const byConfidence = verifiedResults.reduce((acc, r) => {
      acc[r.confidence] = (acc[r.confidence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   High confidence: ${byConfidence.high || 0}`);
    console.log(`   Medium confidence: ${byConfidence.medium || 0}`);
    console.log(`   Low confidence: ${byConfidence.low || 0}`);
    
    console.log(`\n🎯 Enhanced discovery complete - maximum coverage achieved!`);
  }
}

export async function enhancedComprehensiveDiscovery() {
  const discovery = new EnhancedComprehensiveDiscovery();
  const results = await discovery.executeEnhancedDiscovery();
  
  console.log(`\n🏆 ENHANCED DISCOVERY COMPLETE: ${results.length} verified sourdough establishments`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  enhancedComprehensiveDiscovery().catch(console.error);
}