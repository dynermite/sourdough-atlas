import { db } from './db';
import { restaurants } from '@shared/schema';
import { sql } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

const SOURDOUGH_KEYWORDS = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

interface VerificationResult {
  verified: boolean;
  sources: string[];
  keywords: string[];
  confidence: 'high' | 'medium' | 'low';
  details: string;
}

// ENHANCED SIMPLE APPROACH: Search + Full 5-Step Verification
export async function simpleSearchCity(city: string, state: string): Promise<number> {
  console.log(`🎯 SIMPLE SEARCH: ${city}, ${state}`);
  
  let totalAdded = 0;
  
  // Search 1: Sourdough pizza restaurants with full state name
  const fullStateName = getFullStateName(state);
  try {
    console.log(`   [1/2] Searching: "sourdough pizza restaurants in ${city} ${fullStateName}"`);
    const response1 = await fetch(`https://api.outscraper.com/maps/search-v3?query=${encodeURIComponent(`sourdough pizza restaurants in ${city} ${fullStateName}`)}&limit=20&language=en&region=US`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      }
    });

    if (response1.ok) {
      const data1 = await response1.json();
      if (data1.status === 'Success' && data1.data) {
        let results = data1.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        console.log(`     Found: ${results.length} results`);
        totalAdded += await processResults(results, city, state);
      } else if (data1.status === 'Pending') {
        console.log(`     Request pending (ID: ${data1.id}), waiting for results...`);
        const pendingResults = await waitForResults(data1.id);
        if (pendingResults.length > 0) {
          console.log(`     Found: ${pendingResults.length} results`);
          totalAdded += await processResults(pendingResults, city, state);
        }
      }
    }
  } catch (error) {
    console.log(`     Error: ${error.message}`);
  }

  // Search 2: Artisan pizza restaurants with full state name
  try {
    console.log(`   [2/2] Searching: "artisan pizza restaurants in ${city} ${fullStateName}"`);
    const response2 = await fetch(`https://api.outscraper.com/maps/search-v3?query=${encodeURIComponent(`artisan pizza restaurants in ${city} ${fullStateName}`)}&limit=20&language=en&region=US`, {
      method: 'GET',
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
      }
    });

    if (response2.ok) {
      const data2 = await response2.json();
      if (data2.status === 'Success' && data2.data) {
        let results = data2.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        console.log(`     Found: ${results.length} results`);
        totalAdded += await processResults(results, city, state);
      } else if (data2.status === 'Pending') {
        console.log(`     Request pending (ID: ${data2.id}), waiting for results...`);
        const pendingResults = await waitForResults(data2.id);
        if (pendingResults.length > 0) {
          console.log(`     Found: ${pendingResults.length} results`);
          totalAdded += await processResults(pendingResults, city, state);
        }
      }
    }
  } catch (error) {
    console.log(`     Error: ${error.message}`);
  }

  console.log(`   ✅ ${city}: +${totalAdded} verified establishments`);
  return totalAdded;
}

