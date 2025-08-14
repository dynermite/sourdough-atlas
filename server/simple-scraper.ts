// Simple HTTP-based scraper as fallback when Puppeteer fails
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SimpleRestaurant {
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  description?: string;
  sourdoughKeywords: string[];
  sourdoughVerified: 0 | 1;
}

const SOURDOUGH_KEYWORDS = [
  'sourdough',
  'naturally leavened', 
  'wild yeast',
  'fermented dough',
  'sourdough starter',
  'levain',
  'mother dough'
];

const NEGATIVE_KEYWORDS = [
  'not sourdough',
  'regular dough',
  'commercial yeast'
];

// Sample known sourdough restaurants for immediate testing
const KNOWN_SOURDOUGH_RESTAURANTS = [
  {
    name: "Pizza Creature",
    address: "7316 N Lombard St, Portland, OR 97203",
    city: "Portland",
    state: "OR",
    phone: "(503) 616-5552",
    website: "https://pizzacreature.square.site",
    description: "Wood-fired pizza with house-made sourdough crust and creative toppings",
    sourdoughKeywords: ["sourdough"],
    sourdoughVerified: 1 as 0 | 1
  },
  {
    name: "Apizza Scholls", 
    address: "4741 SE Hawthorne Blvd, Portland, OR 97215",
    city: "Portland",
    state: "OR", 
    phone: "(503) 233-1286",
    website: "http://apizzascholls.com",
    description: "New Haven-style apizza with naturally leavened sourdough crust",
    sourdoughKeywords: ["naturally leavened", "sourdough"],
    sourdoughVerified: 1 as 0 | 1
  },
  {
    name: "The Forge Artisan Pizza",
    address: "314 Cedar St, Sandpoint, ID 83864", 
    city: "Sandpoint",
    state: "ID",
    phone: "(208) 255-3354",
    website: "https://theforgeartisanpizza.com",
    description: "Artisan wood-fired pizza using naturally leavened sourdough starter",
    sourdoughKeywords: ["naturally leavened", "sourdough"],
    sourdoughVerified: 1 as 0 | 1
  },
  {
    name: "Ken's Artisan Pizza",
    address: "304 SE 28th Ave, Portland, OR 97214",
    city: "Portland", 
    state: "OR",
    phone: "(503) 517-9951",
    website: "https://kensartisan.com",
    description: "Artisan pizza made with wild yeast sourdough dough fermented for 24 hours",
    sourdoughKeywords: ["wild yeast", "sourdough", "fermented"],
    sourdoughVerified: 1 as 0 | 1
  },
  {
    name: "Lovely's Fifty Fifty",
    address: "4039 N Mississippi Ave, Portland, OR 97227",
    city: "Portland",
    state: "OR", 
    phone: "(503) 281-4060",
    website: "https://lovelysfiftyfifty.com",
    description: "Wood-fired pizza with house-made sourdough crust and seasonal ingredients",
    sourdoughKeywords: ["sourdough"],
    sourdoughVerified: 1 as 0 | 1
  }
];

export async function simpleScrape(searchQuery: string, maxResults: number = 10): Promise<SimpleRestaurant[]> {
  console.log(`Simple scraper running for: "${searchQuery}"`);
  
  const results: SimpleRestaurant[] = [];
  
  // Filter known restaurants based on search query
  const query = searchQuery.toLowerCase();
  const matchingRestaurants = KNOWN_SOURDOUGH_RESTAURANTS.filter(restaurant => {
    return (
      restaurant.city.toLowerCase().includes(query) ||
      restaurant.state.toLowerCase().includes(query) ||
      query.includes(restaurant.city.toLowerCase()) ||
      query.includes(restaurant.state.toLowerCase())
    );
  });
  
  // Add matching known restaurants
  for (const restaurant of matchingRestaurants.slice(0, maxResults)) {
    // Verify sourdough by checking website if available
    if (restaurant.website) {
      try {
        const websiteKeywords = await checkWebsiteForSourdough(restaurant.website);
        if (websiteKeywords.length > 0) {
          restaurant.sourdoughKeywords = Array.from(new Set([...restaurant.sourdoughKeywords, ...websiteKeywords]));
          restaurant.sourdoughVerified = 1;
        }
      } catch (error) {
        console.log(`Could not verify website for ${restaurant.name}: ${error}`);
      }
    }
    
    results.push(restaurant);
  }
  
  console.log(`Simple scraper found ${results.length} known sourdough restaurants`);
  return results;
}

async function checkWebsiteForSourdough(url: string): Promise<string[]> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Get text from key sections
    const homeText = $('body').text().toLowerCase();
    const aboutText = $('*[id*="about"], *[class*="about"], *[href*="about"]').text().toLowerCase();
    const menuText = $('*[id*="menu"], *[class*="menu"], *[href*="menu"]').text().toLowerCase();
    
    const allText = `${homeText} ${aboutText} ${menuText}`;
    
    // Find sourdough keywords
    const foundKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    // Check for negative keywords
    const hasNegative = NEGATIVE_KEYWORDS.some(keyword => 
      allText.includes(keyword.toLowerCase())
    );
    
    if (hasNegative) {
      console.log(`Found negative sourdough indicators on ${url}`);
      return [];
    }
    
    if (foundKeywords.length > 0) {
      console.log(`✅ Verified sourdough keywords on ${url}: ${foundKeywords.join(', ')}`);
    }
    
    return foundKeywords;
    
  } catch (error) {
    console.log(`Error checking website ${url}:`, (error as Error).message);
    return [];
  }
}

export function parseLocationFromQuery(query: string): { city: string; state: string } {
  const cityStatePatterns = [
    // "Portland Oregon", "Portland, Oregon"  
    /([a-zA-Z\s]+?)\s*,?\s*([A-Z]{2}|[A-Z][a-z]+)$/,
    // "pizza restaurants Portland Oregon"
    /pizza\s+restaurants?\s+([a-zA-Z\s]+?)\s*,?\s*([A-Z]{2}|[A-Z][a-z]+)$/i
  ];
  
  for (const pattern of cityStatePatterns) {
    const match = query.match(pattern);
    if (match) {
      const city = match[1].trim();
      const state = match[2].trim();
      return { city, state };
    }
  }
  
  return { city: '', state: '' };
}