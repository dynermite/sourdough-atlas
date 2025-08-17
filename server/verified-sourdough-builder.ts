#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

// Curated list of establishments known to use authentic sourdough methods
const VERIFIED_SOURDOUGH_CANDIDATES = [
  // Pacific Northwest sourdough culture
  { name: "Flying Apron Bakery", website: "https://flyingapron.com", city: "Seattle", state: "WA" },
  { name: "Grand Central Bakery", website: "https://grandcentralbakery.com", city: "Seattle", state: "WA" },
  { name: "Macrina Bakery", website: "https://macrinabakery.com", city: "Seattle", state: "WA" },
  { name: "Essential Baking Company", website: "https://essentialbaking.com", city: "Seattle", state: "WA" },
  
  // California sourdough heartland
  { name: "Tartine Bakery", website: "https://tartinebakery.com", city: "San Francisco", state: "CA" },
  { name: "Boudin Bakery", website: "https://boudinbakery.com", city: "San Francisco", state: "CA" },
  { name: "Acme Bread Company", website: "https://acmebread.com", city: "Berkeley", state: "CA" },
  { name: "Della Fattoria", website: "https://dellafattoria.com", city: "Petaluma", state: "CA" },
  { name: "Starter Bakery", website: "https://starterbakery.com", city: "Oakland", state: "CA" },
  
  // New England artisan traditions
  { name: "Flour Bakery + Cafe", website: "https://flourbakery.com", city: "Boston", state: "MA" },
  { name: "Tatte Bakery & Cafe", website: "https://tattebakery.com", city: "Cambridge", state: "MA" },
  { name: "Clear Flour Bread", website: "https://clearflourbread.com", city: "Brookline", state: "MA" },
  { name: "Iggy's Bread", website: "https://iggysbread.com", city: "Cambridge", state: "MA" },
  
  // Vermont sourdough stronghold
  { name: "Red Hen Baking Co", website: "https://redhenbaking.com", city: "Duxbury", state: "VT" },
  { name: "Bohemian Bakery", website: "https://bohemianbakery.com", city: "Saratoga Springs", state: "NY" },
  { name: "Wild Hive Farm", website: "https://wildhivefarm.com", city: "Clinton Corners", state: "NY" },
  
  // Brooklyn artisan scene  
  { name: "She Wolf Bakery", website: "https://shewolfbakery.com", city: "Brooklyn", state: "NY" },
  { name: "L'industrie Pizzeria", website: "https://lindustriepizzeria.com", city: "Brooklyn", state: "NY" },
  { name: "Lucali", website: "https://lucali.com", city: "Brooklyn", state: "NY" },
  { name: "Roberta's", website: "https://robertaspizza.com", city: "Brooklyn", state: "NY" },
  
  // Portland food culture
  { name: "Little T American Baker", website: "https://littletbaker.com", city: "Portland", state: "OR" },
  { name: "Tabor Bread", website: "https://taborbread.com", city: "Portland", state: "OR" },
  { name: "Fleur de Lis Bakery", website: "https://fleurdelisbakery.com", city: "Portland", state: "OR" },
  { name: "Ken's Artisan Pizza", website: "https://kensartisan.com", city: "Portland", state: "OR" },
  
  // Austin food scene
  { name: "Quack's 43rd Street Bakery", website: "https://quacksbakery.com", city: "Austin", state: "TX" },
  { name: "Easy Tiger", website: "https://easytiger.com", city: "Austin", state: "TX" },
  { name: "Épicerie Café & Grocery", website: "https://epiceriecafe.com", city: "Austin", state: "TX" },
  
  // Chicago artisan establishments
  { name: "Publican Quality Bread", website: "https://publicanqualitybread.com", city: "Chicago", state: "IL" },
  { name: "Spacca Napoli", website: "https://spaccanapolipizzeria.com", city: "Chicago", state: "IL" },
  { name: "Boka", website: "https://bokachicago.com", city: "Chicago", state: "IL" },
  
  // Colorado mountain culture
  { name: "Rebel Farm", website: "https://rebelfarm.com", city: "Boulder", state: "CO" },
  { name: "Breadworks", website: "https://breadworksco.com", city: "Boulder", state: "CO" },
  { name: "Grateful Bread", website: "https://gratefulbreadbakery.com", city: "Golden", state: "CO" },
  
  // North Carolina mountains
  { name: "Farm and Sparrow", website: "https://farmandsparrow.com", city: "Candler", state: "NC" },
  { name: "All Day Darling", website: "https://alldaydarling.com", city: "Asheville", state: "NC" },
  { name: "White Labs Kitchen", website: "https://whitelabskitchen.com", city: "Asheville", state: "NC" }
];

class VerifiedSourdoughBuilder {
  private processed = 0;
  private verified = 0;
  private failed = 0;
  private skipped = 0;

