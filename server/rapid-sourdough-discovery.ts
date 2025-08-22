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
}

class RapidSourdoughDiscovery {
  private apiKey: string;
  private sourdoughKeywords = [
    'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'
  ];
  private totalAPIRequests = 0;
  private allDiscoveries: Map<string, DiscoveredEstablishment> = new Map();

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async executeRapidDiscovery() {
    console.log('🚀 RAPID COMPREHENSIVE SOURDOUGH DISCOVERY');
    console.log('=' .repeat(50));
    console.log('Optimized for speed and maximum coverage');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Focus on most productive searches
    await this.coreHighVolumeSearches();
    await this.targetedSourdoughSearches();
    await this.priorityNeighborhoodSearches();
    await this.rapidWebsiteVerification();

    const verifiedResults = this.getVerifiedResults();
    await this.addToDatabase(verifiedResults);
    
    this.displayResults(verifiedResults);
    return verifiedResults;
  }

  async coreHighVolumeSearches() {
    console.log('\n🎯 PHASE 1: CORE HIGH-VOLUME SEARCHES');
    
    const searches = [
      { query: 'pizza restaurants San Francisco CA', limit: 200 },
      { query: 'pizza San Francisco California', limit: 150 },
      { query: 'pizzeria San Francisco', limit: 100 },
      { query: 'artisan pizza San Francisco CA', limit: 100 },
      { query: 'craft pizza San Francisco CA', limit: 80 }
    ];

    await this.executeSearchBatch(searches);
  }

  async targetedSourdoughSearches() {
    console.log('\n🍞 PHASE 2: DIRECT SOURDOUGH SEARCHES');
    
    const searches = [
      { query: 'sourdough pizza San Francisco CA', limit: 100 },
      { query: 'naturally leavened pizza San Francisco', limit: 50 },
      { query: 'sourdough crust pizza San Francisco', limit: 50 },
      { query: 'traditional sourdough pizza San Francisco', limit: 40 }
    ];

    await this.executeSearchBatch(searches);
  }

  async priorityNeighborhoodSearches() {
    console.log('\n🏘️  PHASE 3: PRIORITY NEIGHBORHOOD SEARCHES');
    
    const neighborhoods = [
      'Mission District', 'Castro', 'Richmond District', 'Sunset District',
      'Potrero Hill', 'Mission Bay', 'SOMA', 'North Beach', 'Marina District',
      'Pacific Heights', 'Nob Hill', 'Russian Hill', 'Chinatown'
    ];

    const searches = neighborhoods.map(neighborhood => ({
      query: `pizza ${neighborhood} San Francisco`,
      limit: 25
    }));

    await this.executeSearchBatch(searches);
  }

  async executeSearchBatch(searches: Array<{query: string, limit: number}>) {
    for (let i = 0; i < searches.length; i++) {
      const { query, limit } = searches[i];
      console.log(`   [${i + 1}/${searches.length}] "${query}" (limit: ${limit})`);
      
      try {
        const results = await this.robustSearch(query, limit);
        const processed = await this.processResults(results);
        
        console.log(`      Found: ${results.length}, Processed: ${processed}, Total: ${this.allDiscoveries.size}`);
        
        // Shorter delays for efficiency
        if (i < searches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
      }
    }
  }

  async robustSearch(query: string, limit: number): Promise<any[]> {
    this.totalAPIRequests++;
    
    const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
      params: { query, limit, language: 'en', region: 'US' },
      headers: { 'X-API-KEY': this.apiKey },
      timeout: 25000
    });

    if (response.data.status === 'Error') {
      throw new Error(response.data.error || 'API error');
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
  }

  async waitForResults(requestId: string): Promise<any[]> {
    for (let attempt = 1; attempt <= 6; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      this.totalAPIRequests++;
      const response = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
        headers: { 'X-API-KEY': this.apiKey },
        timeout: 20000
      });

