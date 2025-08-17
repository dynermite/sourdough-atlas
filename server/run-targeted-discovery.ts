#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Focus on top sourdough cities with specific restaurants known to mention sourdough
const TARGETED_RESTAURANTS = [
  // San Francisco Bay Area - sourdough capital
  { name: "Tony's Little Star Pizza", city: "San Francisco", state: "CA", website: "https://tonylittlestar.com" },
  { name: "Escape from New York Pizza", city: "San Francisco", state: "CA", website: "https://escapefromnewyorkpizza.com" },
  { name: "Golden Boy Pizza", city: "San Francisco", state: "CA", website: "https://goldenboyseafood.com" },
  { name: "North Beach Pizza", city: "San Francisco", state: "CA", website: "https://northbeachpizza.com" },
  { name: "Arinell Pizza", city: "Berkeley", state: "CA", website: "https://arinellpizza.com" },
  
  // Portland artisan scene
  { name: "Scottie's Pizza Parlor", city: "Portland", state: "OR", website: "https://scottiespizza.com" },
  { name: "Sizzle Pie", city: "Portland", state: "OR", website: "https://sizzlepie.com" },
  { name: "Ranch Pizza", city: "Portland", state: "OR", website: "https://ranchpizza.com" },
  { name: "Baby Doll Pizza", city: "Portland", state: "OR", website: "https://babydollpizza.com" },
  
  // Seattle area
  { name: "Pagliacci Pizza", city: "Seattle", state: "WA", website: "https://pagliacci.com" },
  { name: "Zeeks Pizza", city: "Seattle", state: "WA", website: "https://zeekspizza.com" },
  { name: "Delfino's Chicago Style Pizza", city: "Seattle", state: "WA", website: "https://delfinospizza.com" },
  
  // Brooklyn/NYC area
  { name: "Joe's Pizza", city: "Brooklyn", state: "NY", website: "https://joespizza.com" },
  { name: "Prince Street Pizza", city: "Manhattan", state: "NY", website: "https://princestpizza.com" },
  { name: "Di Fara Pizza", city: "Brooklyn", state: "NY", website: "https://difarapizza.com" },
  { name: "Keste Pizza & Vino", city: "Manhattan", state: "NY", website: "https://kestepizzeria.com" },
  
  // Boston area
  { name: "Santarpio's Pizza", city: "Boston", state: "MA", website: "https://santarpios.com" },
  { name: "Regina Pizzeria", city: "Boston", state: "MA", website: "https://reginapizzeria.com" },
  { name: "Posto", city: "Cambridge", state: "MA", website: "https://postoboston.com" },
  
  // Austin artisan scene
  { name: "Via 313", city: "Austin", state: "TX", website: "https://via313.com" },
  { name: "East Side Pies", city: "Austin", state: "TX", website: "https://eastsidepies.com" },
  { name: "Little Deli & Pizzeria", city: "Austin", state: "TX", website: "https://littledelipizza.com" },
  
  // Philadelphia
  { name: "Villa di Roma", city: "Philadelphia", state: "PA", website: "https://villadiroma.com" },
  { name: "Tacconelli's Pizzeria", city: "Philadelphia", state: "PA", website: "https://tacconellis.com" },
  { name: "Santucci's Square Pizza", city: "Philadelphia", state: "PA", website: "https://santuccis.com" },
  
  // Denver/Boulder area
  { name: "Beau Jo's Pizza", city: "Boulder", state: "CO", website: "https://beaujos.com" },
  { name: "Proto's Pizza", city: "Denver", state: "CO", website: "https://protospizza.com" },
  { name: "Fat Sully's Pizza", city: "Denver", state: "CO", website: "https://fatsullyspizza.com" },
  
  // Vermont artisan culture
  { name: "American Flatbread", city: "Burlington", state: "VT", website: "https://americanflatbread.com" },
  { name: "Folino's Wood Fired Pizza", city: "Burlington", state: "VT", website: "https://folinospizza.com" },
  
  // Asheville mountain culture
  { name: "Pack's Tavern", city: "Asheville", state: "NC", website: "https://packstavern.com" },
  { name: "Asheville Pizza & Brewing", city: "Asheville", state: "NC", website: "https://ashevillebrewing.com" }
];

class TargetedDiscoverySystem {
  private processed = 0;
  private verified = 0;
  private failed = 0;

  async verifyRestaurant(restaurant: {
    name: string;
    website: string;
    city: string;
    state: string;
  }) {
    this.processed++;
    console.log(`\n[${this.processed}/${TARGETED_RESTAURANTS.length}] Verifying: ${restaurant.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, restaurant.name));
      if (existing.length > 0) {
        console.log(`   Already verified in database`);
        return false;
      }
      
      console.log(`   Checking website: ${restaurant.website}`);
      
      const response = await axios.get(restaurant.website, {
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
      
      if (foundKeywords.length === 0) {
        console.log(`   No approved sourdough keywords found`);
        this.failed++;
        return false;
      }
      
      console.log(`   VERIFIED: [${foundKeywords.join(', ')}]`);
      
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
      
      // Get business data from API
      const businessData = await this.getBusinessData(restaurant.name, restaurant.city, restaurant.state);
      
      // Add to database
      await db.insert(restaurants).values({
        name: restaurant.name,
        address: businessData.address || '',
        city: restaurant.city,
        state: restaurant.state,
        zipCode: '',
        phone: businessData.phone || '',
        website: restaurant.website,
        description: description || `${restaurant.name} - verified sourdough pizza restaurant`,
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

export async function runTargetedDiscovery() {
  console.log('🎯 TARGETED SOURDOUGH DISCOVERY');
  console.log('=' .repeat(45));
  console.log(`Processing ${TARGETED_RESTAURANTS.length} targeted restaurants`);
  console.log(`Keywords: [${SOURDOUGH_KEYWORDS.join(', ')}]`);
  console.log(`Focus: High-probability sourdough establishments`);
  
  const system = new TargetedDiscoverySystem();
  
  for (const restaurant of TARGETED_RESTAURANTS) {
    await system.verifyRestaurant(restaurant);
    
    // Respectful pause
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  const stats = system.getStats();
  
  console.log(`\n🎉 TARGETED DISCOVERY COMPLETE:`);
  console.log(`   Restaurants checked: ${stats.processed}`);
  console.log(`   Sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   Total database size: ${totalRestaurants.length}`);
  console.log(`   Progress: ${((totalRestaurants.length / 1000) * 100).toFixed(1)}% toward 1,000 goal`);
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runTargetedDiscovery().catch(console.error);
}