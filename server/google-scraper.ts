// Real Google Maps web scraper for finding sourdough pizza restaurants
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface ScrapedRestaurant {
  name: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  website?: string;
  description?: string;
  googleDescription?: string;
  sourdoughKeywords: string[];
  sourdoughVerified: 0 | 1;
  latitude?: number;
  longitude?: number;
  reviews?: string[];
}

// Sourdough detection keywords
const POSITIVE_KEYWORDS = [
  'sourdough',
  'naturally leavened',
  'wild yeast',
  'fermented dough',
  'sourdough starter',
  'fermentation',
  'levain',
  'mother dough',
  'starter culture'
];

const NEGATIVE_KEYWORDS = [
  'not sourdough',
  'regular dough',
  'commercial yeast',
  'instant yeast',
  'no sourdough'
];

export async function scrapeGoogleMaps(searchQuery: string, maxResults: number = 10): Promise<ScrapedRestaurant[]> {
  console.log(`Starting Google Maps scrape for: "${searchQuery}"`);
  
  let browser;
  try {
    // Launch browser in headless mode with system Chromium
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/*/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Search for pizza restaurants on Google Maps
    const searchUrl = `https://www.google.com/maps/search/pizza+restaurants+${encodeURIComponent(searchQuery)}`;
    console.log(`Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results to load - use more generic selectors
    try {
      await page.waitForSelector('[data-result-index]', { timeout: 15000 });
    } catch (error) {
      // Try alternative selector
      await page.waitForSelector('[role="main"]', { timeout: 15000 });
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // Additional wait for dynamic content
    
    // Extract restaurant data from the results using more reliable selectors
    const restaurants = await page.evaluate((maxResults) => {
      const results = [];
      
      // Try multiple selectors for finding restaurant cards
      const selectors = [
        '[data-result-index]',
        'div[role="article"]',
        '.qBF1Pd', // Google Maps result card class
        '[data-cid]' // Another common identifier
      ];
      
      let restaurantElements = null;
      for (const selector of selectors) {
        restaurantElements = document.querySelectorAll(selector);
        if (restaurantElements.length > 0) {
          console.log(`Found ${restaurantElements.length} elements with selector: ${selector}`);
          break;
        }
      }
      
      if (!restaurantElements || restaurantElements.length === 0) {
        // Fallback: try to find anything that looks like a business listing
        restaurantElements = document.querySelectorAll('div[jsaction]');
        console.log(`Fallback: found ${restaurantElements.length} potential results`);
      }
      
      for (let i = 0; i < Math.min(restaurantElements.length, maxResults); i++) {
        const element = restaurantElements[i];
        
        try {
          // Try to find name in various ways
          let name = '';
          const nameSelectors = [
            '[data-value="Name"]',
            'h3',
            '.fontHeadlineSmall',
            '.qBF1Pd'
          ];
          
          for (const selector of nameSelectors) {
            const nameEl = element.querySelector(selector);
            if (nameEl?.textContent?.trim()) {
              name = nameEl.textContent.trim();
              break;
            }
          }
          
          if (!name || !name.toLowerCase().includes('pizza')) continue;
          
          // Extract address
          let address = '';
          const addressSelectors = [
            '[data-value="Address"]',
            '.W4Efsd:nth-child(2)',
            '.fontBodyMedium'
          ];
          
          for (const selector of addressSelectors) {
            const addrEl = element.querySelector(selector);
            if (addrEl?.textContent?.trim()) {
              address = addrEl.textContent.trim();
              break;
            }
          }
          
          // Get all text content for description analysis
          let description = element.textContent?.trim() || '';
          
          results.push({
            name,
            address: address || '',
            phone: '',
            website: '',
            description: description.substring(0, 500), // Limit description length
            googleDescription: description.substring(0, 500)
          });
          
        } catch (error) {
          console.error('Error extracting restaurant data:', error);
        }
      }
      
      return results;
    }, maxResults);
    
    console.log(`Found ${restaurants.length} restaurants from Google Maps`);
    
    // Process each restaurant for sourdough keywords
    const processedRestaurants: ScrapedRestaurant[] = [];
    
    for (const restaurant of restaurants) {
      try {
        const processed = await processRestaurant(restaurant, page);
        processedRestaurants.push(processed);
      } catch (error) {
        console.error(`Error processing restaurant ${restaurant.name}:`, error);
        // Add restaurant with basic info even if processing fails
        const basicRestaurant = createBasicRestaurant(restaurant);
        processedRestaurants.push(basicRestaurant);
      }
    }
    
    return processedRestaurants;
    
  } catch (error) {
    console.error('Error scraping Google Maps:', error);
    // Re-throw the error so the fallback system can be triggered
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function processRestaurant(restaurant: any, page: any): Promise<ScrapedRestaurant> {
  let websiteContent = '';
  let allKeywords: string[] = [];
  
  // Check Google description for sourdough keywords
  const googleText = `${restaurant.description} ${restaurant.googleDescription}`.toLowerCase();
  const googleKeywords = POSITIVE_KEYWORDS.filter(keyword => 
    googleText.includes(keyword.toLowerCase())
  );
  
  if (googleKeywords.length > 0) {
    console.log(`Found sourdough keywords in Google description for ${restaurant.name}: ${googleKeywords.join(', ')}`);
    allKeywords.push(...googleKeywords);
  }
  
  // If restaurant has a website, scrape it for sourdough mentions
  if (restaurant.website && restaurant.website.startsWith('http')) {
    try {
      console.log(`Scraping website for ${restaurant.name}: ${restaurant.website}`);
      
      await page.goto(restaurant.website, { waitUntil: 'networkidle2', timeout: 10000 });
      const content = await page.content();
      
      // Parse website content
      const $ = cheerio.load(content);
      
      // Extract text from key sections
      const homeText = $('body').text().toLowerCase();
      const aboutText = $('*[id*="about"], *[class*="about"], *[id*="story"], *[class*="story"]').text().toLowerCase();
      
      websiteContent = `${homeText} ${aboutText}`;
      
      // Find sourdough keywords on website
      const websiteKeywords = POSITIVE_KEYWORDS.filter(keyword => 
        websiteContent.includes(keyword.toLowerCase())
      );
      
      if (websiteKeywords.length > 0) {
        console.log(`Found sourdough keywords on website for ${restaurant.name}: ${websiteKeywords.join(', ')}`);
        allKeywords.push(...websiteKeywords);
      }
      
    } catch (error) {
      console.error(`Error scraping website for ${restaurant.name}:`, error);
    }
  }
  
  // Check for negative keywords
  const hasNegativeKeywords = NEGATIVE_KEYWORDS.some(keyword => 
    googleText.includes(keyword.toLowerCase()) || 
    websiteContent.includes(keyword.toLowerCase())
  );
  
  // Remove duplicates from keywords
  allKeywords = Array.from(new Set(allKeywords));
  
  // Determine if restaurant is verified sourdough
  const sourdoughVerified = (allKeywords.length > 0 && !hasNegativeKeywords) ? 1 : 0;
  
  // Parse location from address
  const { city, state } = parseLocation(restaurant.address);
  
  const result: ScrapedRestaurant = {
    name: restaurant.name,
    address: restaurant.address || '',
    city,
    state,
    phone: restaurant.phone || undefined,
    website: restaurant.website || undefined,
    description: restaurant.description || undefined,
    googleDescription: restaurant.googleDescription || undefined,
    sourdoughKeywords: allKeywords,
    sourdoughVerified: sourdoughVerified as 0 | 1,
    reviews: []
  };
  
  if (sourdoughVerified) {
    console.log(`✅ Verified sourdough restaurant: ${restaurant.name} (${allKeywords.join(', ')})`);
  } else {
    console.log(`❌ Not sourdough: ${restaurant.name}`);
  }
  
  return result;
}

function createBasicRestaurant(restaurant: any): ScrapedRestaurant {
  const { city, state } = parseLocation(restaurant.address);
  
  return {
    name: restaurant.name,
    address: restaurant.address || '',
    city,
    state,
    phone: restaurant.phone || undefined,
    website: restaurant.website || undefined,
    description: restaurant.description || undefined,
    googleDescription: restaurant.googleDescription || undefined,
    sourdoughKeywords: [],
    sourdoughVerified: 0,
    reviews: []
  };
}

function parseLocation(address: string): { city: string; state: string } {
  if (!address) return { city: '', state: '' };
  
  // Extract city and state from address (assuming format: "Street, City, State Zip")
  const parts = address.split(',');
  if (parts.length >= 3) {
    const city = parts[parts.length - 2].trim();
    const stateZip = parts[parts.length - 1].trim();
    const state = stateZip.split(' ')[0].trim();
    return { city, state };
  }
  
  return { city: '', state: '' };
}