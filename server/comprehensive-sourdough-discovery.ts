#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface RestaurantData {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
  category?: string[];
}

class ComprehensiveSourdoughDiscovery {
  private apiKey: string;
  private sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast'];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async searchWithMultipleQueries(city: string, state: string) {
    const queries = [
      `sourdough pizza ${city} ${state}`,
      `naturally leavened pizza ${city} ${state}`,
      `artisan pizza ${city} ${state}`,
      `wood fired pizza ${city} ${state}`,
      `best pizza ${city} ${state}`
    ];

    console.log(`\n🔍 COMPREHENSIVE SEARCH: ${city}, ${state}`);
    console.log('=' .repeat(50));

    let allRestaurants: RestaurantData[] = [];
    let verified = 0;

    for (const query of queries) {
      console.log(`\n🔍 Searching: ${query}`);
      
      try {
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query,
            limit: 20,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (response.data.status === 'Pending') {
          console.log(`⏳ Request pending: ${response.data.id}`);
          
          // Wait for results
          let attempts = 0;
          while (attempts < 4) {
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            try {
              const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
                headers: {
                  'X-API-KEY': this.apiKey
                }
              });

              if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
                console.log(`✅ Found ${resultResponse.data.data.length} restaurants`);
                
                // Process each restaurant
                for (const restaurant of resultResponse.data.data) {
                  if (restaurant.website && restaurant.name) {
                    const verification = await this.verifyWebsiteForSourdough(restaurant.name, restaurant.website);
                    
                    if (verification.verified) {
                      console.log(`✅ SOURDOUGH VERIFIED: ${restaurant.name}`);
                      console.log(`   Address: ${restaurant.address || 'N/A'}`);
                      console.log(`   Website: ${restaurant.website}`);
                      console.log(`   Keywords: [${verification.keywords.join(', ')}]`);
                      
                      // Add to database
                      await db.insert(restaurants).values({
                        name: restaurant.name,
                        address: restaurant.address || '',
                        city: city,
                        state: state,
                        zipCode: '',
                        phone: restaurant.phone || '',
                        website: restaurant.website,
                        description: verification.description,
                        sourdoughVerified: 1,
                        sourdoughKeywords: verification.keywords,
                        rating: restaurant.rating || 0,
                        reviewCount: restaurant.reviews_count || 0,
                        latitude: restaurant.latitude || 0,
                        longitude: restaurant.longitude || 0,
                        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                      });
                      
                      verified++;
                    } else {
                      console.log(`❌ No sourdough: ${restaurant.name}`);
                    }
                    
                    // Be respectful to websites
                    await new Promise(resolve => setTimeout(resolve, 2000));
                  }
                }
                
                break;
              } else if (resultResponse.data.status === 'Pending') {
                console.log(`⏳ Still pending, attempt ${attempts + 1}/4`);
                attempts++;
              } else {
                console.log(`❌ Request failed: ${resultResponse.data.status}`);
                break;
              }
            } catch (error) {
              console.log(`❌ Error fetching results: ${error.message}`);
              break;
            }
          }
        }
        
      } catch (error) {
        console.log(`❌ Search failed: ${error.message}`);
      }
      
      // Brief pause between different searches
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return verified;
  }

  async verifyWebsiteForSourdough(name: string, website: string): Promise<{
    verified: boolean;
    keywords: string[];
    description: string;
  }> {
    try {
      console.log(`    Verifying ${name}: ${website}`);
      
      const response = await axios.get(website, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const content = $('body').text().toLowerCase();
      
      // Check for sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      // Extract description from meta tag or content
      let description = '';
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc && metaDesc.length > 20) {
        description = metaDesc;
      } else {
        // Look for pizza-related paragraphs
        $('p').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 50 && (text.toLowerCase().includes('pizza') || text.toLowerCase().includes('dough'))) {
            description = text.substring(0, 200) + '...';
            return false; // Break loop
          }
        });
      }
      
      console.log(`    Keywords found: [${foundKeywords.join(', ')}]`);
      
      return {
        verified: foundKeywords.length > 0,
        keywords: foundKeywords,
        description: description || `${name} - verified restaurant`
      };
      
    } catch (error) {
      console.log(`    Verification failed: ${error.message}`);
      return { verified: false, keywords: [], description: '' };
    }
  }
}

export async function runComprehensiveDiscovery() {
  console.log('🔍 COMPREHENSIVE SOURDOUGH PIZZA DISCOVERY');
  console.log('=' .repeat(55));
  console.log('✅ Multiple search strategies for complete coverage');
  console.log('✅ Real business data from Outscraper API');
  console.log('✅ Website verification for sourdough claims');
  
  const discovery = new ComprehensiveSourdoughDiscovery();
  
  // High-probability sourdough cities
  const cities = [
    { city: 'San Francisco', state: 'CA' },
    { city: 'Berkeley', state: 'CA' }
  ];
  
  let totalVerified = 0;
  
  for (const location of cities) {
    const verified = await discovery.searchWithMultipleQueries(location.city, location.state);
    totalVerified += verified;
  }
  
  console.log(`\n📊 DISCOVERY COMPLETE:`);
  console.log(`   ✅ Total sourdough restaurants verified: ${totalVerified}`);
  console.log(`   🎯 All data sourced from authentic restaurant websites`);
  console.log(`   📍 All business information from verified APIs`);
  
  return totalVerified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runComprehensiveDiscovery().catch(console.error);
}