#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface RestaurantResult {
  name?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
}

class FullNationwideDiscovery {
  private apiKey: string;
  private sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async processCity(city: string, state: string): Promise<number> {
    console.log(`\n🏙️  DISCOVERING: ${city}, ${state}`);
    console.log('=' .repeat(50));

    // Try multiple targeted searches for better sourdough discovery
    const searches = [
      `sourdough pizza ${city} ${state}`,
      `naturally leavened pizza ${city} ${state}`,
      `artisan pizza ${city} ${state}`
    ];

    let verified = 0;

    for (const query of searches) {
      try {
        console.log(`🔍 Searching: ${query}`);
        
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query,
            limit: 10,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          },
          timeout: 30000
        });

        if (response.data.status === 'Pending') {
          const requestId = response.data.id;
          console.log(`⏳ Processing request: ${requestId}`);
          
          // Wait for results with multiple attempts
          let results: RestaurantResult[] = [];
          for (let attempt = 0; attempt < 3; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 20000)); // Wait 20 seconds
            
            try {
              const resultResponse = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
                headers: {
                  'X-API-KEY': this.apiKey
                }
              });

              if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
                results = resultResponse.data.data;
                console.log(`✅ Found ${results.length} restaurants`);
                break;
              } else if (resultResponse.data.status === 'Pending') {
                console.log(`⏳ Still processing, attempt ${attempt + 1}/3`);
              }
            } catch (error) {
              console.log(`❌ Error fetching results: ${error.message}`);
            }
          }

          // Process each restaurant found
          for (const restaurant of results) {
            if (!restaurant.name || !restaurant.website) {
              continue;
            }

            const verification = await this.verifyWebsiteForSourdough(restaurant.name, restaurant.website);
            
            if (verification.verified) {
              console.log(`✅ VERIFIED: ${restaurant.name}`);
              console.log(`   Address: ${restaurant.address || 'N/A'}`);
              console.log(`   Website: ${restaurant.website}`);
              console.log(`   Keywords: [${verification.keywords.join(', ')}]`);
              
              // Check if already exists to avoid duplicates
              const { eq } = await import('drizzle-orm');
              const existing = await db.select().from(restaurants).where(eq(restaurants.name, restaurant.name));
              
              if (existing.length === 0) {
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
                console.log(`   ⚠️  Already exists in database`);
              }
            }
            
            // Be respectful to websites
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
      } catch (error) {
        console.log(`❌ Search failed: ${error.message}`);
      }
      
      // Brief pause between searches
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log(`📊 ${city}, ${state}: Found ${verified} verified sourdough restaurants`);
    return verified;
  }

  async verifyWebsiteForSourdough(name: string, website: string): Promise<{
    verified: boolean;
    keywords: string[];
    description: string;
  }> {
    try {
      console.log(`    Verifying: ${name} (${website})`);
      
      const response = await axios.get(website, {
        timeout: 15000,
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
      
      // Extract description
      let description = '';
      const metaDesc = $('meta[name="description"]').attr('content');
      if (metaDesc && metaDesc.length > 20) {
        description = metaDesc;
      } else {
        // Look for relevant content
        $('p').each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 50 && text.toLowerCase().includes('pizza')) {
            description = text.substring(0, 200) + '...';
            return false; // Break
          }
        });
      }
      
      return {
        verified: foundKeywords.length > 0,
        keywords: foundKeywords,
        description: description || `${name} - verified sourdough pizza restaurant`
      };
      
    } catch (error) {
      console.log(`    Verification failed: ${error.message}`);
      return { verified: false, keywords: [], description: '' };
    }
  }
}

export async function executeFullNationwide() {
  console.log('🚀 FULL NATIONWIDE SOURDOUGH DISCOVERY');
  console.log('=' .repeat(55));
  console.log('✅ Authentic data from Outscraper API');
  console.log('✅ Website verification for sourdough claims');
  console.log('🎯 Targeting high-probability sourdough cities');
  
  const discovery = new FullNationwideDiscovery();
  
  // Priority cities with high sourdough likelihood
  const priorityCities = [
    { city: 'San Francisco', state: 'CA' },
    { city: 'Berkeley', state: 'CA' },
    { city: 'Portland', state: 'OR' },
    { city: 'Seattle', state: 'WA' },
    { city: 'Boulder', state: 'CO' },
    { city: 'Austin', state: 'TX' },
    { city: 'Asheville', state: 'NC' },
    { city: 'Burlington', state: 'VT' },
    { city: 'Santa Fe', state: 'NM' },
    { city: 'Brooklyn', state: 'NY' }
  ];
  
  let totalVerified = 0;
  let processedCities = 0;
  
  for (const location of priorityCities) {
    const verified = await discovery.processCity(location.city, location.state);
    totalVerified += verified;
    processedCities++;
    
    console.log(`\n📈 PROGRESS: ${processedCities}/${priorityCities.length} cities processed`);
    console.log(`   Total verified restaurants: ${totalVerified}`);
    
    // Longer pause between cities to be respectful to APIs
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log(`\n🎉 NATIONWIDE DISCOVERY COMPLETE:`);
  console.log(`   🏙️  Cities processed: ${processedCities}`);
  console.log(`   ✅ Sourdough restaurants verified: ${totalVerified}`);
  console.log(`   📊 Average per city: ${(totalVerified / processedCities).toFixed(1)}`);
  console.log(`   🎯 All data authentic and verified`);
  
  return totalVerified;
}

if (import.meta.url.endsWith(process.argv[1])) {
  executeFullNationwide().catch(console.error);
}