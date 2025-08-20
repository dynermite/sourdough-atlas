#!/usr/bin/env tsx

import axios from 'axios';

class APIInconsistencyDebugger {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async debugAPIIssues() {
    console.log('🔍 DEBUGGING API INCONSISTENCY ISSUES');
    console.log('=' .repeat(50));
    
    if (!this.apiKey) {
      console.log('❌ No API key available');
      return;
    }

    console.log(`API Key present: ${this.apiKey.substring(0, 8)}...`);
    
    // Test 1: Basic API connectivity
    console.log('\n🧪 TEST 1: API CONNECTIVITY');
    await this.testBasicConnectivity();
    
    // Test 2: Rate limiting issues
    console.log('\n🧪 TEST 2: RATE LIMITING');
    await this.testRateLimiting();
    
    // Test 3: Query variations
    console.log('\n🧪 TEST 3: QUERY VARIATIONS');
    await this.testQueryVariations();
    
    // Test 4: Limit parameter effects
    console.log('\n🧪 TEST 4: LIMIT PARAMETER EFFECTS');
    await this.testLimitParameters();
    
    // Test 5: Account status
    console.log('\n🧪 TEST 5: ACCOUNT STATUS');
    await this.checkAccountStatus();
  }

  async testBasicConnectivity() {
    try {
      console.log('   Testing basic "pizza San Francisco" query...');
      
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: 'pizza San Francisco',
          limit: 5,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        }
      });
      
      console.log(`   Response status: ${response.status}`);
      console.log(`   Response data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data.status === 'Pending') {
        console.log('   Request is pending, waiting for results...');
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': this.apiKey
          }
        });
        
        console.log(`   Result status: ${resultResponse.data.status}`);
        console.log(`   Result data:`, JSON.stringify(resultResponse.data, null, 2));
        
        if (resultResponse.data.status === 'Success') {
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          console.log(`   ✅ Found ${results ? results.length : 0} results`);
          
          if (results && results.length > 0) {
            console.log(`   Sample result: ${results[0].name} - ${results[0].full_address}`);
          }
        } else {
          console.log(`   ❌ Request failed with status: ${resultResponse.data.status}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ API Error: ${error.message}`);
      if (error.response) {
        console.log(`   Response status: ${error.response.status}`);
        console.log(`   Response data:`, error.response.data);
      }
    }
  }

  async testRateLimiting() {
    console.log('   Testing multiple rapid requests...');
    
    const queries = [
      'pizza San Francisco',
      'restaurant San Francisco', 
      'italian San Francisco'
    ];
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`   Request ${i + 1}: "${query}"`);
      
      try {
        const startTime = Date.now();
        
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query,
            limit: 5,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          }
        });
        
        const responseTime = Date.now() - startTime;
        console.log(`     Response time: ${responseTime}ms`);
        console.log(`     Status: ${response.data.status}`);
        
        if (response.data.status === 'Error') {
          console.log(`     Error: ${response.data.error || 'Unknown error'}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`     ❌ Request failed: ${error.message}`);
        if (error.response?.status === 429) {
          console.log(`     🚨 RATE LIMITING DETECTED`);
        }
      }
    }
  }

  async testQueryVariations() {
    console.log('   Testing different query formats...');
    
    const queryVariations = [
      'pizza San Francisco',
      'pizza San Francisco CA',
      'pizza restaurants San Francisco CA',
      'Pizza restaurant San Francisco CA',
      'pizza in San Francisco',
      'San Francisco pizza'
    ];
    
    for (const query of queryVariations) {
      console.log(`   Testing: "${query}"`);
      
      try {
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query,
            limit: 3,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          }
        });
        
        console.log(`     Status: ${response.data.status}`);
        
        if (response.data.status === 'Pending') {
          // Don't wait for results to save time, just note it's pending
          console.log(`     Request submitted successfully`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.log(`     ❌ Failed: ${error.message}`);
      }
    }
  }

  async testLimitParameters() {
    console.log('   Testing different limit values...');
    
    const limits = [1, 5, 10, 20, 50];
    
    for (const limit of limits) {
      console.log(`   Testing limit: ${limit}`);
      
      try {
        const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
          params: {
            query: 'pizza San Francisco',
            limit,
            language: 'en',
            region: 'US'
          },
          headers: {
            'X-API-KEY': this.apiKey
          }
        });
        
        console.log(`     Status: ${response.data.status}`);
        console.log(`     Request ID: ${response.data.id || 'No ID'}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`     ❌ Failed: ${error.message}`);
      }
    }
  }

  async checkAccountStatus() {
    console.log('   Checking account status and credits...');
    
    try {
      // Try to get account info if the API provides it
      const response = await axios.get('https://api.outscraper.com/profile', {
        headers: {
          'X-API-KEY': this.apiKey
        }
      });
      
      console.log(`   Account info:`, JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log(`   Could not fetch account info: ${error.message}`);
      
      if (error.response) {
        console.log(`   Response status: ${error.response.status}`);
        console.log(`   Response data:`, error.response.data);
        
        if (error.response.status === 401) {
          console.log(`   🚨 AUTHENTICATION ISSUE - Invalid API key`);
        } else if (error.response.status === 402) {
          console.log(`   🚨 PAYMENT REQUIRED - Account may be out of credits`);
        } else if (error.response.status === 429) {
          console.log(`   🚨 RATE LIMIT EXCEEDED`);
        }
      }
    }
  }
}

export async function debugAPIInconsistency() {
  const debugger = new APIInconsistencyDebugger();
  await debugger.debugAPIIssues();
  
  console.log('\n🎯 DEBUGGING COMPLETE');
  console.log('Check the output above to identify the root cause of inconsistency');
}

if (import.meta.url.endsWith(process.argv[1])) {
  debugAPIInconsistency().catch(console.error);
}