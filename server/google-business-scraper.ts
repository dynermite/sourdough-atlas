import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface BusinessListing {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  googleUrl?: string;
  confidence: number;
}

interface SourdoughAnalysis {
  keywords: string[];
  isVerified: boolean;
  description: string;
  confidence: number;
}

export class GoogleBusinessScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'natural fermentation',
    'levain',
    'slow rise',
    'artisan dough'
  ];

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  // Search for pizza restaurants using Google-like queries
  async discoverPizzaBusinesses(city: string, state: string): Promise<BusinessListing[]> {
    const businesses: BusinessListing[] = [];
    
    console.log(`🔍 Discovering pizza businesses in ${city}, ${state}...`);
    
    // Use multiple search engines and strategies
    const searchQueries = [
      `pizza restaurant ${city} ${state} site:google.com`,
      `pizzeria ${city} ${state} site:google.com`,
      `"${city} ${state}" pizza restaurant`,
      `wood fired pizza ${city} ${state}`,
      `artisan pizza ${city} ${state}`,
      `neapolitan pizza ${city} ${state}`
    ];

    for (const query of searchQueries) {
      try {
        console.log(`  🔎 Searching: ${query}`);
        const results = await this.searchBusinesses(query, city, state);
        businesses.push(...results);
        
        // Respectful delay between searches
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(`    ❌ Search failed: ${error.message}`);
      }
    }

    // Also try direct Google Business searches
    const directBusinesses = await this.searchDirectBusinesses(city, state);
    businesses.push(...directBusinesses);

    return this.deduplicateBusinesses(businesses);
  }

  // Search for businesses using web search
  private async searchBusinesses(query: string, city: string, state: string): Promise<BusinessListing[]> {
    const businesses: BusinessListing[] = [];
    
    try {
      // Use DuckDuckGo as it's more permissive
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      const $ = cheerio.load(response.data);
      
      // Look for business listings and websites
      $('a').each((_, element) => {
        const link = $(element);
        const href = link.attr('href');
        const text = link.text().trim();
        
        if (!href || text.length < 3) return;
        
        // Check if this looks like a restaurant business
        if (this.isRestaurantBusiness(href, text)) {
          const name = this.cleanBusinessName(text);
          if (name && name.length > 2) {
            businesses.push({
              name,
              website: this.extractWebsiteUrl(href),
              googleUrl: href.includes('google.com') ? href : undefined,
              confidence: this.calculateConfidence(href, text)
            });
          }
        }
      });

    } catch (error) {
      console.log(`      ❌ Failed to search "${query}":`, error.message);
    }

    return businesses;
  }

  // Search for businesses using known patterns
  private async searchDirectBusinesses(city: string, state: string): Promise<BusinessListing[]> {
    const businesses: BusinessListing[] = [];
    
    // Generate potential business website patterns
    const citySlug = city.toLowerCase().replace(/\s+/g, '');
    const patterns = [
      // Common pizza restaurant naming patterns
      `${citySlug}pizza`,
      `pizza${citySlug}`,
      `${citySlug}pizzeria`,
      `pizzeria${citySlug}`,
      // Individual restaurant guesses based on common names
      'tonyssourodugh', 'kensartisan', 'apizzascholls', 'lovelysscott',
      'pizzacreature', 'turningpeel', 'delancey', 'roberta', 'nostrana'
    ];

    for (const pattern of patterns) {
      const domains = [`https://www.${pattern}.com`, `https://${pattern}.com`];
      
      for (const domain of domains) {
        try {
          // Quick HEAD request to check if site exists
          const response = await axios.head(domain, {
            timeout: 5000,
            headers: { 'User-Agent': this.getRandomUserAgent() },
            maxRedirects: 3
          });
          
          if (response.status === 200) {
            // Site exists, try to extract business info
            const businessInfo = await this.extractBusinessInfo(domain);
            if (businessInfo && businessInfo.name) {
              businesses.push({
                ...businessInfo,
                website: domain,
                confidence: 0.7
              });
            }
          }
          
        } catch (error) {
          // Expected - most patterns won't exist
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`  📍 Found ${businesses.length} direct businesses`);
    return businesses;
  }

  // Extract business information from a website
  private async extractBusinessInfo(url: string): Promise<BusinessListing | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': this.getRandomUserAgent() }
      });

      const $ = cheerio.load(response.data);
      
      const title = $('title').text();
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      
      // Check if this is actually a pizza restaurant
      const content = `${title} ${metaDesc}`.toLowerCase();
      if (!content.includes('pizza') && !content.includes('pizzeria')) {
        return null;
      }

      // Extract business details
      const name = this.extractBusinessName($);
      const address = this.extractAddress($);
      const phone = this.extractPhone($);
      
      return {
        name: name || this.cleanBusinessName(title),
        address,
        phone,
        description: metaDesc,
        confidence: 0.8
      };

    } catch (error) {
      return null;
    }
  }

  // Extract business name from webpage
  private extractBusinessName($: cheerio.CheerioAPI): string | null {
    // Look for common business name patterns
    const selectors = [
      'h1',
      '.restaurant-name',
      '.business-name', 
      '[class*="name"]',
      'title'
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      const text = element.text().trim();
      if (text.length > 2 && text.length < 100) {
        return this.cleanBusinessName(text);
      }
    }

    return null;
  }

  // Extract address from webpage
  private extractAddress($: cheerio.CheerioAPI): string | null {
    // Look for address patterns
    const addressSelectors = [
      '[class*="address"]',
      '[id*="address"]',
      '.contact-info',
      '.location'
    ];

    for (const selector of addressSelectors) {
      const text = $(selector).text().trim();
      if (this.looksLikeAddress(text)) {
        return text;
      }
    }

    // Look for address patterns in text
    const bodyText = $('body').text();
    const addressMatch = bodyText.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/);
    
    return addressMatch ? addressMatch[0] : null;
  }

  // Extract phone from webpage
  private extractPhone($: cheerio.CheerioAPI): string | null {
    const phoneSelectors = [
      '[class*="phone"]',
      '[id*="phone"]',
      '.contact-info'
    ];

    for (const selector of phoneSelectors) {
      const text = $(selector).text().trim();
      const phoneMatch = text.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
      if (phoneMatch) {
        return phoneMatch[0];
      }
    }

    return null;
  }

  // Check if text looks like an address
  private looksLikeAddress(text: string): boolean {
    return /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)/.test(text) &&
           text.length > 10 && text.length < 200;
  }

  // Check if this looks like a restaurant business
  private isRestaurantBusiness(url: string, text: string): boolean {
    const lowerUrl = url.toLowerCase();
    const lowerText = text.toLowerCase();
    
    const restaurantIndicators = ['pizza', 'pizzeria', 'restaurant', 'kitchen', 'eatery'];
    const hasIndicator = restaurantIndicators.some(indicator => 
      lowerUrl.includes(indicator) || lowerText.includes(indicator)
    );

    // Exclude unwanted domains
    const excludeDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'yelp.com', 'wikipedia.org'];
    const isExcluded = excludeDomains.some(domain => lowerUrl.includes(domain));

    return hasIndicator && !isExcluded;
  }

  // Extract website URL from various formats
  private extractWebsiteUrl(href: string): string {
    // Handle redirects and encoded URLs
    if (href.includes('duckduckgo.com/l/?uddg=')) {
      try {
        const urlMatch = href.match(/uddg=([^&]+)/);
        if (urlMatch) {
          return decodeURIComponent(urlMatch[1]);
        }
      } catch (error) {
        // Fall back to original URL
      }
    }
    
    return href;
  }

  // Calculate confidence score for business
  private calculateConfidence(url: string, text: string): number {
    let score = 0.5;
    
    if (url.includes('google.com')) score += 0.3;
    if (text.toLowerCase().includes('pizza')) score += 0.2;
    if (url.includes('.com') || url.includes('.net')) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  // Clean business name
  private cleanBusinessName(name: string): string {
    return name
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*-\s*.*$/, '')
      .replace(/\s*\|.*$/, '')
      .replace(/\s*\(.*\)$/, '')
      .trim();
  }

  // Remove duplicate businesses
  private deduplicateBusinesses(businesses: BusinessListing[]): BusinessListing[] {
    const seen = new Set<string>();
    const unique: BusinessListing[] = [];
    
    for (const business of businesses) {
      const key = business.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
      if (!seen.has(key) && business.name.length > 2) {
        seen.add(key);
        unique.push(business);
      }
    }
    
    return unique;
  }

  // Analyze website for sourdough content
  async analyzeBusinessForSourdough(business: BusinessListing): Promise<SourdoughAnalysis> {
    const sources: string[] = [];
    
    // Analyze website if available
    if (business.website) {
      const websiteAnalysis = await this.analyzeWebsite(business.website);
      if (websiteAnalysis.keywords.length > 0) {
        return websiteAnalysis;
      }
    }

    // Analyze Google Business description if available
    if (business.description) {
      const descAnalysis = this.analyzeText(business.description, 'Google Business Profile');
      if (descAnalysis.keywords.length > 0) {
        return descAnalysis;
      }
    }

    return {
      keywords: [],
      isVerified: false,
      description: '',
      confidence: 0
    };
  }

  // Analyze website content
  private async analyzeWebsite(url: string): Promise<SourdoughAnalysis> {
    try {
      console.log(`      🌐 Analyzing website: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 12000,
        headers: { 'User-Agent': this.getRandomUserAgent() }
      });

      const $ = cheerio.load(response.data);
      
      const title = $('title').text().toLowerCase();
      const metaDesc = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      const bodyText = $('body').text().toLowerCase();
      const menuText = $('.menu, #menu, [class*="menu"]').text().toLowerCase();
      
      const allText = `${title} ${metaDesc} ${bodyText} ${menuText}`;
      
      return this.analyzeText(allText, 'website');

    } catch (error) {
      console.log(`        ❌ Website analysis failed: ${error.message}`);
      return { keywords: [], isVerified: false, description: '', confidence: 0 };
    }
  }

  // Analyze text content for sourdough keywords
  private analyzeText(text: string, source: string): SourdoughAnalysis {
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];
    let score = 0;

    // Check for sourdough keywords
    for (const keyword of this.SOURDOUGH_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      
      if (matches) {
        foundKeywords.push(keyword);
        const keywordWeight = keyword === 'sourdough' ? 4 : 
                             keyword === 'naturally leavened' ? 4 :
                             keyword === 'wild yeast' ? 3 : 2;
        score += matches.length * keywordWeight;
      }
    }

    const confidence = Math.min(score / 6, 1.0);
    const isVerified = foundKeywords.length > 0 && confidence > 0.3;

    let description = '';
    if (isVerified) {
      description = `Verified sourdough keywords found in ${source}: ${foundKeywords.join(', ')}`;
    }

    return {
      keywords: foundKeywords,
      isVerified,
      description,
      confidence
    };
  }

  // Add verified business to database
  async addVerifiedBusiness(business: BusinessListing, analysis: SourdoughAnalysis, city: string, state: string): Promise<boolean> {
    try {
      // Check if business already exists
      if (business.website) {
        const existing = await db.select().from(restaurants).where(eq(restaurants.website, business.website));
        if (existing.length > 0) {
          console.log(`        🔄 ${business.name} already exists, skipping`);
          return false;
        }
      }

      const restaurantData = {
        name: business.name,
        address: business.address || `${city}, ${state}`,
        city,
        state,
        zipCode: business.address?.match(/\d{5}/)?.[0] || '',
        phone: business.phone || '',
        website: business.website || '',
        description: analysis.description || `Pizza restaurant discovered through Google Business search`,
        sourdoughVerified: analysis.isVerified ? 1 : 0,
        sourdoughKeywords: analysis.keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: analysis.isVerified ? [analysis.description] : []
      };

      await db.insert(restaurants).values(restaurantData);
      
      const status = analysis.isVerified ? '✅ VERIFIED' : '❌ No sourdough';
      console.log(`        ${status}: ${business.name} (${Math.round(analysis.confidence * 100)}%)`);
      
      return analysis.isVerified;
      
    } catch (error) {
      console.log(`        ❌ Failed to add ${business.name}:`, error.message);
      return false;
    }
  }

  // Main scraping function
  async scrapeGoogleBusinesses(city: string, state: string): Promise<void> {
    console.log(`\n🏢 Google Business scraping for ${city}, ${state}...`);
    
    try {
      // Discover pizza businesses
      const businesses = await this.discoverPizzaBusinesses(city, state);
      console.log(`📋 Found ${businesses.length} pizza businesses`);

      if (businesses.length === 0) {
        console.log('❌ No businesses discovered');
        return;
      }

      let verified = 0;
      let analyzed = 0;

      // Analyze each business (limit to prevent timeout)
      const businessesToAnalyze = businesses.slice(0, 20);
      
      for (const business of businessesToAnalyze) {
        console.log(`    🔍 Analyzing: ${business.name}`);
        
        const analysis = await this.analyzeBusinessForSourdough(business);
        const added = await this.addVerifiedBusiness(business, analysis, city, state);
        
        if (added) verified++;
        analyzed++;
        
        // Respectful delay
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      console.log(`\n🎉 Google Business scraping complete!`);
      console.log(`   📊 Analyzed: ${analyzed} businesses`);
      console.log(`   ✅ Verified: ${verified} sourdough restaurants`);
      
    } catch (error) {
      console.error('❌ Google Business scraping failed:', error);
    }
  }
}

// Test function for Portland
export async function testGoogleBusinessScraping() {
  const scraper = new GoogleBusinessScraper();
  await scraper.scrapeGoogleBusinesses('Portland', 'OR');
}