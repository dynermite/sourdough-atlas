import puppeteer from 'puppeteer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface GoogleMapsRestaurant {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  googleMapsUrl: string;
  googleBusinessDescription?: string;
  rating?: number;
  reviewCount?: number;
  latitude?: number;
  longitude?: number;
}

interface SourdoughAnalysis {
  isVerified: boolean;
  keywords: string[];
  sources: string[];
  confidence: number;
  description: string;
}

export class GoogleMapsScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough',
    'naturally leavened',
    'wild yeast'
  ];

  private browser?: puppeteer.Browser;

  async initialize() {
    console.log('🚀 Initializing Google Maps scraper...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Step 1: Find ALL pizza restaurants in Google Maps for a city
  async findPizzaRestaurantsInGoogleMaps(city: string, state: string): Promise<GoogleMapsRestaurant[]> {
    if (!this.browser) await this.initialize();
    
    const restaurants: GoogleMapsRestaurant[] = [];
    console.log(`\n🗺️  Finding ALL pizza restaurants in ${city}, ${state} via Google Maps...`);

    try {
      const page = await this.browser!.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Search for pizza restaurants in the city
      const searchQuery = `pizza restaurants ${city} ${state}`;
      const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      console.log(`📍 Searching Google Maps: ${searchQuery}`);
      await page.goto(mapsUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for search results to load
      await page.waitForSelector('[role="main"]', { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll to load more results
      await this.scrollToLoadResults(page);

      // Extract restaurant data from search results
      const restaurantElements = await page.$$('[data-result-index]');
      console.log(`🔍 Found ${restaurantElements.length} potential restaurants`);

      for (let i = 0; i < Math.min(restaurantElements.length, 50); i++) { // Limit to 50 to prevent timeout
        try {
          const element = restaurantElements[i];
          
          // Click on the restaurant to get details
          await element.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Extract restaurant information
          const restaurantData = await this.extractRestaurantDetails(page, city, state);
          
          if (restaurantData && this.isPizzaRestaurant(restaurantData)) {
            restaurants.push(restaurantData);
            console.log(`  ✅ Added: ${restaurantData.name}`);
          }

        } catch (error) {
          console.log(`  ❌ Failed to extract restaurant ${i + 1}:`, error.message);
        }
      }

      await page.close();
    } catch (error) {
      console.error('❌ Google Maps search failed:', error.message);
    }

    console.log(`📊 Total pizza restaurants found: ${restaurants.length}`);
    return restaurants;
  }

  // Scroll to load more search results
  private async scrollToLoadResults(page: puppeteer.Page) {
    try {
      const scrollContainer = await page.$('[role="main"]');
      if (scrollContainer) {
        // Scroll multiple times to load more results
        for (let i = 0; i < 5; i++) {
          await page.evaluate((container) => {
            container.scrollTop = container.scrollHeight;
          }, scrollContainer);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.log('⚠️  Scroll loading failed:', error.message);
    }
  }

  // Extract detailed information for a specific restaurant
  private async extractRestaurantDetails(page: puppeteer.Page, city: string, state: string): Promise<GoogleMapsRestaurant | null> {
    try {
      // Wait for restaurant details to load
      await page.waitForSelector('h1', { timeout: 5000 });

      const name = await page.$eval('h1', el => el.textContent?.trim() || '');
      if (!name) return null;

      // Extract address
      const address = await this.extractAddress(page, city, state);
      
      // Extract phone
      const phone = await this.extractPhone(page);
      
      // Extract website
      const website = await this.extractWebsite(page);
      
      // Extract Google Business description
      const description = await this.extractGoogleBusinessDescription(page);
      
      // Extract rating and review count
      const { rating, reviewCount } = await this.extractRatingInfo(page);
      
      // Get current URL (Google Maps URL)
      const googleMapsUrl = page.url();

      return {
        name,
        address: address || `${city}, ${state}`,
        phone,
        website,
        googleMapsUrl,
        googleBusinessDescription: description,
        rating,
        reviewCount
      };

    } catch (error) {
      console.log('    ❌ Failed to extract restaurant details:', error.message);
      return null;
    }
  }

  // Extract address from Google Maps page
  private async extractAddress(page: puppeteer.Page, city: string, state: string): Promise<string | null> {
    try {
      const addressSelectors = [
        '[data-item-id="address"] .rogA2c',
        '[data-item-id="address"]',
        '.rogA2c',
        '[class*="address"]'
      ];

      for (const selector of addressSelectors) {
        try {
          const address = await page.$eval(selector, el => el.textContent?.trim());
          if (address && address.length > 10) {
            return address;
          }
        } catch (error) {
          // Try next selector
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Extract phone number
  private async extractPhone(page: puppeteer.Page): Promise<string | null> {
    try {
      const phoneSelectors = [
        '[data-item-id="phone:tel:"] span',
        '[data-value*="tel:"]',
        'span[class*="phone"]'
      ];

      for (const selector of phoneSelectors) {
        try {
          const phone = await page.$eval(selector, el => el.textContent?.trim());
          if (phone && /\d{3}[\s.-]\d{3}[\s.-]\d{4}/.test(phone)) {
            return phone;
          }
        } catch (error) {
          // Try next selector
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Extract website URL
  private async extractWebsite(page: puppeteer.Page): Promise<string | null> {
    try {
      const websiteSelectors = [
        '[data-item-id^="authority"] a',
        'a[href*="http"]:not([href*="google.com"]):not([href*="maps.google"])',
        '[data-value*="http"]'
      ];

      for (const selector of websiteSelectors) {
        try {
          const website = await page.$eval(selector, el => el.getAttribute('href'));
          if (website && this.isValidWebsiteUrl(website)) {
            return website;
          }
        } catch (error) {
          // Try next selector
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Extract Google Business description
  private async extractGoogleBusinessDescription(page: puppeteer.Page): Promise<string | null> {
    try {
      // Look for business description in various places
      const descriptionSelectors = [
        '[data-section-id="od"] .PYvSYb',
        '.PYvSYb',
        '[class*="description"]',
        '.rogA2c div'
      ];

      for (const selector of descriptionSelectors) {
        try {
          const description = await page.$eval(selector, el => el.textContent?.trim());
          if (description && description.length > 20 && description.length < 1000) {
            return description;
          }
        } catch (error) {
          // Try next selector
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Extract rating and review count
  private async extractRatingInfo(page: puppeteer.Page): Promise<{ rating?: number; reviewCount?: number }> {
    try {
      let rating: number | undefined;
      let reviewCount: number | undefined;

      // Extract rating
      try {
        const ratingText = await page.$eval('.MW4etd', el => el.textContent?.trim());
        if (ratingText) {
          rating = parseFloat(ratingText);
        }
      } catch (error) {
        // Rating not found
      }

      // Extract review count
      try {
        const reviewText = await page.$eval('.UY7F9', el => el.textContent?.trim());
        if (reviewText) {
          const match = reviewText.match(/\(([0-9,]+)\)/);
          if (match) {
            reviewCount = parseInt(match[1].replace(/,/g, ''));
          }
        }
      } catch (error) {
        // Review count not found
      }

      return { rating, reviewCount };
    } catch (error) {
      return {};
    }
  }

  // Check if URL is a valid website
  private isValidWebsiteUrl(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    const excludePatterns = [
      'google.com', 'maps.google', 'facebook.com', 'instagram.com', 
      'twitter.com', 'yelp.com', 'tripadvisor.com'
    ];
    
    return !excludePatterns.some(pattern => url.includes(pattern)) && 
           (url.startsWith('http://') || url.startsWith('https://'));
  }

  // Check if this is actually a pizza restaurant
  private isPizzaRestaurant(restaurant: GoogleMapsRestaurant): boolean {
    const name = restaurant.name.toLowerCase();
    const description = restaurant.googleBusinessDescription?.toLowerCase() || '';
    
    const pizzaKeywords = ['pizza', 'pizzeria', 'pizze', 'pie'];
    return pizzaKeywords.some(keyword => name.includes(keyword) || description.includes(keyword));
  }

  // Step 2: Analyze Google Business description for sourdough keywords
  async analyzeGoogleBusinessProfile(restaurant: GoogleMapsRestaurant): Promise<SourdoughAnalysis> {
    console.log(`    📋 Analyzing Google Business profile: ${restaurant.name}`);
    
    const sources: string[] = [];
    let foundKeywords: string[] = [];
    let score = 0;

    if (restaurant.googleBusinessDescription) {
      const description = restaurant.googleBusinessDescription.toLowerCase();
      
      for (const keyword of this.SOURDOUGH_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        if (regex.test(description)) {
          foundKeywords.push(keyword);
          score += keyword === 'sourdough' ? 4 : keyword === 'naturally leavened' ? 4 : 2;
        }
      }

      if (foundKeywords.length > 0) {
        sources.push('Google Business Profile');
      }
    }

    const confidence = Math.min(score / 6, 1.0);
    const isVerified = foundKeywords.length > 0 && confidence > 0.3;

    return {
      isVerified,
      keywords: foundKeywords,
      sources,
      confidence,
      description: isVerified ? 
        `Sourdough keywords found in Google Business Profile: ${foundKeywords.join(', ')}` : ''
    };
  }

  // Step 3: Analyze restaurant website for sourdough keywords
  async analyzeRestaurantWebsite(restaurant: GoogleMapsRestaurant): Promise<SourdoughAnalysis> {
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
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract all text content
      const title = $('title').text().toLowerCase();
      const metaDesc = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      const bodyText = $('body').text().toLowerCase();
      const menuText = $('.menu, #menu, [class*="menu"], [id*="menu"]').text().toLowerCase();
      
      const allText = `${title} ${metaDesc} ${bodyText} ${menuText}`;
      
      const foundKeywords: string[] = [];
      let score = 0;

      // Check for sourdough keywords
      for (const keyword of this.SOURDOUGH_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = allText.match(regex);
        
        if (matches) {
          foundKeywords.push(keyword);
          score += matches.length * (keyword === 'sourdough' ? 4 : keyword === 'naturally leavened' ? 4 : 2);
        }
      }

      const confidence = Math.min(score / 6, 1.0);
      const isVerified = foundKeywords.length > 0 && confidence > 0.3;

      return {
        isVerified,
        keywords: foundKeywords,
        sources: isVerified ? ['Restaurant Website'] : [],
        confidence,
        description: isVerified ? 
          `Sourdough keywords found on restaurant website: ${foundKeywords.join(', ')}` : ''
      };

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

  // Combine analyses from Google Business and website
  private combineAnalyses(businessAnalysis: SourdoughAnalysis, websiteAnalysis: SourdoughAnalysis): SourdoughAnalysis {
    const allKeywords = [...new Set([...businessAnalysis.keywords, ...websiteAnalysis.keywords])];
    const allSources = [...new Set([...businessAnalysis.sources, ...websiteAnalysis.sources])];
    const maxConfidence = Math.max(businessAnalysis.confidence, websiteAnalysis.confidence);
    const isVerified = businessAnalysis.isVerified || websiteAnalysis.isVerified;

    let description = '';
    if (businessAnalysis.isVerified && websiteAnalysis.isVerified) {
      description = `Verified through both Google Business Profile and restaurant website. Keywords: ${allKeywords.join(', ')}`;
    } else if (businessAnalysis.isVerified) {
      description = businessAnalysis.description;
    } else if (websiteAnalysis.isVerified) {
      description = websiteAnalysis.description;
    }

    return {
      isVerified,
      keywords: allKeywords,
      sources: allSources,
      confidence: maxConfidence,
      description
    };
  }

  // Add verified restaurant to database
  async addVerifiedRestaurant(restaurant: GoogleMapsRestaurant, analysis: SourdoughAnalysis, city: string, state: string): Promise<boolean> {
    try {
      // Check if restaurant already exists (by name and city)
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`        🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address,
        city,
        state,
        zipCode: restaurant.address.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: analysis.description || `Pizza restaurant discovered via Google Maps`,
        sourdoughVerified: analysis.isVerified ? 1 : 0,
        sourdoughKeywords: analysis.keywords,
        rating: restaurant.rating || 0,
        reviewCount: restaurant.reviewCount || 0,
        latitude: restaurant.latitude || 0,
        longitude: restaurant.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: analysis.isVerified ? [analysis.description] : []
      };

      await db.insert(restaurants).values(restaurantData);
      
      const status = analysis.isVerified ? '✅ VERIFIED SOURDOUGH' : '➕ Added (no sourdough)';
      const sources = analysis.sources.length > 0 ? ` (${analysis.sources.join(', ')})` : '';
      console.log(`        ${status}: ${restaurant.name}${sources}`);
      
      return analysis.isVerified;
      
    } catch (error) {
      console.log(`        ❌ Failed to add ${restaurant.name}:`, error.message);
      return false;
    }
  }

  // Main comprehensive scraping function
  async scrapeGoogleMapsRestaurants(city: string, state: string): Promise<void> {
    console.log(`\n🚀 Starting comprehensive Google Maps scraping for ${city}, ${state}`);
    console.log('This process will take significant time to gather reliable data...\n');
    
    try {
      // Step 1: Find all pizza restaurants in Google Maps
      const allRestaurants = await this.findPizzaRestaurantsInGoogleMaps(city, state);
      
      if (allRestaurants.length === 0) {
        console.log('❌ No pizza restaurants found in Google Maps');
        return;
      }

      console.log(`\n📊 Found ${allRestaurants.length} pizza restaurants. Beginning sourdough analysis...`);
      
      let verifiedCount = 0;
      let totalAnalyzed = 0;

      // Step 2 & 3: Analyze each restaurant's Google Business profile AND website
      for (const restaurant of allRestaurants) {
        console.log(`\n  🔍 Analyzing: ${restaurant.name}`);
        
        // Analyze Google Business profile
        const businessAnalysis = await this.analyzeGoogleBusinessProfile(restaurant);
        
        // Analyze restaurant website
        const websiteAnalysis = await this.analyzeRestaurantWebsite(restaurant);
        
        // Combine both analyses
        const finalAnalysis = this.combineAnalyses(businessAnalysis, websiteAnalysis);
        
        // Add to database
        const wasVerified = await this.addVerifiedRestaurant(restaurant, finalAnalysis, city, state);
        
        if (wasVerified) verifiedCount++;
        totalAnalyzed++;
        
        // Respectful delay between requests
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      console.log(`\n🎉 Google Maps scraping complete!`);
      console.log(`   📊 Total restaurants analyzed: ${totalAnalyzed}`);
      console.log(`   ✅ Verified sourdough restaurants: ${verifiedCount}`);
      console.log(`   📍 All restaurants added to directory (sourdough and non-sourdough)`);
      
    } catch (error) {
      console.error('❌ Google Maps scraping failed:', error);
    } finally {
      await this.cleanup();
    }
  }
}

// Test function
export async function testGoogleMapsScraping() {
  const scraper = new GoogleMapsScraper();
  await scraper.scrapeGoogleMapsRestaurants('Portland', 'OR');
}