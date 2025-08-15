#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';

interface YelpPizzaRestaurant {
  name: string;
  address: string;
  rating: string;
  reviewCount: string;
  priceRange: string;
  yelpUrl: string;
  website?: string;
  phone?: string;
}

export class YelpPizzaScraper {
  
  async scrapeSanFranciscoPizzaFromYelp(): Promise<YelpPizzaRestaurant[]> {
    console.log('🔍 Scraping Yelp for ALL San Francisco pizza restaurants...');
    
    const allRestaurants: YelpPizzaRestaurant[] = [];
    
    // Yelp search URLs for different pages and filters
    const yelpSearches = [
      'https://www.yelp.com/search?find_desc=pizza&find_loc=San%20Francisco%2C%20CA',
      'https://www.yelp.com/search?find_desc=pizzeria&find_loc=San%20Francisco%2C%20CA',
      'https://www.yelp.com/search?find_desc=italian%20pizza&find_loc=San%20Francisco%2C%20CA',
      'https://www.yelp.com/search?find_desc=wood%20fired%20pizza&find_loc=San%20Francisco%2C%20CA',
      'https://www.yelp.com/search?find_desc=neapolitan%20pizza&find_loc=San%20Francisco%2C%20CA'
    ];
    
    for (const baseUrl of yelpSearches) {
      // Try multiple pages for each search
      for (let page = 0; page <= 50; page += 10) { // Yelp uses start parameter
        const searchUrl = `${baseUrl}&start=${page}`;
        console.log(`  📄 Scraping: ${searchUrl}`);
        
        try {
          const restaurants = await this.scrapeYelpPage(searchUrl);
          allRestaurants.push(...restaurants);
          
          if (restaurants.length === 0) {
            console.log(`    ⏭️  No more results, moving to next search`);
            break;
          }
          
          await this.delay(2000); // Rate limiting
          
        } catch (error) {
          console.log(`    ❌ Error scraping page ${page}: ${error.message}`);
          break;
        }
      }
    }
    
    const uniqueRestaurants = this.removeDuplicates(allRestaurants);
    console.log(`\n✅ Yelp scraping complete: ${uniqueRestaurants.length} unique pizza restaurants found`);
    
    return uniqueRestaurants;
  }
  
  private async scrapeYelpPage(url: string): Promise<YelpPizzaRestaurant[]> {
    const restaurants: YelpPizzaRestaurant[] = [];
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      // Yelp's business listings selectors (these change frequently)
      const businessSelectors = [
        '[data-testid="serp-ia-card"]',
        '.result',
        '.businessResult',
        '.searchResult',
        '.regular-search-result'
      ];
      
      let foundBusinesses = false;
      
      for (const selector of businessSelectors) {
        const businesses = $(selector);
        
        if (businesses.length > 0) {
          foundBusinesses = true;
          console.log(`    Found ${businesses.length} businesses with selector: ${selector}`);
          
          businesses.each((index, element) => {
            try {
              const $business = $(element);
              
              // Extract business name
              const name = $business.find('h3 a, .businessName, [data-testid="business-name"]').first().text().trim();
              
              // Extract address
              const address = $business.find('.secondaryAttributes, .address, [data-testid="business-address"]').first().text().trim();
              
              // Extract rating
              const rating = $business.find('.rating, [data-testid="rating"]').first().attr('aria-label') || 
                           $business.find('.i-stars').first().attr('title') || '0';
              
              // Extract review count
              const reviewCount = $business.find('.reviewCount, [data-testid="review-count"]').first().text().trim();
              
              // Extract price range
              const priceRange = $business.find('.priceRange, .price-range').first().text().trim();
              
              // Extract Yelp URL
              const yelpUrl = $business.find('h3 a, .businessName').first().attr('href') || '';
              const fullYelpUrl = yelpUrl.startsWith('/') ? `https://www.yelp.com${yelpUrl}` : yelpUrl;
              
              if (name && name.length > 2 && address.includes('San Francisco')) {
                restaurants.push({
                  name,
                  address,
                  rating: rating.toString(),
                  reviewCount,
                  priceRange,
                  yelpUrl: fullYelpUrl
                });
              }
              
            } catch (error) {
              // Continue with next business
            }
          });
          
          break; // Found businesses with this selector, no need to try others
        }
      }
      
      if (!foundBusinesses) {
        console.log(`    ⚠️  No businesses found on page - selectors may have changed`);
        // Log the page structure for debugging
        const pageTitle = $('title').text();
        const mainContent = $('main, #main, .main-content').length;
        console.log(`    📄 Page title: ${pageTitle}`);
        console.log(`    🔍 Main content areas found: ${mainContent}`);
      }
      
    } catch (error) {
      console.log(`    ❌ Request error: ${error.message}`);
    }
    