async function waitForResults(requestId: string): Promise<any[]> {
  for (let i = 0; i < 12; i++) { // Wait up to 2 minutes
    try {
      const response = await fetch(`https://api.outscraper.com/requests/${requestId}`, {
        headers: {
          'X-API-KEY': process.env.OUTSCRAPER_API_KEY!
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'Success' && data.data) {
          let results = data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
        } else if (data.status === 'Pending') {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          continue;
        } else {
          console.log(`     Request failed: ${data.status}`);
          return [];
        }
      }
    } catch (error) {
      console.log(`     Polling error: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  console.log(`     Timeout waiting for results`);
  return [];
}

async function processResults(results: any[], city: string, state: string): Promise<number> {
  let added = 0;
  
  console.log(`     🔍 Processing ${results.length} results...`);
  
  for (const place of results) {
    if (!place.name) continue;
    
    // Debug: Show what we're looking at
    console.log(`       Checking: ${place.name}`);
    console.log(`         Address: ${place.full_address || place.address || 'No address'}`);
    console.log(`         Category: ${place.category}`);
    
    // Geographic filtering: ensure restaurant is actually in the target city
    const address = (place.full_address || place.address || '').toLowerCase();
    const isInTargetCity = address.includes(city.toLowerCase()) || 
                          address.includes(state.toLowerCase());
    
    // Pizza restaurant filter  
    const isPizzaRelated = place.name.toLowerCase().includes('pizza') ||
                          place.category?.toLowerCase().includes('pizza') ||
                          place.description?.toLowerCase().includes('pizza');
    
    if (isPizzaRelated && isInTargetCity) {
      // Check for duplicates
      const existing = await db.select()
        .from(restaurants)
        .where(sql`LOWER(name) = LOWER(${place.name}) AND city = ${city}`)
        .limit(1);
        
      if (existing.length === 0) {
        console.log(`     🔍 Verifying: ${place.name}`);
        
        // FULL 5-STEP VERIFICATION PROCESS
        const verification = await verifyRestaurantSourdough(place);
        
        if (verification.verified) {
          // Only add restaurants with verified sourdough claims
          await db.insert(restaurants).values({
            name: place.name,
            address: place.full_address,
            city: city,
            state: state,
            phone: place.phone || '',
            website: place.site || '',
            rating: place.rating || 0,
            reviewCount: place.reviews_count || 0,
            latitude: place.latitude || 0,
            longitude: place.longitude || 0,
            keywords: verification.keywords,
            verificationSources: verification.sources
          });
          
          console.log(`     ✅ VERIFIED: ${place.name}`);
          console.log(`       Sources: ${verification.sources.join(', ')}`);
          console.log(`       Keywords: ${verification.keywords.join(', ')}`);
          console.log(`       Confidence: ${verification.confidence}`);
          added++;
        } else {
          console.log(`     ❌ NO SOURDOUGH: ${place.name}`);
          console.log(`       ${verification.details}`);
        }
      }
    }
  }
  
  return added;
}

export async function runSimpleSearch(): Promise<void> {
  console.log('🎯 SIMPLE SOURDOUGH SEARCH');
  console.log('==========================');
  console.log('Back to original plan: Just "sourdough pizza" + "artisan pizza" searches');
  console.log('');

  const cities = [
    ['Chicago', 'IL'], ['Boston', 'MA'], ['Denver', 'CO'], ['Philadelphia', 'PA'],
    ['Miami', 'FL'], ['Phoenix', 'AZ'], ['Dallas', 'TX'], ['Atlanta', 'GA'],
    ['Houston', 'TX'], ['Detroit', 'MI'], ['Minneapolis', 'MN'], ['Tampa', 'FL'],
    ['St. Louis', 'MO'], ['Baltimore', 'MD'], ['San Diego', 'CA'], ['Nashville', 'TN'],
    ['Charlotte', 'NC'], ['Las Vegas', 'NV'], ['Orlando', 'FL'], ['Cleveland', 'OH']
  ];
  
  let total = 0;
  const start = Date.now();
  
  for (let i = 0; i < cities.length; i++) {
    const [city, state] = cities[i];
    const added = await simpleSearchCity(city, state);
    total += added;
    
    const current = await db.select().from(restaurants);
    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    
    console.log(`📊 [${i+1}/${cities.length}] Total: ${current.length} (+${total}) | ${elapsed}s`);
    
    if (current.length >= 1000) {
      console.log('🎉 1,000+ REACHED!');
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n🌟 SIMPLE SEARCH COMPLETE: +${total} establishments`);
}

// ===============================================
// COMPREHENSIVE 5-STEP VERIFICATION SYSTEM
// ===============================================

async function verifyRestaurantSourdough(place: any): Promise<VerificationResult> {
  const sources: string[] = [];
  const keywords: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let details = '';

  // STEP 1: Check Google Business Profile description
  const profileKeywords = findSourdoughKeywords(place.description || '');
  if (profileKeywords.length > 0) {
    sources.push('Google Business Profile');
    keywords.push(...profileKeywords);
    details += `Google profile mentions: ${profileKeywords.join(', ')}. `;
  }

  // STEP 2: Check restaurant website if available
  const website = place.site || place.website;
  if (website && isValidWebsite(website)) {
    try {
      console.log(`       🌐 Checking website: ${website}`);
      const websiteKeywords = await analyzeRestaurantWebsite(website);
      
      if (websiteKeywords.length > 0) {
        sources.push('Restaurant Website');
        keywords.push(...websiteKeywords);
        details += `Website mentions: ${websiteKeywords.join(', ')}. `;
      }
      
    } catch (error) {
      console.log(`       ⚠️  Website analysis failed: ${error.message}`);
    }
  }

  // STEP 3: Check Instagram profiles
  try {
    const instagramKeywords = await checkInstagramForSourdough(place.name);
    if (instagramKeywords.length > 0) {
      sources.push('Instagram');
      keywords.push(...instagramKeywords);
      details += `Instagram mentions: ${instagramKeywords.join(', ')}. `;
    }
  } catch (error) {
    console.log(`       ⚠️  Instagram check failed: ${error.message}`);
  }

  // STEP 4: Check Facebook profiles
  try {
    const facebookKeywords = await checkFacebookForSourdough(place.name);
    if (facebookKeywords.length > 0) {
      sources.push('Facebook');
      keywords.push(...facebookKeywords);
      details += `Facebook mentions: ${facebookKeywords.join(', ')}. `;
    }
  } catch (error) {
    console.log(`       ⚠️  Facebook check failed: ${error.message}`);
  }

  // Determine confidence level
  if (sources.length >= 2) {
    confidence = 'high'; // Multiple sources
  } else if (sources.length === 1 && keywords.length >= 2) {
    confidence = 'medium'; // Single source, multiple keywords
  } else if (sources.length === 1) {
    confidence = 'low'; // Single source, single keyword
  }

  const verified = keywords.length > 0;

  return {
    verified,
    sources,
    keywords: [...new Set(keywords)], // Remove duplicates
    confidence,
    details: details.trim() || 'No sourdough claims found in available sources'
  };
}

function findSourdoughKeywords(text: string): string[] {
  const foundKeywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const keyword of SOURDOUGH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
    }
    
    const hyphenated = keyword.replace(' ', '-');
    if (hyphenated !== keyword && lowerText.includes(hyphenated)) {
      foundKeywords.push(`${keyword} (${hyphenated})`);
    }
  }
  
  return foundKeywords;
}

async function analyzeRestaurantWebsite(websiteUrl: string): Promise<string[]> {
  try {
    let url = websiteUrl.trim();
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 3
    });

    const $ = cheerio.load(response.data);
    
    const textSections = [
      $('title').text(),
      $('meta[name="description"]').attr('content') || '',
      $('h1, h2, h3').text(),
      $('.menu, .about, .story, .description').text(),
      $('p').text()
    ];

    const combinedText = textSections.join(' ');
    return findSourdoughKeywords(combinedText);

  } catch (error) {
    throw new Error(`Website scraping failed: ${error.message}`);
  }
}