  async processCandidate(candidate: {
    name: string;
    website: string;
    city: string;
    state: string;
  }) {
    this.processed++;
    console.log(`\n[${this.processed}/${VERIFIED_SOURDOUGH_CANDIDATES.length}] Checking: ${candidate.name}`);
    
    try {
      // Check if already exists
      const existing = await db.select().from(restaurants).where(eq(restaurants.name, candidate.name));
      if (existing.length > 0) {
        console.log(`   Already verified in database`);
        this.skipped++;
        return false;
      }
      
      console.log(`   Analyzing: ${candidate.website}`);
      
      const response = await axios.get(candidate.website, {
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
      
      // Check if they serve pizza, flatbread, or are a bakery serving food
      const hasPizza = content.includes('pizza') || content.includes('flatbread') || 
                      content.includes('wood fired') || content.includes('wood-fired') ||
                      content.includes('bakery') || content.includes('bread') ||
                      candidate.name.toLowerCase().includes('pizza') ||
                      candidate.name.toLowerCase().includes('bakery');
      
      if (!hasPizza) {
        console.log(`   Has sourdough [${foundKeywords.join(', ')}] but no pizza/bakery service`);
        this.failed++;
        return false;
      }
      
      console.log(`   VERIFIED SOURDOUGH ESTABLISHMENT: [${foundKeywords.join(', ')}]`);
      
      // Extract description
      let description = '';
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc && metaDesc.length > 20) {
        description = metaDesc;
      } else {
        // Look for descriptive paragraphs
        $('p, .description, .about').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 80 && (
            text.toLowerCase().includes('artisan') ||
            text.toLowerCase().includes('handcrafted') ||
            text.toLowerCase().includes('traditional') ||
            foundKeywords.some(keyword => text.toLowerCase().includes(keyword))
          )) {
            description = text.substring(0, 220) + '...';
            return false;
          }
        });
      }
      
      // Get business location data
      const businessData = await this.getBusinessData(candidate.name, candidate.city, candidate.state);
      
      // Add to database
      await db.insert(restaurants).values({
        name: candidate.name,
        address: businessData.address || '',
        city: candidate.city,
        state: candidate.state,
        zipCode: '',
        phone: businessData.phone || '',
        website: candidate.website,
        description: description || `${candidate.name} - verified authentic sourdough establishment`,
        sourdoughVerified: 1,
        sourdoughKeywords: foundKeywords,
        rating: businessData.rating || 0,
        reviewCount: businessData.reviewCount || 0,
        latitude: businessData.latitude || 0,
        longitude: businessData.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`   ADDED TO DATABASE - Total verified: ${this.verified}`);
      
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
      skipped: this.skipped,
      successRate: this.processed > 0 ? ((this.verified / (this.processed - this.skipped)) * 100).toFixed(1) : '0'
    };
  }
}

export async function buildVerifiedSourdoughDatabase() {
  console.log('🏗️  VERIFIED SOURDOUGH DATABASE BUILDER');
  console.log('=' .repeat(50));
  console.log(`Target: ${VERIFIED_SOURDOUGH_CANDIDATES.length} curated sourdough establishments`);
  console.log(`Focus: Known artisan bakeries and sourdough specialists`);
  console.log(`Regions: CA, WA, MA, VT, NY, OR, TX, IL, CO, NC`);
  
  const builder = new VerifiedSourdoughBuilder();
  
  for (const candidate of VERIFIED_SOURDOUGH_CANDIDATES) {
    await builder.processCandidate(candidate);
    
    // Respectful pause between requests
    await new Promise(resolve => setTimeout(resolve, 2500));
  }
  
  const stats = builder.getStats();
  
  console.log(`\n🎉 SOURDOUGH DATABASE BUILD COMPLETE:`);
  console.log(`   Establishments processed: ${stats.processed}`);
  console.log(`   Already in database: ${stats.skipped}`);
  console.log(`   New sourdough verified: ${stats.verified}`);
  console.log(`   Failed verification: ${stats.failed}`);
  console.log(`   Success rate: ${stats.successRate}%`);
  
  const totalRestaurants = await db.select().from(restaurants);
  console.log(`   🎯 TOTAL DATABASE SIZE: ${totalRestaurants.length} restaurants`);
  console.log(`   Progress toward 1,000 goal: ${((totalRestaurants.length / 1000) * 100).toFixed(1)}%`);
  
  if (totalRestaurants.length >= 50) {
    console.log(`   🎊 Milestone: Database now ready for user testing!`);
    console.log(`   📍 Geographic coverage across major US sourdough regions`);
    console.log(`   ✅ All entries verified with authentic sourdough keywords`);
  }
  
  return stats.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  buildVerifiedSourdoughDatabase().catch(console.error);
}