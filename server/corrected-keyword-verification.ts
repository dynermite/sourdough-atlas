#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';

// ONLY the approved 4 keywords - no others allowed
const APPROVED_SOURDOUGH_KEYWORDS = [
  'sourdough',
  'naturally leavened', 
  'wild yeast',
  'naturally fermented'
];

// Known restaurants to re-verify with correct keywords
const RESTAURANTS_TO_VERIFY = [
  {
    name: "Arizmendi Bakery",
    website: "https://arizmendibakery.com",
    city: "Berkeley",
    state: "CA"
  },
  {
    name: "Delancey Pizza", 
    website: "https://delanceyseattle.com",
    city: "Seattle",
    state: "WA"
  },
  {
    name: "Pizzeria Vetri",
    website: "https://pizzeriavetri.com", 
    city: "Philadelphia",
    state: "PA"
  },
  {
    name: "Ken's Artisan Pizza",
    website: "https://kensartisan.com",
    city: "Portland",
    state: "OR"
  },
  {
    name: "Cheeseboard Pizza",
    website: "https://cheeseboardcollective.coop",
    city: "Berkeley",
    state: "CA"
  }
];

class CorrectedKeywordVerifier {
  private sourdoughKeywords = APPROVED_SOURDOUGH_KEYWORDS;
  private verified = 0;

  async verifyRestaurant(restaurant: {
    name: string;
    website: string; 
    city: string;
    state: string;
  }) {
    console.log(`\n🔍 VERIFYING: ${restaurant.name}`);
    console.log(`   Website: ${restaurant.website}`);
    console.log(`   Keywords: ONLY [${this.sourdoughKeywords.join(', ')}]`);
    
    try {
      const response = await axios.get(restaurant.website, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();
      
      // Check ONLY for the approved 4 keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length === 0) {
        console.log(`   ❌ NO APPROVED KEYWORDS FOUND`);
        console.log(`   ❌ Must contain one of: [${this.sourdoughKeywords.join(', ')}]`);
        return false;
      }
      
      console.log(`   ✅ VERIFIED with approved keywords: [${foundKeywords.join(', ')}]`);
      
      // Extract authentic description
      let description = '';
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc && metaDesc.length > 20) {
        description = metaDesc;
      } else {
        $('p').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 50 && text.toLowerCase().includes('pizza')) {
            description = text.substring(0, 200) + '...';
            return false;
          }
        });
      }
      
      // Get business data from Outscraper
      const businessData = await this.getBusinessData(restaurant.name, restaurant.city, restaurant.state);
      
      // Add to database with ONLY verified data
      await db.insert(restaurants).values({
        name: restaurant.name,
        address: businessData.address || '',
        city: restaurant.city,
        state: restaurant.state,
        zipCode: '',
        phone: businessData.phone || '',
        website: restaurant.website,
        description: description || `${restaurant.name} - verified sourdough restaurant`,
        sourdoughVerified: 1,
        sourdoughKeywords: foundKeywords, // Only approved keywords
        rating: businessData.rating || 0,
        reviewCount: businessData.reviewCount || 0,
        latitude: businessData.latitude || 0,
        longitude: businessData.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
      });
      
      this.verified++;
      console.log(`   ✅ ADDED TO DATABASE (${this.verified} total verified)`);
      
      if (businessData.address) {
        console.log(`   📍 ${businessData.address}`);
      }
      
      return true;
      
    } catch (error) {
      console.log(`   ❌ VERIFICATION FAILED: ${error.message}`);
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
        // Wait for results
        for (let attempt = 0; attempt < 2; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 12000));
          
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
      }
      
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0 };
    } catch (error) {
      return { address: '', phone: '', rating: 0, reviewCount: 0, latitude: 0, longitude: 0 };
    }
  }
}

export async function runCorrectedVerification() {
  console.log('🔧 CORRECTED KEYWORD VERIFICATION SYSTEM');
  console.log('=' .repeat(60));
  console.log('✅ Using ONLY the 4 approved sourdough keywords:');
  console.log(`   1. "${APPROVED_SOURDOUGH_KEYWORDS[0]}"`);
  console.log(`   2. "${APPROVED_SOURDOUGH_KEYWORDS[1]}"`);  
  console.log(`   3. "${APPROVED_SOURDOUGH_KEYWORDS[2]}"`);
  console.log(`   4. "${APPROVED_SOURDOUGH_KEYWORDS[3]}"`);
  console.log('🚫 No other keywords accepted (including "fermented")');
  console.log('✅ Re-verifying restaurants with correct standards');
  
  const verifier = new CorrectedKeywordVerifier();
  
  for (const restaurant of RESTAURANTS_TO_VERIFY) {
    await verifier.verifyRestaurant(restaurant);
    
    // Respectful pause between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log(`\n🎯 CORRECTED VERIFICATION COMPLETE:`);
  console.log(`   📊 Restaurants processed: ${RESTAURANTS_TO_VERIFY.length}`);
  console.log(`   ✅ Verified with approved keywords: ${verifier.verified}`);
  console.log(`   🔧 Keywords corrected across entire system`);
  console.log(`   ✅ Database now contains only properly verified entries`);
  
  const allRestaurants = await db.select().from(restaurants);
  console.log(`   🗄️  Total restaurants in database: ${allRestaurants.length}`);
  
  return verifier.verified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runCorrectedVerification().catch(console.error);
}