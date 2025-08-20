#!/usr/bin/env tsx

import axios from 'axios';

class SFPizzaBaseline {
  private apiKey: string;
  private allEstablishments: Map<string, any> = new Map();

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async establishCompleteBaseline() {
    console.log('🍕 ESTABLISHING COMPLETE SF PIZZA BASELINE');
    console.log('=' .repeat(55));
    console.log('Goal: Find every single pizza restaurant in San Francisco');
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Method 1: Google Maps category search
    console.log('\n📋 METHOD 1: GOOGLE MAPS PIZZA CATEGORY');
    await this.searchByCategory();
    
    // Method 2: Systematic keyword searches
    console.log('\n📋 METHOD 2: SYSTEMATIC KEYWORD SEARCHES');
    await this.searchByKeywords();
    
    // Method 3: Geographic grid search
    console.log('\n📋 METHOD 3: NEIGHBORHOOD-BASED SEARCH');
    await this.searchByNeighborhoods();
    
    // Convert to array and analyze
    const allEstablishments = Array.from(this.allEstablishments.values());
    
    console.log('\n🎯 BASELINE ESTABLISHMENT RESULTS:');
    console.log(`Total unique pizza establishments found: ${allEstablishments.length}`);
    
    // Categorize by type
    this.analyzeEstablishments(allEstablishments);
    
    // Export the complete list
    this.exportCompleteList(allEstablishments);
    
    return allEstablishments;
  }

  async searchByCategory() {
    console.log('   Using Google Maps "Pizza" category filter...');
    
    const categoryQueries = [
      'Pizza restaurant San Francisco CA',
      'Pizzeria San Francisco CA',
      'Pizza place San Francisco CA'
    ];

    for (const query of categoryQueries) {
      console.log(`   Searching: "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 50); // Higher limit for comprehensive coverage
        console.log(`     Found: ${results.length} results`);
        
        this.addResults(results, 'category');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Rate limiting
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }
    
    console.log(`   Category search total: ${this.allEstablishments.size} unique establishments`);
  }

  async searchByKeywords() {
    console.log('   Using comprehensive keyword variations...');
    
    const keywordQueries = [
      // Generic pizza terms
      'pizza San Francisco CA',
      'pizzas San Francisco CA',
      'pizza delivery San Francisco CA',
      'pizza takeout San Francisco CA',
      
      // Style-specific
      'wood fired pizza San Francisco CA',
      'brick oven pizza San Francisco CA',
      'thin crust pizza San Francisco CA',
      'deep dish pizza San Francisco CA',
      'neapolitan pizza San Francisco CA',
      'new york style pizza San Francisco CA',
      'sicilian pizza San Francisco CA',
      'chicago style pizza San Francisco CA',
      
      // Cuisine-based
      'italian restaurant San Francisco CA',
      'italian food San Francisco CA',
      
      // Business type
      'pizza chain San Francisco CA',
      'local pizza San Francisco CA',
      'family pizza San Francisco CA',
      'gourmet pizza San Francisco CA'
    ];

    let searchCount = 0;
    for (const query of keywordQueries) {
      searchCount++;
      console.log(`   [${searchCount}/${keywordQueries.length}] "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 30);
        console.log(`     Added: ${this.addResults(results, 'keyword')} new establishments`);
        
        if (searchCount % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 4000)); // Rate limiting every 3 searches
        }
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }
    