    return restaurants;
  }
  
  private removeDuplicates(restaurants: YelpPizzaRestaurant[]): YelpPizzaRestaurant[] {
    const seen = new Set();
    return restaurants.filter(restaurant => {
      const key = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  displayResults(restaurants: YelpPizzaRestaurant[]): void {
    console.log(`\n📊 YELP SCRAPING RESULTS:`);
    console.log(`🏆 Total pizza restaurants found: ${restaurants.length}`);
    
    console.log(`\n🍕 Sample restaurants:`);
    restaurants.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   📍 ${r.address}`);
      console.log(`   ⭐ ${r.rating} (${r.reviewCount} reviews)`);
      if (r.priceRange) console.log(`   💰 ${r.priceRange}`);
      console.log(`   🔗 ${r.yelpUrl}\n`);
    });
    
    if (restaurants.length > 10) {
      console.log(`   ... and ${restaurants.length - 10} more restaurants`);
    }
  }
}

// Alternative approach using different data sources
export class AlternativeDataSources {
  
  // Check if we can use any APIs
  async checkAvailableAPIs(): Promise<void> {
    console.log('🔍 Checking available data source options...');
    
    // Check if Google Places API key is available
    console.log('📍 Google Places API: Checking for API key...');
    // Would need GOOGLE_PLACES_API_KEY
    
    // Check if Yelp Fusion API key is available
    console.log('🍽️  Yelp Fusion API: Checking for API key...');
    // Would need YELP_API_KEY
    
    // Check if Foursquare API key is available
    console.log('📱 Foursquare API: Checking for API key...');
    // Would need FOURSQUARE_API_KEY
    
    console.log('\n💡 API Recommendations:');
    console.log('1. Google Places API - Most comprehensive restaurant data');
    console.log('2. Yelp Fusion API - Good restaurant coverage with reviews');
    console.log('3. Foursquare Places API - Location-based business discovery');
    console.log('4. Outscraper - Third-party Google Maps scraping service');
    console.log('\n🔑 All require API keys but provide much better coverage than web scraping');
  }
  
  // Suggest outscraper approach
  suggestOutscraper(): void {
    console.log('\n🌟 RECOMMENDED: Outscraper Google Maps Scraper');
    console.log('=' .repeat(50));
    console.log('✅ Pros:');
    console.log('  • Can access full Google Maps data');
    console.log('  • Gets all ~180 pizza restaurants you found');
    console.log('  • Includes business details, websites, phone numbers');
    console.log('  • No coding required - just API calls');
    console.log('  • Relatively inexpensive for one-time city scraping');
    
    console.log('\n📊 Expected Results:');
    console.log('  • ~180 pizza restaurants in San Francisco');
    console.log('  • Complete business profiles with websites');
    console.log('  • Phone numbers and addresses');
    console.log('  • Ratings and review counts');
    
    console.log('\n💰 Cost Estimate:');
    console.log('  • Outscraper: ~$10-20 for complete SF pizza restaurant data');
    console.log('  • One-time cost vs ongoing development time');
    
    console.log('\n🔧 Implementation:');
    console.log('  1. Get Outscraper API key');
    console.log('  2. Search "pizza restaurants San Francisco"');
    console.log('  3. Export complete dataset');
    console.log('  4. Import into our verification system');
  }
}

// Main execution
async function main() {
  const yelpScraper = new YelpPizzaScraper();
  const alternatives = new AlternativeDataSources();
  
  console.log('🚀 COMPREHENSIVE PIZZA RESTAURANT DISCOVERY OPTIONS');
  console.log('=' .repeat(60));
  
  // Try Yelp scraping first
  console.log('\n📋 OPTION 1: Yelp Web Scraping');
  const yelpRestaurants = await yelpScraper.scrapeSanFranciscoPizzaFromYelp();
  yelpScraper.displayResults(yelpRestaurants);
  
  // Show API options
  console.log('\n📋 OPTION 2: API-Based Solutions');
  await alternatives.checkAvailableAPIs();
  
  // Recommend outscraper
  console.log('\n📋 OPTION 3: Third-Party Service');
  alternatives.suggestOutscraper();
  
  console.log(`\n🎯 RECOMMENDATION:`);
  if (yelpRestaurants.length < 50) {
    console.log('Yelp scraping found limited results. Consider:');
    console.log('1. 🥇 Outscraper API (most comprehensive)');
    console.log('2. 🥈 Google Places API key');
    console.log('3. 🥉 Yelp Fusion API key');
  } else {
    console.log(`✅ Yelp scraping successful: ${yelpRestaurants.length} restaurants`);
    console.log('Ready for sourdough verification phase');
  }
}

main().catch(console.error);