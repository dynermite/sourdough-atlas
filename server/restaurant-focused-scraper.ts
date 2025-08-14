import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface RestaurantWebsite {
  name: string;
  website: string;
  address?: string;
  phone?: string;
  confidence: number;
}

export class RestaurantFocusedScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough', 'naturally leavened', 'wild yeast', 'fermented dough',
    'starter', 'long fermentation', 'natural fermentation', 'levain'
  ];

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
  ];

  // Extract restaurant websites from local food guides and blogs
  async extractRestaurantWebsitesFromGuides(city: string, state: string): Promise<RestaurantWebsite[]> {
    const restaurants: RestaurantWebsite[] = [];
    
    // Known high-quality local food guides for Portland
    const portlandGuides = [
      'https://pdx.eater.com/maps/portland-oregon-best-pizza-pizzerias',
      'https://www.oregonlive.com/entertainment/restaurants/best-pizza-portland/',
      'https://www.travelportland.com/culture/best-pizza-portland-guide/',
      'https://www.theinfatuation.com/portland/guides/best-pizza-portland-or'
    ];

    for (const guide of portlandGuides) {
      try {
        console.log(`📖 Extracting restaurants from: ${guide}`);
        
        const response = await axios.get(guide, {
          timeout: 15000,
          headers: { 'User-Agent': this.USER_AGENTS[0] }
        });

        const $ = cheerio.load(response.data);
        
        // Look for restaurant mentions and links
        $('a[href*=".com"], a[href*=".net"], a[href*=".org"]').each((_, element) => {
          const link = $(element);
          const href = link.attr('href');
          const text = link.text().trim();
          
          if (href && this.isRestaurantWebsite(href) && text.length > 2) {
            restaurants.push({
              name: this.cleanRestaurantName(text),
              website: this.normalizeUrl(href),
              confidence: 0.8
            });
          }
        });

        // Also extract from article text mentions
        $('p, div').each((_, element) => {
          const text = $(element).text();
          const restaurantMatches = text.match(/([A-Z][a-zA-Z\s&']+(?:Pizza|Pizzeria|Kitchen|Cafe|Restaurant|Eatery))/g);
          
          if (restaurantMatches) {
            for (const match of restaurantMatches) {
              const cleaned = this.cleanRestaurantName(match);
              if (cleaned.length > 4) {
                // Try to construct potential website
                const domain = this.guessWebsiteDomain(cleaned);
                if (domain) {
                  restaurants.push({
                    name: cleaned,
                    website: domain,
                    confidence: 0.6
                  });
                }
              }
            }
          }
        });

        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`  ❌ Failed to process ${guide}:`, error.message);
      }
    }

    // Remove duplicates and return
    return this.deduplicateRestaurants(restaurants);
  }

  // Generate potential website domains from restaurant names
  private guessWebsiteDomain(restaurantName: string): string | null {
    const name = restaurantName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .replace(/pizza|pizzeria|restaurant|cafe|kitchen|eatery/g, '');
    
    if (name.length < 3) return null;
    
    // Try common patterns
    const patterns = [
      `https://www.${name}.com`,
      `https://www.${name}pizza.com`,
      `https://www.${name}pizzeria.com`,
      `https://${name}.com`,
      `https://${name}pizza.com`
    ];

    return patterns[0]; // Return first pattern for testing
  }

  // Check if URL looks like a restaurant website
  private isRestaurantWebsite(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    
    // Exclude social media, review sites, etc.
    const excludePatterns = [
      'facebook.com', 'instagram.com', 'twitter.com', 'yelp.com',
      'tripadvisor.com', 'zomato.com', 'grubhub.com', 'doordash.com',
      'ubereats.com', 'seamless.com', 'google.com', 'youtube.com'
    ];

    return !excludePatterns.some(pattern => lowerUrl.includes(pattern)) &&
           (lowerUrl.includes('.com') || lowerUrl.includes('.net') || lowerUrl.includes('.org'));
  }

  // Clean restaurant names
  private cleanRestaurantName(name: string): string {
    return name
      .replace(/^\d+\.\s*/, '') // Remove numbering
      .replace(/\s*-\s*.*$/, '') // Remove suffixes after dash
      .replace(/\s*\|.*$/, '') // Remove suffixes after pipe
      .trim();
  }

  // Normalize URLs
  private normalizeUrl(url: string): string {
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  }

  // Remove duplicate restaurants
  private deduplicateRestaurants(restaurants: RestaurantWebsite[]): RestaurantWebsite[] {
    const seen = new Set<string>();
    return restaurants.filter(restaurant => {
      const key = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Analyze restaurant website for sourdough
  async analyzeSourdoughContent(restaurant: RestaurantWebsite): Promise<{
    isVerified: boolean;
    keywords: string[];
    description: string;
    confidence: number;
  }> {
    try {
      console.log(`    🔍 Analyzing ${restaurant.name}: ${restaurant.website}`);
      
      const response = await axios.get(restaurant.website, {
        timeout: 10000,
        headers: { 'User-Agent': this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)] }
      });

      const $ = cheerio.load(response.data);
      
      // Extract text content
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
          score += matches.length * (keyword === 'sourdough' ? 3 : keyword === 'naturally leavened' ? 3 : 2);
        }
      }

      const confidence = Math.min(score / 5, 1.0);
      const isVerified = foundKeywords.length > 0 && confidence > 0.4;

      // Extract description
      let description = '';
      if (isVerified) {
        // Try to find a paragraph with sourdough mentions
        $('p').each((_, element) => {
          const text = $(element).text();
          if (text.length > 50 && text.length < 300) {
            const lowerText = text.toLowerCase();
            if (this.SOURDOUGH_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
              description = text.trim();
              return false; // Break the loop
            }
          }
        });

        if (!description) {
          description = $('meta[name="description"]').attr('content') || 
                       `Pizza restaurant featuring ${foundKeywords.join(', ')}`;
        }
      }

      return {
        isVerified,
        keywords: foundKeywords,
        description: description.substring(0, 500),
        confidence
      };

    } catch (error) {
      console.log(`      ❌ Failed to analyze ${restaurant.website}:`, error.message);
      return {
        isVerified: false,
        keywords: [],
        description: '',
        confidence: 0
      };
    }
  }

  // Add verified restaurant to database
  async addRestaurantToDatabase(restaurant: RestaurantWebsite, analysis: any, city: string, state: string): Promise<boolean> {
    try {
      // Check if exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.website, restaurant.website));
      if (existing.length > 0) {
        console.log(`      🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address || `${city}, ${state}`,
        city,
        state,
        zipCode: '',
        phone: restaurant.phone || '',
        website: restaurant.website,
        description: analysis.description,
        sourdoughVerified: analysis.isVerified ? 1 : 0,
        sourdoughKeywords: analysis.keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: analysis.isVerified ? [`Restaurant-focused scraper found: ${analysis.keywords.join(', ')}`] : []
      };

      await db.insert(restaurants).values(restaurantData);
      
      const status = analysis.isVerified ? '✅ VERIFIED' : '❌ No sourdough';
      console.log(`      ${status}: ${restaurant.name} (${Math.round(analysis.confidence * 100)}%)`);
      return analysis.isVerified;
      
    } catch (error) {
      console.log(`      ❌ Failed to add ${restaurant.name}:`, error.message);
      return false;
    }
  }

  // Main restaurant-focused scraping function
  async scrapeRestaurants(city: string, state: string): Promise<void> {
    console.log(`\n🍕 Restaurant-focused scraping for ${city}, ${state}...`);
    
    try {
      // Extract restaurant websites from food guides
      const restaurantWebsites = await this.extractRestaurantWebsitesFromGuides(city, state);
      console.log(`📋 Found ${restaurantWebsites.length} potential restaurant websites`);

      if (restaurantWebsites.length === 0) {
        console.log('❌ No restaurant websites discovered');
        return;
      }

      let verified = 0;
      let total = 0;

      // Analyze each restaurant
      for (const restaurant of restaurantWebsites.slice(0, 15)) { // Limit to first 15 for efficiency
        const analysis = await this.analyzeSourdoughContent(restaurant);
        const added = await this.addRestaurantToDatabase(restaurant, analysis, city, state);
        
        if (added) verified++;
        total++;
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      console.log(`\n🎉 Restaurant-focused scraping complete!`);
      console.log(`   📊 Analyzed: ${total} restaurants`);
      console.log(`   ✅ Verified: ${verified} sourdough restaurants`);
      
    } catch (error) {
      console.error('❌ Restaurant scraping failed:', error);
    }
  }
}

// Test function
export async function testRestaurantScraping() {
  const scraper = new RestaurantFocusedScraper();
  await scraper.scrapeRestaurants('Portland', 'OR');
}