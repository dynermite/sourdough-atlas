#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';
import { SocialMediaIntegration } from './social-media-integration';

const SOURDOUGH_PATTERNS = [
  'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented',
  'sourdough-crust', 'sourdough-pizza', 'sourdough-dough', 'sourdough-bread',
  'naturally-leavened', 'wild-yeast', 'naturally-fermented'
];

class ComprehensivePizzaDiscovery {
  private totalFound = 0;
  private totalVerified = 0;
  private totalProcessed = 0;
  private apiKey: string;
  private allPizzaEstablishments: any[] = [];
  private socialMediaIntegration: SocialMediaIntegration;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
    this.socialMediaIntegration = new SocialMediaIntegration();
  }

  async discoverAllPizzaInCity(city: string, state: string) {
    console.log('🍕 COMPREHENSIVE PIZZA DISCOVERY SYSTEM');
    console.log('=' .repeat(60));
    console.log(`Target: ${city}, ${state}`);
    console.log('Strategy: Two-phase comprehensive search');
    
    if (!this.apiKey) {
      console.log('❌ No API key available - cannot proceed');
      return { found: 0, verified: 0 };
    }

    // PHASE 1: Find ALL pizza restaurants
    console.log('\n📋 PHASE 1: COMPREHENSIVE PIZZA RESTAURANT DISCOVERY');
    console.log('Finding every single pizza establishment...');
    
    await this.searchAllPizzaRestaurants(city, state);
    
    // PHASE 2: Targeted sourdough verification
    console.log('\n🔍 PHASE 2: SOURDOUGH VERIFICATION');
    console.log('Verifying sourdough claims from all discovered establishments...');
    
    await this.verifyAllEstablishments();
    
    // PHASE 3: Direct sourdough search as backup
    console.log('\n🎯 PHASE 3: DIRECT SOURDOUGH SEARCH');
    console.log('Searching specifically for sourdough establishments...');
    
    await this.directSourdoughSearch(city, state);
    
    return {
      found: this.totalFound,
      verified: this.totalVerified,
      processed: this.totalProcessed
    };
  }

  async searchAllPizzaRestaurants(city: string, state: string) {
    const searchQueries = [
      // Broad pizza searches
      `pizza restaurants ${city} ${state}`,
      `pizzeria ${city} ${state}`,
      `pizza places ${city} ${state}`,
      `pizza delivery ${city} ${state}`,
      
      // Category-based searches
      `pizza ${city} ${state}`,
      `Italian restaurants ${city} ${state}`,
      
      // Style-specific searches
      `wood fired pizza ${city} ${state}`,
      `thin crust pizza ${city} ${state}`,
      `artisan pizza ${city} ${state}`,
      `sourdough pizza ${city} ${state}`,  // BREAKTHROUGH: Direct sourdough search
      `neapolitan pizza ${city} ${state}`,
      
      // Size-based searches
      `pizza chains ${city} ${state}`,
      `local pizza ${city} ${state}`,
      `independent pizza ${city} ${state}`
    ];

    console.log(`   Running ${searchQueries.length} comprehensive searches...`);
    
    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      console.log(`\n   [${i + 1}/${searchQueries.length}] Searching: "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 20); // Higher limit for comprehensive coverage
        
        if (results && results.length > 0) {
          console.log(`     Found: ${results.length} establishments`);
          
          for (const result of results) {
            if (this.isPizzaEstablishment(result)) {
              const existing = this.allPizzaEstablishments.find(e => 
                e.name === result.name && 
                Math.abs(e.latitude - result.latitude) < 0.001
              );
              
              if (!existing) {
                this.allPizzaEstablishments.push(result);
                this.totalFound++;
              }
            }
          }
        } else {
          console.log(`     No results found`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }
    
    console.log(`\n✅ PHASE 1 COMPLETE: Found ${this.allPizzaEstablishments.length} unique pizza establishments`);
    
    // Show sample of discoveries
    console.log(`\nSample discoveries:`);
    this.allPizzaEstablishments.slice(0, 10).forEach((est, index) => {
      console.log(`${index + 1}. ${est.name} - ${est.full_address || est.address}`);
    });
    
    if (this.allPizzaEstablishments.length > 10) {
      console.log(`... and ${this.allPizzaEstablishments.length - 10} more`);
    }
  }

  async verifyAllEstablishments() {
    console.log(`\nVerifying ${this.allPizzaEstablishments.length} establishments for sourdough...`);
    
    for (let i = 0; i < this.allPizzaEstablishments.length; i++) {
      const establishment = this.allPizzaEstablishments[i];
      this.totalProcessed++;
      
      console.log(`\n[${i + 1}/${this.allPizzaEstablishments.length}] ${establishment.name}`);
      
      try {
        const isVerified = await this.verifyEstablishment(establishment);
        if (isVerified) {
          this.totalVerified++;
        }
      } catch (error) {
        console.log(`   Error verifying: ${error.message}`);
      }
      
      // Rate limiting for website requests
      if (i % 5 === 0 && i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  async directSourdoughSearch(city: string, state: string) {
    const sourdoughQueries = [
      `sourdough pizza ${city} ${state}`,
      `naturally leavened pizza ${city} ${state}`,
      `wild yeast pizza ${city} ${state}`,
      `artisan sourdough ${city} ${state}`,
      `sourdough crust pizza ${city} ${state}`
    ];

    console.log(`\nExecuting ${sourdoughQueries.length} targeted sourdough searches...`);
    
    for (const query of sourdoughQueries) {
      console.log(`\n   Searching: "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 10);
        
        if (results && results.length > 0) {
          console.log(`     Found: ${results.length} potential sourdough establishments`);
          
          for (const result of results) {
            if (this.isPizzaEstablishment(result)) {
              // Check if we already processed this one
              const existing = await db.select().from(restaurants).where(eq(restaurants.name, result.name));
              
              if (existing.length === 0) {
                console.log(`     New discovery: ${result.name}`);
                const isVerified = await this.verifyEstablishment(result);
                if (isVerified) {
                  this.totalVerified++;
                }
                this.totalProcessed++;
              }
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }
  }

  async executeSearch(query: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit,
          language: 'en',
          region: 'US',
          coordinates: this.getCoordinatesForQuery(query),  // ADD PROPER GEOGRAPHIC TARGETING
          radius: 50000  // 50km radius for precise city targeting
        },
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      if (response.data.status === 'Pending') {
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
        }
      }
      
      return [];
    } catch (error) {
      console.log(`Search error for "${query}": ${error.message}`);
      return [];
    }
  }

  isPizzaEstablishment(result: any): boolean {
    if (!result.name) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    const categories = (result.categories || []).join(' ').toLowerCase();
    
    // Pizza keywords
    const pizzaKeywords = [
      'pizza', 'pizzeria', 'pizzas', 'pie', 'pies',
      'italian restaurant', 'trattoria', 'ristorante'
    ];
    
    // Exclude non-pizza places
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience store',
      'delivery service', 'courier', 'driver'
    ];
    
    // Check exclusions first
    for (const exclude of excludeKeywords) {
      if (name.includes(exclude) || description.includes(exclude)) {
        return false;
      }
    }
    
    // Check pizza keywords
    for (const keyword of pizzaKeywords) {
      if (name.includes(keyword) || description.includes(keyword) || categories.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }

  async verifyEstablishment(establishment: any): Promise<boolean> {
    // Check if already exists
    const existing = await db.select().from(restaurants).where(eq(restaurants.name, establishment.name));
    if (existing.length > 0) {
      console.log(`   Already in database`);
      return false;
    }

    let websiteKeywords: string[] = [];
    let businessKeywords: string[] = [];
    let socialMediaKeywords: string[] = [];
    
    // STEP 1: Check business description (Google Business Profile)
    if (establishment.description) {
      businessKeywords = this.findSourdoughPatterns(establishment.description.toLowerCase());
      if (businessKeywords.length > 0) {
        console.log(`   🎯 Business keywords: [${businessKeywords.join(', ')}]`);
      }
    }
    
    // STEP 2: Check website if available
    const website = establishment.site || establishment.website;
    if (website) {
      try {
        const response = await axios.get(website, {
          timeout: 12000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        const content = $('body').text().toLowerCase();
        
        websiteKeywords = this.findSourdoughPatterns(content);
        
        if (websiteKeywords.length > 0) {
          console.log(`   🎯 Website keywords: [${websiteKeywords.join(', ')}]`);
        }
      } catch (error) {
        console.log(`   Website check failed: ${error.message}`);
      }
    }
    
    // STEP 3: Check social media profiles (Instagram & Facebook)
    console.log(`   📱 Checking social media...`);
    try {
      const socialResult = await this.socialMediaIntegration.enhanceRestaurantWithSocialMedia(
        establishment.name,
        establishment.full_address || establishment.address || '',
        establishment.phone,
        website,
        establishment.rating
      );
      
      if (socialResult.sourdoughViaSocial) {
        socialMediaKeywords = socialResult.evidence.flatMap(e => 
          e.split(': ')[1]?.split(', ') || []
        );
        console.log(`   📱 Social media keywords: [${socialMediaKeywords.join(', ')}]`);
      }
    } catch (error) {
      console.log(`   📱 Social media check failed: ${error.message}`);
    }
    
    // Combine ALL verification sources
    const allKeywords = [...new Set([...websiteKeywords, ...businessKeywords, ...socialMediaKeywords])];
    
    if (allKeywords.length === 0) {
      console.log(`   ❌ No sourdough verification from any source`);
      return false;
    }
    
    console.log(`   ✅ SOURDOUGH VERIFIED: [${allKeywords.join(', ')}]`);
    
    // Add to database with comprehensive verification tracking
    const description = establishment.description || `${establishment.name} - verified sourdough pizza establishment`;
    
    // Build verification source summary
    const verificationSources = [];
    if (businessKeywords.length > 0) verificationSources.push('Google Business');
    if (websiteKeywords.length > 0) verificationSources.push('Website');  
    if (socialMediaKeywords.length > 0) verificationSources.push('Social Media');
    
    await db.insert(restaurants).values({
      name: establishment.name,
      address: establishment.full_address || establishment.address || '',
      city: establishment.city || 'San Francisco',
      state: establishment.state || 'CA',
      zipCode: establishment.postal_code || '',
      phone: establishment.phone || '',
      website: website || '',
      description: `${description} | Verified via: ${verificationSources.join(', ')}`.length > 240 
        ? description.substring(0, 200) + `... | Sources: ${verificationSources.join(', ')}`
        : `${description} | Verified via: ${verificationSources.join(', ')}`,
      sourdoughVerified: 1,
      sourdoughKeywords: allKeywords,
      rating: establishment.rating || 0,
      reviewCount: establishment.reviews || establishment.reviews_count || 0,
      latitude: establishment.latitude || 0,
      longitude: establishment.longitude || 0,
      imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
    });
    
    console.log(`   💾 Added to database`);
    return true;
  }

  findSourdoughPatterns(text: string): string[] {
    const found: string[] = [];
    
    for (const pattern of SOURDOUGH_PATTERNS) {
      if (text.includes(pattern.toLowerCase())) {
        found.push(pattern);
      }
    }
    
    return found;
  }

  getCoordinatesForQuery(query: string): string {
    // Extract city and state from query and return coordinates
    const cityStateMapping: { [key: string]: string } = {
      // Tier 1: Sourdough Strongholds
      'Seattle WA': '47.6062,-122.3321',
      'Portland OR': '45.5152,-122.6784', 
      'San Francisco CA': '37.7749,-122.4194',
      'Los Angeles CA': '34.0522,-118.2437',
      'Austin TX': '30.2672,-97.7431',
      'Brooklyn NY': '40.6782,-73.9442',
      'Boulder CO': '40.0150,-105.2705',
      'Asheville NC': '35.5951,-82.5515',
      'Burlington VT': '44.4759,-73.2121',
      'Madison WI': '43.0731,-89.4012',
      'Providence RI': '41.8240,-71.4128',
      
      // Tier 2: Major Metros
      'New York NY': '40.7128,-74.0060',
      'Chicago IL': '41.8781,-87.6298',
      'Boston MA': '42.3601,-71.0589',
      'Denver CO': '39.7392,-104.9903',
      'Philadelphia PA': '39.9526,-75.1652',
      'Miami FL': '25.7617,-80.1918',
      'Phoenix AZ': '33.4484,-112.0740',
      'Dallas TX': '32.7767,-96.7970',
      'Atlanta GA': '33.7490,-84.3880',
      'Houston TX': '29.7604,-95.3698',
      'Detroit MI': '42.3314,-83.0458',
      'Minneapolis MN': '44.9778,-93.2650',
      'Tampa FL': '27.9506,-82.4572',
      'St. Louis MO': '38.6270,-90.1994',
      'Baltimore MD': '39.2904,-76.6122',
      
      // Tier 3: Regional Centers
      'San Diego CA': '32.7157,-117.1611',
      'Nashville TN': '36.1627,-86.7816',
      'Charlotte NC': '35.2271,-80.8431',
      'Las Vegas NV': '36.1699,-115.1398',
      'Orlando FL': '28.5383,-81.3792',
      'Cleveland OH': '41.4993,-81.6944',
      'Pittsburgh PA': '40.4406,-79.9959',
      'Cincinnati OH': '39.1031,-84.5120',
      'Kansas City MO': '39.0997,-94.5786',
      'Indianapolis IN': '39.7684,-86.1581',
      'Columbus OH': '39.9612,-82.9988',
      'Milwaukee WI': '43.0389,-87.9065',
      'Virginia Beach VA': '36.8529,-75.9780',
      'Sacramento CA': '38.5816,-121.4944',
      'Omaha NE': '41.2565,-95.9345',
      'Raleigh NC': '35.7796,-78.6382',
      'New Orleans LA': '29.9511,-90.0715',
      'Memphis TN': '35.1495,-90.0490',
      'Louisville KY': '38.2527,-85.7585',
      'Richmond VA': '37.5407,-77.4360',
      'Oklahoma City OK': '35.4676,-97.5164',
      'Jacksonville FL': '30.3322,-81.6557',
      'Tucson AZ': '32.2226,-110.9747',
      'Fresno CA': '36.7378,-119.7871',
      'Mesa AZ': '33.4152,-111.8315',
      
      // Tier 4: Growing Markets
      'Colorado Springs CO': '38.8339,-104.8214',
      'Albuquerque NM': '35.0844,-106.6504',
      'Tulsa OK': '36.1540,-95.9928',
      'Wichita KS': '37.6872,-97.3301',
      'Arlington TX': '32.7357,-97.1081',
      'Bakersfield CA': '35.3733,-119.0187',
      'Aurora CO': '39.7294,-104.8319',
      'Anaheim CA': '33.8366,-117.9143',
      'Honolulu HI': '21.3099,-157.8581',
      'Santa Ana CA': '33.7455,-117.8677',
      'Corpus Christi TX': '27.8006,-97.3964',
      'Riverside CA': '33.9533,-117.3962',
      'Lexington KY': '38.0406,-84.5037',
      'Stockton CA': '37.9577,-121.2908',
      'St. Paul MN': '44.9537,-93.0900',
      'Buffalo NY': '42.8864,-78.8784',
      'Newark NJ': '40.7357,-74.1724',
      'Plano TX': '33.0198,-96.6989',
      'Fort Wayne IN': '41.0793,-85.1394',
      'St. Petersburg FL': '27.7676,-82.6403',
      'Jersey City NJ': '40.7178,-74.0431',
      'Lincoln NE': '40.8136,-96.7026',
      'Henderson NV': '36.0395,-114.9817',
      'Greensboro NC': '36.0726,-79.7920',
      'Chandler AZ': '33.3062,-111.8413',
      'Chula Vista CA': '32.6401,-117.0842',
      'Norfolk VA': '36.8468,-76.2852',
      'North Las Vegas NV': '36.1989,-115.1175',
      'Durham NC': '35.9940,-78.8986',
      'Lubbock TX': '33.5779,-101.8552',
      'Irvine CA': '33.6846,-117.8265',
      'Winston-Salem NC': '36.0999,-80.2442',
      'Glendale AZ': '33.5387,-112.1860',
      'Garland TX': '32.9126,-96.6389',
      'Hialeah FL': '25.8576,-80.2781',
      'Reno NV': '39.5296,-119.8138',
      'Baton Rouge LA': '30.4515,-91.1871',
      'Irving TX': '32.8140,-96.9489',
      'Chesapeake VA': '36.7682,-76.2875',
      'Scottsdale AZ': '33.4942,-111.9261',
      'Spokane WA': '47.6588,-117.4260',
      'Fremont CA': '37.5485,-121.9886',
      'San Bernardino CA': '34.1083,-117.2898',
      'Gilbert AZ': '33.3528,-111.7890',
      'Boise ID': '43.6150,-116.2023',
      'Birmingham AL': '33.5207,-86.8025'
    };

    // Extract city and state from query
    for (const [cityState, coords] of Object.entries(cityStateMapping)) {
      if (query.includes(cityState)) {
        return coords;
      }
    }
    
    return ''; // Default if not found
  }
}

export { ComprehensivePizzaDiscovery };

export async function runComprehensivePizzaDiscovery(city: string = 'San Francisco', state: string = 'CA') {
  const discovery = new ComprehensivePizzaDiscovery();
  
  const results = await discovery.discoverAllPizzaInCity(city, state);
  
  console.log(`\n🎉 COMPREHENSIVE DISCOVERY COMPLETE:`);
  console.log(`   Total pizza establishments found: ${results.found}`);
  console.log(`   Total establishments processed: ${results.processed}`);
  console.log(`   New sourdough verified: ${results.verified}`);
  console.log(`   Success rate: ${results.processed > 0 ? ((results.verified / results.processed) * 100).toFixed(1) : '0'}%`);
  
  // Show final results
  const allRestaurants = await db.select().from(restaurants).where(eq(restaurants.city, city));
  console.log(`\n🌉 TOTAL ${city.toUpperCase()} SOURDOUGH ESTABLISHMENTS: ${allRestaurants.length}`);
  
  allRestaurants.forEach((restaurant, index) => {
    console.log(`\n${index + 1}. ${restaurant.name}`);
    console.log(`   📍 ${restaurant.address || 'Address TBD'}`);
    console.log(`   🔍 Keywords: [${restaurant.sourdoughKeywords?.join(', ') || 'sourdough'}]`);
    console.log(`   🌐 ${restaurant.website || 'No website'}`);
    console.log(`   ⭐ ${restaurant.rating || 'No rating'} (${restaurant.reviewCount || 0} reviews)`);
  });
  
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  runComprehensivePizzaDiscovery().catch(console.error);
}