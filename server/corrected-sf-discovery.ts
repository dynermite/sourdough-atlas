#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';

interface SourdoughVerification {
  name: string;
  address: string;
  website?: string;
  phone?: string;
  sources: string[];
  keywords: string[];
  confidence: 'high' | 'medium' | 'low';
}

class CorrectedSFDiscovery {
  private apiKey: string;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];
  private totalAPIRequests = 0;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async findAllSourdoughEstablishments() {
    console.log('🎯 CORRECTED SF SOURDOUGH DISCOVERY');
    console.log('=' .repeat(45));
    console.log('Goal: Find ALL sourdough establishments including missed ones like Long Bridge Pizza');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Key insight: Use the "sourdough pizza San Francisco" search that found 6 establishments
    console.log('\n🔍 Using comprehensive sourdough-focused search...');
    
    const results = await this.robustSearch('sourdough pizza San Francisco', 50);
    console.log(`Found ${results.length} establishments mentioning sourdough`);
    
    const verifiedEstablishments: SourdoughVerification[] = [];
    
    console.log('\n📋 ANALYZING EACH ESTABLISHMENT:');
    
    for (let i = 0; i < results.length; i++) {
      const establishment = results[i];
      console.log(`\n[${i + 1}/${results.length}] ${establishment.name}`);
      console.log(`   📍 ${establishment.full_address || establishment.address}`);
      console.log(`   📝 "${establishment.description || 'No description'}"`);
      
      // Check for sourdough keywords in Google Business description
      const profileKeywords = this.findSourdoughKeywords(establishment.description || '');
      let sources: string[] = [];
      let allKeywords: string[] = [];
      
      if (profileKeywords.length > 0) {
        sources.push('Google Business Profile');
        allKeywords.push(...profileKeywords);
        console.log(`   ✅ Google profile contains: ${profileKeywords.join(', ')}`);
      }
      
      // Check website if available
      if (establishment.website && this.isValidWebsite(establishment.website)) {
        try {
          console.log(`   🌐 Checking website: ${establishment.website}`);
          const websiteKeywords = await this.analyzeRestaurantWebsite(establishment.website);
          
          if (websiteKeywords.length > 0) {
            sources.push('Restaurant Website');
            allKeywords.push(...websiteKeywords);
            console.log(`   ✅ Website contains: ${websiteKeywords.join(', ')}`);
          } else {
            console.log(`   ❌ Website does not mention sourdough`);
          }
          
        } catch (error) {
          console.log(`   ⚠️  Website check failed: ${error.message}`);
        }
      } else if (establishment.website) {
        console.log(`   ⚠️  Skipping invalid website: ${establishment.website}`);
      } else {
        console.log(`   📝 No website available`);
      }
      
      // Determine if this is a verified sourdough establishment
      if (allKeywords.length > 0) {
        let confidence: 'high' | 'medium' | 'low' = 'low';
        
        if (sources.length >= 2) {
          confidence = 'high'; // Multiple sources
        } else if (sources.length === 1 && allKeywords.length >= 2) {
          confidence = 'medium'; // Single source, multiple keywords
        }
        
        verifiedEstablishments.push({
          name: establishment.name,
          address: establishment.full_address || establishment.address || '',
          website: establishment.website || establishment.site,
          phone: establishment.phone,
          sources,
          keywords: [...new Set(allKeywords)],
          confidence
        });
        
        console.log(`   🏆 VERIFIED - ${confidence.toUpperCase()} CONFIDENCE`);
      } else {
        console.log(`   ❌ Not verified as sourdough establishment`);
      }
      
      // Rate limiting
      if (i < results.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    this.displayFinalDirectory(verifiedEstablishments);
    return verifiedEstablishments;
  }

  async robustSearch(query: string, limit: number): Promise<any[]> {
    console.log(`Searching: "${query}" (limit: ${limit})`);
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
        console.log('Request pending, waiting for results...');
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
      
      console.log(`Attempt ${attempts}/${maxAttempts} - waiting ${waitTime/1000}s...`);
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
          console.log(`✅ Results received: ${results ? results.length : 0}`);
          return results || [];
          
        } else if (resultResponse.data.status === 'Error') {
          throw new Error(resultResponse.data.error || 'Request processing failed');
        }
        
        console.log(`Status: ${resultResponse.data.status} (still pending)`);
        
      } catch (error) {
        console.log(`Attempt ${attempts} failed: ${error.message}`);
        if (attempts === maxAttempts) throw error;
      }
    }

    throw new Error(`Timeout after ${maxAttempts} attempts`);
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxRedirects: 3
      });

      const $ = cheerio.load(response.data);
      
      const textSections = [
        $('title').text(),
        $('meta[name="description"]').attr('content') || '',
        $('.menu, .food-menu, #menu').text(),
        $('.about, .story, #about').text(),
        $('.description, .info').text(),
        $('main').text()
      ];

      const fullText = textSections.join(' ');
      return this.findSourdoughKeywords(fullText);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Website timeout');
      } else if (error.response?.status === 403) {
        throw new Error('Website access denied');
      } else if (error.response?.status === 404) {
        throw new Error('Website not found');
      }
      throw new Error(`${error.message}`);
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

  displayFinalDirectory(establishments: SourdoughVerification[]) {
    console.log('\n🍞 COMPLETE SAN FRANCISCO SOURDOUGH PIZZA DIRECTORY');
    console.log('=' .repeat(60));
    
    if (establishments.length === 0) {
      console.log('❌ No verified sourdough pizzerias found');
      return;
    }

    // Sort by confidence then name
    establishments
      .sort((a, b) => {
        const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
        return confidenceDiff !== 0 ? confidenceDiff : a.name.localeCompare(b.name);
      })
      .forEach((establishment, index) => {
        console.log(`\n${index + 1}. ${establishment.name} [${establishment.confidence.toUpperCase()} CONFIDENCE]`);
        console.log(`   📍 ${establishment.address}`);
        
        if (establishment.website) {
          console.log(`   🌐 ${establishment.website}`);
        }
        
        if (establishment.phone) {
          console.log(`   📞 ${establishment.phone}`);
        }
        
        console.log(`   ✅ Verified Sources: ${establishment.sources.join(', ')}`);
        console.log(`   🔍 Sourdough Keywords: ${establishment.keywords.join(', ')}`);
      });

    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`   Total verified sourdough pizzerias: ${establishments.length}`);
    console.log(`   API requests used: ${this.totalAPIRequests}`);
    
    const byConfidence = establishments.reduce((acc, v) => {
      acc[v.confidence] = (acc[v.confidence] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`   High confidence: ${byConfidence.high || 0}`);
    console.log(`   Medium confidence: ${byConfidence.medium || 0}`);
    console.log(`   Low confidence: ${byConfidence.low || 0}`);
    
    console.log(`\n🎯 Directory ready for SourDough Scout database import!`);
  }
}

export async function correctedSFDiscovery() {
  const discovery = new CorrectedSFDiscovery();
  const results = await discovery.findAllSourdoughEstablishments();
  
  console.log(`\n🏆 CORRECTED DISCOVERY COMPLETE: ${results.length} verified sourdough establishments`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  correctedSFDiscovery().catch(console.error);
}