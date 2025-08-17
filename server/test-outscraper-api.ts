#!/usr/bin/env tsx

import axios from 'axios';

async function testOutscraperAPI() {
  const apiKey = process.env.OUTSCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OUTSCRAPER_API_KEY not found');
    return;
  }
  
  console.log('🔧 Testing Outscraper API connection...');
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  
  try {
    // Test with a simple, known query
    const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
      params: {
        query: 'Tartine Bakery San Francisco',
        limit: 1,
        language: 'en',
        region: 'US'
      },
      headers: {
        'X-API-KEY': apiKey
      },
      timeout: 15000
    });
    
    console.log('✅ API Response received');
    console.log('Status:', response.status);
    console.log('Data structure:', response.data);
    
    if (response.data && response.data.data) {
      console.log('📊 Results found:', response.data.data.length);
      if (response.data.data.length > 0) {
        const first = response.data.data[0];
        console.log('First result:', {
          name: first.name,
          address: first.address,
          website: first.website,
          rating: first.rating
        });
      }
    }
    
  } catch (error) {
    console.log('❌ API Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  testOutscraperAPI().catch(console.error);
}