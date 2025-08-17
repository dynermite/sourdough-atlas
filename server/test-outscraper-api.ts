#!/usr/bin/env tsx

import axios from 'axios';

class OutscraperAPITest {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async testDirectAPICall() {
    console.log('🔍 OUTSCRAPER API DIRECT TEST');
    console.log('=' .repeat(50));
    
    if (!this.apiKey) {
      console.log('❌ No API key found');
      return;
    }
    
    console.log('✅ API key found');
    console.log('🔍 Testing with simple query: "Tony\'s Little Star Pizza San Francisco"');
    
    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: "Tony's Little Star Pizza San Francisco",
          limit: 3,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      console.log('\n📊 INITIAL RESPONSE:');
      console.log('Status:', response.data.status);
      console.log('Response keys:', Object.keys(response.data));
      
      if (response.data.status === 'Pending') {
        console.log('⏳ Request is pending, waiting for results...');
        console.log('Request ID:', response.data.id);
        
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        console.log('\n🔄 Fetching results...');
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        console.log('\n📊 FINAL RESPONSE:');
        console.log('Status:', resultResponse.data.status);
        console.log('Response keys:', Object.keys(resultResponse.data));
        
        if (resultResponse.data.status === 'Success') {
          console.log('\n✅ SUCCESS! Data structure:');
          console.log('Data type:', typeof resultResponse.data.data);
          console.log('Data is array:', Array.isArray(resultResponse.data.data));
          
          if (resultResponse.data.data && Array.isArray(resultResponse.data.data)) {
            console.log('Number of results:', resultResponse.data.data.length);
            
            if (resultResponse.data.data.length > 0) {
              const firstResult = resultResponse.data.data[0];
              console.log('\n🔍 FIRST RESULT STRUCTURE:');
              console.log('Keys:', Object.keys(firstResult));
              console.log('Name:', firstResult.name);
              console.log('Address:', firstResult.address);
              console.log('Website:', firstResult.website);
              console.log('Description:', firstResult.description?.substring(0, 150));
              console.log('Categories:', firstResult.categories);
              console.log('Rating:', firstResult.rating);
              console.log('Phone:', firstResult.phone);
              
              console.log('\n📋 COMPLETE FIRST RESULT:');
              console.log(JSON.stringify(firstResult, null, 2));
            }
          } else {
            console.log('❌ No data array found');
            console.log('Raw data:', resultResponse.data.data);
          }
        } else {
          console.log('❌ Request failed');
          console.log('Error:', resultResponse.data.error || 'Unknown error');
        }
      } else {
        console.log('❌ Unexpected initial status:', response.data.status);
        console.log('Full response:', JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ API Error:', error.message);
      if (error.response) {
        console.log('Error status:', error.response.status);
        console.log('Error data:', error.response.data);
      }
    }
  }

  async testPizzaSearch() {
    console.log('\n\n🍕 TESTING PIZZA SEARCH');
    console.log('=' .repeat(50));
    console.log('🔍 Query: "pizza San Francisco CA"');
    
    try {
      const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
        params: {
          query: "pizza San Francisco CA",
          limit: 5,
          language: 'en',
          region: 'US'
        },
        headers: {
          'X-API-KEY': this.apiKey
        }
      });

      if (response.data.status === 'Pending') {
        console.log('⏳ Request pending...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${response.data.id}`, {
          headers: {
            'X-API-KEY': this.apiKey
          }
        });

        if (resultResponse.data.status === 'Success' && resultResponse.data.data) {
          const results = resultResponse.data.data;
          console.log(`✅ Found ${results.length} pizza places`);
          
          results.forEach((place, index) => {
            console.log(`\n${index + 1}. ${place.name || 'NO NAME'}`);
            console.log(`   Address: ${place.address || 'NO ADDRESS'}`);
            console.log(`   Categories: ${place.categories?.join(', ') || 'NO CATEGORIES'}`);
            console.log(`   Description: ${place.description?.substring(0, 100) || 'NO DESCRIPTION'}...`);
            console.log(`   Website: ${place.website || 'NO WEBSITE'}`);
          });
        }
      }
      
    } catch (error) {
      console.log('❌ Pizza search error:', error.message);
    }
  }
}

export async function testOutscraperAPI() {
  const tester = new OutscraperAPITest();
  
  await tester.testDirectAPICall();
  await tester.testPizzaSearch();
  
  console.log('\n✅ API testing complete');
}

if (import.meta.url.endsWith(process.argv[1])) {
  testOutscraperAPI().catch(console.error);
}