async function checkInstagramForSourdough(restaurantName: string): Promise<string[]> {
  try {
    const potentialUsernames = generateInstagramUsernames(restaurantName);
    
    for (const username of potentialUsernames.slice(0, 2)) {
      try {
        const bio = await getInstagramBio(username);
        if (bio) {
          const keywords = findSourdoughKeywords(bio);
          if (keywords.length > 0) {
            console.log(`       📱 Instagram @${username}: ${keywords.join(', ')}`);
            return keywords;
          }
        }
      } catch {}
    }
    
    return [];
  } catch {
    return [];
  }
}

async function checkFacebookForSourdough(restaurantName: string): Promise<string[]> {
  try {
    const potentialPages = generateFacebookPageNames(restaurantName);
    
    for (const pageName of potentialPages.slice(0, 2)) {
      try {
        const description = await getFacebookDescription(pageName);
        if (description) {
          const keywords = findSourdoughKeywords(description);
          if (keywords.length > 0) {
            console.log(`       📘 Facebook ${pageName}: ${keywords.join(', ')}`);
            return keywords;
          }
        }
      } catch {}
    }
    
    return [];
  } catch {
    return [];
  }
}

async function getInstagramBio(username: string): Promise<string> {
  try {
    if (!process.env.OUTSCRAPER_API_KEY) return '';
    
    const response = await axios.get('https://api.outscraper.com/google-search-v3', {
      params: {
        query: `site:instagram.com/${username}`,
        limit: 1,
        async: false
      },
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY
      },
      timeout: 8000
    });
    
    if (response.data?.data?.[0]?.[0]) {
      const result = response.data.data[0][0];
      return result.description || result.snippet || '';
    }
    
    return '';
  } catch {
    return '';
  }
}

async function getFacebookDescription(pageName: string): Promise<string> {
  try {
    if (!process.env.OUTSCRAPER_API_KEY) return '';
    
    const response = await axios.get('https://api.outscraper.com/google-search-v3', {
      params: {
        query: `site:facebook.com/${pageName}`,
        limit: 1,
        async: false
      },
      headers: {
        'X-API-KEY': process.env.OUTSCRAPER_API_KEY
      },
      timeout: 8000
    });
    
    if (response.data?.data?.[0]?.[0]) {
      const result = response.data.data[0][0];
      return result.description || result.snippet || '';
    }
    
    return '';
  } catch {
    return '';
  }
}

function generateInstagramUsernames(restaurantName: string): string[] {
  const clean = restaurantName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');
  
  return [
    clean,
    clean + 'pizza',
    clean + 'restaurant',
    clean.replace('pizza', '')
  ];
}

function generateFacebookPageNames(restaurantName: string): string[] {
  const clean = restaurantName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');
  
  return [
    clean,
    restaurantName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-'),
    clean + '-restaurant',
    clean + '-pizza'
  ];
}

function isValidWebsite(url: string): boolean {
  if (!url) return false;
  
  const skipPatterns = [
    'yelp.com', 'google.com', 'facebook.com', 'instagram.com',
    'grubhub.com', 'doordash.com', 'ubereats.com'
  ];
  
  return !skipPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

function getFullStateName(stateCode: string): string {
  const stateMap: { [key: string]: string } = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming'
  };
  
  return stateMap[stateCode] || stateCode;
}