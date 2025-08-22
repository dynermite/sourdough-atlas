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
  discoverySource: string;
  rating?: number;
  priceRange?: string;
}

class MultiSourceDiscovery {
  private outscraper_api_key: string;
  private yelp_api_key: string;
  private sourdoughKeywords = [
    'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'
  ];
  private allDiscoveries: Map<string, DiscoveredEstablishment> = new Map();
  private processedWebsites = new Set<string>();

  constructor() {
    this.outscraper_api_key = process.env.OUTSCRAPER_API_KEY || '';
    this.yelp_api_key = process.env.YELP_API_KEY || '';
  }

  async executeMultiSourceDiscovery(city: string = 'San Francisco', state: string = 'CA') {
    console.log('🌐 MULTI-SOURCE SOURDOUGH DISCOVERY');
    console.log('=' .repeat(50));
    console.log(`Target: ${city}, ${state}`);
    console.log('Sources: Google Maps (Outscraper) + Yelp + Website Analysis');
    
    // Check available APIs
    const availableSources = this.checkAvailableSources();
    console.log(`Available sources: ${availableSources.join(', ')}`);
    
    if (availableSources.length === 0) {
      console.log('❌ No API keys available - cannot perform discovery');
      return [];
    }

    // Source 1: Google Maps via Outscraper
    if (availableSources.includes('Google Maps')) {
      await this.discoverViaGoogleMaps(city, state);
    }

    // Source 2: Yelp API
    if (availableSources.includes('Yelp')) {
      await this.discoverViaYelp(city, state);
    }

    // Source 3: Website verification for all found establishments
    await this.comprehensiveWebsiteVerification();

    // Source 4: Cross-reference and deduplicate
    await this.crossReferenceAndDeduplicate();

    const verifiedResults = this.getVerifiedResults();
    await this.addManuallyFoundEstablishments();
    await this.addToDatabase(verifiedResults);
    
    this.displayResults(verifiedResults);
    return verifiedResults;
  }

  checkAvailableSources(): string[] {
    const sources = [];
    if (this.outscraper_api_key) sources.push('Google Maps');
    if (this.yelp_api_key) sources.push('Yelp');
    sources.push('Website Analysis'); // Always available
    return sources;
  }

