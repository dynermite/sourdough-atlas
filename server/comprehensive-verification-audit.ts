#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ComprehensiveResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  sources: string[];
  keywords: string[];
  confidence: 'high' | 'medium' | 'low';
  discoveryMethod: string;
}

class ComprehensiveVerificationAudit {
  private apiKey: string;
  private sourdoughKeywords = [
    'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented',
    'natural fermentation', 'long fermentation', 'slow rise', 'mother dough',
    'levain', 'starter', 'wild fermentation'
  ];
  private totalAPIRequests = 0;
  private allFindings: Map<string, ComprehensiveResult> = new Map();

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async executeComprehensiveAudit() {
    console.log('🔍 COMPREHENSIVE SOURDOUGH VERIFICATION AUDIT');
    console.log('=' .repeat(55));
    console.log('Goal: Leave no sourdough establishment undetected using multi-layered approach');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Phase 1: Direct sourdough-focused searches
    await this.directSourdoughSearches();
    
    // Phase 2: Neighborhood + sourdough searches  
    await this.neighborhoodSourdoughSearches();
    
    // Phase 3: Artisan/craft pizza searches (these often use sourdough)
    await this.artisanPizzaSearches();
    
    // Phase 4: Website verification of all found establishments
    await this.comprehensiveWebsiteVerification();

    const finalResults = Array.from(this.allFindings.values());
    this.displayComprehensiveResults(finalResults);
    
    return finalResults;
  }

  async directSourdoughSearches() {
    console.log('\n📍 PHASE 1: DIRECT SOURDOUGH SEARCHES');
    
    const searches = [
      { query: 'sourdough pizza San Francisco CA', limit: 50, method: 'Direct sourdough search' },
      { query: 'naturally leavened pizza San Francisco', limit: 30, method: 'Natural fermentation search' },
      { query: 'wild yeast pizza San Francisco', limit: 20, method: 'Wild yeast search' },
      { query: 'sourdough crust pizza San Francisco', limit: 30, method: 'Sourdough crust search' },
      { query: 'artisan sourdough pizza San Francisco', limit: 25, method: 'Artisan sourdough search' }
    ];

    await this.executeSearchPhase(searches);
  }

  async neighborhoodSourdoughSearches() {
    console.log('\n🏘️  PHASE 2: NEIGHBORHOOD + SOURDOUGH SEARCHES');
    
    const neighborhoods = [
      'Mission District', 'Castro', 'Haight', 'Richmond', 'Sunset',
      'Potrero Hill', 'Dogpatch', 'Mission Bay', 'SOMA', 'North Beach',
      'Chinatown', 'Marina', 'Pacific Heights', 'Noe Valley', 'Bernal Heights'
    ];

    const searches = neighborhoods.map(neighborhood => ({
      query: `sourdough pizza ${neighborhood} San Francisco`,
      limit: 15,
      method: `Neighborhood sourdough (${neighborhood})`
    }));

    await this.executeSearchPhase(searches);
  }

  async artisanPizzaSearches() {
    console.log('\n🎨 PHASE 3: ARTISAN/CRAFT PIZZA SEARCHES');
    
    const searches = [
      { query: 'artisan pizza San Francisco CA', limit: 50, method: 'Artisan pizza search' },
      { query: 'craft pizza San Francisco CA', limit: 40, method: 'Craft pizza search' },
      { query: 'wood fired pizza San Francisco CA', limit: 40, method: 'Wood fired search' },
      { query: 'neapolitan pizza San Francisco CA', limit: 30, method: 'Neapolitan search' },
      { query: 'authentic pizza San Francisco CA', limit: 35, method: 'Authentic pizza search' },
      { query: 'traditional pizza San Francisco CA', limit: 30, method: 'Traditional pizza search' }
    ];

    await this.executeSearchPhase(searches);
  }

