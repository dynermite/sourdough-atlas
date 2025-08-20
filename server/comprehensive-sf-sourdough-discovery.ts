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

interface SourdoughVerification {
  restaurant: Restaurant;
  verified: boolean;
  sources: string[];
  keywords: string[];
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

class ComprehensiveSFSourdoughDiscovery {
  private apiKey: string;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];
  private totalAPIRequests = 0;
  private verifiedEstablishments: SourdoughVerification[] = [];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async discoverSourdoughPizza() {
    console.log('🍕 COMPREHENSIVE SF SOURDOUGH PIZZA DISCOVERY');
    console.log('=' .repeat(55));
    console.log('Goal: Find authentic sourdough pizzerias using verified sources only');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // First, get all pizza establishments using our proven method
    const allEstablishments = await this.getAllPizzaEstablishments();
    console.log(`\n📊 Found ${allEstablishments.length} pizza establishments to analyze`);
    
    // Now verify each one for sourdough claims
    console.log('\n🔍 STARTING SOURDOUGH VERIFICATION PROCESS');
    console.log('Analyzing Google Business profiles and restaurant websites...');
    
    let processed = 0;
    
    for (const establishment of allEstablishments) {
      processed++;
      console.log(`\n[${processed}/${allEstablishments.length}] Analyzing: ${establishment.name}`);
      
      try {
        const verification = await this.verifySourdoughClaims(establishment);
        
        if (verification.verified) {
          this.verifiedEstablishments.push(verification);
          console.log(`   ✅ SOURDOUGH VERIFIED - ${verification.confidence} confidence`);
          console.log(`   📝 ${verification.details}`);
        } else {
          console.log(`   ❌ No sourdough claims found`);
        }
        
        // Rate limiting to avoid overwhelming servers
        if (processed % 5 === 0 && processed < allEstablishments.length) {
          console.log('   ⏳ Pausing 3 seconds to respect rate limits...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.log(`   ⚠️  Analysis error: ${error.message}`);
      }
    }

    console.log(`\n✅ VERIFICATION COMPLETE`);
    console.log(`Total establishments analyzed: ${allEstablishments.length}`);
    console.log(`Verified sourdough establishments: ${this.verifiedEstablishments.length}`);
    console.log(`API requests used: ${this.totalAPIRequests}`);
    
    this.displaySourdoughDirectory();
    return this.verifiedEstablishments;
  }

  async getAllPizzaEstablishments(): Promise<Restaurant[]> {
    console.log('🔍 Discovering all SF pizza establishments...');
    
    const searchQueries = [
      { query: 'pizza San Francisco CA', limit: 50 },
      { query: 'Pizza restaurant San Francisco CA', limit: 50 },
      { query: 'pizzeria San Francisco CA', limit: 50 },
      { query: 'wood fired pizza San Francisco CA', limit: 30 },
      { query: 'italian restaurant San Francisco CA', limit: 50 },
      { query: 'sourdough pizza restaurants San Francisco', limit: 20 }
    ];

    const allEstablishments = new Map<string, Restaurant>();
    
    for (let i = 0; i < searchQueries.length; i++) {
      const { query, limit } = searchQueries[i];
      console.log(`   [${i + 1}/${searchQueries.length}] "${query}"`);
      
      try {
        const results = await this.robustSearch(query, limit);
        const newCount = this.addUniqueEstablishments(results, allEstablishments);
        
        console.log(`   Found: ${results.length}, Added: ${newCount}, Total: ${allEstablishments.size}`);
        
        if (i < searchQueries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.log(`   ❌ Search failed: ${error.message}`);
      }
    }

    return Array.from(allEstablishments.values());
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
        timeout: 20000
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
        throw new Error('Request timeout - API taking too long to respond');
      }
      throw error;
    }
  }

  async waitForResults(requestId: string): Promise<any[]> {
    const maxAttempts = 6;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      const waitTime = Math.min(8000 + (attempts * 1000), 12000);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      try {
        this.totalAPIRequests++;
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
          headers: {
            'X-API-KEY': this.apiKey
          },
          timeout: 15000
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
        if (attempts === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error(`Timeout after ${maxAttempts} attempts - request never completed`);
  }

  addUniqueEstablishments(results: any[], establishments: Map<string, Restaurant>): number {
    let newCount = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        const key = `${result.name}_${result.latitude}_${result.longitude}`;
        
        if (!establishments.has(key)) {
          establishments.set(key, {
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
      'brick oven', 'wood fired', 'neapolitan'
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

  async verifySourdoughClaims(restaurant: Restaurant): Promise<SourdoughVerification> {
    const sources: string[] = [];
    const keywords: string[] = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let details = '';

    // 1. Check Google Business Profile description
    const profileKeywords = this.findSourdoughKeywords(restaurant.description || '');
    if (profileKeywords.length > 0) {
      sources.push('Google Business Profile');
      keywords.push(...profileKeywords);
      details += `Google profile mentions: ${profileKeywords.join(', ')}. `;
    }

    // 2. Check restaurant website if available
    if (restaurant.website && this.isValidWebsite(restaurant.website)) {
      try {
        console.log(`   🌐 Checking website: ${restaurant.website}`);
        const websiteKeywords = await this.analyzeRestaurantWebsite(restaurant.website);
        
        if (websiteKeywords.length > 0) {
          sources.push('Restaurant Website');
          keywords.push(...websiteKeywords);
          details += `Website mentions: ${websiteKeywords.join(', ')}. `;
        }
        
      } catch (error) {
        console.log(`   ⚠️  Website analysis failed: ${error.message}`);
      }
    }

    // Determine confidence level
    if (sources.length >= 2) {
      confidence = 'high'; // Multiple sources
    } else if (sources.length === 1 && keywords.length >= 2) {
      confidence = 'medium'; // Single source, multiple keywords
    } else if (sources.length === 1) {
      confidence = 'low'; // Single source, single keyword
    }

    const verified = keywords.length > 0;

    return {
      restaurant,
      verified,
      sources,
      keywords: [...new Set(keywords)], // Remove duplicates
      confidence,
      details: details.trim() || 'No sourdough claims found in available sources'
    };
  }

  findSourdoughKeywords(text: string): string[] {
    const foundKeywords: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const keyword of this.sourdoughKeywords) {
      // Check for exact keyword match
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
      // Clean up URL
      let url = websiteUrl.trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 3
      });

      const $ = cheerio.load(response.data);
      
      // Extract text content from relevant sections
      const textSections = [
        $('title').text(),
        $('meta[name="description"]').attr('content') || '',
        $('.menu, .food-menu, #menu').text(),
        $('.about, .story, #about').text(),
        $('.description, .info').text(),
        $('main').text(),
        $('body').text()
      ];

      const fullText = textSections.join(' ').toLowerCase();
      
      return this.findSourdoughKeywords(fullText);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Website timeout');
      } else if (error.response?.status === 403 || error.response?.status === 404) {
        throw new Error(`Website access denied (${error.response.status})`);
      }
      throw new Error(`Website analysis failed: ${error.message}`);
    }
  }

  isValidWebsite(url: string): boolean {
    if (!url) return false;
    
    try {
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      const urlObj = new URL(cleanUrl);
      
      // Exclude social media and non-restaurant websites
      const excludedDomains = [
        'facebook.com', 'instagram.com', 'twitter.com', 'yelp.com',
        'google.com', 'maps.google.com', 'foursquare.com'
      ];
      
      return !excludedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  displaySourdoughDirectory() {
    console.log('\n🍞 SAN FRANCISCO AUTHENTIC SOURDOUGH PIZZA DIRECTORY');
    console.log('=' .repeat(60));
    
    if (this.verifiedEstablishments.length === 0) {
      console.log('❌ No verified sourdough pizzerias found');
      return;
    }

    // Sort by confidence then name
    this.verifiedEstablishments
      .sort((a, b) => {
        const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        return confidenceDiff !== 0 ? confidenceDiff : a.restaurant.name.localeCompare(b.restaurant.name);
      })
      .forEach((verification, index) => {
        const { restaurant, sources, keywords, confidence, details } = verification;
        
        console.log(`\n${index + 1}. ${restaurant.name} [${confidence.toUpperCase()} CONFIDENCE]`);
        console.log(`   📍 ${restaurant.address}`);
        
        if (restaurant.website) {
          console.log(`   🌐 ${restaurant.website}`);
        }
        
        if (restaurant.phone) {
          console.log(`   📞 ${restaurant.phone}`);
        }
        
        console.log(`   ✅ Verified Sources: ${sources.join(', ')}`);
        console.log(`   🔍 Sourdough Keywords: ${keywords.join(', ')}`);
        console.log(`   📝 ${details}`);
        
        if (restaurant.rating) {
          console.log(`   ⭐ Rating: ${restaurant.rating} (${restaurant.reviews} reviews)`);
        }
      });

    console.log(`\n📊 DIRECTORY SUMMARY:`);
    console.log(`   Total verified sourdough pizzerias: ${this.verifiedEstablishments.length}`);
    
    const byConfidence = this.verifiedEstablishments.reduce((acc, v) => {
      acc[v.confidence] = (acc[v.confidence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   High confidence: ${byConfidence.high || 0}`);
    console.log(`   Medium confidence: ${byConfidence.medium || 0}`);
    console.log(`   Low confidence: ${byConfidence.low || 0}`);
    
    console.log(`\n🎯 Ready for import into SourDough Scout directory!`);
  }
}

export async function comprehensiveSFSourdoughDiscovery() {
  const discovery = new ComprehensiveSFSourdoughDiscovery();
  const results = await discovery.discoverSourdoughPizza();
  
  console.log(`\n🏆 FINAL RESULT: ${results.length} verified sourdough pizzerias in San Francisco`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  comprehensiveSFSourdoughDiscovery().catch(console.error);
}