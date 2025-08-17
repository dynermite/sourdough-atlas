#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Focus on bakeries and artisan establishments more likely to mention sourdough
const BAKERY_PIZZA_ESTABLISHMENTS = [
  // California sourdough specialists
  { name: "Tartine Manufactory", website: "https://www.tartinemanufactory.com", city: "San Francisco", state: "CA" },
  { name: "Mission Chinese Food", website: "https://missionchinesefood.com", city: "San Francisco", state: "CA" },
  { name: "State Bird Provisions", website: "https://statebirdsf.com", city: "San Francisco", state: "CA" },
  { name: "The Mill", website: "https://themillsf.com", city: "San Francisco", state: "CA" },
  { name: "Outerlands", website: "https://outerlandssf.com", city: "San Francisco", state: "CA" },
  
  // Portland artisan scene
  { name: "Grand Central Bakery", website: "https://grandcentralbakery.com", city: "Portland", state: "OR" },
  { name: "Pearl Bakery", website: "https://pearlbakery.com", city: "Portland", state: "OR" },
  { name: "Little T American Baker", website: "https://littletbaker.com", city: "Portland", state: "OR" },
  { name: "Levison's", website: "https://levisons.com", city: "Portland", state: "OR" },
  
  // Seattle sourdough culture
  { name: "Macrina Bakery", website: "https://macrinabakery.com", city: "Seattle", state: "WA" },
  { name: "Columbia City Bakery", website: "https://columbiacitybakery.com", city: "Seattle", state: "WA" },
  { name: "Grand Central Bakery", website: "https://grandcentralbakery.com", city: "Seattle", state: "WA" },
  { name: "Tall Grass Bakery", website: "https://tallgrassbakery.com", city: "Seattle", state: "WA" },
  
  // New York artisan pizza/bread
  { name: "Pizza Beach", website: "https://pizzabeach.com", city: "Brooklyn", state: "NY" },
  { name: "L'industrie Pizzeria", website: "https://lindustriepizzeria.com", city: "Brooklyn", state: "NY" },
  { name: "Ops", website: "https://opsbrooklyn.com", city: "Brooklyn", state: "NY" },
  { name: "Mimi's", website: "https://mimispizza.com", city: "Brooklyn", state: "NY" },
  { name: "Amy's Bread", website: "https://amysbread.com", city: "New York", state: "NY" },
  { name: "She Wolf Bakery", website: "https://shewolfbakery.com", city: "Brooklyn", state: "NY" },
  
  // Philadelphia bread culture
  { name: "High Street Provisions", website: "https://highstreetphilly.com", city: "Philadelphia", state: "PA" },
  { name: "Metropolitan Bakery", website: "https://metropolitanbakery.com", city: "Philadelphia", state: "PA" },
  { name: "Rival Bros Coffee", website: "https://rivalbros.com", city: "Philadelphia", state: "PA" },
  
  // Chicago deep connections to bread
  { name: "Hoosier Mama Pie Company", website: "https://hoosiermamapie.com", city: "Chicago", state: "IL" },
  { name: "Stan's Donuts", website: "https://stansdonuts.com", city: "Chicago", state: "IL" },
  { name: "Publican Quality Bread", website: "https://publicanqualitybread.com", city: "Chicago", state: "IL" },
  
  // Austin food scene
  { name: "Sour Duck Market", website: "https://sourduckmarket.com", city: "Austin", state: "TX" },
  { name: "Easy Tiger", website: "https://easytigerusa.com", city: "Austin", state: "TX" },
  { name: "Quack's 43rd Street Bakery", website: "https://quacksbakery.com", city: "Austin", state: "TX" },
  
  // Denver/Boulder altitude baking
  { name: "Rebel Farm", website: "https://rebelfarm.com", city: "Boulder", state: "CO" },
  { name: "Wooden Spoon Bakery", website: "https://woodenspoonbakery.net", city: "Denver", state: "CO" },
  { name: "Grateful Bread", website: "https://gratefulbread.net", city: "Golden", state: "CO" },
  
  // Vermont/New England sourdough tradition
  { name: "Red Hen Bakery", website: "https://redhenbaking.com", city: "Duxbury", state: "VT" },
  { name: "King Arthur Baking", website: "https://kingarthurbaking.com", city: "Norwich", state: "VT" },
  { name: "Elmore Mountain Bread", website: "https://elmoremountainbread.com", city: "Elmore", state: "VT" }
];

class ExpandedDatabaseBuilder {
  private processed = 0;
  private verified = 0;
  private failed = 0;

