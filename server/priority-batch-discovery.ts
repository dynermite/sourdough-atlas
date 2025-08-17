#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Focus on known sourdough establishments and artisan food culture centers
const HIGH_PRIORITY_BATCH = [
  // Vermont - Strong sourdough tradition
  { name: "Prohibition Pig", website: "https://prohibitionpig.com", city: "Waterbury", state: "VT" },
  { name: "Hen of the Wood", website: "https://henofthewood.com", city: "Waterbury", state: "VT" },
  { name: "Doc Ponds", website: "https://docponds.com", city: "Stowe", state: "VT" },
  { name: "Worthy Kitchen", website: "https://worthykitchen.com", city: "Woodstock", state: "VT" },
  
  // San Francisco Bay Area - Sourdough capital
  { name: "Pizzetta 211", website: "https://pizzetta211.com", city: "San Francisco", state: "CA" },
  { name: "Boot and Shoe Service", website: "https://bootandshoeservice.com", city: "Oakland", state: "CA" },
  { name: "Camino", website: "https://caminorestaurant.com", city: "Oakland", state: "CA" },
  { name: "Temescal Brewing", website: "https://temescalbrewing.com", city: "Oakland", state: "CA" },
  
  // Portland - Artisan food scene
  { name: "Trifecta Tavern", website: "https://trifectatavern.com", city: "Portland", state: "OR" },
  { name: "Reverend's BBQ", website: "https://reverendsbbq.com", city: "Portland", state: "OR" },
  { name: "St. Jack", website: "https://stjackpdx.com", city: "Portland", state: "OR" },
  { name: "Grain & Gristle", website: "https://grainandgristle.com", city: "Portland", state: "OR" },
  
  // Asheville - Mountain artisan culture
  { name: "Buxton Hall Barbecue", website: "https://buxtonhall.com", city: "Asheville", state: "NC" },
  { name: "Cúrate", website: "https://curateashevillenc.com", city: "Asheville", state: "NC" },
  { name: "The Admiral", website: "https://theadmiralasheville.com", city: "Asheville", state: "NC" },
  { name: "Strada Italiano", website: "https://stradaitaliano.com", city: "Asheville", state: "NC" },
  
  // New England artisan establishments
  { name: "Puritan & Company", website: "https://puritancambridge.com", city: "Cambridge", state: "MA" },
  { name: "Area Four", website: "https://areafour.com", city: "Cambridge", state: "MA" },
  { name: "Giulia", website: "https://giuliarestaurant.com", city: "Cambridge", state: "MA" },
  { name: "Coppa", website: "https://coppaboston.com", city: "Boston", state: "MA" },
  
  // Austin artisan scene
  { name: "Barley Swine", website: "https://barleyswine.com", city: "Austin", state: "TX" },
  { name: "Odd Duck", website: "https://oddduckaustin.com", city: "Austin", state: "TX" },
  { name: "Emmer & Rye", website: "https://emmerandrye.com", city: "Austin", state: "TX" },
  { name: "Lucky Robot", website: "https://luckyrobotaustin.com", city: "Austin", state: "TX" },
  
  // Brooklyn artisan establishments
  { name: "Emily", website: "https://pizzalovesemily.com", city: "Brooklyn", state: "NY" },
  { name: "Olmsted", website: "https://olmstednyc.com", city: "Brooklyn", state: "NY" },
  { name: "Faun", website: "https://faunnyc.com", city: "Brooklyn", state: "NY" },
  { name: "Lilia", website: "https://lilianewyork.com", city: "Brooklyn", state: "NY" }
];

class PriorityBatchDiscovery {
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
    console.log(`\n[${this.processed}/${HIGH_PRIORITY_BATCH.length}] Checking: ${establishment.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, establishment.name));
      if (existing.length > 0) {
        console.log(`   Already in database`);
        return false;
      }
      
      console.log(`   Analyzing: ${establishment.website}`);
      
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
      
      // Check if they serve pizza or flatbread
      const hasPizza = content.includes('pizza') || content.includes('flatbread') || 
                      content.includes('wood fired') || content.includes('wood-fired') ||
                      establishment.name.toLowerCase().includes('pizza');
      
      if (foundKeywords.length === 0) {
        console.log(`   No sourdough keywords found`);
        this.failed++;
        return false;
      }
      
      if (!hasPizza) {
        console.log(`   Has sourdough [${foundKeywords.join(', ')}] but no pizza/flatbread`);
        this.failed++;
        return false;
      }
      
      console.log(`   VERIFIED SOURDOUGH + PIZZA: [${foundKeywords.join(', ')}]`);
      
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
            text.toLowerCase().includes('artisan') ||
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

export async function runPriorityBatchDiscovery() {
  console.log('🎯 PRIORITY BATCH DISCOVERY');
  console.log('=' .repeat(40));
  console.log(`Focus: High-end artisan establishments`);
  console.log(`Target: Restaurants likely to use sourdough`);
  console.log(`Regions: VT, CA Bay Area, Portland, Asheville, Boston, Austin, Brooklyn`);
  
  const system = new PriorityBatchDiscovery();
  
  for (const establishment of HIGH_PRIORITY_BATCH) {
    await system.processEstablishment(establishment);
    
    // Respectful pause
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  const stats = system.getStats();
  
  console.log(`\n🎉 PRIORITY BATCH COMPLETE:`);
  console.log(`   Establishments checked: ${stats.processed}`);
  console.log(`   Sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   Total database size: ${totalRestaurants.length}`);
  console.log(`   Progress: ${((totalRestaurants.length / 1000) * 100).toFixed(1)}% toward 1,000 goal`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runPriorityBatchDiscovery().catch(console.error);
}