    console.log(`   Keyword search total: ${this.allEstablishments.size} unique establishments`);
  }

  async searchByNeighborhoods() {
    console.log('   Using SF neighborhood-specific searches...');
    
    const neighborhoods = [
      'Mission District', 'North Beach', 'Chinatown', 'SOMA', 'Financial District',
      'Castro', 'Haight Ashbury', 'Richmond', 'Sunset', 'Marina',
      'Pacific Heights', 'Nob Hill', 'Russian Hill', 'Fillmore',
      'Tenderloin', 'Potrero Hill', 'Dogpatch', 'Bernal Heights',
      'Glen Park', 'Noe Valley', 'West Portal', 'Inner Sunset',
      'Outer Richmond', 'Japantown', 'Lower Haight'
    ];

    for (const neighborhood of neighborhoods) {
      const query = `pizza ${neighborhood} San Francisco CA`;
      console.log(`   Searching: ${neighborhood}`);
      
      try {
        const results = await this.executeSearch(query, 20);
        const newCount = this.addResults(results, 'neighborhood');
        
        if (newCount > 0) {
          console.log(`     Found: ${newCount} new establishments in ${neighborhood}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     Error in ${neighborhood}: ${error.message}`);
      }
    }
    
    console.log(`   Neighborhood search total: ${this.allEstablishments.size} unique establishments`);
  }

  async executeSearch(query: string, limit: number): Promise<any[]> {
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
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  addResults(results: any[], source: string): number {
    let newCount = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        // Create unique key based on name + location
        const key = `${result.name}_${result.latitude}_${result.longitude}`;
        
        if (!this.allEstablishments.has(key)) {
          result.discoveredBy = source;
          this.allEstablishments.set(key, result);
          newCount++;
        } else {
          // Update discovery method if found by multiple sources
          const existing = this.allEstablishments.get(key);
          if (!existing.discoveredBy.includes(source)) {
            existing.discoveredBy += `,${source}`;
          }
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
    
    // Strong pizza indicators
    const pizzaKeywords = [
      'pizza', 'pizzeria', 'pizzas', 'pie shop', 'pizza place',
      'brick oven', 'wood fired', 'neapolitan', 'trattoria'
    ];
    
    // Exclude non-pizza businesses
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience',
      'delivery service', 'uber eats', 'doordash', 'grubhub',
      'catering only', 'food truck', 'cafe'  // Will reconsider cafes later
    ];
    
    // Check exclusions first
    for (const exclude of excludeKeywords) {
      if (name.includes(exclude) || description.includes(exclude)) {
        return false;
      }
    }
    
    // Must have pizza indicators
    for (const keyword of pizzaKeywords) {
      if (name.includes(keyword) || description.includes(keyword) || categories.includes(keyword)) {
        return true;
      }
    }
    
    // Check if it's an Italian restaurant that likely serves pizza
    if ((name.includes('italian') || description.includes('italian') || categories.includes('italian')) &&
        (description.includes('restaurant') || categories.includes('restaurant'))) {
      return true;
    }
    
    return false;
  }

  analyzeEstablishments(establishments: any[]) {
    console.log('\n📊 ESTABLISHMENT ANALYSIS:');
    
    const byDiscoveryMethod = new Map();
    const byType = new Map();
    
    establishments.forEach(est => {
      // Count by discovery method
      const methods = est.discoveredBy.split(',');
      methods.forEach(method => {
        byDiscoveryMethod.set(method, (byDiscoveryMethod.get(method) || 0) + 1);
      });
      
      // Categorize by name patterns
      const name = est.name.toLowerCase();
      if (name.includes('pizza')) {
        byType.set('Has "Pizza" in name', (byType.get('Has "Pizza" in name') || 0) + 1);
      } else if (name.includes('italian')) {
        byType.set('Italian restaurant', (byType.get('Italian restaurant') || 0) + 1);
      } else {
        byType.set('Other naming pattern', (byType.get('Other naming pattern') || 0) + 1);
      }
    });
    
    console.log('   Discovery method breakdown:');
    byDiscoveryMethod.forEach((count, method) => {
      console.log(`     ${method}: ${count} establishments`);
    });
    
    console.log('\n   Type breakdown:');
    byType.forEach((count, type) => {
      console.log(`     ${type}: ${count} establishments`);
    });
  }

  exportCompleteList(establishments: any[]) {
    console.log('\n📋 COMPLETE SF PIZZA ESTABLISHMENT LIST:');
    console.log(`Found ${establishments.length} total establishments\n`);
    
    establishments
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((est, index) => {
        console.log(`${index + 1}. ${est.name}`);
        console.log(`   📍 ${est.full_address || est.address || 'Address unknown'}`);
        console.log(`   🔍 Found via: ${est.discoveredBy}`);
        console.log(`   📝 ${est.description?.substring(0, 80) || 'No description'}...`);
        console.log('');
      });
  }
}

export async function establishPizzaBaseline() {
  const baseline = new SFPizzaBaseline();
  const establishments = await baseline.establishCompleteBaseline();
  
  console.log(`\n✅ SF PIZZA BASELINE ESTABLISHED`);
  console.log(`Total establishments discovered: ${establishments.length}`);
  console.log(`Ready for sourdough verification phase`);
  
  return establishments;
}

if (import.meta.url.endsWith(process.argv[1])) {
  establishPizzaBaseline().catch(console.error);
}