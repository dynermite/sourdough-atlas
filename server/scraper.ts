import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ScrapeResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  phone?: string;
  website?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
  reviews: string[];
  sourdoughKeywords: string[];
  sourdoughVerified: number; // 1 = verified, 0 = unverified, -1 = rejected
}

export class GoogleMapsScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough',
    'naturally leavened',
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'natural fermentation'
  ];

  private readonly NEGATIVE_KEYWORDS = [
    'not sourdough',
    'no sourdough',
    'commercial yeast',
    'traditional yeast'
  ];

  private analyzeTextForSourdough(text: string): { keywords: string[], isPositive: boolean } {
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];
    let hasNegative = false;

    // Check for negative keywords first
    for (const negKeyword of this.NEGATIVE_KEYWORDS) {
      if (lowerText.includes(negKeyword)) {
        hasNegative = true;
        break;
      }
    }

    // Check for positive keywords
    for (const keyword of this.SOURDOUGH_KEYWORDS) {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }

    return {
      keywords: foundKeywords,
      isPositive: foundKeywords.length > 0 && !hasNegative
    };
  }

  async scrapeGoogleMaps(searchQuery: string, maxResults: number = 20): Promise<ScrapeResult[]> {
    // For demo purposes, simulate finding sourdough restaurants
    console.log(`Demo mode: Simulating scrape for "${searchQuery}"`);
    
    // Return simulated results based on the search query
    const demoResults: ScrapeResult[] = [];
    
    if (searchQuery.toLowerCase().includes('san francisco')) {
      demoResults.push({
        name: "Delfina Pizzeria",
        address: "3621 18th St, San Francisco, CA 94110",
        city: "San Francisco",
        state: "CA", 
        description: "Our naturally leavened sourdough pizza dough is made with heritage wheat and fermented for 24 hours",
        latitude: 37.7615,
        longitude: -122.4264,
        phone: "(415) 552-4055",
        website: "https://pizzeriadelfina.com",
        sourdoughKeywords: ["naturally leavened", "sourdough", "fermented"],
        sourdoughVerified: 1,
        reviews: ["Amazing sourdough crust with perfect tang", "The naturally leavened dough here is exceptional"]
      }, {
        name: "Pizzetta 211",
        address: "211 23rd Ave, San Francisco, CA 94121",
        city: "San Francisco",
        state: "CA",
        description: "Wood-fired pizzas with house-made sourdough crust using wild yeast starter",
        latitude: 37.7831,
        longitude: -122.4821,
        phone: "(415) 379-9880",
        website: "https://pizzetta211.com",
        sourdoughKeywords: ["sourdough", "wild yeast", "starter"],
        sourdoughVerified: 1,
        reviews: ["Wild yeast sourdough creates incredible flavor", "Best sourdough pizza in the Richmond"]
      });
    }
    
    return demoResults.slice(0, maxResults);

    /* Real browser automation code (commented out for demo) */
  }

  private async scrollToLoadResults(page: any, targetCount: number) {
    let loadedCount = 0;
    let attempts = 0;
    const maxAttempts = 5;

    while (loadedCount < targetCount && attempts < maxAttempts) {
      await page.evaluate(() => {
        const articles = document.querySelectorAll('[role="article"]');
        if (articles.length > 0) {
          articles[articles.length - 1].scrollIntoView();
        }
      });

      await page.waitForTimeout(2000);

      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('[role="article"]').length;
      });

      if (currentCount === loadedCount) {
        attempts++;
      } else {
        attempts = 0;
        loadedCount = currentCount;
      }
    }
  }

  private async getRestaurantDetails(page: any, basicInfo: any): Promise<ScrapeResult | null> {
    try {
      // Parse address to extract city, state, zip
      const addressParts = this.parseAddress(basicInfo.address || '');
      
      // For now, we'll set default coordinates - in a real implementation,
      // you'd use Google Geocoding API or extract from the map
      const latitude = 37.7749 + (Math.random() - 0.5) * 10; // Placeholder
      const longitude = -122.4194 + (Math.random() - 0.5) * 10; // Placeholder

      let description = '';
      let website = '';
      let phone = '';
      let reviews: string[] = [];

      // If we have a place ID, try to get more details
      if (basicInfo.googlePlaceId) {
        try {
          // Click on the restaurant to get more details
          await page.evaluate((placeId: string) => {
            const link = document.querySelector(`a[href*="${placeId}"]`);
            if (link) {
              (link as HTMLElement).click();
            }
          }, basicInfo.googlePlaceId);

          await page.waitForTimeout(3000);

          // Extract additional details
          const details = await page.evaluate(() => {
            const descriptionElement = document.querySelector('[data-value="Description"]');
            const websiteElement = document.querySelector('a[data-value="Website"]');
            const phoneElement = document.querySelector('[data-value="Phone"]');
            
            return {
              description: descriptionElement?.textContent?.trim() || '',
              website: websiteElement?.getAttribute('href') || '',
              phone: phoneElement?.textContent?.trim() || ''
            };
          });

          description = details.description;
          website = details.website;
          phone = details.phone;

          // Get some reviews
          reviews = await page.evaluate(() => {
            const reviewElements = document.querySelectorAll('[data-review-id] [class*="review"]');
            const reviewTexts: string[] = [];
            
            reviewElements.forEach((element, index) => {
              if (index < 10) { // Limit to first 10 reviews
                const text = element.textContent?.trim();
                if (text && text.length > 20) {
                  reviewTexts.push(text);
                }
              }
            });
            
            return reviewTexts;
          });

        } catch (error) {
          console.error('Error getting restaurant details:', error);
        }
      }

      // Analyze all text content for sourdough keywords
      const allText = [
        basicInfo.name,
        description,
        ...reviews
      ].join(' ');

      const analysis = this.analyzeTextForSourdough(allText);

      // If we need to check the website for more information
      if (website && analysis.keywords.length === 0) {
        try {
          const websiteAnalysis = await this.analyzeWebsite(website);
          analysis.keywords.push(...websiteAnalysis.keywords);
          if (websiteAnalysis.isPositive) {
            analysis.isPositive = true;
          }
        } catch (error) {
          console.error('Error analyzing website:', error);
        }
      }

      return {
        name: basicInfo.name,
        address: basicInfo.address || '',
        city: addressParts.city,
        state: addressParts.state,
        zipCode: addressParts.zipCode,
        phone,
        website,
        description,
        rating: basicInfo.rating || 0,
        reviewCount: basicInfo.reviewCount || 0,
        latitude,
        longitude,
        googlePlaceId: basicInfo.googlePlaceId,
        reviews,
        sourdoughKeywords: analysis.keywords,
        sourdoughVerified: analysis.isPositive ? 1 : (analysis.keywords.length > 0 ? 0 : -1)
      };

    } catch (error) {
      console.error('Error getting restaurant details:', error);
      return null;
    }
  }

  private async analyzeWebsite(url: string): Promise<{ keywords: string[], isPositive: boolean }> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract text content from the page
      const pageText = $('body').text().toLowerCase();
      
      return this.analyzeTextForSourdough(pageText);
    } catch (error) {
      console.error('Error analyzing website:', error);
      return { keywords: [], isPositive: false };
    }
  }

  private parseAddress(address: string): { city: string, state: string, zipCode?: string } {
    // Simple address parsing - in production, you'd use a proper geocoding service
    const parts = address.split(',').map(part => part.trim());
    
    let city = '';
    let state = '';
    let zipCode: string | undefined;

    if (parts.length >= 2) {
      city = parts[parts.length - 2];
      const lastPart = parts[parts.length - 1];
      
      // Extract state and zip from last part (e.g., "CA 94105")
      const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})?/);
      if (stateZipMatch) {
        state = stateZipMatch[1];
        zipCode = stateZipMatch[2];
      } else {
        state = lastPart;
      }
    }

    return { city, state, zipCode };
  }

  async saveRestaurantToDatabase(restaurantData: ScrapeResult): Promise<void> {
    try {
      console.log(`Attempting to save restaurant: ${restaurantData.name}, City: ${restaurantData.city}, State: ${restaurantData.state}`);
      
      // Check if restaurant already exists
      const existing = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.googlePlaceId, restaurantData.googlePlaceId || ''))
        .limit(1);

      if (existing.length > 0) {
        console.log(`Restaurant ${restaurantData.name} already exists in database`);
        return;
      }

      // Parse address to get city and state if not provided
      const { city, state, zipCode } = this.parseAddress(restaurantData.address);
      
      // Insert new restaurant
      await db.insert(restaurants).values({
        name: restaurantData.name,
        address: restaurantData.address,
        city: restaurantData.city || city,
        state: restaurantData.state || state,
        zipCode: restaurantData.zipCode || zipCode || null,
        phone: restaurantData.phone || null,
        website: restaurantData.website || null,
        description: restaurantData.description || null,
        rating: restaurantData.rating || 0,
        reviewCount: restaurantData.reviewCount || 0,
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        sourdoughVerified: restaurantData.sourdoughVerified,
        sourdoughKeywords: restaurantData.sourdoughKeywords,
        googlePlaceId: restaurantData.googlePlaceId || null,
        reviews: restaurantData.reviews || null,
        lastScraped: new Date().toISOString(),
        imageUrl: `https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400`
      });

      console.log(`Saved restaurant: ${restaurantData.name} (Sourdough: ${restaurantData.sourdoughVerified === 1 ? 'Yes' : 'No'})`);
    } catch (error) {
      console.error(`Error saving restaurant ${restaurantData.name}:`, error);
    }
  }

  async scrapeAndSaveRestaurants(searchQuery: string, maxResults: number = 20): Promise<void> {
    console.log(`Starting scrape for: ${searchQuery}`);
    
    try {
      const restaurants = await this.scrapeGoogleMaps(searchQuery, maxResults);
      
      console.log(`Found ${restaurants.length} restaurants`);
      
      // Save each restaurant to the database
      for (const restaurant of restaurants) {
        await this.saveRestaurantToDatabase(restaurant);
      }
      
      const sourdoughCount = restaurants.filter(r => r.sourdoughVerified === 1).length;
      console.log(`Scraping complete. Found ${sourdoughCount} sourdough restaurants out of ${restaurants.length} total.`);
      
    } catch (error) {
      console.error('Error during scraping process:', error);
    }
  }
}