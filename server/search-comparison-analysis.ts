#!/usr/bin/env tsx

import axios from 'axios';

class SearchComparisonAnalysis {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async compareSearchStrategies() {
    console.log('🔍 SEARCH STRATEGY COMPARISON ANALYSIS');
    console.log('=' .repeat(60));
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return;
    }

    // Test the original single broad search
    console.log('\n📋 ORIGINAL SINGLE SEARCH APPROACH:');
    const singleSearchResults = await this.testSingleSearch();
    
    // Test multiple specific searches with smaller limits
    console.log('\n📋 MULTIPLE SEARCH APPROACH (Current):');
    const multipleSearchResults = await this.testMultipleSearches();
    
    // Test single search with higher limit
    console.log('\n📋 SINGLE SEARCH WITH HIGHER LIMIT:');
    const highLimitResults = await this.testHighLimitSearch();
    
    console.log('\n🎯 ANALYSIS RESULTS:');
    console.log(`Single broad search (limit 20): ${singleSearchResults} establishments`);
    console.log(`Multiple specific searches: ${multipleSearchResults} unique establishments`);
    console.log(`Single search (limit 100): ${highLimitResults} establishments`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (highLimitResults > multipleSearchResults) {
      console.log('✅ Single search with higher limit is more effective');
      console.log('   Reason: API returns more comprehensive results in single query');
    } else if (multipleSearchResults > singleSearchResults) {
      console.log('✅ Multiple search strategy is working correctly');
      console.log('   Reason: Different search terms capture different establishments');
    } else {
      console.log('⚠️  Both strategies return similar results');
      console.log('   Reason: May need to investigate API response patterns');
    }
  }

  async testSingleSearch(): Promise<number> {
    try {
      console.log('   Testing: "pizza San Francisco CA" (limit 20)');
      
      const results = await this.executeSearch('pizza San Francisco CA', 20);
      const pizzaEstablishments = results.filter(r => this.isPizzaEstablishment(r));
      
      console.log(`   Raw results: ${results.length}`);
      console.log(`   Pizza establishments: ${pizzaEstablishments.length}`);
      
      // Show sample
      console.log('   Sample results:');
      pizzaEstablishments.slice(0, 5).forEach((est, index) => {
        console.log(`     ${index + 1}. ${est.name} - ${est.full_address || est.address}`);
      });
      
      return pizzaEstablishments.length;
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      return 0;
    }
  }

  async testMultipleSearches(): Promise<number> {
    const searchQueries = [
      'pizza restaurants San Francisco CA',
      'pizzeria San Francisco CA',
      'pizza places San Francisco CA',
      'Italian restaurants San Francisco CA',
      'wood fired pizza San Francisco CA'
    ];

    const allEstablishments: any[] = [];
    let totalRawResults = 0;

    for (const query of searchQueries) {
      try {
        console.log(`   Testing: "${query}" (limit 20)`);
        
        const results = await this.executeSearch(query, 20);
        totalRawResults += results.length;
        
        console.log(`     Raw results: ${results.length}`);
        
        for (const result of results) {
          if (this.isPizzaEstablishment(result)) {
            const existing = allEstablishments.find(e => 
              e.name === result.name && 
              Math.abs(e.latitude - result.latitude) < 0.001
            );
            
            if (!existing) {
              allEstablishments.push(result);
            }
          }
        }
        
        console.log(`     Unique pizza establishments so far: ${allEstablishments.length}`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`     Error: ${error.message}`);
      }
    }

    console.log(`   Total raw results across all searches: ${totalRawResults}`);
    console.log(`   Unique pizza establishments: ${allEstablishments.length}`);
    
    return allEstablishments.length;
  }

  async testHighLimitSearch(): Promise<number> {
    try {
      console.log('   Testing: "pizza San Francisco CA" (limit 100)');
      
      const results = await this.executeSearch('pizza San Francisco CA', 100);
      const pizzaEstablishments = results.filter(r => this.isPizzaEstablishment(r));
      
      console.log(`   Raw results: ${results.length}`);
      console.log(`   Pizza establishments: ${pizzaEstablishments.length}`);
      
      // Show sample
      console.log('   Sample results (first 10):');
      pizzaEstablishments.slice(0, 10).forEach((est, index) => {
        console.log(`     ${index + 1}. ${est.name} - ${est.full_address || est.address}`);
      });
      
      if (pizzaEstablishments.length > 10) {
        console.log(`     ... and ${pizzaEstablishments.length - 10} more`);
      }
      
      return pizzaEstablishments.length;
      
    } catch (error) {
      console.log(`   Error: ${error.message}`);
      return 0;
    }
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

  isPizzaEstablishment(result: any): boolean {
    if (!result.name) return false;
    
    const name = result.name.toLowerCase();
    const description = (result.description || '').toLowerCase();
    const categories = (result.categories || []).join(' ').toLowerCase();
    
    const pizzaKeywords = [
      'pizza', 'pizzeria', 'pizzas', 'pie', 'pies',
      'italian restaurant', 'trattoria', 'ristorante'
    ];
    
    const excludeKeywords = [
      'grocery', 'supermarket', 'gas station', 'convenience store',
      'delivery service', 'courier', 'driver', 'doordash', 'uber eats'
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
}

export async function runSearchComparisonAnalysis() {
  const analysis = new SearchComparisonAnalysis();
  await analysis.compareSearchStrategies();
}

if (import.meta.url.endsWith(process.argv[1])) {
  runSearchComparisonAnalysis().catch(console.error);
}