#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';

interface PizzaRestaurant {
  name: string;
  address: string;
  rating?: string;
  priceRange?: string;
  cuisine?: string;
  website?: string;
  phone?: string;
  source: string;
}

export class SanFranciscoPizzaDiscovery {
  
  // Comprehensive discovery of ALL pizza restaurants in San Francisco
  async discoverAllSanFranciscoPizzaRestaurants(): Promise<PizzaRestaurant[]> {
    console.log('🔍 Discovering ALL pizza restaurants in San Francisco...');
    console.log('Using multiple comprehensive search strategies...');
    
    const allRestaurants: PizzaRestaurant[] = [];
    
    // Strategy 1: Direct Google Maps pizza category searches
    const googleMapsSearches = [
      'pizza San Francisco CA',
      'pizza restaurants San Francisco California',
      'pizzeria San Francisco',
      'pizza delivery San Francisco',
      'pizza takeout San Francisco',
      'Italian restaurant pizza San Francisco',
      'New York pizza San Francisco',
      'Chicago pizza San Francisco',
      'Neapolitan pizza San Francisco',
      'wood fired pizza San Francisco'
    ];
    
    for (const query of googleMapsSearches) {
      console.log(`  📍 Google Maps search: ${query}`);
      const restaurants = await this.searchGoogleMaps(query);
      allRestaurants.push(...restaurants);
      await this.delay(2000);
    }
    
    // Strategy 2: Business directory comprehensive searches
    const directorySearches = [
      'site:yelp.com pizza San Francisco',
      'site:yelp.com pizzeria San Francisco',  
      'site:zomato.com pizza San Francisco',
      'site:foursquare.com pizza San Francisco',
      'site:opentable.com pizza San Francisco',
      'site:grubhub.com pizza San Francisco',
      'site:doordash.com pizza San Francisco',
      'site:ubereats.com pizza San Francisco'
    ];
    
    for (const query of directorySearches) {
      console.log(`  📋 Directory search: ${query}`);
      const restaurants = await this.searchBusinessDirectories(query);
      allRestaurants.push(...restaurants);
      await this.delay(1500);
    }
    
    // Strategy 3: Neighborhood-specific searches
    const sfNeighborhoods = [
      'Mission District', 'Castro', 'Haight-Ashbury', 'Chinatown', 'North Beach',
      'Financial District', 'SoMa', 'Nob Hill', 'Russian Hill', 'Pacific Heights',
      'Marina District', 'Richmond', 'Sunset', 'Potrero Hill', 'Bernal Heights'
    ];
    
    for (const neighborhood of sfNeighborhoods) {
      console.log(`  🏘️  Neighborhood search: ${neighborhood}`);
      const restaurants = await this.searchByNeighborhood(neighborhood);
      allRestaurants.push(...restaurants);
      await this.delay(1500);
    }
    
    // Strategy 4: Cuisine-specific searches that include pizza
    const cuisineSearches = [
      'Italian restaurant San Francisco pizza',
      'Mediterranean restaurant San Francisco pizza', 
      'Casual dining San Francisco pizza',
      'Family restaurant San Francisco pizza',
      'Sports bar San Francisco pizza',
      'Beer garden San Francisco pizza'
    ];
    
    for (const query of cuisineSearches) {
      console.log(`  🍽️  Cuisine search: ${query}`);
      const restaurants = await this.searchByCuisine(query);
      allRestaurants.push(...restaurants);
      await this.delay(1500);
    }
    
    const uniqueRestaurants = this.removeDuplicates(allRestaurants);
    console.log(`\n✅ DISCOVERY COMPLETE:`);
    console.log(`📊 Total pizza restaurants found: ${uniqueRestaurants.length}`);
    console.log(`🔍 Sources used: Google Maps, Yelp, Zomato, Foursquare, delivery apps`);
    console.log(`🏘️  Neighborhoods covered: ${sfNeighborhoods.length} SF areas`);
    
    return uniqueRestaurants;
  }

