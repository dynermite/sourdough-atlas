#!/usr/bin/env tsx

import axios from 'axios';

class APIConsistencyTest {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async testConsistency() {
    console.log('🔍 TESTING API CONSISTENCY');
    console.log('=' .repeat(40));
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return;
    }

    console.log(`API Key: ${this.apiKey.substring(0, 8)}...`);
    
    // Test the same query multiple times
    const testQuery = 'pizza San Francisco CA';
    console.log(`\nTesting query: "${testQuery}"`);
    
    for (let i = 1; i <= 3; i++) {
      console.log(`\n--- TEST RUN ${i} ---`);
      await this.singleTest(testQuery, 10);
      
      if (i < 3) {
        console.log('Waiting 5 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Test different queries
    console.log('\n\n🔍 TESTING DIFFERENT QUERIES');
    const queries = [
      'Pizza restaurant San Francisco CA',
      'pizzeria San Francisco CA',
      'italian restaurant San Francisco CA'
    ];
    
    for (const query of queries) {
      console.log(`\n--- TESTING: "${query}" ---`);
      await this.singleTest(query, 10);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  async singleTest(query: string, limit: number) {
    try {
      const startTime = Date.now();
      
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
        timeout: 15000
      });
      
      const initialResponseTime = Date.now() - startTime;
      console.log(`Initial response time: ${initialResponseTime}ms`);
      console.log(`Status: ${response.data.status}`);
      console.log(`Request ID: ${response.data.id || 'No ID'}`);
      
      if (response.data.status === 'Error') {
        console.log(`❌ Error: ${response.data.error || 'Unknown error'}`);
        return;
      }
      
      if (response.data.status === 'Pending') {
        console.log('Waiting for results...');
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 8000));
          attempts++;
          
          try {
            const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
              headers: {
                'X-API-KEY': this.apiKey
              },
              timeout: 10000
            });
            
            console.log(`Attempt ${attempts} - Status: ${resultResponse.data.status}`);
            
            if (resultResponse.data.status === 'Success') {
              let results = resultResponse.data.data;
              if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
                results = results.flat();
              }
              
              console.log(`✅ Results found: ${results ? results.length : 0}`);
              
              if (results && results.length > 0) {
                console.log(`Sample results:`);
                results.slice(0, 3).forEach((result, index) => {
                  console.log(`  ${index + 1}. ${result.name} - ${result.full_address || result.address}`);
                });
              }
              return;
              
            } else if (resultResponse.data.status === 'Error') {
              console.log(`❌ Request failed: ${resultResponse.data.error || 'Unknown error'}`);
              return;
            }
            
          } catch (error) {
            console.log(`Attempt ${attempts} failed: ${error.message}`);
          }
        }
        
        console.log(`❌ Timeout after ${maxAttempts} attempts`);
        
      } else if (response.data.status === 'Success') {
        // Immediate success
        let results = response.data.data;
        if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
          results = results.flat();
        }
        console.log(`✅ Immediate results: ${results ? results.length : 0}`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
      
      if (error.response) {
        console.log(`Response status: ${error.response.status}`);
        console.log(`Response data:`, error.response.data);
        
        if (error.response.status === 401) {
          console.log('🚨 AUTHENTICATION ERROR - Invalid API key');
        } else if (error.response.status === 402) {
          console.log('🚨 PAYMENT REQUIRED - Out of credits');
        } else if (error.response.status === 429) {
          console.log('🚨 RATE LIMIT EXCEEDED');
        }
      }
    }
  }
}

export async function testAPIConsistency() {
  const tester = new APIConsistencyTest();
  await tester.testConsistency();
}

if (import.meta.url.endsWith(process.argv[1])) {
  testAPIConsistency().catch(console.error);
}