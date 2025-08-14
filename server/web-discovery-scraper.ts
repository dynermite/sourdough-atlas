#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface RestaurantLead {
  name: string;
  website: string;
  location: string;
  source: string;
}

export class WebDiscoveryScr {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation'
  ];

  // Search multiple web sources for pizza restaurants
  async discoverRestaurants(city: string, state: string): Promise<RestaurantLead[]> {
    console.log(`🔍 Web discovery for pizza restaurants in ${city}, ${state}...`);
    
    const allLeads: RestaurantLead[] = [];
    
    // Search strategies
    const searchQueries = [
      `"${city}" "pizza" "Oregon" site:yelp.com`,
      `"${city}" "pizzeria" "naturally leavened"`,
      `"${city}" "sourdough pizza"`,
      `"${city}" "artisan pizza" site:zomato.com`,
      `"${city}" "wood fired pizza"`,
      `"pizza" "${city}" "locally sourced"`
    ];
    
    for (const query of searchQueries) {
      try {
        console.log(`  📋 Searching: ${query}`);
        const leads = await this.searchWeb(query, city);
        allLeads.push(...leads);
        
        // Delay between searches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`    ⚠️  Search failed: ${error.message}`);
      }
    }
    
    return this.removeDuplicates(allLeads);
  }

  // Perform web search for restaurant leads
  private async searchWeb(query: string, city: string): Promise<RestaurantLead[]> {
    const leads: RestaurantLead[] = [];
    
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract search results
      $('.g').each((index, element) => {
        if (index >= 15) return; // Limit results
        
        try {
          const $el = $(element);
          const title = $el.find('h3').text();
          const snippet = $el.find('.VwiC3b, .s3v9rd').text();
          const link = $el.find('a').attr('href');
          
          // Look for pizza restaurant patterns
          if ((title.toLowerCase().includes('pizza') || 
               snippet.toLowerCase().includes('pizza')) &&
              (title.includes(city) || snippet.includes(city)) &&
              link && link.startsWith('http')) {
            
            // Extract restaurant name from title
            let restaurantName = title
              .replace(/\|.*$/, '')  // Remove site names after |
              .replace(/-.*$/, '')   // Remove extra text after -
              .trim();
            
            if (restaurantName && restaurantName.length > 3) {
              leads.push({
                name: restaurantName,
                website: link,
                location: `${city}, OR`,
                source: 'Google Search'
              });
            }
          }
        } catch (error) {
          // Continue to next result
        }
      });
      
    } catch (error) {
      console.log(`    ❌ Web search error: ${error.message}`);
    }
    
    return leads;
  }

  // Remove duplicate restaurant leads
  private removeDuplicates(leads: RestaurantLead[]): RestaurantLead[] {
    const seen = new Set();
    return leads.filter(lead => {
      const key = `${lead.name.toLowerCase()}-${lead.website}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Verify sourdough on restaurant website
  async verifySourdoughClaim(lead: RestaurantLead): Promise<{verified: boolean, keywords: string[], description: string}> {
    console.log(`    🔍 Checking ${lead.name}...`);
    
    try {
      const response = await axios.get(lead.website, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove non-content elements
      $('script, style, nav, header, footer').remove();
      
      // Extract text content
      const content = $('body').text().toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Check for sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        // Extract description context
        let description = '';
        foundKeywords.forEach(keyword => {
          const index = content.indexOf(keyword.toLowerCase());
          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + 150);
            const context = content.substring(start, end).trim();
            if (description.length < 200) {
              description += context + ' ';
            }
          }
        });
        
        console.log(`        ✅ SOURDOUGH VERIFIED: ${foundKeywords.join(', ')}`);
        return {
          verified: true,
          keywords: foundKeywords,
          description: description.trim().substring(0, 300)
        };
      } else {
        console.log(`        ❌ No sourdough keywords found`);
        return { verified: false, keywords: [], description: '' };
      }
      
    } catch (error) {
      console.log(`        ⚠️  Website check failed: ${error.message}`);
      return { verified: false, keywords: [], description: '' };
    }
  }

  // Add verified restaurant to database
  async addVerifiedRestaurant(lead: RestaurantLead, keywords: string[], description: string): Promise<boolean> {
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
        address: lead.location,
        city: 'Portland',
        state: 'OR',
        zipCode: '',
        phone: '',
        website: lead.website,
        description: description,
        sourdoughVerified: 1,
        sourdoughKeywords: keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 45.5152,
        longitude: -122.6784,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified sourdough keywords: ${keywords.join(', ')}`]
      };

      await db.insert(restaurants).values(restaurantData);
      
      console.log(`        ✅ ADDED: ${lead.name}`);
      console.log(`           Keywords: ${keywords.join(', ')}`);
      
      return true;
      
    } catch (error) {
      console.log(`        ❌ Failed to add ${lead.name}: ${error.message}`);
      return false;
    }
  }

  // Enhanced discovery process
  async enhancedPortlandDiscovery(): Promise<number> {
    console.log('🚀 Enhanced Portland sourdough discovery...');
    
    let addedCount = 0;
    
    // Step 1: Web discovery
    const leads = await this.discoverRestaurants('Portland', 'Oregon');
    console.log(`📋 Found ${leads.length} potential restaurant leads`);
    
    if (leads.length === 0) {
      console.log('❌ No restaurant leads found');
      return 0;
    }
    
    // Step 2: Verify each restaurant
    console.log('\n🔍 Verifying restaurants for sourdough...');
    
    for (let i = 0; i < Math.min(leads.length, 20); i++) {
      const lead = leads[i];
      console.log(`\n[${i + 1}/${Math.min(leads.length, 20)}] 🍕 ${lead.name}`);
      console.log(`    🌐 ${lead.website}`);
      
      const verification = await this.verifySourdoughClaim(lead);
      
      if (verification.verified) {
        const added = await this.addVerifiedRestaurant(lead, verification.keywords, verification.description);
        if (added) {
          addedCount++;
        }
      }
      
      // Delay between checks
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    
    console.log(`\n✅ Enhanced discovery complete: Added ${addedCount} new verified sourdough restaurants`);
    return addedCount;
  }
}

// Main execution
async function main() {
  const scraper = new WebDiscoveryScr();
  const addedCount = await scraper.enhancedPortlandDiscovery();
  
  console.log(`\n🎉 Discovery process complete! Added ${addedCount} restaurants to database`);
}

main().catch(console.error);