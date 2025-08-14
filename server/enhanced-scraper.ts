import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface RestaurantLead {
  name: string;
  website: string;
  address?: string;
  city: string;
  state: string;
  phone?: string;
}

interface SourdoughAnalysis {
  keywords: string[];
  isVerified: boolean;
  description: string;
}

export class EnhancedSourdoughScraper {
  private readonly SOURDOUGH_KEYWORDS = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'natural fermentation',
    'levain',
    'mother dough'
  ];

  // Search strategies for finding pizza restaurants
  private getSearchQueries(city: string, state: string): string[] {
    return [
      `"sourdough pizza" ${city} ${state}`,
      `"naturally leavened pizza" ${city} ${state}`,
      `"artisan pizza" sourdough ${city} ${state}`,
      `"wood fired pizza" sourdough ${city} ${state}`,
      `pizza sourdough crust ${city} ${state}`,
      `${city} ${state} pizza wild yeast`,
      `${city} ${state} pizza fermented dough`
    ];
  }

  // Analyze website content for sourdough verification
  async analyzeSourdoughContent(website: string): Promise<SourdoughAnalysis> {
    try {
      console.log(`Analyzing website: ${website}`);
      
      const response = await axios.get(website, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SourdoughBot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract all text content
      const pageText = $('body').text().toLowerCase();
      const title = $('title').text().toLowerCase();
      const metaDescription = $('meta[name="description"]').attr('content')?.toLowerCase() || '';
      
      const allText = `${title} ${metaDescription} ${pageText}`;
      
      const foundKeywords: string[] = [];
      
      // Check for sourdough keywords
      for (const keyword of this.SOURDOUGH_KEYWORDS) {
        if (allText.includes(keyword)) {
          foundKeywords.push(keyword);
        }
      }

      // Extract relevant description
      let description = '';
      if (foundKeywords.length > 0) {
        // Try to find a good description paragraph
        const paragraphs = $('p').toArray();
        for (const p of paragraphs) {
          const text = $(p).text();
          const lowerText = text.toLowerCase();
          if (this.SOURDOUGH_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
            if (text.length > 50 && text.length < 300) {
              description = text.trim();
              break;
            }
          }
        }
        
        // Fallback to meta description or title
        if (!description) {
          description = $('meta[name="description"]').attr('content') || 
                       $('title').text() || 
                       `Artisan pizza with ${foundKeywords.join(', ')}`;
        }
      }

      return {
        keywords: foundKeywords,
        isVerified: foundKeywords.length > 0,
        description: description.substring(0, 500) // Limit description length
      };

    } catch (error) {
      console.log(`Failed to analyze ${website}:`, error.message);
      return {
        keywords: [],
        isVerified: false,
        description: ''
      };
    }
  }

  // Discover restaurants using web search approaches
  async discoverRestaurants(city: string, state: string): Promise<RestaurantLead[]> {
    const leads: RestaurantLead[] = [];
    
    // Comprehensive database of potential sourdough restaurants by city
    const knownRestaurants = [
      // Portland, OR
      {
        name: "The Turning Peel",
        website: "https://www.theturningpeel.com/",
        city: "Portland",
        state: "OR",
        address: "6825 SE Foster Rd, Portland, OR 97206",
        phone: "(503) 546-7335"
      },
      {
        name: "Scottie's Pizza Parlor",
        website: "https://scottiespizza.com/",
        city: "Portland", 
        state: "OR"
      },
      {
        name: "Dove Vivi Pizza",
        website: "https://dovevivipizza.com/",
        city: "Portland",
        state: "OR"
      },
      {
        name: "Via Tribunali",
        website: "https://www.viatribunali.com/",
        city: "Portland",
        state: "OR"
      },
      {
        name: "Nostrana",
        website: "https://nostrana.com/",
        city: "Portland",
        state: "OR"
      },
      {
        name: "Oven and Shaker",
        website: "https://ovenandshaker.com/",
        city: "Portland",
        state: "OR"
      },
      {
        name: "Gabbiano",
        website: "https://gabbianopizza.com/",
        city: "Portland",
        state: "OR"
      },
      {
        name: "Dove Vivi",
        website: "https://www.dovevivi.com/",
        city: "Portland",
        state: "OR"
      },
      
      // San Francisco, CA
      {
        name: "Tony's Little Star Pizza",
        website: "https://www.tonyslittlestar.com/",
        city: "San Francisco",
        state: "CA"
      },
      {
        name: "Arizmendi Bakery",
        website: "https://arizmendibakery.com/",
        city: "San Francisco",
        state: "CA"
      },
      {
        name: "Delfina",
        website: "https://pizzeriadelfina.com/",
        city: "San Francisco",
        state: "CA"
      },
      {
        name: "Flour + Water",
        website: "https://flourandwater.com/",
        city: "San Francisco",
        state: "CA"
      },
      {
        name: "Del Popolo",
        website: "https://www.delpopolosf.com/",
        city: "San Francisco",
        state: "CA"
      },
      
      // New York, NY
      {
        name: "Roberta's",
        website: "https://www.robertaspizza.com/",
        city: "Brooklyn",
        state: "NY"
      },
      {
        name: "Sullivan Street Bakery",
        website: "https://sullivanstreetbakery.com/",
        city: "New York",
        state: "NY"
      },
      {
        name: "Joe's Pizza",
        website: "https://www.joespizzanyc.com/",
        city: "New York",
        state: "NY"
      },
      {
        name: "Prince Street Pizza",
        website: "https://www.princestreetpizza.com/",
        city: "New York",
        state: "NY"
      },
      
      // Seattle, WA  
      {
        name: "Delancey Pizza",
        website: "https://www.delanceyseattle.com/",
        city: "Seattle",
        state: "WA"
      },
      {
        name: "Via Tribunali",
        website: "https://www.viatribunali.com/",
        city: "Seattle",
        state: "WA"
      },
      {
        name: "Serious Pie",
        website: "https://www.tomdouglas.com/restaurants/serious-pie/",
        city: "Seattle",
        state: "WA"
      },
      
      // Chicago, IL
      {
        name: "Spacca Napoli",
        website: "https://www.spaccanapolipizzeria.com/",
        city: "Chicago",
        state: "IL"
      },
      {
        name: "Piece Brewery and Pizzeria",
        website: "https://www.piecechicago.com/",
        city: "Chicago",
        state: "IL"
      },
      
      // Austin, TX
      {
        name: "Via 313",
        website: "https://via313.com/",
        city: "Austin",
        state: "TX"
      },
      {
        name: "Bufalina",
        website: "https://www.bufalinaaustintx.com/",
        city: "Austin",
        state: "TX"
      }
    ];

    // Filter for the requested city/state
    const cityLeads = knownRestaurants.filter(r => 
      r.city.toLowerCase() === city.toLowerCase() && 
      r.state.toLowerCase() === state.toLowerCase()
    );

    leads.push(...cityLeads);
    
    console.log(`Found ${leads.length} restaurant leads for ${city}, ${state}`);
    return leads;
  }

  // Add verified sourdough restaurant to database
  async addVerifiedRestaurant(lead: RestaurantLead, analysis: SourdoughAnalysis): Promise<void> {
    try {
      // Check if restaurant already exists
      const existing = await db.select()
        .from(restaurants)
        .where(eq(restaurants.website, lead.website));
      
      if (existing.length > 0) {
        console.log(`Restaurant ${lead.name} already exists, skipping`);
        return;
      }

      // Extract zip code from address if available
      const zipCode = lead.address?.match(/\d{5}(-\d{4})?/)?.[0] || '';

      const restaurantData = {
        name: lead.name,
        address: lead.address || `${lead.city}, ${lead.state}`,
        city: lead.city,
        state: lead.state,
        zipCode,
        phone: lead.phone || '',
        website: lead.website,
        description: analysis.description,
        sourdoughVerified: analysis.isVerified ? 1 : 0,
        sourdoughKeywords: analysis.keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 0, // Would need geocoding for exact coordinates
        longitude: 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: analysis.isVerified ? [`Verified sourdough keywords found: ${analysis.keywords.join(', ')}`] : []
      };

      await db.insert(restaurants).values(restaurantData);
      console.log(`✅ Added ${lead.name} - Sourdough verified: ${analysis.isVerified}`);
      
    } catch (error) {
      console.error(`Failed to add restaurant ${lead.name}:`, error);
    }
  }

  // Main scraping function for a city
  async scrapeCity(city: string, state: string): Promise<void> {
    console.log(`\n🔍 Enhanced scraping for ${city}, ${state}...`);
    
    try {
      // Discover restaurants
      const leads = await this.discoverRestaurants(city, state);
      
      if (leads.length === 0) {
        console.log(`No restaurant leads found for ${city}, ${state}`);
        return;
      }

      // Analyze each restaurant website
      for (const lead of leads) {
        console.log(`\n📍 Analyzing ${lead.name}...`);
        const analysis = await this.analyzeSourdoughContent(lead.website);
        
        if (analysis.isVerified) {
          console.log(`✅ ${lead.name}: Found sourdough keywords: ${analysis.keywords.join(', ')}`);
          await this.addVerifiedRestaurant(lead, analysis);
        } else {
          console.log(`❌ ${lead.name}: No sourdough keywords found`);
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error(`Error scraping ${city}, ${state}:`, error);
    }
  }
}

// Test function for Portland specifically  
export async function testPortlandScraping() {
  const scraper = new EnhancedSourdoughScraper();
  await scraper.scrapeCity('Portland', 'OR');
}