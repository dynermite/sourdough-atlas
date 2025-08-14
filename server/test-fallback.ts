#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';

async function analyzeRestaurant(url: string, restaurantName: string) {
  console.log(`\n🔍 Analyzing ${restaurantName}: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Remove script and style elements
    $('script, style, nav, header, footer').remove();
    
    // Extract text content
    const content = $('body').text().toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Check for sourdough keywords
    const sourdoughKeywords = [
      'sourdough',
      'naturally leavened', 
      'wild yeast',
      'fermented dough',
      'starter',
      'long fermentation',
      'fermented'
    ];
    
    const foundKeywords = sourdoughKeywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    );
    
    console.log(`✅ Keywords found: ${foundKeywords.join(', ') || 'NONE'}`);
    
    if (foundKeywords.length > 0) {
      // Find context around keywords
      foundKeywords.forEach(keyword => {
        const index = content.indexOf(keyword.toLowerCase());
        if (index !== -1) {
          const start = Math.max(0, index - 100);
          const end = Math.min(content.length, index + 100);
          const context = content.substring(start, end);
          console.log(`📝 Context for "${keyword}": ...${context}...`);
        }
      });
    }
    
    // Check if this is in Portland
    const isPortland = content.includes('portland') || content.includes('oregon');
    console.log(`📍 Portland location mentioned: ${isPortland ? 'YES' : 'NO'}`);
    
    return {
      hasKeywords: foundKeywords.length > 0,
      keywords: foundKeywords,
      isPortland
    };
    
  } catch (error) {
    console.log(`❌ Error analyzing ${restaurantName}: ${error.message}`);
    return { hasKeywords: false, keywords: [], isPortland: false };
  }
}

async function main() {
  console.log('🕵️ Investigating why these restaurants were missed...');
  
  const restaurants = [
    { name: 'Paladin Pie', url: 'https://www.paladinpie.com/' },
    { name: 'Pizza Thief', url: 'https://pizzathief.com/about/' }
  ];
  
  for (const restaurant of restaurants) {
    await analyzeRestaurant(restaurant.url, restaurant.name);
  }
  
  console.log('\n💡 Analysis complete!');
  console.log('This will help us understand coverage gaps in our scraping system.');
}

main().catch(console.error);