import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface RestaurantListing {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  source: string;
  confidence: number;
}

interface SourdoughVerification {
  isVerified: boolean;
  keywords: string[];
  sources: string[];
  confidence: number;
  description: string;
}

export class ReliableRestaurantScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough',
    'naturally leavened', 
    'wild yeast'
  ];

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
  ];

  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  // Phase 1: Discover pizza restaurants through multiple reliable sources
  async discoverPizzaRestaurants(city: string, state: string): Promise<RestaurantListing[]> {
    console.log(`\n🔍 Discovering pizza restaurants in ${city}, ${state} through reliable sources...`);
    
    const restaurants: RestaurantListing[] = [];
    
    // Method 1: Search for business directories and local listings
    const directorySearches = await this.searchBusinessDirectories(city, state);
    restaurants.push(...directorySearches);
    
    // Method 2: Search for restaurants with common pizza restaurant naming patterns
    const patternRestaurants = await this.findRestaurantsByPattern(city, state);
    restaurants.push(...patternRestaurants);

    // Method 3: Use known high-quality local business sources
    const localBusinesses = await this.findLocalBusinessListings(city, state);
    restaurants.push(...localBusinesses);
    
    return this.deduplicateRestaurants(restaurants);
  }

  // Search business directories for pizza restaurants
  private async searchBusinessDirectories(city: string, state: string): Promise<RestaurantListing[]> {
    const restaurants: RestaurantListing[] = [];
    console.log('  📋 Searching business directories...');
    
    const queries = [
      `pizza restaurant "${city}" "${state}"`,
      `pizzeria "${city}" "${state}"`,
      `"${city} ${state}" pizza delivery`,
      `wood fired pizza "${city}"`
    ];

    for (const query of queries) {
      try {
        const results = await this.performDirectorySearch(query, city, state);
        restaurants.push(...results);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(`    ❌ Directory search failed: ${error.message}`);
      }
    }

    return restaurants;
  }

  // Perform search using web search engines
  private async performDirectorySearch(query: string, city: string, state: string): Promise<RestaurantListing[]> {
    const restaurants: RestaurantListing[] = [];
    
    try {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Look for restaurant websites and business listings
      $('a').each((_, element) => {
        const link = $(element);
        const href = link.attr('href');
        const text = link.text().trim();
        
        if (!href || text.length < 3) return;
        
        // Check if this looks like a restaurant
        if (this.isRestaurantListing(href, text)) {
          const extractedUrl = this.extractCleanUrl(href);
          if (extractedUrl && this.isValidRestaurantWebsite(extractedUrl)) {
            restaurants.push({
              name: this.cleanRestaurantName(text),
              website: extractedUrl,
              source: 'directory_search',
              confidence: 0.7
            });
          }
        }
      });

    } catch (error) {
      console.log(`      ❌ Search failed for "${query}": ${error.message}`);
    }

    return restaurants;
  }

  // Find restaurants by testing common naming patterns
  private async findRestaurantsByPattern(city: string, state: string): Promise<RestaurantListing[]> {
    console.log('  🔤 Testing common restaurant naming patterns...');
    
    const restaurants: RestaurantListing[] = [];
    const citySlug = city.toLowerCase().replace(/\s+/g, '');
    
    // Common pizza restaurant naming patterns
    const patterns = [
      // Location-based patterns
      `${citySlug}pizza`,
      `${citySlug}pizzeria`, 
      `pizza${citySlug}`,
      // Generic but common patterns
      'tonyspizza', 'mariospizza', 'vincespizza', 'antonios', 'ginosplace',
      'northside', 'southside', 'downtown', 'cornerstore', 'familypizza',
      'woodfired', 'artisanpizza', 'craftedpizza', 'stoneovenpizza'
    ];

    for (const pattern of patterns) {
      const domains = [`https://www.${pattern}.com`, `https://${pattern}.com`];
      
      for (const domain of domains) {
        try {
          // Quick check if domain exists
          const response = await axios.head(domain, {
            timeout: 5000,
            headers: { 'User-Agent': this.getRandomUserAgent() },
            maxRedirects: 3
          });
          
          if (response.status === 200) {
            const businessInfo = await this.analyzeBusinessWebsite(domain);
            if (businessInfo && this.isPizzaRestaurant(businessInfo.name, businessInfo.description || '')) {
              restaurants.push({
                name: businessInfo.name,
                website: domain,
                description: businessInfo.description,
                source: 'pattern_discovery',
                confidence: 0.8
              });
              console.log(`    ✅ Found: ${businessInfo.name} at ${domain}`);
            }
          }
        } catch (error) {
          // Expected - most patterns won't exist
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return restaurants;
  }

  // Find local business listings
  private async findLocalBusinessListings(city: string, state: string): Promise<RestaurantListing[]> {
    console.log('  🏢 Searching local business listings...');
    
    const restaurants: RestaurantListing[] = [];
    
    // Known reliable local business sources (not blogs)
    const businessSources = [
      `https://www.${city.toLowerCase().replace(/\s+/g, '')}.gov`, // City government
      `https://www.${city.toLowerCase().replace(/\s+/g, '')}chamber.com`, // Chamber of commerce
      `https://www.visit${city.toLowerCase().replace(/\s+/g, '')}.com` // Tourism/visitor bureau
    ];

    for (const source of businessSources) {
      try {
        const response = await axios.get(source, {
          timeout: 10000,
          headers: { 'User-Agent': this.getRandomUserAgent() }
        });

        const $ = cheerio.load(response.data);
        
        // Look for business directory sections or restaurant listings
        $('a').each((_, element) => {
          const link = $(element);
          const href = link.attr('href');
          const text = link.text().trim();
          
          if (href && this.isRestaurantListing(href, text)) {
            const extractedUrl = this.extractCleanUrl(href);
            if (extractedUrl && this.isValidRestaurantWebsite(extractedUrl)) {
              restaurants.push({
                name: this.cleanRestaurantName(text),
                website: extractedUrl,
                source: 'local_business_listing',
                confidence: 0.9
              });
            }
          }
        });

      } catch (error) {
        console.log(`    ⚠️  Could not access ${source}: ${error.message}`);
      }
    }

    return restaurants;
  }

  // Analyze a business website to extract information
  private async analyzeBusinessWebsite(url: string): Promise<{ name: string; description?: string } | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': this.getRandomUserAgent() }
      });

      const $ = cheerio.load(response.data);
      
      const title = $('title').text().trim();
      const metaDesc = $('meta[name="description"]').attr('content') || '';
      const h1 = $('h1').first().text().trim();
      
      const name = h1 || this.cleanRestaurantName(title);
      
      return {
        name,
        description: metaDesc
      };

    } catch (error) {
      return null;
    }
  }

  // Check if this is a pizza restaurant
  private isPizzaRestaurant(name: string, description: string): boolean {
    const content = `${name} ${description}`.toLowerCase();
    const pizzaKeywords = ['pizza', 'pizzeria', 'pizze', 'pie'];
    return pizzaKeywords.some(keyword => content.includes(keyword));
  }

  // Check if URL/text looks like a restaurant listing
  private isRestaurantListing(url: string, text: string): boolean {
    const lowerUrl = url.toLowerCase();
    const lowerText = text.toLowerCase();
    
    const restaurantIndicators = ['pizza', 'pizzeria', 'restaurant'];
    const hasIndicator = restaurantIndicators.some(indicator => 
      lowerUrl.includes(indicator) || lowerText.includes(indicator)
    );

    // Exclude blogs and review sites
    const excludePatterns = [
      'blog', 'review', 'best', 'top', 'guide', 'eater.com', 'yelp.com', 
      'tripadvisor.com', 'facebook.com', 'instagram.com', 'twitter.com'
    ];
    const isExcluded = excludePatterns.some(pattern => 
      lowerUrl.includes(pattern) || lowerText.includes(pattern)
    );

    return hasIndicator && !isExcluded;
  }

  // Check if URL is a valid restaurant website
  private isValidRestaurantWebsite(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    const excludePatterns = [
      'google.com', 'facebook.com', 'instagram.com', 'twitter.com',
      'yelp.com', 'tripadvisor.com', 'blog', 'wordpress.com'
    ];
    
    return !excludePatterns.some(pattern => url.includes(pattern)) && 
           (url.startsWith('http://') || url.startsWith('https://'));
  }

  // Extract clean URL from various redirect formats
  private extractCleanUrl(href: string): string {
    if (href.includes('duckduckgo.com/l/?uddg=')) {
      try {
        const urlMatch = href.match(/uddg=([^&]+)/);
        if (urlMatch) {
          return decodeURIComponent(urlMatch[1]);
        }
      } catch (error) {
        return href;
      }
    }
    
    return href.startsWith('//') ? `https:${href}` : href;
  }

  // Clean restaurant name
  private cleanRestaurantName(name: string): string {
    return name
      .replace(/^\d+\.\s*/, '')
      .replace(/\s*-\s*.*$/, '')
      .replace(/\s*\|.*$/, '')
      .replace(/\s*\(.*\)$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Remove duplicate restaurants
  private deduplicateRestaurants(restaurants: RestaurantListing[]): RestaurantListing[] {
    const seen = new Set<string>();
    const unique: RestaurantListing[] = [];
    
    for (const restaurant of restaurants) {
      const key = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
      if (!seen.has(key) && restaurant.name.length > 2) {
        seen.add(key);
        unique.push(restaurant);
      }
    }
    
    return unique;
  }

  // Phase 2: Analyze restaurant website for sourdough content
  async analyzeRestaurantForSourdough(restaurant: RestaurantListing): Promise<SourdoughVerification> {
    if (!restaurant.website) {
      return {
        isVerified: false,
        keywords: [],
        sources: [],
        confidence: 0,
        description: ''
      };
    }

    console.log(`    🌐 Analyzing restaurant website: ${restaurant.website}`);
    
    try {
      const response = await axios.get(restaurant.website, {
        timeout: 12000,
        headers: { 'User-Agent': this.getRandomUserAgent() }
      });

      const $ = cheerio.load(response.data);
      
      // Extract comprehensive text content
      const title = $('title').text().toLowerCase();
      const metaDesc = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      const bodyText = $('body').text().toLowerCase();
      const menuText = $('.menu, #menu, [class*="menu"], [id*="menu"]').text().toLowerCase();
      const aboutText = $('.about, #about, [class*="about"], [id*="about"]').text().toLowerCase();
      
      const allText = `${title} ${metaDesc} ${bodyText} ${menuText} ${aboutText}`;
      
      return this.analyzeSourdoughContent(allText, 'restaurant website');

    } catch (error) {
      console.log(`      ❌ Website analysis failed: ${error.message}`);
      return {
        isVerified: false,
        keywords: [],
        sources: [],
        confidence: 0,
        description: ''
      };
    }
  }

  // Analyze text content for sourdough keywords
  private analyzeSourdoughContent(text: string, source: string): SourdoughVerification {
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];
    let score = 0;

    // Check for sourdough keywords with weighted scoring
    for (const keyword of this.SOURDOUGH_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = lowerText.match(regex);
      
      if (matches) {
        foundKeywords.push(keyword);
        const keywordWeight = keyword === 'sourdough' ? 5 : 
                             keyword === 'naturally leavened' ? 5 :
                             keyword === 'wild yeast' ? 4 : 
                             keyword === 'starter' ? 4 : 3;
        score += matches.length * keywordWeight;
      }
    }

    const confidence = Math.min(score / 8, 1.0);
    const isVerified = foundKeywords.length > 0 && confidence > 0.4;

    return {
      isVerified,
      keywords: foundKeywords,
      sources: isVerified ? [source] : [],
      confidence,
      description: isVerified ? 
        `Sourdough keywords found on ${source}: ${foundKeywords.join(', ')}` : ''
    };
  }

  // Phase 3: Add ONLY verified sourdough restaurants to database
  async addVerifiedRestaurant(restaurant: RestaurantListing, verification: SourdoughVerification, city: string, state: string): Promise<boolean> {
    try {
      // ONLY add restaurants that are verified as sourdough
      if (!verification.isVerified) {
        console.log(`        ❌ ${restaurant.name}: No sourdough found, not adding to directory`);
        return false;
      }

      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`        🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address || `${city}, ${state}`,
        city,
        state,
        zipCode: restaurant.address?.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: verification.description,
        sourdoughVerified: 1, // Always 1 since we only add verified restaurants
        sourdoughKeywords: verification.keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [verification.description]
      };

      await db.insert(restaurants).values(restaurantData);
      
      const confidenceStr = ` (${Math.round(verification.confidence * 100)}%)`;
      console.log(`        ✅ VERIFIED SOURDOUGH ADDED: ${restaurant.name}${confidenceStr}`);
      
      return true;
      
    } catch (error) {
      console.log(`        ❌ Failed to add ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  // Main comprehensive scraping process
  async scrapeReliableRestaurants(city: string, state: string): Promise<void> {
    console.log(`\n🚀 Starting comprehensive restaurant discovery for ${city}, ${state}`);
    console.log('This process focuses on restaurant-controlled content only (no blogs/reviews)');
    console.log('Expected duration: 10-15 minutes for thorough analysis\n');
    
    try {
      // Phase 1: Discover all pizza restaurants
      const discoveredRestaurants = await this.discoverPizzaRestaurants(city, state);
      
      if (discoveredRestaurants.length === 0) {
        console.log('❌ No pizza restaurants discovered');
        return;
      }

      console.log(`\n📊 Discovered ${discoveredRestaurants.length} pizza restaurants`);
      console.log('Beginning sourdough verification process...\n');
      
      let verifiedCount = 0;
      let totalAnalyzed = 0;

      // Phase 2 & 3: Analyze each restaurant and add to database
      for (const restaurant of discoveredRestaurants.slice(0, 25)) { // Limit for efficiency
        console.log(`  🔍 Analyzing: ${restaurant.name}`);
        
        const verification = await this.analyzeRestaurantForSourdough(restaurant);
        const wasVerified = await this.addVerifiedRestaurant(restaurant, verification, city, state);
        
        if (wasVerified) verifiedCount++;
        totalAnalyzed++;
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      console.log(`\n🎉 Reliable restaurant scraping complete!`);
      console.log(`   📊 Total restaurants analyzed: ${totalAnalyzed}`);
      console.log(`   ✅ Verified sourdough restaurants: ${verifiedCount}`);
      console.log(`   🏢 All data sourced from restaurant-controlled content only`);
      
    } catch (error) {
      console.error('❌ Reliable restaurant scraping failed:', error);
    }
  }
}

// Test function
export async function testReliableScraping() {
  const scraper = new ReliableRestaurantScraper();
  await scraper.scrapeReliableRestaurants('Portland', 'OR');
}