  async processEstablishment(establishment: {
    name: string;
    website: string;
    city: string;
    state: string;
  }) {
    this.processed++;
    console.log(`\n[${this.processed}/${BAKERY_PIZZA_ESTABLISHMENTS.length}] Checking: ${establishment.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, establishment.name));
      if (existing.length > 0) {
        console.log(`   Already in database`);
        return false;
      }
      
      console.log(`   Analyzing website: ${establishment.website}`);
      
      const response = await axios.get(establishment.website, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();
      
      // Check for approved sourdough keywords
      const foundKeywords = SOURDOUGH_KEYWORDS.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      // Also check if they serve pizza (since this is a pizza directory)
      const hasPizza = content.includes('pizza') || content.includes('pizzeria') || 
                      establishment.name.toLowerCase().includes('pizza');
      
      if (foundKeywords.length === 0) {
        console.log(`   No sourdough keywords found`);
        this.failed++;
        return false;
      }
      
      if (!hasPizza) {
        console.log(`   Has sourdough [${foundKeywords.join(', ')}] but no pizza service`);
        this.failed++;
        return false;
      }
      
      console.log(`   VERIFIED SOURDOUGH PIZZA: [${foundKeywords.join(', ')}]`);
      
      // Extract description
      let description = '';
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc && metaDesc.length > 20) {
        description = metaDesc;
      } else {
        $('p').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 60 && (
            text.toLowerCase().includes('pizza') || 
            foundKeywords.some(keyword => text.toLowerCase().includes(keyword))
          )) {
            description = text.substring(0, 200) + '...';
            return false;
          }
        });
      }
      
      // Get business data
      const businessData = await this.getBusinessData(establishment.name, establishment.city, establishment.state);
      
      // Add to database
      await db.insert(restaurants).values({
        name: establishment.name,
        address: businessData.address || '',
        city: establishment.city,
        state: establishment.state,
        zipCode: '',
        phone: businessData.phone || '',
        website: establishment.website,
        description: description || `${establishment.name} - verified sourdough pizza establishment`,
        sourdoughVerified: 1,
        sourdoughKeywords: foundKeywords,
        rating: businessData.rating || 0,
        reviewCount: businessData.reviewCount || 0,
        latitude: businessData.latitude || 0,
        longitude: businessData.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`   ADDED TO DATABASE - Total: ${this.verified}`);
      
      if (businessData.address) {
        console.log(`   Address: ${businessData.address}`);
      }
      
      return true;
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      this.failed++;
      return false;
    }
  }

  async getBusinessData(name: string, city: string, state: string) {
    const apiKey = process.env.OUTSCRAPER_API_KEY;
    if (!apiKey) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0 };
    }
    
    try {
      const query = `${name} ${city} ${state}`;
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit: 1,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': apiKey
        }
      });

      if (response.data.status === 'Pending') {
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': apiKey
          }
        });

        if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
          const results = resultResponse.data.data;
          if (results.length > 0) {
            const business = results[0];
            return {
              address: business.address || '',
              phone: business.phone || '',
              rating: business.rating || 0,
              reviewCount: business.reviews_count || 0,
              latitude: business.latitude || 0,
              longitude: business.longitude || 0
            };
          }
        }
      }
      
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0 };
    } catch (error) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0 };
    }
  }

  getStats() {
    return {
      processed: this.processed,
      verified: this.verified,
      failed: this.failed,
      successRate: this.processed > 0 ? ((this.verified / this.processed) * 100).toFixed(1) : '0'
    };
  }
}

export async function expandSourdoughDatabase() {
  console.log('📈 EXPANDING SOURDOUGH DATABASE');
  console.log('=' .repeat(50));
  console.log(`🎯 Targeting bakeries and artisan establishments`);
  console.log(`✅ Keywords: [${SOURDOUGH_KEYWORDS.join(', ')}]`);
  console.log(`🍕 Must also serve pizza`);
  
  const builder = new ExpandedDatabaseBuilder();
  
  for (const establishment of BAKERY_PIZZA_ESTABLISHMENTS) {
    await builder.processEstablishment(establishment);
    
    // Respectful pause
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  const stats = builder.getStats();
  
  console.log(`\n📊 EXPANSION RESULTS:`);
  console.log(`   Establishments checked: ${stats.processed}`);
  console.log(`   Sourdough pizza verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   Total database size: ${totalRestaurants.length}`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  expandSourdoughDatabase().catch(console.error);
}