  async discoverViaGoogleMaps(city: string, state: string) {
    console.log('\n📍 SOURCE 1: GOOGLE MAPS DISCOVERY');
    
    const searches = [
      { query: `pizza restaurants ${city} ${state}`, limit: 200 },
      { query: `sourdough pizza ${city} ${state}`, limit: 100 },
      { query: `artisan pizza ${city} ${state}`, limit: 100 },
      { query: `pizzeria ${city}`, limit: 100 },
      { query: `craft pizza ${city}`, limit: 80 },
      { query: `wood fired pizza ${city}`, limit: 80 },
      { query: `neapolitan pizza ${city}`, limit: 60 }
    ];

    for (const search of searches) {
      console.log(`   Searching: "${search.query}" (limit: ${search.limit})`);
      
      try {
        const results = await this.searchGoogleMaps(search.query, search.limit);
        const processed = this.processGoogleMapsResults(results, 'Google Maps');
        console.log(`   Found: ${results.length}, Processed: ${processed}, Total: ${this.allDiscoveries.size}`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
  }

  async discoverViaYelp(city: string, state: string) {
    console.log('\n🔍 SOURCE 2: YELP API DISCOVERY');
    
    const searches = [
      { term: 'pizza', categories: 'pizza', limit: 50 },
      { term: 'sourdough pizza', categories: 'pizza', limit: 50 },
      { term: 'artisan pizza', categories: 'pizza', limit: 50 },
      { term: 'wood fired pizza', categories: 'pizza', limit: 50 },
      { term: 'neapolitan pizza', categories: 'pizza', limit: 50 },
      { term: 'craft pizza', categories: 'pizza', limit: 50 }
    ];

    for (const search of searches) {
      console.log(`   Yelp search: "${search.term}" in ${city}`);
      
      try {
        const results = await this.searchYelp(search.term, city, state, search.limit);
        const processed = this.processYelpResults(results, 'Yelp');
        console.log(`   Found: ${results.length}, Processed: ${processed}, Total: ${this.allDiscoveries.size}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
      }
    }
  }

  async searchGoogleMaps(query: string, limit: number): Promise<any[]> {
    const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
      params: { query, limit, language: 'en', region: 'US' },
      headers: { 'X-API-KEY': this.outscraper_api_key },
      timeout: 25000
    });

    if (response.data.status === 'Error') {
      throw new Error(response.data.error || 'Google Maps API error');
    }

    if (response.data.status === 'Pending') {
      await new Promise(resolve => setTimeout(resolve, 8000));
      const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
        headers: { 'X-API-KEY': this.outscraper_api_key },
        timeout: 20000
      });
      
      if (resultResponse.data.status === 'Success') {
        let results = resultResponse.data.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        return results || [];
      }
    }

    if (response.data.status === 'Success') {
      let results = response.data.data;
      if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
        results = results.flat();
      }
      return results || [];
    }

    throw new Error('Google Maps search failed');
  }

  async searchYelp(term: string, city: string, state: string, limit: number): Promise<any[]> {
    const response = await axios.get('https://api.yelp.com/v3/businesses/search', {
      params: {
        term,
        location: `${city}, ${state}`,
        categories: 'pizza',
        limit: Math.min(limit, 50), // Yelp max limit is 50
        radius: 40000 // 40km radius
      },
      headers: {
        'Authorization': `Bearer ${this.yelp_api_key}`
      },
      timeout: 15000
    });

    return response.data.businesses || [];
  }

  processGoogleMapsResults(results: any[], source: string): number {
    let processed = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        const key = this.generateKey(result.name, result.latitude, result.longitude);
        
        if (!this.allDiscoveries.has(key)) {
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
            discoverySource: source,
            rating: result.rating || 4.0
          };
          
          this.allDiscoveries.set(key, discovery);
          if (profileKeywords.length > 0) processed++;
        }
      }
    }
    
    return processed;
  }

  processYelpResults(results: any[], source: string): number {
    let processed = 0;
    
    for (const result of results) {
      if (result.name && result.coordinates) {
        const key = this.generateKey(result.name, result.coordinates.latitude, result.coordinates.longitude);
        
        if (!this.allDiscoveries.has(key)) {
          // Yelp doesn't provide descriptions in search results, so we'll verify via website later
          const discovery: DiscoveredEstablishment = {
            name: result.name,
            address: result.location ? `${result.location.address1 || ''} ${result.location.city || ''} ${result.location.state || ''} ${result.location.zip_code || ''}`.trim() : '',
            latitude: result.coordinates.latitude,
            longitude: result.coordinates.longitude,
            phone: result.phone,
            website: result.url, // Yelp URL initially
            description: '',
            keywords: [],
            sources: [],
            confidence: 'low',
            discoverySource: source,
            rating: result.rating || 4.0,
            priceRange: result.price || '$$'
          };
          
          this.allDiscoveries.set(key, discovery);
          processed++;
        }
      }
    }
    
    return processed;
  }

  generateKey(name: string, lat?: number, lng?: number): string {
    return `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${lat}_${lng}`;
  }

  isPizzaEstablishment(result: any): boolean {
    if (!result.name) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    const categories = (result.categories || []).join(' ').toLowerCase();
    
    const pizzaKeywords = ['pizza', 'pizzeria', 'pizzas', 'brick oven', 'wood fired', 'neapolitan', 'pinsa'];
    const excludeKeywords = ['grocery', 'supermarket', 'gas station', 'delivery service', 'uber eats', 'doordash'];
    
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
    
    return false;
  }

  async comprehensiveWebsiteVerification() {
    console.log('\n🌐 SOURCE 3: COMPREHENSIVE WEBSITE VERIFICATION');
    
    const establishments = Array.from(this.allDiscoveries.values());
    const withWebsites = establishments.filter(est => 
      est.website && this.isValidWebsite(est.website) && !this.processedWebsites.has(est.website)
    );
    
    console.log(`Verifying ${withWebsites.length} unique websites...`);
    
    let verified = 0;
    const batchSize = 15;
    
    for (let i = 0; i < withWebsites.length; i += batchSize) {
      const batch = withWebsites.slice(i, i + batchSize);
      console.log(`   Batch ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} websites...`);
      
      for (const establishment of batch) {
        try {
          // Get actual restaurant website if this is a Yelp URL
          const actualWebsite = await this.getActualWebsite(establishment.website!);
          
          if (actualWebsite && actualWebsite !== establishment.website) {
            establishment.website = actualWebsite;
          }
          
          if (actualWebsite && !this.processedWebsites.has(actualWebsite)) {
            const keywords = await this.analyzeWebsiteForSourdough(actualWebsite);
            this.processedWebsites.add(actualWebsite);
            
            if (keywords.length > 0) {
              console.log(`      ✅ ${establishment.name}: ${keywords.join(', ')}`);
              
              // Update discovery
              const key = Array.from(this.allDiscoveries.keys()).find(k => 
                this.allDiscoveries.get(k)?.name === establishment.name
              );
              
              if (key) {
                const discovery = this.allDiscoveries.get(key)!;
                if (!discovery.sources.includes('Restaurant Website')) {
                  discovery.sources.push('Restaurant Website');
                }
                discovery.keywords.push(...keywords);
                discovery.keywords = [...new Set(discovery.keywords)];
                
                if (discovery.sources.length >= 2) {
                  discovery.confidence = 'high';
                } else if (discovery.keywords.length >= 2) {
                  discovery.confidence = 'medium';
                }
                
                verified++;
              }
            }
          }
        } catch (error) {
          // Continue on errors
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      if (i + batchSize < withWebsites.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`   Website verification complete: ${verified} confirmations`);
  }

  async getActualWebsite(url: string): Promise<string | null> {
    try {
      // If it's a Yelp URL, try to find the actual website
      if (url.includes('yelp.com')) {
        const response = await axios.get(url, {
          timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SourdoughBot/1.0)' },
          maxRedirects: 3
        });
        
        const $ = cheerio.load(response.data);
        const websiteLink = $('a[href*="http"]:contains("Website"), a[href*="http"]:contains("website")').attr('href');
        
        if (websiteLink && !websiteLink.includes('yelp.com')) {
          return websiteLink;
        }
      }
      
      return url;
    } catch (error) {
      return url;
    }
  }

  async analyzeWebsiteForSourdough(websiteUrl: string): Promise<string[]> {
    let url = websiteUrl.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SourdoughBot/1.0)' },
      maxRedirects: 3
    });

    const $ = cheerio.load(response.data);
    
    const text = [
      $('title').text(),
      $('meta[name="description"]').attr('content') || '',
      $('.menu, #menu, [class*="menu"]').text(),
      $('.about, #about, [class*="about"]').text(),
      $('.faq, #faq, [class*="faq"]').text(),
      $('h1, h2, h3').text()
    ].join(' ');

    return this.findSourdoughKeywords(text);
  }

  findSourdoughKeywords(text: string): string[] {
    const foundKeywords: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const keyword of this.sourdoughKeywords) {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    
    return foundKeywords;
  }

  isValidWebsite(url: string): boolean {
    if (!url) return false;
    
    try {
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(cleanUrl);
      
      const excluded = ['facebook.com', 'instagram.com', 'twitter.com', 'google.com'];
      return !excluded.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  async crossReferenceAndDeduplicate() {
    console.log('\n🔄 SOURCE 4: CROSS-REFERENCE & DEDUPLICATION');
    
    const establishments = Array.from(this.allDiscoveries.values());
    console.log(`Cross-referencing ${establishments.length} total discoveries...`);
    
    // Group by similar names and locations
    const groups = new Map<string, DiscoveredEstablishment[]>();
    
    for (const est of establishments) {
      const normalizedName = est.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const locationKey = `${Math.round((est.latitude || 0) * 1000)}_${Math.round((est.longitude || 0) * 1000)}`;
      const groupKey = `${normalizedName}_${locationKey}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(est);
    }
    
    // Merge duplicates, keeping best data
    let merged = 0;
    for (const [groupKey, groupEstablishments] of groups) {
      if (groupEstablishments.length > 1) {
        const best = this.mergeDuplicateEstablishments(groupEstablishments);
        
        // Remove all instances and add the merged one
        for (const est of groupEstablishments) {
          const key = this.generateKey(est.name, est.latitude, est.longitude);
          this.allDiscoveries.delete(key);
        }
        
        const newKey = this.generateKey(best.name, best.latitude, best.longitude);
        this.allDiscoveries.set(newKey, best);
        merged++;
      }
    }
    
    console.log(`   Merged ${merged} duplicate groups`);
  }

  mergeDuplicateEstablishments(establishments: DiscoveredEstablishment[]): DiscoveredEstablishment {
    // Take the one with most complete data
    let best = establishments[0];
    
    for (const est of establishments) {
      if (est.keywords.length > best.keywords.length) best = est;
      if (est.sources.length > best.sources.length) best = est;
      if (est.website && !best.website) best = est;
    }
    
    // Merge all sources and keywords
    const allSources = [...new Set(establishments.flatMap(e => e.sources))];
    const allKeywords = [...new Set(establishments.flatMap(e => e.keywords))];
    
    return {
      ...best,
      sources: allSources,
      keywords: allKeywords,
      confidence: allSources.length >= 2 ? 'high' : allKeywords.length >= 2 ? 'medium' : 'low'
    };
  }

  async addManuallyFoundEstablishments() {
    console.log('\n📝 ADDING MANUALLY DISCOVERED ESTABLISHMENTS');
    
    // Add Sunset Squares which we found manually
    const sunsetSquares: DiscoveredEstablishment = {
      name: "Sunset Squares",
      address: "3901 Irving St, San Francisco, CA 94122",
      latitude: 37.7637,
      longitude: -122.4955,
      phone: "(415) 742-4500",
      website: "https://www.sunsetsquares.com/",
      description: "Detroit-style square pizza made with SF style sourdough, long natural fermentation process.",
      keywords: ['sourdough', 'naturally fermented'],
      sources: ['Restaurant Website', 'Manual Discovery'],
      confidence: 'high',
      discoverySource: 'Manual Research',
      rating: 4.6,
      priceRange: "$$"
    };
    
    const key = this.generateKey(sunsetSquares.name, sunsetSquares.latitude, sunsetSquares.longitude);
    this.allDiscoveries.set(key, sunsetSquares);
    
    console.log(`   Added: ${sunsetSquares.name} (manually discovered)`);
  }

  getVerifiedResults(): DiscoveredEstablishment[] {
    return Array.from(this.allDiscoveries.values()).filter(discovery => 
      discovery.keywords.length > 0
    );
  }

  async addToDatabase(verifiedResults: DiscoveredEstablishment[]) {
    if (verifiedResults.length === 0) {
      console.log('\n❌ No verified establishments to add');
      return;
    }

    console.log('\n💾 UPDATING DATABASE WITH MULTI-SOURCE RESULTS');
    
    await db.delete(restaurants);

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
        description: `${discovery.description || ''} Verified via: ${discovery.sources.join(', ')}. Keywords: ${discovery.keywords.join(', ')}`.trim(),
        cuisineType: "Pizza",
        priceRange: discovery.priceRange || "$$",
        rating: discovery.rating || 4.0,
        isVerified: true
      };
      
      await db.insert(restaurants).values(restaurantData);
    }
    
    console.log(`✅ Added ${verifiedResults.length} verified establishments to database`);
  }

  displayResults(verifiedResults: DiscoveredEstablishment[]) {
    console.log('\n🍞 MULTI-SOURCE DISCOVERY RESULTS');
    console.log('=' .repeat(50));
    
    if (verifiedResults.length === 0) {
      console.log('❌ No verified sourdough establishments found');
      return;
    }

    console.log(`🎯 Found ${verifiedResults.length} verified sourdough establishments:`);

    verifiedResults
      .sort((a, b) => {
        const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      })
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name} [${result.confidence.toUpperCase()}]`);
        console.log(`   📍 ${result.address}`);
        if (result.website) console.log(`   🌐 ${result.website}`);
        if (result.phone) console.log(`   📞 ${result.phone}`);
        console.log(`   ✅ Sources: ${result.sources.join(', ')}`);
        console.log(`   🔍 Keywords: ${result.keywords.join(', ')}`);
        console.log(`   📊 Discovery: ${result.discoverySource}`);
        console.log(`   ⭐ Rating: ${result.rating}`);
      });

    console.log(`\n📊 MULTI-SOURCE SUMMARY:`);
    console.log(`   Total analyzed: ${this.allDiscoveries.size} establishments`);
    console.log(`   Verified sourdough: ${verifiedResults.length}`);
    
    const bySource = verifiedResults.reduce((acc, r) => {
      acc[r.discoverySource] = (acc[r.discoverySource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   Discovery breakdown:`);
    for (const [source, count] of Object.entries(bySource)) {
      console.log(`     ${source}: ${count}`);
    }
  }
}

export async function multiSourceDiscovery() {
  const discovery = new MultiSourceDiscovery();
  const results = await discovery.executeMultiSourceDiscovery();
  
  console.log(`\n🏆 MULTI-SOURCE DISCOVERY COMPLETE: ${results.length} verified establishments`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  multiSourceDiscovery().catch(console.error);
}