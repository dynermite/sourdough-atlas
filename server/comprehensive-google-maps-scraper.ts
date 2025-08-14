import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface GoogleBusinessResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
}

interface SourdoughVerification {
  isVerified: boolean;
  keywords: string[];
  sources: string[];
  confidence: number;
}

export class ComprehensiveGoogleMapsScraper {
  private browser: Browser | null = null;
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast'
  ];

  async initialize(): Promise<void> {
    console.log('🚀 Launching browser for Google Maps scraping...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920x1080'
      ]
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Search Google Maps for pizza restaurants in a city
  async searchGoogleMaps(city: string, state: string): Promise<GoogleBusinessResult[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    const restaurants: GoogleBusinessResult[] = [];

    try {
      console.log(`🔍 Searching Google Maps for pizza restaurants in ${city}, ${state}...`);
      
      const searchQuery = `pizza restaurants ${city} ${state}`;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(3000);

      // Scroll to load more results
      await this.scrollToLoadResults(page);

      // Extract restaurant listings
      const listings = await page.evaluate(() => {
        const results: GoogleBusinessResult[] = [];
        const listItems = document.querySelectorAll('[data-result-index]');
        
        listItems.forEach((item) => {
          try {
            const nameEl = item.querySelector('[data-value="Name"]');
            const addressEl = item.querySelector('[data-value="Address"]');
            const phoneEl = item.querySelector('[data-value="Phone"]');
            const websiteEl = item.querySelector('a[data-value="Website"]');
            const ratingEl = item.querySelector('[data-value="Rating"]');
            const reviewCountEl = item.querySelector('[data-value="Review count"]');
            
            const name = nameEl?.textContent?.trim();
            const address = addressEl?.textContent?.trim();
            
            if (name && address) {
              results.push({
                name,
                address,
                phone: phoneEl?.textContent?.trim() || undefined,
                website: websiteEl?.getAttribute('href') || undefined,
                rating: ratingEl ? parseFloat(ratingEl.textContent || '0') : undefined,
                reviewCount: reviewCountEl ? parseInt(reviewCountEl.textContent?.replace(/[^\d]/g, '') || '0') : undefined
              });
            }
          } catch (error) {
            console.error('Error extracting listing:', error);
          }
        });
        
        return results;
      });

      console.log(`    📍 Found ${listings.length} pizza restaurants in Google Maps`);
      restaurants.push(...listings);

    } catch (error) {
      console.error(`❌ Error searching Google Maps for ${city}:`, error.message);
    } finally {
      await page.close();
    }

    return restaurants;
  }

  // Scroll to load more Google Maps results
  private async scrollToLoadResults(page: Page): Promise<void> {
    const scrollableSelector = '[role="main"]';
    
    for (let i = 0; i < 5; i++) {
      await page.evaluate((selector) => {
        const scrollable = document.querySelector(selector);
        if (scrollable) {
          scrollable.scrollTop = scrollable.scrollHeight;
        }
      }, scrollableSelector);
      
      await page.waitForTimeout(2000);
    }
  }

  // Get detailed Google Business information including description
  async getBusinessDetails(restaurant: GoogleBusinessResult): Promise<GoogleBusinessResult> {
    if (!this.browser || !restaurant.name) {
      return restaurant;
    }

    const page = await this.browser.newPage();
    
    try {
      const searchQuery = `${restaurant.name} ${restaurant.address}`;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);

      // Try to click on the first result to get details
      const firstResult = await page.$('[data-result-index="0"]');
      if (firstResult) {
        await firstResult.click();
        await page.waitForTimeout(3000);

        // Extract business description/about text
        const description = await page.evaluate(() => {
          // Look for various description selectors
          const selectors = [
            '[data-value="Description"]',
            '[aria-label*="About"]',
            '.section-editorial-quote',
            '.section-editorial-text'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent?.trim()) {
              return element.textContent.trim();
            }
          }
          
          return '';
        });

        if (description) {
          restaurant.description = description;
        }
      }

    } catch (error) {
      console.error(`Error getting details for ${restaurant.name}:`, error.message);
    } finally {
      await page.close();
    }

    return restaurant;
  }

  // Verify sourdough keywords in Google Business description and website
  async verifySourdoughKeywords(restaurant: GoogleBusinessResult): Promise<SourdoughVerification> {
    const foundKeywords: string[] = [];
    const sources: string[] = [];
    let confidence = 0;

    // Check Google Business description
    if (restaurant.description) {
      const businessKeywords = this.findSourdoughKeywords(restaurant.description);
      if (businessKeywords.length > 0) {
        foundKeywords.push(...businessKeywords);
        sources.push('Google Business');
        confidence += 0.6;
        console.log(`    📋 Google Business: Found keywords: ${businessKeywords.join(', ')}`);
      }
    }

    // Check restaurant website
    if (restaurant.website) {
      const websiteKeywords = await this.checkWebsiteForSourdough(restaurant.website);
      if (websiteKeywords.length > 0) {
        foundKeywords.push(...websiteKeywords);
        sources.push('Restaurant Website');
        confidence += 0.8;
        console.log(`    🌐 Website: Found keywords: ${websiteKeywords.join(', ')}`);
      }
    }

    // Remove duplicates
    const uniqueKeywords = [...new Set(foundKeywords)];
    
    return {
      isVerified: uniqueKeywords.length > 0,
      keywords: uniqueKeywords,
      sources,
      confidence: Math.min(confidence, 1.0)
    };
  }

  // Find sourdough keywords in text
  private findSourdoughKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    return this.sourdoughKeywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  // Check restaurant website for sourdough keywords
  private async checkWebsiteForSourdough(websiteUrl: string): Promise<string[]> {
    try {
      const foundKeywords: string[] = [];
      
      // Check home page
      const homeContent = await this.scrapeWebsiteContent(websiteUrl);
      if (homeContent) {
        const homeKeywords = this.findSourdoughKeywords(homeContent);
        foundKeywords.push(...homeKeywords);
      }

      // Check about page
      const aboutUrls = [
        `${websiteUrl.replace(/\/$/, '')}/about`,
        `${websiteUrl.replace(/\/$/, '')}/about-us`,
        `${websiteUrl.replace(/\/$/, '')}/story`,
        `${websiteUrl.replace(/\/$/, '')}/our-story`
      ];

      for (const aboutUrl of aboutUrls) {
        try {
          const aboutContent = await this.scrapeWebsiteContent(aboutUrl);
          if (aboutContent) {
            const aboutKeywords = this.findSourdoughKeywords(aboutContent);
            foundKeywords.push(...aboutKeywords);
            break; // Stop after finding first working about page
          }
        } catch (error) {
          // Continue to next about URL
        }
      }

      return [...new Set(foundKeywords)]; // Remove duplicates
      
    } catch (error) {
      console.error(`Error checking website ${websiteUrl}:`, error.message);
      return [];
    }
  }

  // Scrape website content
  private async scrapeWebsiteContent(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove script and style elements
      $('script, style, nav, header, footer').remove();
      
      // Extract text content
      const content = $('body').text().replace(/\s+/g, ' ').trim();
      return content;
      
    } catch (error) {
      return null;
    }
  }

  // Add verified sourdough restaurant to database
  async addVerifiedRestaurant(restaurant: GoogleBusinessResult, verification: SourdoughVerification, city: string, state: string): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`    🔄 ${restaurant.name} already exists, skipping`);
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
        description: restaurant.description || `Verified sourdough pizza restaurant found through Google Maps`,
        sourdoughVerified: 1,
        sourdoughKeywords: verification.keywords,
        rating: restaurant.rating || 0,
        reviewCount: restaurant.reviewCount || 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified sourdough: ${verification.keywords.join(', ')} (Sources: ${verification.sources.join(', ')})`]
      };

      await db.insert(restaurants).values(restaurantData);
      
      console.log(`    ✅ VERIFIED SOURDOUGH ADDED: ${restaurant.name}`);
      console.log(`       Keywords: ${verification.keywords.join(', ')}`);
      console.log(`       Sources: ${verification.sources.join(', ')}`);
      console.log(`       Confidence: ${Math.round(verification.confidence * 100)}%`);
      
      return true;
      
    } catch (error) {
      console.log(`    ❌ Failed to add ${restaurant.name}: ${error.message}`);
      return false;
    }
  }

  // Main scraping method for a city
  async scrapeCity(city: string, state: string): Promise<number> {
    console.log(`\n🏙️  Starting comprehensive scraping for ${city}, ${state}`);
    
    let addedCount = 0;
    
    try {
      // Step 1: Search Google Maps for pizza restaurants
      const restaurants = await this.searchGoogleMaps(city, state);
      
      if (restaurants.length === 0) {
        console.log(`    ❌ No pizza restaurants found in Google Maps for ${city}`);
        return 0;
      }

      console.log(`\n📋 Analyzing ${restaurants.length} restaurants for sourdough verification...`);
      
      // Step 2: Process each restaurant
      for (let i = 0; i < restaurants.length; i++) {
        const restaurant = restaurants[i];
        console.log(`\n[${i + 1}/${restaurants.length}] 🔍 ${restaurant.name}`);
        
        // Get detailed business information
        const detailedRestaurant = await this.getBusinessDetails(restaurant);
        
        // Verify sourdough keywords
        const verification = await this.verifySourdoughKeywords(detailedRestaurant);
        
        if (verification.isVerified) {
          const added = await this.addVerifiedRestaurant(detailedRestaurant, verification, city, state);
          if (added) {
            addedCount++;
          }
        } else {
          console.log(`    ❌ ${restaurant.name}: No sourdough keywords found, not adding to directory`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`❌ Error scraping ${city}:`, error.message);
    }
    
    console.log(`\n✅ ${city} scraping complete: Added ${addedCount} verified sourdough restaurants`);
    return addedCount;
  }
}

// Export for use in routes
export async function scrapeGoogleMapsForSourdough(city: string, state: string): Promise<number> {
  const scraper = new ComprehensiveGoogleMapsScraper();
  
  try {
    await scraper.initialize();
    const addedCount = await scraper.scrapeCity(city, state);
    return addedCount;
  } finally {
    await scraper.close();
  }
}