      if (response.data.status === 'Success') {
        let results = response.data.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        return results || [];
      } else if (response.data.status === 'Error') {
        throw new Error(response.data.error || 'Processing failed');
      }
    }

    throw new Error('Timeout after 6 attempts');
  }

  async processResults(results: any[]): Promise<number> {
    let processed = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        const key = `${result.name}_${result.latitude}_${result.longitude}`;
        
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
            confidence: profileKeywords.length > 1 ? 'medium' : 'low'
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

  async rapidWebsiteVerification() {
    console.log('\n🌐 PHASE 4: RAPID WEBSITE VERIFICATION');
    
    const establishments = Array.from(this.allDiscoveries.values());
    const withWebsites = establishments.filter(est => 
      est.website && this.isValidWebsite(est.website)
    );
    
    console.log(`Verifying ${withWebsites.length} websites rapidly...`);
    
    // Process in smaller batches for speed
    const batchSize = 15;
    let verified = 0;
    
    for (let i = 0; i < withWebsites.length; i += batchSize) {
      const batch = withWebsites.slice(i, i + batchSize);
      console.log(`   Batch ${Math.floor(i/batchSize) + 1}: Processing ${batch.length} websites...`);
      
      // Process batch with shorter timeouts
      for (const establishment of batch) {
        try {
          const keywords = await this.quickWebsiteCheck(establishment.website!);
          
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
        } catch (error) {
          // Silently continue on errors for speed
        }
        
        // Short delay between requests
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Pause between batches
      if (i + batchSize < withWebsites.length) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`   Rapid verification complete: ${verified} confirmations`);
  }

  async quickWebsiteCheck(websiteUrl: string): Promise<string[]> {
    let url = websiteUrl.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      timeout: 8000, // Shorter timeout
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SourdoughBot/1.0)' },
      maxRedirects: 3
    });

    const $ = cheerio.load(response.data);
    
    // Focus on key content areas
    const text = [
      $('title').text(),
      $('meta[name="description"]').attr('content') || '',
      $('.menu, #menu, [class*="menu"]').text(),
      $('.about, #about, [class*="about"]').text(),
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
      
      const excluded = ['facebook.com', 'instagram.com', 'twitter.com', 'yelp.com', 'google.com'];
      return !excluded.some(domain => urlObj.hostname.includes(domain));
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
    if (verifiedResults.length === 0) {
      console.log('\n❌ No verified establishments to add');
      return;
    }

    console.log('\n💾 UPDATING DATABASE WITH VERIFIED ESTABLISHMENTS');
    
    // Clear existing data
    await db.delete(restaurants);

    // Add verified establishments
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
        description: `${discovery.description || ''} Verified sourdough: ${discovery.keywords.join(', ')}`.trim(),
        cuisineType: "Pizza",
        priceRange: "$$",
        rating: 4.0,
        isVerified: true
      };
      
      await db.insert(restaurants).values(restaurantData);
    }
    
    console.log(`✅ Added ${verifiedResults.length} verified establishments to database`);
  }

  displayResults(verifiedResults: DiscoveredEstablishment[]) {
    console.log('\n🍞 RAPID DISCOVERY RESULTS');
    console.log('=' .repeat(40));
    
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
      });

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total analyzed: ${this.allDiscoveries.size} establishments`);
    console.log(`   Verified sourdough: ${verifiedResults.length}`);
    console.log(`   API requests: ${this.totalAPIRequests}`);
    
    const byConfidence = verifiedResults.reduce((acc, r) => {
      acc[r.confidence] = (acc[r.confidence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   High confidence: ${byConfidence.high || 0}`);
    console.log(`   Medium confidence: ${byConfidence.medium || 0}`);
    console.log(`   Low confidence: ${byConfidence.low || 0}`);
  }
}

export async function rapidSourdoughDiscovery() {
  const discovery = new RapidSourdoughDiscovery();
  const results = await discovery.executeRapidDiscovery();
  
  console.log(`\n🏆 RAPID DISCOVERY COMPLETE: ${results.length} verified establishments`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  rapidSourdoughDiscovery().catch(console.error);
}