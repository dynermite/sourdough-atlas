#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface RestaurantLead {
  name: string;
  address: string;
  website?: string;
  phone?: string;
  source: string;
}

export class EnhancedPizzaDiscovery {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'fermented'
  ];

  // Comprehensive search strategies to find ALL pizza restaurants
  async discoverAllPizzaRestaurants(city: string, state: string): Promise<RestaurantLead[]> {
    console.log(`🔍 Comprehensive pizza discovery for ${city}, ${state}`);
    console.log('Using multiple search strategies to find ALL pizza restaurants...');
    
    const allLeads: RestaurantLead[] = [];
    
    // Strategy 1: Google business directory search
    const googleSearches = [
      `pizza restaurants ${city} ${state}`,
      `pizzeria ${city} ${state}`,
      `pizza ${city} ${state} site:google.com`,
      `"${city}" "pizza" OR "pizzeria" OR "pie" restaurant`,
      `${city} ${state} italian restaurant pizza`,
      `${city} ${state} wood fired pizza`,
      `${city} ${state} artisan pizza`,
      `${city} ${state} neapolitan pizza`
    ];
    
    for (const query of googleSearches) {
      console.log(`  📋 Searching: ${query}`);
      const leads = await this.searchGoogle(query, city, state);
      allLeads.push(...leads);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Strategy 2: Business directory searches
    const directorySearches = [
      `site:yelp.com pizza ${city} ${state}`,
      `site:zomato.com pizza ${city} ${state}`,
      `site:foursquare.com pizza ${city} ${state}`,
      `site:opentable.com pizza ${city} ${state}`,
      `site:yellowpages.com pizza ${city} ${state}`
    ];
    
    for (const query of directorySearches) {
      console.log(`  📋 Directory search: ${query}`);
      const leads = await this.searchGoogle(query, city, state);
      allLeads.push(...leads);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Strategy 3: Specific cuisine searches that might include pizza
    const cuisineSearches = [
      `${city} ${state} italian restaurant`,
      `${city} ${state} mediterranean restaurant`,
      `${city} ${state} casual dining pizza`,
      `${city} ${state} family restaurant pizza`
    ];
    
    for (const query of cuisineSearches) {
      console.log(`  📋 Cuisine search: ${query}`);
      const leads = await this.searchGoogle(query, city, state);
      allLeads.push(...leads);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    const uniqueLeads = this.removeDuplicates(allLeads);
    console.log(`✅ Found ${uniqueLeads.length} unique restaurant leads from all sources`);
    
    return uniqueLeads;
  }

  // Enhanced Google search that extracts more restaurant information
  private async searchGoogle(query: string, city: string, state: string): Promise<RestaurantLead[]> {
    const leads: RestaurantLead[] = [];
    
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=50`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract search results with enhanced parsing
      $('.g').each((index, element) => {
        if (index >= 30) return; // Process more results per search
        
        try {
          const $el = $(element);
          const title = $el.find('h3').text();
          const snippet = $el.find('.VwiC3b, .s3v9rd, .IsZvec').text();
          const link = $el.find('a').attr('href');
          
          // More inclusive restaurant detection
          const restaurantIndicators = [
            'pizza', 'pizzeria', 'restaurant', 'kitchen', 'cafe', 'diner', 
            'eatery', 'bistro', 'trattoria', 'bar', 'grill', 'house'
          ];
          
          const locationIndicators = [city.toLowerCase(), state.toLowerCase()];
          
          const hasRestaurantKeyword = restaurantIndicators.some(keyword => 
            title.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)
          );
          
          const hasLocationKeyword = locationIndicators.some(keyword =>
            title.toLowerCase().includes(keyword) || snippet.toLowerCase().includes(keyword)
          );
          
          if (hasRestaurantKeyword && hasLocationKeyword && link && link.startsWith('http')) {
            
            // Clean restaurant name
            let restaurantName = title
              .replace(/\|.*$/, '')
              .replace(/-.*$/, '') 
              .replace(/\s*\.\.\.$/, '')
              .trim();
            
            // Extract address from snippet if available
            const addressMatch = snippet.match(/\d+\s+[A-Za-z\s,]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)[^,]*,?\s*[A-Za-z\s]*\d{5}?/i);
            const address = addressMatch ? addressMatch[0] : `${city}, ${state}`;
            
            if (restaurantName && restaurantName.length > 2) {
              leads.push({
                name: restaurantName,
                address: address,
                website: link,
                source: 'Google Search'
              });
            }
          }
        } catch (error) {
          // Continue to next result
        }
      });
      
    } catch (error) {
      console.log(`    ❌ Search error: ${error.message}`);
    }
    
    return leads;
  }

  // Remove duplicate leads with better deduplication
  private removeDuplicates(leads: RestaurantLead[]): RestaurantLead[] {
    const seen = new Set();
    return leads.filter(lead => {
      // Create multiple keys to catch different variations
      const nameKey = lead.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const websiteKey = lead.website ? new URL(lead.website).hostname : '';
      const combinedKey = `${nameKey}-${websiteKey}`;
      
      if (seen.has(combinedKey) || seen.has(nameKey)) {
        return false;
      }
      seen.add(combinedKey);
      seen.add(nameKey);
      return true;
    });
  }

  // Enhanced website analysis
  async analyzeRestaurantForSourdough(lead: RestaurantLead): Promise<{verified: boolean, keywords: string[], description: string}> {
    console.log(`    🔍 Analyzing ${lead.name}...`);
    
    if (!lead.website) {
      return { verified: false, keywords: [], description: '' };
    }
    
    try {
      const response = await axios.get(lead.website, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove non-content elements
      $('script, style, nav, header, footer, .nav, .navigation, .sidebar').remove();
      
      // Focus on content areas that typically contain menu/description
      const contentAreas = [
        'main', '.main', '.content', '.about', '.menu', '.description',
        '.story', '.our-story', '.food', '.pizza', '.specialty'
      ].map(selector => $(selector).text()).join(' ');
      
      const fullContent = $('body').text();
      const combinedContent = (contentAreas + ' ' + fullContent).toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Enhanced keyword detection
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        combinedContent.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        // Extract context around keywords for description
        let description = '';
        foundKeywords.forEach(keyword => {
          const index = combinedContent.indexOf(keyword.toLowerCase());
          if (index !== -1 && description.length < 250) {
            const start = Math.max(0, index - 75);
            const end = Math.min(combinedContent.length, index + 175);
            const context = combinedContent.substring(start, end).trim();
            description += context + ' ';
          }
        });
        
        console.log(`        ✅ SOURDOUGH VERIFIED: ${foundKeywords.join(', ')}`);
        return {
          verified: true,
          keywords: foundKeywords,
          description: description.trim().substring(0, 400)
        };
      } else {
        console.log(`        ❌ No sourdough keywords found`);
        return { verified: false, keywords: [], description: '' };
      }
      
    } catch (error) {
      console.log(`        ⚠️  Website analysis failed: ${error.message}`);
      return { verified: false, keywords: [], description: '' };
    }
  }

  // Add verified restaurant to database
  async addVerifiedRestaurant(lead: RestaurantLead, keywords: string[], description: string, city: string, state: string): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, lead.name));
      
      if (existing.length > 0) {
        console.log(`        🔄 ${lead.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: lead.name,
        address: lead.address,
        city: city,
        state: state,
        zipCode: lead.address.match(/\d{5}/)?.[0] || '',
        phone: lead.phone || '',
        website: lead.website || '',
        description: description || `Verified sourdough keywords: ${keywords.join(', ')}`,
        sourdoughVerified: 1,
        sourdoughKeywords: keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 45.5152, // Default coordinates
        longitude: -122.6784,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified sourdough restaurant: ${keywords.join(', ')}`]
      };

      await db.insert(restaurants).values(restaurantData);
      console.log(`        ✅ ADDED TO DATABASE: ${lead.name}`);
      console.log(`           Keywords: ${keywords.join(', ')}`);
      
      return true;
      
    } catch (error) {
      console.log(`        ❌ Failed to add ${lead.name}: ${error.message}`);
      return false;
    }
  }

  // Main comprehensive discovery process
  async runComprehensiveDiscovery(city: string, state: string): Promise<number> {
    console.log('🚀 Starting comprehensive pizza restaurant discovery...');
    
    let totalAdded = 0;
    
    // Step 1: Discover all pizza restaurants
    const allLeads = await this.discoverAllPizzaRestaurants(city, state);
    
    if (allLeads.length === 0) {
      console.log('❌ No restaurant leads found');
      return 0;
    }
    
    console.log(`\n🔍 Analyzing ${allLeads.length} restaurants for sourdough verification...`);
    
    // Step 2: Analyze each restaurant
    for (let i = 0; i < Math.min(allLeads.length, 40); i++) { // Analyze up to 40 restaurants
      const lead = allLeads[i];
      console.log(`\n[${i + 1}/${Math.min(allLeads.length, 40)}] 🍕 ${lead.name}`);
      console.log(`    📍 ${lead.address}`);
      console.log(`    🌐 ${lead.website || 'No website'}`);
      
      const verification = await this.analyzeRestaurantForSourdough(lead);
      
      if (verification.verified) {
        const added = await this.addVerifiedRestaurant(lead, verification.keywords, verification.description, city, state);
        if (added) {
          totalAdded++;
        }
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 COMPREHENSIVE DISCOVERY RESULTS:`);
    console.log(`🔍 Total restaurant leads found: ${allLeads.length}`);
    console.log(`🍕 Restaurants analyzed: ${Math.min(allLeads.length, 40)}`);
    console.log(`✅ Verified sourdough restaurants added: ${totalAdded}`);
    console.log(`📈 Sourdough success rate: ${((totalAdded / Math.min(allLeads.length, 40)) * 100).toFixed(1)}%`);
    
    return totalAdded;
  }
}

// Main execution
async function main() {
  const scraper = new EnhancedPizzaDiscovery();
  
  console.log('🎯 Running enhanced comprehensive pizza discovery for Portland...');
  console.log('This uses multiple search strategies to find ALL pizza restaurants');
  
  const addedCount = await scraper.runComprehensiveDiscovery('Portland', 'Oregon');
  
  console.log(`\n🎉 Enhanced discovery complete! Added ${addedCount} verified sourdough restaurants`);
}

main().catch(console.error);