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
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Search for pizza restaurants in the specified area
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery + ' pizza restaurant')}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for results to load
      await page.waitForSelector('[role="article"]', { timeout: 10000 });

      // Scroll to load more results
      await this.scrollToLoadResults(page, maxResults);

      // Extract restaurant data
      const restaurants = await page.evaluate(() => {
        const articles = document.querySelectorAll('[role="article"]');
        const results: any[] = [];

        articles.forEach((article, index) => {
          if (index >= 20) return; // Limit results

          const nameElement = article.querySelector('[data-value="Title"]');
          const name = nameElement?.textContent?.trim();

          if (!name) return;

          const addressElement = article.querySelector('[data-value="Address"]');
          const address = addressElement?.textContent?.trim();

          const ratingElement = article.querySelector('[data-value="Rating"]');
          const ratingText = ratingElement?.textContent?.trim();
          const rating = ratingText ? parseFloat(ratingText) : 0;

          const reviewElement = article.querySelector('[data-value="Reviews"]');
          const reviewText = reviewElement?.textContent?.trim();
          const reviewCount = reviewText ? parseInt(reviewText.replace(/[^\d]/g, '')) : 0;

          // Try to get place ID from data attributes or URL
          const link = article.querySelector('a[href*="place"]');
          const href = link?.getAttribute('href');
          const placeIdMatch = href?.match(/place\/([^\/]+)/);
          const googlePlaceId = placeIdMatch ? placeIdMatch[1] : undefined;

          results.push({
            name,
            address,
            rating,
            reviewCount,
            googlePlaceId
          });
        });

        return results;
      });

      const detailedResults: ScrapeResult[] = [];

      // Process each restaurant to get detailed information
      for (const restaurant of restaurants.slice(0, maxResults)) {
        try {
          const detailedData = await this.getRestaurantDetails(page, restaurant);
          if (detailedData) {
            detailedResults.push(detailedData);
          }
        } catch (error) {
          console.error(`Error processing restaurant ${restaurant.name}:`, error);
        }
      }

      return detailedResults;

    } finally {
      await browser.close();
    }
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

      // Insert new restaurant
      await db.insert(restaurants).values({
        name: restaurantData.name,
        address: restaurantData.address,
        city: restaurantData.city,
        state: restaurantData.state,
        zipCode: restaurantData.zipCode,
        phone: restaurantData.phone,
        website: restaurantData.website,
        description: restaurantData.description,
        rating: restaurantData.rating,
        reviewCount: restaurantData.reviewCount,
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        sourdoughVerified: restaurantData.sourdoughVerified,
        sourdoughKeywords: restaurantData.sourdoughKeywords,
        googlePlaceId: restaurantData.googlePlaceId,
        reviews: restaurantData.reviews,
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