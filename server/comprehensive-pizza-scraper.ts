#!/usr/bin/env tsx

import puppeteer from 'puppeteer';
import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface PizzaRestaurant {
  name: string;
  address: string;
  rating: string;
  googleUrl: string;
  website?: string;
  phone?: string;
  description?: string;
}

export class ComprehensivePizzaScraper {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'fermented'
  ];

  async scrapeAllPizzaRestaurants(city: string, state: string): Promise<number> {
    console.log(`🍕 Comprehensive pizza restaurant discovery for ${city}, ${state}`);
    console.log('Using Google Maps Pizza category to find ALL pizza restaurants...');
    
    let browser;
    let totalFound = 0;
    let sourdoughVerified = 0;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Use Google Maps search with Pizza category
      const searchUrl = `https://www.google.com/maps/search/pizza/@45.5152,-122.6784,12z/data=!3m1!4b1!4m2!2m1!6e1`;
      const citySearchUrl = `https://www.google.com/maps/search/pizza+${encodeURIComponent(city)}+${encodeURIComponent(state)}`;
      
      console.log('🔍 Navigating to Google Maps pizza search...');
      await page.goto(citySearchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      // Wait for search results
      await page.waitForSelector('[role="article"]', { timeout: 15000 });
      
      console.log('📜 Scrolling to load ALL pizza restaurants...');
      
      // Scroll to load more results
      let previousHeight = 0;
      let scrollAttempts = 0;
      const maxScrollAttempts = 10;
      
      while (scrollAttempts < maxScrollAttempts) {
        // Scroll down the results panel
        await page.evaluate(() => {
          const resultsPanel = document.querySelector('[role="main"]');
          if (resultsPanel) {
            resultsPanel.scrollTop = resultsPanel.scrollHeight;
          }
        });
        
        await page.waitForTimeout(2000);
        
        // Check if new content loaded
        const currentHeight = await page.evaluate(() => {
          const resultsPanel = document.querySelector('[role="main"]');
          return resultsPanel ? resultsPanel.scrollHeight : 0;
        });
        
        if (currentHeight === previousHeight) {
          scrollAttempts++;
        } else {
          scrollAttempts = 0; // Reset if we found new content
        }
        
        previousHeight = currentHeight;
        console.log(`   Scroll attempt ${scrollAttempts}/10, height: ${currentHeight}`);
      }
      
      console.log('✅ Finished loading all pizza restaurants');
      
      // Extract all pizza restaurants
      const pizzaRestaurants = await page.evaluate(() => {
        const results: any[] = [];
        const articles = document.querySelectorAll('[role="article"]');
        
        articles.forEach((article, index) => {
          try {
            const nameElement = article.querySelector('a[data-value="Establishment"]');
            const addressElement = article.querySelector('[data-value="Address"]');
            const ratingElement = article.querySelector('[role="img"][aria-label*="star"]');
            const linkElement = article.querySelector('a[data-value="Establishment"]');
            
            if (nameElement && nameElement.textContent) {
              const name = nameElement.textContent.trim();
              const address = addressElement?.textContent?.trim() || '';
              const rating = ratingElement?.getAttribute('aria-label') || 'No rating';
              const googleUrl = linkElement?.getAttribute('href') || '';
              
              // Include ALL establishments from pizza search, regardless of name
              results.push({
                name,
                address,
                rating,
                googleUrl,
                index
              });
            }
          } catch (error) {
            console.log('Error processing restaurant:', error);
          }
        });
        
        return results;
      });
      
      totalFound = pizzaRestaurants.length;
      console.log(`🎯 Found ${totalFound} total pizza restaurants in ${city}`);
      
      if (totalFound === 0) {
        console.log('❌ No pizza restaurants found');
        return 0;
      }
      
      console.log('\n🔍 Analyzing each restaurant for sourdough verification...');
      
      // Process each restaurant
      for (let i = 0; i < Math.min(totalFound, 50); i++) { // Process up to 50 restaurants
        const restaurant = pizzaRestaurants[i];
        console.log(`\n[${i + 1}/${Math.min(totalFound, 50)}] 🍕 ${restaurant.name}`);
        console.log(`   📍 ${restaurant.address}`);
        console.log(`   ⭐ ${restaurant.rating}`);
        
        try {
          // Check Google Business profile for sourdough keywords
          const googleInfo = await this.analyzeGoogleBusinessProfile(page, restaurant);
          
          // Check restaurant website if available
          let websiteInfo = { verified: false, keywords: [], description: '' };
          if (googleInfo.website) {
            websiteInfo = await this.analyzeRestaurantWebsite(googleInfo.website);
          }
          
          // Combine verification from both sources
          const allKeywords = [...new Set([...googleInfo.keywords, ...websiteInfo.keywords])];
          const isVerified = googleInfo.verified || websiteInfo.verified;
          
          if (isVerified && allKeywords.length > 0) {
            console.log(`   ✅ SOURDOUGH VERIFIED: ${allKeywords.join(', ')}`);
            
            const added = await this.addVerifiedRestaurant({
              name: restaurant.name,
              address: restaurant.address,
              rating: restaurant.rating,
              googleUrl: restaurant.googleUrl,
              website: googleInfo.website,
              phone: googleInfo.phone,
              description: googleInfo.description || websiteInfo.description
            }, allKeywords, city, state);
            
            if (added) {
              sourdoughVerified++;
            }
          } else {
            console.log(`   ❌ No sourdough verification found`);
          }
          
          // Rate limiting
          await page.waitForTimeout(1500);
          
        } catch (error) {
          console.log(`   ⚠️  Error analyzing ${restaurant.name}: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    console.log(`\n📊 COMPREHENSIVE SEARCH RESULTS:`);
    console.log(`🔍 Total pizza restaurants found: ${totalFound}`);
    console.log(`🍕 Restaurants analyzed: ${Math.min(totalFound, 50)}`);
    console.log(`✅ Verified sourdough restaurants: ${sourdoughVerified}`);
    console.log(`📈 Sourdough success rate: ${((sourdoughVerified / Math.min(totalFound, 50)) * 100).toFixed(1)}%`);
    
    return sourdoughVerified;
  }

  async analyzeGoogleBusinessProfile(page: any, restaurant: PizzaRestaurant): Promise<{verified: boolean, keywords: string[], description: string, website?: string, phone?: string}> {
    try {
      if (restaurant.googleUrl) {
        await page.goto(restaurant.googleUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForTimeout(2000);
        
        const businessInfo = await page.evaluate(() => {
          // Extract business description and details
          const descriptionSelectors = [
            '[data-value="Description"]',
            '[aria-label*="About"]',
            '.rogA2c',
            '.PYvSYb',
            '.lMbq3e'
          ];
          
          let description = '';
          for (const selector of descriptionSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el.textContent) {
                description += el.textContent + ' ';
              }
            });
          }
          
          // Look for website
          const websiteElement = document.querySelector('[data-value="Website"] a');
          const website = websiteElement?.getAttribute('href') || '';
          
          // Look for phone
          const phoneElement = document.querySelector('[data-value="Phone number"]');
          const phone = phoneElement?.textContent?.trim() || '';
          
          // Get all text content for keyword search
          const allText = document.body.innerText.toLowerCase();
          
          return {
            description: description.trim(),
            website,
            phone,
            fullText: allText
          };
        });
        
        // Check for sourdough keywords
        const foundKeywords = this.sourdoughKeywords.filter(keyword => 
          businessInfo.description.toLowerCase().includes(keyword) ||
          businessInfo.fullText.includes(keyword)
        );
        
        return {
          verified: foundKeywords.length > 0,
          keywords: foundKeywords,
          description: businessInfo.description,
          website: businessInfo.website,
          phone: businessInfo.phone
        };
      }
    } catch (error) {
      console.log(`     ⚠️  Google profile analysis failed: ${error.message}`);
    }
    
    return { verified: false, keywords: [], description: '' };
  }

  async analyzeRestaurantWebsite(websiteUrl: string): Promise<{verified: boolean, keywords: string[], description: string}> {
    try {
      const response = await axios.get(websiteUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      $('script, style, nav, header, footer').remove();
      
      const content = $('body').text().toLowerCase().replace(/\s+/g, ' ').trim();
      
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        content.includes(keyword.toLowerCase())
      );
      
      if (foundKeywords.length > 0) {
        // Extract context around keywords
        let description = '';
        foundKeywords.forEach(keyword => {
          const index = content.indexOf(keyword.toLowerCase());
          if (index !== -1 && description.length < 200) {
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + 150);
            description += content.substring(start, end).trim() + ' ';
          }
        });
        
        return {
          verified: true,
          keywords: foundKeywords,
          description: description.trim().substring(0, 300)
        };
      }
      
    } catch (error) {
      console.log(`     ⚠️  Website analysis failed: ${error.message}`);
    }
    
    return { verified: false, keywords: [], description: '' };
  }

  async addVerifiedRestaurant(restaurant: PizzaRestaurant, keywords: string[], city: string, state: string): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`     🔄 ${restaurant.name} already exists, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address,
        city: city,
        state: state,
        zipCode: restaurant.address.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: restaurant.description || `Verified sourdough keywords: ${keywords.join(', ')}`,
        sourdoughVerified: 1,
        sourdoughKeywords: keywords,
        rating: 0,
        reviewCount: 0,
        latitude: 45.5152, // Default Portland coordinates
        longitude: -122.6784,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified sourdough restaurant: ${keywords.join(', ')}`]
      };

      await db.insert(restaurants).values(restaurantData);
      console.log(`     ✅ ADDED TO DATABASE: ${restaurant.name}`);
      
      return true;
      
    } catch (error) {
      console.log(`     ❌ Failed to add ${restaurant.name}: ${error.message}`);
      return false;
    }
  }
}

// Main execution
async function main() {
  const scraper = new ComprehensivePizzaScraper();
  
  console.log('🚀 Starting comprehensive pizza restaurant discovery...');
  console.log('This will find ALL pizza restaurants using Google Maps category search');
  
  const addedCount = await scraper.scrapeAllPizzaRestaurants('Portland', 'Oregon');
  
  console.log(`\n🎉 Comprehensive discovery complete!`);
  console.log(`Added ${addedCount} verified sourdough restaurants to database`);
}

main().catch(console.error);