import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface DiscoveredRestaurant {
  name: string;
  address?: string;
  website?: string;
  phone?: string;
  source: 'yelp' | 'google' | 'web_search';
}

interface SourdoughAnalysis {
  keywords: string[];
  isVerified: boolean;
  description: string;
  confidence: number;
}

export class WebDiscoveryScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough',
    'naturally leavened',
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'natural fermentation',
    'levain',
    'mother dough',
    'slow fermentation',
    'artisan dough'
  ];

  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  ];

  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  // Discover pizza restaurants through web searches
  async discoverPizzaRestaurants(city: string, state: string): Promise<DiscoveredRestaurant[]> {
    const discovered: DiscoveredRestaurant[] = [];
    
    console.log(`🔍 Discovering pizza restaurants in ${city}, ${state}...`);
    
    try {
      // Method 1: Search Yelp-style pages for pizza restaurants
      const yelpResults = await this.searchYelpListings(city, state);
      discovered.push(...yelpResults);
      
      // Method 2: Search restaurant directories and local listings
      const directoryResults = await this.searchRestaurantDirectories(city, state);
      discovered.push(...directoryResults);
      
      // Method 3: Search local news and food blogs
      const blogResults = await this.searchFoodBlogs(city, state);
      discovered.push(...blogResults);
      
    } catch (error) {
      console.error(`Error discovering restaurants in ${city}, ${state}:`, error);
    }

    // Remove duplicates based on name similarity
    const unique = this.removeDuplicateRestaurants(discovered);
    console.log(`📍 Found ${unique.length} unique pizza restaurants in ${city}, ${state}`);
    
    return unique;
  }

  // Search Yelp and similar listing sites
  async searchYelpListings(city: string, state: string): Promise<DiscoveredRestaurant[]> {
    const results: DiscoveredRestaurant[] = [];
    
    try {
      // Search multiple query variations
      const queries = [
        `${city} ${state} pizza restaurants`,
        `${city} ${state} pizzeria`,
        `${city} ${state} wood fired pizza`,
        `${city} ${state} artisan pizza`,
        `best pizza ${city} ${state}`,
        `pizza places ${city} ${state}`
      ];

      for (const query of queries) {
        console.log(`  Searching: ${query}`);
        
        // Search DuckDuckGo for pizza restaurants (more permissive than Google)
        const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        
        try {
          const response = await axios.get(searchUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
            }
          });

          const $ = cheerio.load(response.data);
          
          // Extract restaurant names and websites from search results
          $('a[href*="yelp.com"], a[href*="tripadvisor.com"], a[href*="zomato.com"]').each((_, element) => {
            const link = $(element);
            const text = link.text().trim();
            const href = link.attr('href');
            
            if (text.toLowerCase().includes('pizza') && href) {
              // Extract restaurant name from link text
              const name = this.cleanRestaurantName(text);
              if (name && name.length > 3) {
                results.push({
                  name,
                  website: href,
                  source: 'yelp'
                });
              }
            }
          });

          // Also look for direct restaurant website links
          $('a').each((_, element) => {
            const link = $(element);
            const text = link.text().trim();
            const href = link.attr('href');
            
            if (href && this.looksLikeRestaurantWebsite(href, text) && text.toLowerCase().includes('pizza')) {
              const name = this.cleanRestaurantName(text);
              if (name && name.length > 3) {
                results.push({
                  name,
                  website: href,
                  source: 'web_search'
                });
              }
            }
          });

        } catch (error) {
          console.log(`    Failed to search ${query}:`, error.message);
        }
        
        // Add delay between searches to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.log(`Error searching Yelp listings:`, error.message);
    }

    console.log(`  Found ${results.length} restaurants from listing sites`);
    return results;
  }

  // Search restaurant directories and local business listings
  async searchRestaurantDirectories(city: string, state: string): Promise<DiscoveredRestaurant[]> {
    const results: DiscoveredRestaurant[] = [];
    
    // Known pizza restaurant patterns and websites to check
    const commonPatterns = [
      `${city.toLowerCase().replace(/\s+/g, '')}pizza`,
      `${city.toLowerCase().replace(/\s+/g, '')}pizzeria`,
      `pizza${city.toLowerCase().replace(/\s+/g, '')}`,
      `pizzeria${city.toLowerCase().replace(/\s+/g, '')}`,
    ];

    const commonDomains = ['.com', '.net', '.org'];

    for (const pattern of commonPatterns) {
      for (const domain of commonDomains) {
        const potentialUrl = `https://www.${pattern}${domain}`;
        
        try {
          const response = await axios.get(potentialUrl, {
            timeout: 5000,
            headers: { 'User-Agent': this.getRandomUserAgent() }
          });
          
          const $ = cheerio.load(response.data);
          const title = $('title').text();
          
          if (title.toLowerCase().includes('pizza') || title.toLowerCase().includes('pizzeria')) {
            results.push({
              name: this.cleanRestaurantName(title),
              website: potentialUrl,
              source: 'web_search'
            });
          }
          
        } catch (error) {
          // Expected - most of these URLs won't exist
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`  Found ${results.length} restaurants from directory search`);
    return results;
  }

  // Search food blogs and local publications
  async searchFoodBlogs(city: string, state: string): Promise<DiscoveredRestaurant[]> {
    const results: DiscoveredRestaurant[] = [];
    
    const blogQueries = [
      `"best pizza ${city}" ${state} blog`,
      `"${city} pizzeria" review`,
      `"pizza guide ${city}" ${state}`,
      `"where to eat pizza ${city}" ${state}`
    ];

    for (const query of blogQueries) {
      try {
        const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await axios.get(searchUrl, {
          timeout: 8000,
          headers: { 'User-Agent': this.getRandomUserAgent() }
        });

        const $ = cheerio.load(response.data);
        
        // Look for restaurant mentions in blog posts and articles
        $('a').each((_, element) => {
          const link = $(element);
          const text = link.text().trim();
          const href = link.attr('href');
          
          if (href && text.length > 5 && text.length < 100) {
            // Look for restaurant name patterns
            const restaurantMatch = text.match(/([A-Z][a-zA-Z\s&']+(?:Pizza|Pizzeria|Kitchen|Cafe|Restaurant|Eatery|Place))/i);
            if (restaurantMatch) {
              const name = this.cleanRestaurantName(restaurantMatch[1]);
              if (name && name.length > 3) {
                results.push({
                  name,
                  website: href,
                  source: 'web_search'
                });
              }
            }
          }
        });
        
      } catch (error) {
        console.log(`    Failed food blog search for "${query}":`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`  Found ${results.length} restaurants from food blogs`);
    return results;
  }

  // Clean and normalize restaurant names
  private cleanRestaurantName(name: string): string {
    return name
      .replace(/\s*-\s*Yelp.*$/i, '')
      .replace(/\s*-\s*TripAdvisor.*$/i, '')
      .replace(/\s*\|\s*.*$/i, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^.*?:\s*/, '')
      .trim();
  }

  // Check if a URL looks like a restaurant website
  private looksLikeRestaurantWebsite(url: string, text: string): boolean {
    const restaurantIndicators = [
      'pizza', 'restaurant', 'cafe', 'kitchen', 'eatery', 
      'bistro', 'grill', 'bar', 'tavern', 'parlor'
    ];
    
    const urlLower = url.toLowerCase();
    const textLower = text.toLowerCase();
    
    return restaurantIndicators.some(indicator => 
      urlLower.includes(indicator) || textLower.includes(indicator)
    ) && !urlLower.includes('yelp.com') && !urlLower.includes('tripadvisor');
  }

  // Remove duplicate restaurants based on name similarity
  private removeDuplicateRestaurants(restaurants: DiscoveredRestaurant[]): DiscoveredRestaurant[] {
    const seen = new Set<string>();
    const unique: DiscoveredRestaurant[] = [];
    
    for (const restaurant of restaurants) {
      const normalizedName = restaurant.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15); // First 15 characters for similarity matching
      
      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        unique.push(restaurant);
      }
    }
    
    return unique;
  }

  // Analyze restaurant website for sourdough content
  async analyzeSourdoughContent(restaurant: DiscoveredRestaurant): Promise<SourdoughAnalysis> {
    if (!restaurant.website) {
      return {
        keywords: [],
        isVerified: false,
        description: '',
        confidence: 0
      };
    }

    try {
      console.log(`    Analyzing ${restaurant.name}: ${restaurant.website}`);
      
      const response = await axios.get(restaurant.website, {
        timeout: 10000,
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract all text content
      const pageText = $('body').text().toLowerCase();
      const title = $('title').text().toLowerCase();
      const metaDescription = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      const menuText = $('*[class*="menu"], *[id*="menu"]').text().toLowerCase();
      
      const allText = `${title} ${metaDescription} ${pageText} ${menuText}`;
      
      const foundKeywords: string[] = [];
      let totalScore = 0;
      
      // Check for sourdough keywords with scoring
      for (const keyword of this.SOURDOUGH_KEYWORDS) {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = allText.match(regex);
        
        if (matches) {
          foundKeywords.push(keyword);
          // Weight keywords by importance
          const keywordScore = keyword === 'sourdough' ? 3 : 
                              keyword === 'naturally leavened' ? 3 :
                              keyword === 'wild yeast' ? 2 : 1;
          totalScore += matches.length * keywordScore;
        }
      }

      // Calculate confidence based on keyword frequency and context
      const confidence = Math.min(totalScore / 5, 1.0);
      
      // Extract description
      let description = '';
      if (foundKeywords.length > 0) {
        // Find the most relevant paragraph
        const paragraphs = $('p, div').toArray();
        for (const p of paragraphs) {
          const text = $(p).text();
          const lowerText = text.toLowerCase();
          
          if (this.SOURDOUGH_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
            if (text.length > 50 && text.length < 400) {
              description = text.trim();
              break;
            }
          }
        }
        
        // Fallback descriptions
        if (!description) {
          description = $('meta[name="description"]').attr('content') || 
                       $('title').text() || 
                       `Pizza restaurant with ${foundKeywords.join(', ')} mentioned on website`;
        }
      }

      return {
        keywords: foundKeywords,
        isVerified: foundKeywords.length > 0 && confidence > 0.3,
        description: description.substring(0, 500),
        confidence
      };

    } catch (error) {
      console.log(`      Failed to analyze ${restaurant.website}:`, error.message);
      return {
        keywords: [],
        isVerified: false,
        description: '',
        confidence: 0
      };
    }
  }

  // Add verified restaurant to database
  async addVerifiedRestaurant(restaurant: DiscoveredRestaurant, analysis: SourdoughAnalysis, city: string, state: string): Promise<void> {
    try {
      // Check if restaurant already exists by name or website
      const existingByName = await db.select()
        .from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (restaurant.website) {
        const existingByWebsite = await db.select()
          .from(restaurants)
          .where(eq(restaurants.website, restaurant.website));
        
        if (existingByWebsite.length > 0) {
          console.log(`      ${restaurant.name} already exists (by website), skipping`);
          return;
        }
      }
      
      if (existingByName.length > 0) {
        console.log(`      ${restaurant.name} already exists (by name), skipping`);
        return;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address || `${city}, ${state}`,
        city: city,
        state: state,
        zipCode: '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: analysis.description,
        sourdoughVerified: analysis.isVerified ? 1 : 0,
        sourdoughKeywords: analysis.keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0,
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: analysis.isVerified ? 
          [`Web discovery found sourdough keywords: ${analysis.keywords.join(', ')} (confidence: ${Math.round(analysis.confidence * 100)}%)`] : 
          []
      };

      await db.insert(restaurants).values(restaurantData);
      
      const status = analysis.isVerified ? '✅ VERIFIED' : '❌ No sourdough';
      const confidenceStr = analysis.isVerified ? ` (${Math.round(analysis.confidence * 100)}%)` : '';
      
      console.log(`      ${status}: ${restaurant.name}${confidenceStr}`);
      
    } catch (error) {
      console.error(`      Failed to add ${restaurant.name}:`, error.message);
    }
  }

  // Main discovery function
  async discoverAndAnalyzeCity(city: string, state: string): Promise<void> {
    console.log(`\n🚀 Starting comprehensive pizza discovery for ${city}, ${state}...`);
    
    try {
      // Step 1: Discover all pizza restaurants
      const discovered = await this.discoverPizzaRestaurants(city, state);
      
      if (discovered.length === 0) {
        console.log(`❌ No pizza restaurants discovered in ${city}, ${state}`);
        return;
      }

      console.log(`\n🔬 Analyzing ${discovered.length} restaurants for sourdough...`);
      let verifiedCount = 0;
      
      // Step 2: Analyze each restaurant for sourdough
      for (const restaurant of discovered) {
        const analysis = await this.analyzeSourdoughContent(restaurant);
        
        if (analysis.isVerified) {
          verifiedCount++;
          await this.addVerifiedRestaurant(restaurant, analysis, city, state);
        } else {
          console.log(`      ❌ ${restaurant.name}: No sourdough keywords found`);
        }
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log(`\n🎉 Discovery complete! Found ${verifiedCount} verified sourdough restaurants out of ${discovered.length} total pizza places in ${city}, ${state}`);
      
    } catch (error) {
      console.error(`❌ Error during discovery for ${city}, ${state}:`, error);
    }
  }
}

// Test function
export async function discoverPortlandPizza() {
  const scraper = new WebDiscoveryScraper();
  await scraper.discoverAndAnalyzeCity('Portland', 'OR');
}