  async executeSearchPhase(searches: Array<{query: string, limit: number, method: string}>) {
    for (let i = 0; i < searches.length; i++) {
      const { query, limit, method } = searches[i];
      console.log(`   [${i + 1}/${searches.length}] ${method}: "${query}"`);
      
      try {
        const results = await this.robustSearch(query, limit);
        const processed = await this.processSearchResults(results, method);
        
        console.log(`      Found: ${results.length}, Processed: ${processed}, Total unique: ${this.allFindings.size}`);
        
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
        
        if (!this.allFindings.has(key)) {
          // Check for immediate sourdough indicators in Google Business profile
          const profileKeywords = this.findSourdoughKeywords(result.description || '');
          
          if (profileKeywords.length > 0) {
            this.allFindings.set(key, {
              name: result.name,
              address: result.full_address || result.address || '',
              phone: result.phone,
              website: result.website || result.site,
              sources: ['Google Business Profile'],
              keywords: profileKeywords,
              confidence: profileKeywords.length > 1 ? 'medium' : 'low',
              discoveryMethod
            });
            processed++;
          } else {
            // Add to findings for website verification even if no immediate keywords
            this.allFindings.set(key, {
              name: result.name,
              address: result.full_address || result.address || '',
              phone: result.phone,
              website: result.website || result.site,
              sources: [],
              keywords: [],
              confidence: 'low',
              discoveryMethod
            });
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

  async comprehensiveWebsiteVerification() {
    console.log('\n🌐 PHASE 4: COMPREHENSIVE WEBSITE VERIFICATION');
    
    const establishments = Array.from(this.allFindings.values());
    const establishmentsWithWebsites = establishments.filter(est => 
      est.website && this.isValidWebsite(est.website)
    );
    
    console.log(`Verifying websites for ${establishmentsWithWebsites.length}/${establishments.length} establishments...`);
    
    let verified = 0;
    
    for (let i = 0; i < establishmentsWithWebsites.length; i++) {
      const establishment = establishmentsWithWebsites[i];
      console.log(`   [${i + 1}/${establishmentsWithWebsites.length}] ${establishment.name}`);
      
      try {
        const websiteKeywords = await this.analyzeRestaurantWebsite(establishment.website!);
        
        if (websiteKeywords.length > 0) {
          console.log(`      ✅ Website verified: ${websiteKeywords.join(', ')}`);
          
          // Update the finding
          const key = `${establishment.name}_${establishment.address}`;
          const existingFinding = this.allFindings.get(Array.from(this.allFindings.keys()).find(k => 
            this.allFindings.get(k)?.name === establishment.name
          ) || '');
          
          if (existingFinding) {
            if (!existingFinding.sources.includes('Restaurant Website')) {
              existingFinding.sources.push('Restaurant Website');
            }
            existingFinding.keywords.push(...websiteKeywords);
            existingFinding.keywords = [...new Set(existingFinding.keywords)]; // Remove duplicates
            
            // Update confidence based on sources and keywords
            if (existingFinding.sources.length >= 2) {
              existingFinding.confidence = 'high';
            } else if (existingFinding.keywords.length >= 2) {
              existingFinding.confidence = 'medium';
            }
            
            verified++;
          }
        } else {
          console.log(`      ❌ No sourdough keywords found`);
        }
        
      } catch (error) {
        console.log(`      ⚠️  Website check failed: ${error.message}`);
      }
      
      // Rate limiting
      if (i < establishmentsWithWebsites.length - 1 && i % 10 === 9) {
        console.log(`      ⏳ Pausing after ${i + 1} checks...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
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
        timeout: 10000,
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
        'google.com', 'maps.google.com', 'foursquare.com', 'order.online'
      ];
      
      return !excludedDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }

  displayComprehensiveResults(results: ComprehensiveResult[]) {
    console.log('\n🍞 COMPREHENSIVE SOURDOUGH PIZZA AUDIT RESULTS');
    console.log('=' .repeat(60));
    
    // Filter for verified sourdough establishments only
    const verifiedResults = results.filter(r => r.keywords.length > 0);
    
    if (verifiedResults.length === 0) {
      console.log('❌ No verified sourdough pizzerias found');
      return;
    }

    console.log(`Found ${verifiedResults.length} verified sourdough establishments:`);

    // Sort by confidence then name
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
        console.log(`   📊 Discovery Method: ${result.discoveryMethod}`);
      });

    console.log(`\n📊 COMPREHENSIVE AUDIT SUMMARY:`);
    console.log(`   Total establishments analyzed: ${results.length}`);
    console.log(`   Verified sourdough establishments: ${verifiedResults.length}`);
    console.log(`   API requests used: ${this.totalAPIRequests}`);
    
    const byConfidence = verifiedResults.reduce((acc, r) => {
      acc[r.confidence] = (acc[r.confidence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   High confidence: ${byConfidence.high || 0}`);
    console.log(`   Medium confidence: ${byConfidence.medium || 0}`);
    console.log(`   Low confidence: ${byConfidence.low || 0}`);
    
    console.log(`\n🎯 Comprehensive audit complete - maximum coverage achieved!`);
  }
}

export async function comprehensiveVerificationAudit() {
  const audit = new ComprehensiveVerificationAudit();
  const results = await audit.executeComprehensiveAudit();
  
  console.log(`\n🏆 COMPREHENSIVE AUDIT COMPLETE: ${results.filter(r => r.keywords.length > 0).length} verified sourdough establishments`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  comprehensiveVerificationAudit().catch(console.error);
}