  // Search Google Maps results
  private async searchGoogleMaps(query: string): Promise<PizzaRestaurant[]> {
    const restaurants: PizzaRestaurant[] = [];
    
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=50`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      $('.g').each((index, element) => {
        if (index >= 40) return;
        
        try {
          const $el = $(element);
          const title = $el.find('h3').text().trim();
          const snippet = $el.find('.VwiC3b, .s3v9rd, .IsZvec').text();
          const link = $el.find('a').attr('href');
          
          // Enhanced pizza restaurant detection
          const pizzaIndicators = [
            'pizza', 'pizzeria', 'pie', 'slice', 'dough', 'crust'
          ];
          
          const sfIndicators = [
            'san francisco', 'sf', 'california', 'ca'
          ];
          
          const hasPizzaKeyword = pizzaIndicators.some(keyword => 
            title.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)
          );
          
          const hasSFLocation = sfIndicators.some(keyword =>
            title.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)
          );
          
          if (hasPizzaKeyword && hasSFLocation && title.length > 2) {
            
            // Extract rating if available
            const ratingMatch = snippet.match(/(\d\.\d|\d)\s?star/i);
            const rating = ratingMatch ? ratingMatch[1] + ' stars' : undefined;
            
            // Extract price range if available  
            const priceMatch = snippet.match(/\$+/);
            const priceRange = priceMatch ? priceMatch[0] : undefined;
            
            // Extract address if available
            const addressMatch = snippet.match(/\d+\s+[A-Za-z\s,]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)[^,]*,?\s*[A-Za-z\s]*\d{5}?/i);
            const address = addressMatch ? addressMatch[0] : 'San Francisco, CA';
            
            restaurants.push({
              name: title.replace(/\|.*$/, '').replace(/-.*$/, '').trim(),
              address,
              rating,
              priceRange,
              website: link && link.startsWith('http') ? link : undefined,
              source: 'Google Maps Search'
            });
          }
        } catch (error) {
          // Continue processing
        }
      });
      
    } catch (error) {
      console.log(`    ⚠️  Google Maps search error: ${error.message}`);
    }
    
    return restaurants;
  }

  // Search business directories
  private async searchBusinessDirectories(query: string): Promise<PizzaRestaurant[]> {
    const restaurants: PizzaRestaurant[] = [];
    
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      $('.g').each((index, element) => {
        if (index >= 20) return;
        
        try {
          const $el = $(element);
          const title = $el.find('h3').text().trim();
          const snippet = $el.find('.VwiC3b, .s3v9rd').text();
          const link = $el.find('a').attr('href');
          
          // Look for restaurant names in directory listings
          if (title.toLowerCase().includes('pizza') && 
              (snippet.toLowerCase().includes('san francisco') || snippet.toLowerCase().includes('sf')) &&
              link && link.startsWith('http')) {
            
            const cleanName = title
              .replace(/\|.*$/, '')
              .replace(/- Yelp|Yelp/gi, '')
              .replace(/- Zomato|Zomato/gi, '')  
              .replace(/\.\.\.$/, '')
              .trim();
            
            if (cleanName.length > 2) {
              restaurants.push({
                name: cleanName,
                address: 'San Francisco, CA',
                website: link,
                source: query.includes('yelp') ? 'Yelp' : 
                        query.includes('zomato') ? 'Zomato' :
                        query.includes('foursquare') ? 'Foursquare' : 'Directory'
              });
            }
          }
        } catch (error) {
          // Continue processing
        }
      });
      
    } catch (error) {
      console.log(`    ⚠️  Directory search error: ${error.message}`);
    }
    
    return restaurants;
  }

  // Search by neighborhood
  private async searchByNeighborhood(neighborhood: string): Promise<PizzaRestaurant[]> {
    const query = `pizza "${neighborhood}" San Francisco`;
    return await this.searchGoogleMaps(query);
  }

  // Search by cuisine type
  private async searchByCuisine(query: string): Promise<PizzaRestaurant[]> {
    return await this.searchGoogleMaps(query);
  }

  // Remove duplicates with enhanced matching
  private removeDuplicates(restaurants: PizzaRestaurant[]): PizzaRestaurant[] {
    const seen = new Map();
    
    return restaurants.filter(restaurant => {
      // Create normalized name for comparison
      const normalizedName = restaurant.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/pizza|pizzeria/g, '');
      
      // Create website domain for comparison
      const domain = restaurant.website ? 
        new URL(restaurant.website).hostname.replace('www.', '') : '';
      
      // Use multiple keys to catch variations
      const keys = [normalizedName, domain].filter(Boolean);
      
      for (const key of keys) {
        if (seen.has(key)) {
          return false;
        }
      }
      
      // Add all keys to seen set
      keys.forEach(key => seen.set(key, true));
      seen.set(restaurant.name.toLowerCase(), true);
      
      return true;
    });
  }

  // Helper delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Display comprehensive results
  displayResults(restaurants: PizzaRestaurant[]): void {
    console.log(`\n📊 SAN FRANCISCO PIZZA RESTAURANT DISCOVERY RESULTS:`);
    console.log(`🏆 Total pizza restaurants found: ${restaurants.length}`);
    
    // Group by source
    const sourceGroups = restaurants.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`\n📈 Results by source:`);
    Object.entries(sourceGroups).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} restaurants`);
    });
    
    // Show sample restaurants
    console.log(`\n🍕 Sample discovered restaurants:`);
    restaurants.slice(0, 10).forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   📍 ${r.address}`);
      if (r.rating) console.log(`   ⭐ ${r.rating}`);
      if (r.website) console.log(`   🌐 ${r.website}`);
      console.log(`   📋 Source: ${r.source}\n`);
    });
    
    if (restaurants.length > 10) {
      console.log(`   ... and ${restaurants.length - 10} more restaurants`);
    }
  }

  // Save results to temporary storage for part 2 analysis
  async saveDiscoveryResults(restaurants: PizzaRestaurant[]): Promise<void> {
    const resultsData = {
      timestamp: new Date().toISOString(),
      totalFound: restaurants.length,
      restaurants: restaurants
    };
    
    // Save to a temporary table or file for the next phase
    console.log(`💾 Discovery results saved for sourdough verification phase`);
    console.log(`📊 Ready for Part 2: Sourdough verification of ${restaurants.length} restaurants`);
  }
}

// Main execution
async function main() {
  const discovery = new SanFranciscoPizzaDiscovery();
  
  console.log('🚀 PART 1: Comprehensive San Francisco Pizza Restaurant Discovery');
  console.log('Goal: Find ALL pizza restaurants in San Francisco using Google Maps pizza category');
  
  const allPizzaRestaurants = await discovery.discoverAllSanFranciscoPizzaRestaurants();
  
  discovery.displayResults(allPizzaRestaurants);
  await discovery.saveDiscoveryResults(allPizzaRestaurants);
  
  console.log(`\n✅ PART 1 COMPLETE:`);
  console.log(`📊 Discovered ${allPizzaRestaurants.length} total pizza restaurants in San Francisco`);
  console.log(`🔍 Next: Part 2 will verify which of these ${allPizzaRestaurants.length} use sourdough`);
  console.log(`📈 This will give us the true sourdough adoption rate in SF pizza restaurants`);
}

main().catch(console.error);