#!/usr/bin/env tsx

import axios from 'axios';

class MissingEstablishmentInvestigation {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async investigateMissingEstablishments() {
    console.log('🔍 INVESTIGATING MISSING SOURDOUGH ESTABLISHMENTS');
    console.log('=' .repeat(55));
    
    // Test specific searches that should find Long Bridge Pizza
    const testSearches = [
      'Long Bridge Pizza San Francisco',
      'pizza Potrero Hill San Francisco',
      'sourdough pizza San Francisco',
      'artisan pizza San Francisco CA',
      'wood fired pizza Potrero Hill',
      'pizza restaurant 94107',
      'pizza Mariposa Street San Francisco'
    ];

    for (const query of testSearches) {
      console.log(`\n🔍 Testing: "${query}"`);
      await this.testSpecificSearch(query);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Test broader geographic searches
    console.log('\n🌍 TESTING BROADER GEOGRAPHIC COVERAGE');
    const geoSearches = [
      'pizza restaurants San Francisco California',
      'pizza delivery San Francisco CA',
      'pizza takeout San Francisco CA'
    ];

    for (const query of geoSearches) {
      console.log(`\n🔍 Geographic test: "${query}"`);
      await this.testSpecificSearch(query, 100); // Higher limit
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  async testSpecificSearch(query: string, limit: number = 50) {
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
        timeout: 20000
      });

      if (response.data.status === 'Pending') {
        console.log('   Waiting for results...');
        const results = await this.waitForResults(response.data.id);
        this.analyzeResults(results, query);
      } else if (response.data.status === 'Success') {
        let results = response.data.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        this.analyzeResults(results || [], query);
      }

    } catch (error) {
      console.log(`   ❌ Search failed: ${error.message}`);
    }
  }

  async waitForResults(requestId: string): Promise<any[]> {
    const maxAttempts = 6;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 8000 + (attempts * 1000)));
      
      try {
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
          headers: {
            'X-API-KEY': this.apiKey
          },
          timeout: 15000
        });

        if (resultResponse.data.status === 'Success') {
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
        } else if (resultResponse.data.status === 'Error') {
          throw new Error(resultResponse.data.error);
        }
        
      } catch (error) {
        if (attempts === maxAttempts) throw error;
      }
    }

    throw new Error(`Timeout after ${maxAttempts} attempts`);
  }

  analyzeResults(results: any[], query: string) {
    console.log(`   Found ${results.length} results`);
    
    // Look specifically for Long Bridge Pizza
    const longBridge = results.find(r => 
      r.name && r.name.toLowerCase().includes('long bridge')
    );
    
    if (longBridge) {
      console.log(`   ✅ FOUND LONG BRIDGE PIZZA!`);
      console.log(`      Name: ${longBridge.name}`);
      console.log(`      Address: ${longBridge.full_address || longBridge.address}`);
      console.log(`      Website: ${longBridge.website || longBridge.site}`);
      console.log(`      Description: ${longBridge.description || 'No description'}`);
    }

    // Look for other potential sourdough establishments
    const sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];
    const potentialSourdough = results.filter(r => {
      const text = `${r.name || ''} ${r.description || ''}`.toLowerCase();
      return sourdoughKeywords.some(keyword => text.includes(keyword));
    });

    if (potentialSourdough.length > 0) {
      console.log(`   🍞 Found ${potentialSourdough.length} potential sourdough establishments:`);
      potentialSourdough.forEach(est => {
        console.log(`      - ${est.name}: ${est.description?.substring(0, 100) || 'No description'}...`);
      });
    }

    // Look for establishments in specific neighborhoods we might have missed
    const neighborhoods = ['potrero hill', 'mission bay', 'dogpatch', 'bernal heights'];
    const neighborhoodEstablishments = results.filter(r => {
      const address = (r.full_address || r.address || '').toLowerCase();
      return neighborhoods.some(neighborhood => address.includes(neighborhood));
    });

    if (neighborhoodEstablishments.length > 0) {
      console.log(`   🏘️  Found ${neighborhoodEstablishments.length} establishments in underrepresented neighborhoods:`);
      neighborhoodEstablishments.slice(0, 5).forEach(est => {
        console.log(`      - ${est.name} (${est.full_address || est.address})`);
      });
    }
  }
}

export async function investigateMissingEstablishments() {
  const investigation = new MissingEstablishmentInvestigation();
  await investigation.investigateMissingEstablishments();
}

if (import.meta.url.endsWith(process.argv[1])) {
  investigateMissingEstablishments().catch(console.error);
}