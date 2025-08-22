#!/usr/bin/env tsx

import axios from 'axios';

async function debugOutscraperData() {
  const outscraper_api_key = process.env.OUTSCRAPER_API_KEY!;
  
  console.log('🔍 Testing Outscraper API data structure...');
  
  try {
    const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
      params: {
        query: 'sourdough pizza San Francisco CA',
        language: 'en',
        region: 'US',
        limit: 3, // Just get a few results to examine structure
        async: false
      },
      headers: {
        'X-API-KEY': outscraper_api_key
      },
      timeout: 30000
    });

    console.log('📊 Raw API Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      const results = response.data.data.flat();
      console.log(`\n🎯 Found ${results.length} results`);
      
      if (results.length > 0) {
        console.log('\n📋 First result structure:');
        const firstResult = results[0];
        console.log('Available fields:', Object.keys(firstResult));
        console.log('\nField values:');
        Object.entries(firstResult).forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugOutscraperData().catch(console.error);