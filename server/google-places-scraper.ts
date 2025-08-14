import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface PlaceResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  placeId: string;
}

interface SourdoughVerification {
  isVerified: boolean;
  keywords: string[];
  sources: string[];
  confidence: number;
  description: string;
}

export class GooglePlacesScraper {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast'
  ];

  // Search for pizza restaurants using Google Places text search
  async searchPizzaPlaces(city: string, state: string): Promise<PlaceResult[]> {
    try {
      // Since we don't have Google Places API key, let's use alternative approaches
      // We'll use web scraping of business directories and Google search results
      
      console.log(`🔍 Searching for pizza restaurants in ${city}, ${state}...`);
      
      const restaurants = await this.searchBusinessDirectories(city, state);
      
      console.log(`    📍 Found ${restaurants.length} pizza restaurants through web search`);
      return restaurants;
      
    } catch (error) {
      console.error(`Error searching pizza places in ${city}:`, error.message);
      return [];
    }
  }

  // Search business directories for pizza restaurants
  private async searchBusinessDirectories(city: string, state: string): Promise<PlaceResult[]> {
    const restaurants: PlaceResult[] = [];
    
    try {
      // Search Google for pizza restaurants in the city
      const searchQuery = `"${city}" "${state}" pizza restaurant site:yellowpages.com OR site:yelp.com OR site:foursquare.com`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract restaurant information from search results
      $('div[data-ved]').each((index, element) => {
        const $el = $(element);
        const text = $el.text();
        const href = $el.find('a').attr('href');
        
        // Look for pizza restaurant patterns
        if (text.toLowerCase().includes('pizza') && 
            (text.includes(city) || text.includes(state))) {
          
          // Extract restaurant name (simple pattern matching)
          const nameMatch = text.match(/([A-Z][a-z\s&']+(?:Pizza|Pizzeria)[a-z\s]*)/i);
          const addressMatch = text.match(/\d+\s+[A-Za-z\s,]+,\s*[A-Z]{2}\s+\d{5}/);
          
          if (nameMatch) {
            restaurants.push({
              name: nameMatch[1].trim(),
              address: addressMatch ? addressMatch[0] : `${city}, ${state}`,
              placeId: `search_${index}`,
              website: href || undefined
            });
          }
        }
      });
      
    } catch (error) {
      console.error('Error searching business directories:', error.message);
    }
    
    return restaurants.slice(0, 20); // Limit to 20 results
  }

  // Get detailed place information and check for sourdough
  async getPlaceDetails(place: PlaceResult): Promise<SourdoughVerification> {
    console.log(`    🔍 Checking ${place.name} for sourdough...`);
    
    const foundKeywords: string[] = [];
    const sources: string[] = [];
    let confidence = 0;
    let description = '';

    // Check restaurant website if available
    if (place.website) {
      const websiteKeywords = await this.checkWebsiteForSourdough(place.website);
      if (websiteKeywords.length > 0) {
        foundKeywords.push(...websiteKeywords);
        sources.push('Restaurant Website');
        confidence += 0.8;
        description = `Found sourdough keywords on restaurant website: ${websiteKeywords.join(', ')}`;
        console.log(`        🌐 Website: Found ${websiteKeywords.join(', ')}`);
      }
    }

    // Search for restaurant's Google Business profile
    const businessKeywords = await this.checkGoogleBusinessProfile(place.name, place.address);
    if (businessKeywords.length > 0) {
      foundKeywords.push(...businessKeywords);
      sources.push('Google Business');
      confidence += 0.6;
      if (!description) {
        description = `Found sourdough keywords in Google Business profile: ${businessKeywords.join(', ')}`;
      }
      console.log(`        📋 Google Business: Found ${businessKeywords.join(', ')}`);
    }

    const uniqueKeywords = [...new Set(foundKeywords)];
    
    return {
      isVerified: uniqueKeywords.length > 0,
      keywords: uniqueKeywords,
      sources,
      confidence: Math.min(confidence, 1.0),
      description: description || `Pizza restaurant in ${place.address}`
    };
  }

  // Check website for sourdough keywords
  private async checkWebsiteForSourdough(websiteUrl: string): Promise<string[]> {
    try {
      const foundKeywords: string[] = [];
      
      // Clean the URL
      let cleanUrl = websiteUrl;
      if (cleanUrl.startsWith('/url?q=')) {
        cleanUrl = decodeURIComponent(cleanUrl.substring(7).split('&')[0]);
      }
      
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Check home page
      const homeContent = await this.scrapeWebsiteContent(cleanUrl);
      if (homeContent) {
        const homeKeywords = this.findSourdoughKeywords(homeContent);
        foundKeywords.push(...homeKeywords);
      }

      // Check about page
      const aboutUrls = [
        `${cleanUrl.replace(/\/$/, '')}/about`,
        `${cleanUrl.replace(/\/$/, '')}/about-us`,
        `${cleanUrl.replace(/\/$/, '')}/story`,
        `${cleanUrl.replace(/\/$/, '')}/our-story`
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

  // Check Google Business profile for sourdough keywords  
  private async checkGoogleBusinessProfile(name: string, address: string): Promise<string[]> {
    try {
      const searchQuery = `"${name}" "${address}" pizza`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 8000
      });

      const $ = cheerio.load(response.data);
      
      // Look for business description in Google search results
      const description = $('.VwiC3b, .s3v9rd, .st').text() || '';
      
      return this.findSourdoughKeywords(description);
      
    } catch (error) {
      return [];
    }
  }

  // Scrape website content
  private async scrapeWebsiteContent(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
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

  // Find sourdough keywords in text
  private findSourdoughKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    return this.sourdoughKeywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  // Add verified sourdough restaurant to database
  async addVerifiedRestaurant(place: PlaceResult, verification: SourdoughVerification, city: string, state: string): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, place.name));
      
      if (existing.length > 0) {
        console.log(`    🔄 ${place.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: place.name,
        address: place.address,
        city,
        state,
        zipCode: place.address.match(/\d{5}/)?.[0] || '',
        phone: place.phone || '',
        website: place.website || '',
        description: verification.description,
        sourdoughVerified: 1,
        sourdoughKeywords: verification.keywords,
        rating: place.rating || 0,
        reviewCount: place.reviewCount || 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified sourdough: ${verification.keywords.join(', ')} (Sources: ${verification.sources.join(', ')})`]
      };

      await db.insert(restaurants).values(restaurantData);
      
      console.log(`    ✅ VERIFIED SOURDOUGH ADDED: ${place.name}`);
      console.log(`       Keywords: ${verification.keywords.join(', ')}`);
      console.log(`       Sources: ${verification.sources.join(', ')}`);
      console.log(`       Confidence: ${Math.round(verification.confidence * 100)}%`);
      
      return true;
      
    } catch (error) {
      console.log(`    ❌ Failed to add ${place.name}: ${error.message}`);
      return false;
    }
  }

  // Main scraping method for a city
  async scrapeCity(city: string, state: string): Promise<number> {
    console.log(`\n🏙️  Starting comprehensive Places scraping for ${city}, ${state}`);
    
    let addedCount = 0;
    
    try {
      // Step 1: Search for pizza restaurants
      const places = await this.searchPizzaPlaces(city, state);
      
      if (places.length === 0) {
        console.log(`    ❌ No pizza restaurants found for ${city}`);
        return 0;
      }

      console.log(`\n📋 Analyzing ${places.length} restaurants for sourdough verification...`);
      
      // Step 2: Process each restaurant
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        console.log(`\n[${i + 1}/${places.length}] 🔍 ${place.name}`);
        
        // Verify sourdough keywords
        const verification = await this.getPlaceDetails(place);
        
        if (verification.isVerified) {
          const added = await this.addVerifiedRestaurant(place, verification, city, state);
          if (added) {
            addedCount++;
          }
        } else {
          console.log(`    ❌ ${place.name}: No sourdough keywords found, not adding to directory`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`❌ Error scraping ${city}:`, error.message);
    }
    
    console.log(`\n✅ ${city} scraping complete: Added ${addedCount} verified sourdough restaurants`);
    return addedCount;
  }
}

// Export for use in routes
export async function scrapeGooglePlacesForSourdough(city: string, state: string): Promise<number> {
  const scraper = new GooglePlacesScraper();
  const addedCount = await scraper.scrapeCity(city, state);
  return addedCount;
}