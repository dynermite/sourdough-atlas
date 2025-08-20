#!/usr/bin/env tsx

import axios from 'axios';

class SimpleSFBaseline {
  private apiKey: string;
  private establishments: any[] = [];

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async getCompleteBaseline() {
    console.log('🍕 SIMPLE SF PIZZA BASELINE');
    console.log('=' .repeat(40));
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return [];
    }

    // Just use the most effective searches we identified
    const searches = [
      'Pizza restaurant San Francisco CA',    // 50 results
      'wood fired pizza San Francisco CA',    // 11 new 
      'italian restaurant San Francisco CA',  // 9 new
      'deep dish pizza San Francisco CA',     // 8 new
      'new york style pizza San Francisco CA' // 8 new
    ];

    for (const query of searches) {
      console.log(`\nSearching: "${query}"`);
      
      try {
        const results = await this.executeSearch(query, 50);
        console.log(`Found: ${results.length} results`);
        
        const newCount = this.addUniqueResults(results);
        console.log(`Added: ${newCount} new pizza establishments`);
        console.log(`Total unique: ${this.establishments.length}`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
    }

    console.log(`\n✅ BASELINE COMPLETE: ${this.establishments.length} unique pizza establishments`);
    
    // Show the complete list
    this.showCompleteList();
    
    return this.establishments;
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

  addUniqueResults(results: any[]): number {
    let newCount = 0;
    
    for (const result of results) {
      if (this.isPizzaEstablishment(result)) {
        // Check if already exists
        const existing = this.establishments.find(e => 
          e.name === result.name && 
          Math.abs((e.latitude || 0) - (result.latitude || 0)) < 0.001
        );
        
        if (!existing) {
          this.establishments.push(result);
          newCount++;
        }
      }
    }
    
    return newCount;
  }

  isPizzaEstablishment(result: any): boolean {
    if (!result.name) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    
    // Strong pizza indicators
    const pizzaKeywords = ['pizza', 'pizzeria', 'pizzas'];
    
    // Exclude obvious non-pizza places
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience',
      'delivery service', 'uber eats', 'doordash'
    ];
    
    // Check exclusions
    for (const exclude of excludeKeywords) {
      if (name.includes(exclude) || description.includes(exclude)) {
        return false;
      }
    }
    
    // Check pizza keywords
    for (const keyword of pizzaKeywords) {
      if (name.includes(keyword) || description.includes(keyword)) {
        return true;
      }
    }
    
    // Italian restaurants that likely serve pizza
    if ((name.includes('italian') || description.includes('italian')) &&
        (description.includes('restaurant'))) {
      return true;
    }
    
    return false;
  }

  showCompleteList() {
    console.log('\n📋 COMPLETE SF PIZZA ESTABLISHMENT BASELINE:');
    
    this.establishments
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((est, index) => {
        console.log(`\n${index + 1}. ${est.name}`);
        console.log(`   📍 ${est.full_address || est.address || 'Address unknown'}`);
        console.log(`   📝 ${est.description?.substring(0, 100) || 'No description'}...`);
      });
  }
}

export async function getSimpleSFBaseline() {
  const baseline = new SimpleSFBaseline();
  const establishments = await baseline.getCompleteBaseline();
  
  console.log(`\n🎯 FINAL RESULT:`);
  console.log(`Total SF pizza establishments: ${establishments.length}`);
  console.log(`Baseline established for sourdough verification`);
  
  return establishments;
}

if (import.meta.url.endsWith(process.argv[1])) {
  getSimpleSFBaseline().catch(console.error);
}