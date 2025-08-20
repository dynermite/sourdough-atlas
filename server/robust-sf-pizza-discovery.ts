#!/usr/bin/env tsx

import axios from 'axios';

class RobustSFPizzaDiscovery {
  private apiKey: string;
  private allEstablishments: Map<string, any> = new Map();
  private totalAPIRequests = 0;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async discoverAllSFPizza() {
    console.log('🍕 ROBUST SF PIZZA DISCOVERY');
    console.log('=' .repeat(45));
    console.log('Goal: Find 80-130 pizza establishments with proper timing');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    const searchQueries = [
      // Primary broad searches with higher limits
      { query: 'pizza San Francisco CA', limit: 50 },
      { query: 'Pizza restaurant San Francisco CA', limit: 50 },
      { query: 'pizzeria San Francisco CA', limit: 50 },
      
      // Style-specific searches
      { query: 'wood fired pizza San Francisco CA', limit: 30 },
      { query: 'italian restaurant San Francisco CA', limit: 50 },
      
      // Targeted sourdough search
      { query: 'sourdough pizza restaurants San Francisco', limit: 20 }
    ];

    console.log(`\nExecuting ${searchQueries.length} comprehensive searches...`);
    
    for (let i = 0; i < searchQueries.length; i++) {
      const { query, limit } = searchQueries[i];
      console.log(`\n[${i + 1}/${searchQueries.length}] "${query}" (limit: ${limit})`);
      
      try {
        const results = await this.robustSearch(query, limit);
        const newCount = this.addUniqueResults(results);
        
        console.log(`   Found: ${results.length} results`);
        console.log(`   Added: ${newCount} new establishments`);
        console.log(`   Total unique: ${this.allEstablishments.size}`);
        
        // Longer delay between searches to avoid rate limiting
        if (i < searchQueries.length - 1) {
          console.log('   Waiting 8 seconds before next search...');
          await new Promise(resolve => setTimeout(resolve, 8000));
        }
        
      } catch (error) {
        console.log(`   ❌ Search failed: ${error.message}`);
      }
    }

    const finalResults = Array.from(this.allEstablishments.values());
    
    console.log(`\n✅ DISCOVERY COMPLETE`);
    console.log(`Total API requests made: ${this.totalAPIRequests}`);
    console.log(`Total unique establishments: ${finalResults.length}`);
    
    if (finalResults.length < 80) {
      console.log(`⚠️  Found fewer than expected (${finalResults.length} < 80)`);
      console.log(`This may indicate timing issues or API limitations`);
    } else {
      console.log(`✅ Successfully found comprehensive set of establishments`);
    }
    
    this.displayResults(finalResults);
    return finalResults;
  }

  async robustSearch(query: string, limit: number): Promise<any[]> {
    console.log(`     Initiating search...`);
    this.totalAPIRequests++;
    
    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query,
          limit,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        },
        timeout: 20000 // 20 second timeout for initial request
      });

      console.log(`     Initial response: ${response.data.status}`);

      if (response.data.status === 'Error') {
        throw new Error(response.data.error || 'API returned error status');
      }

      if (response.data.status === 'Pending') {
        console.log(`     Request pending, waiting for results...`);
        return await this.waitForResults(response.data.id);
      }

      if (response.data.status === 'Success') {
        // Immediate success - rare but possible
        let results = response.data.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        return results || [];
      }

      throw new Error(`Unexpected status: ${response.data.status}`);

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - API taking too long to respond');
      }
      throw error;
    }
  }

  async waitForResults(requestId: string): Promise<any[]> {
    const maxAttempts = 8; // Up to 64 seconds total wait time
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      const waitTime = Math.min(8000 + (attempts * 1000), 12000); // Increasing wait time
      
      console.log(`     Attempt ${attempts}/${maxAttempts} - waiting ${waitTime/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      try {
        this.totalAPIRequests++;
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
          headers: {
            'X-API-KEY': this.apiKey
          },
          timeout: 15000
        });

        console.log(`     Status: ${resultResponse.data.status}`);

        if (resultResponse.data.status === 'Success') {
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          
          console.log(`     ✅ Results received: ${results ? results.length : 0}`);
          return results || [];
          
        } else if (resultResponse.data.status === 'Error') {
          throw new Error(resultResponse.data.error || 'Request processing failed');
        }
        
        // Still pending, continue waiting
        
      } catch (error) {
        console.log(`     Attempt ${attempts} error: ${error.message}`);
        
        // If it's the last attempt, throw the error
        if (attempts === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error(`Timeout after ${maxAttempts} attempts - request never completed`);
  }

  addUniqueResults(results: any[]): number {
    let newCount = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        // Create unique key based on name + coordinates
        const key = `${result.name}_${result.latitude}_${result.longitude}`;
        
        if (!this.allEstablishments.has(key)) {
          this.allEstablishments.set(key, result);
          newCount++;
        }
      }
    }
    
    return newCount;
  }

  isPizzaEstablishment(result: any): boolean {
    if (!result.name || !result.latitude || !result.longitude) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    const categories = (result.categories || []).join(' ').toLowerCase();
    
    // Pizza indicators
    const pizzaKeywords = [
      'pizza', 'pizzeria', 'pizzas', 'pie shop', 'pizza place',
      'brick oven', 'wood fired', 'neapolitan'
    ];
    
    // Exclude non-pizza businesses
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience',
      'delivery service', 'uber eats', 'doordash', 'grubhub'
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
    
    // Italian restaurants that likely serve pizza
    if ((name.includes('italian') || description.includes('italian') || categories.includes('italian')) &&
        (description.includes('restaurant') || categories.includes('restaurant'))) {
      return true;
    }
    
    return false;
  }

  displayResults(establishments: any[]) {
    console.log('\n📋 COMPLETE SF PIZZA ESTABLISHMENT DISCOVERY:');
    
    // Sort by name for consistent display
    establishments
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((est, index) => {
        console.log(`\n${index + 1}. ${est.name}`);
        console.log(`   📍 ${est.full_address || est.address || 'Address unknown'}`);
        console.log(`   📝 ${est.description?.substring(0, 80) || 'No description'}...`);
      });
      
    // Show statistics
    console.log(`\n📊 DISCOVERY STATISTICS:`);
    console.log(`   Total establishments found: ${establishments.length}`);
    console.log(`   API requests used: ${this.totalAPIRequests}`);
    
    // Check for known sourdough establishments
    const sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast'];
    const potentialSourdough = establishments.filter(est => {
      const text = `${est.name} ${est.description || ''}`.toLowerCase();
      return sourdoughKeywords.some(keyword => text.includes(keyword));
    });
    
    console.log(`   Potential sourdough establishments: ${potentialSourdough.length}`);
    
    if (potentialSourdough.length > 0) {
      console.log(`   Sourdough candidates:`);
      potentialSourdough.forEach(est => {
        console.log(`     - ${est.name}`);
      });
    }
  }
}

export async function robustSFPizzaDiscovery() {
  const discovery = new RobustSFPizzaDiscovery();
  const results = await discovery.discoverAllSFPizza();
  
  console.log(`\n🎯 FINAL RESULT: ${results.length} establishments ready for sourdough verification`);
  return results;
}

if (import.meta.url.endsWith(process.argv[1])) {
  robustSFPizzaDiscovery().catch(console.error);
}