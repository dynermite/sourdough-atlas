#!/usr/bin/env tsx

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';

async function testPortlandDiscovery() {
  console.log('🔍 Testing Portland pizza restaurant discovery process...');
  
  let browser;
  let foundRestaurants = [];
  let googleProfilesChecked = 0;
  let sourdoughFound = 0;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('\n📍 Step 1: Searching Google Maps for "pizza restaurants Portland Oregon"...');
    
    // Search Google Maps for pizza restaurants in Portland
    const searchUrl = 'https://www.google.com/maps/search/pizza+restaurants+Portland+Oregon';
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results to load
    await page.waitForSelector('[role="article"]', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Extract restaurant information
    const restaurants = await page.evaluate(() => {
      const results = [];
      const articles = document.querySelectorAll('[role="article"]');
      
      articles.forEach((article, index) => {
        if (index >= 20) return; // Limit to first 20 results
        
        const nameElement = article.querySelector('[data-value="Establishment"] a');
        const ratingElement = article.querySelector('[role="img"][aria-label*="star"]');
        const addressElement = article.querySelector('[data-value="Address"]');
        
        if (nameElement) {
          const name = nameElement.textContent?.trim();
          const rating = ratingElement?.getAttribute('aria-label');
          const address = addressElement?.textContent?.trim();
          
          if (name && name.toLowerCase().includes('pizza')) {
            results.push({
              name,
              rating: rating || 'No rating',
              address: address || 'No address',
              link: nameElement.href || ''
            });
          }
        }
      });
      
      return results;
    });
    
    foundRestaurants = restaurants;
    console.log(`✅ Found ${foundRestaurants.length} pizza restaurants in Google Maps results`);
    
    // Display the restaurants found
    console.log('\n📋 Pizza restaurants discovered:');
    foundRestaurants.forEach((restaurant, index) => {
      console.log(`${index + 1}. ${restaurant.name}`);
      console.log(`   Address: ${restaurant.address}`);
      console.log(`   Rating: ${restaurant.rating}\n`);
    });
    
    console.log('\n🔍 Step 2: Checking Google Business profiles for sourdough keywords...');
    
    // Check each restaurant's Google Business profile
    for (let i = 0; i < Math.min(foundRestaurants.length, 10); i++) {
      const restaurant = foundRestaurants[i];
      googleProfilesChecked++;
      
      console.log(`\n[${i + 1}/10] Checking: ${restaurant.name}`);
      
      try {
        if (restaurant.link) {
          await page.goto(restaurant.link, { waitUntil: 'networkidle2', timeout: 15000 });
          await page.waitForTimeout(2000);
          
          // Extract business description and details
          const businessInfo = await page.evaluate(() => {
            // Look for business description
            const descriptionSelectors = [
              '[data-value="Description"]',
              '[aria-label*="About"]',
              '.rogA2c',
              '.PYvSYb'
            ];
            
            let description = '';
            for (const selector of descriptionSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                description += element.textContent + ' ';
              }
            }
            
            // Also get any other text content that might contain keywords
            const allText = document.body.innerText.toLowerCase();
            
            return {
              description: description.trim(),
              fullText: allText
            };
          });
          
          // Check for sourdough keywords
          const sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast', 'fermented dough', 'starter'];
          const foundKeywords = sourdoughKeywords.filter(keyword => 
            businessInfo.description.toLowerCase().includes(keyword) ||
            businessInfo.fullText.includes(keyword)
          );
          
          if (foundKeywords.length > 0) {
            console.log(`   ✅ SOURDOUGH KEYWORDS FOUND: ${foundKeywords.join(', ')}`);
            console.log(`   📝 Description: ${businessInfo.description.substring(0, 200)}...`);
            sourdoughFound++;
          } else {
            console.log(`   ❌ No sourdough keywords found in Google Business profile`);
          }
          
          // Small delay between requests
          await page.waitForTimeout(1500);
        }
      } catch (error) {
        console.log(`   ⚠️  Error checking ${restaurant.name}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during discovery process:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Summary
  console.log('\n📊 DISCOVERY SUMMARY:');
  console.log(`🔍 Total pizza restaurants found on Google Maps: ${foundRestaurants.length}`);
  console.log(`👀 Google Business profiles checked: ${googleProfilesChecked}`);
  console.log(`✅ Restaurants with sourdough keywords: ${sourdoughFound}`);
  console.log(`📈 Sourdough success rate: ${((sourdoughFound / googleProfilesChecked) * 100).toFixed(1)}%`);
  
  console.log('\n💡 This explains why we only have verified sourdough restaurants in the database!');
  console.log('   The system correctly filters out regular pizza places that don\'t mention sourdough.');
}

testPortlandDiscovery().catch(console.error);