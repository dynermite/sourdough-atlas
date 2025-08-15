#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface OutscraperCSVRow {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews_count?: number;
  latitude?: number;
  longitude?: number;
  category?: string;
  description?: string;
}

export class OutscraperCSVProcessor {
  private readonly sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'fermented dough',
    'starter',
    'long fermentation',
    'naturally fermented',
    'artisan dough',
    'traditional fermentation'
  ];

  // Process CSV file downloaded from Outscraper website
  async processCSVFile(csvFilePath: string, city: string, state: string): Promise<number> {
    console.log(`Processing Outscraper CSV file: ${csvFilePath}`);
    console.log(`Target city: ${city}, ${state}`);
    
    if (!fs.existsSync(csvFilePath)) {
      console.log(`Error: CSV file not found at ${csvFilePath}`);
      return 0;
    }
    
    // Read and parse CSV
    const restaurants = await this.parseCSV(csvFilePath);
    console.log(`Found ${restaurants.length} restaurants in CSV file`);
    
    if (restaurants.length === 0) {
      console.log('No restaurants found in CSV');
      return 0;
    }
    
    // Verify each restaurant for sourdough
    return await this.verifyAllRestaurantsForSourdough(restaurants, city, state);
  }

  // Parse CSV file (simplified parser)
  private async parseCSV(csvFilePath: string): Promise<OutscraperCSVRow[]> {
    try {
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        console.log('CSV file appears to be empty or malformed');
        return [];
      }
      
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const restaurants: OutscraperCSVRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        
        if (values.length >= headers.length) {
          const restaurant: any = {};
          
          headers.forEach((header, index) => {
            const value = values[index];
            
            // Map common Outscraper CSV columns
            switch (header.toLowerCase()) {
              case 'name':
              case 'title':
                restaurant.name = value;
                break;
              case 'address':
              case 'full_address':
                restaurant.address = value;
                break;
              case 'phone':
              case 'phone_number':
                restaurant.phone = value;
                break;
              case 'website':
              case 'site':
                restaurant.website = value;
                break;
              case 'rating':
              case 'stars':
                restaurant.rating = parseFloat(value) || 0;
                break;
              case 'reviews_count':
              case 'reviews':
                restaurant.reviews_count = parseInt(value) || 0;
                break;
              case 'latitude':
              case 'lat':
                restaurant.latitude = parseFloat(value) || 0;
                break;
              case 'longitude':
              case 'lng':
              case 'lon':
                restaurant.longitude = parseFloat(value) || 0;
                break;
              case 'category':
              case 'categories':
                restaurant.category = value;
                break;
              case 'description':
              case 'about':
                restaurant.description = value;
                break;
            }
          });
          
          if (restaurant.name) {
            restaurants.push(restaurant as OutscraperCSVRow);
          }
        }
      }
      
      console.log(`Parsed ${restaurants.length} restaurants from CSV`);
      return restaurants;
      
    } catch (error) {
      console.log(`Error parsing CSV: ${error.message}`);
      return [];
    }
  }

  // Verify all restaurants for sourdough keywords
  private async verifyAllRestaurantsForSourdough(restaurants: OutscraperCSVRow[], city: string, state: string): Promise<number> {
    console.log(`\nVerifying ${restaurants.length} restaurants for sourdough keywords...`);
    console.log('=' .repeat(60));
    
    let sourdoughCount = 0;
    let processed = 0;
    
    for (const restaurant of restaurants) {
      processed++;
      console.log(`\n[${processed}/${restaurants.length}] ${restaurant.name}`);
      console.log(`  Address: ${restaurant.address}`);
      console.log(`  Website: ${restaurant.website || 'No website'}`);
      console.log(`  Rating: ${restaurant.rating || 'N/A'} (${restaurant.reviews_count || 0} reviews)`);
      
      // Check for sourdough verification
      const verification = await this.verifySourdoughKeywords(restaurant);
      
      if (verification.verified) {
        console.log(`  ✅ SOURDOUGH VERIFIED: ${verification.keywords.join(', ')}`);
        
        const added = await this.addVerifiedSourdoughRestaurant(restaurant, verification, city, state);
        if (added) {
          sourdoughCount++;
        }
      } else {
        console.log(`  ❌ No sourdough keywords found`);
      }
      
      // Rate limiting to be respectful to websites
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\n${'=' .repeat(60)}`);
    console.log(`SOURDOUGH VERIFICATION COMPLETE`);
    console.log(`Total restaurants analyzed: ${processed}`);
    console.log(`Sourdough restaurants found: ${sourdoughCount}`);
    console.log(`Sourdough adoption rate: ${((sourdoughCount / processed) * 100).toFixed(1)}%`);
    
    return sourdoughCount;
  }

  // Verify individual restaurant for sourdough keywords
  private async verifySourdoughKeywords(restaurant: OutscraperCSVRow): Promise<{verified: boolean, keywords: string[], description: string}> {
    const foundKeywords: string[] = [];
    let description = '';
    
    // Check Outscraper description first
    if (restaurant.description) {
      const descKeywords = this.sourdoughKeywords.filter(keyword => 
        restaurant.description!.toLowerCase().includes(keyword.toLowerCase())
      );
      foundKeywords.push(...descKeywords);
      
      if (descKeywords.length > 0) {
        description = restaurant.description.substring(0, 200);
        console.log(`    Found in description: ${descKeywords.join(', ')}`);
      }
    }
    
    // If no keywords found and restaurant has website, check website
    if (foundKeywords.length === 0 && restaurant.website && restaurant.website !== 'N/A') {
      console.log(`    Checking website for sourdough keywords...`);
      const websiteVerification = await this.analyzeRestaurantWebsite(restaurant.website);
      foundKeywords.push(...websiteVerification.keywords);
      
      if (websiteVerification.description) {
        description = websiteVerification.description;
      }
    }
    
    return {
      verified: foundKeywords.length > 0,
      keywords: [...new Set(foundKeywords)], // Remove duplicates
      description
    };
  }

  // Analyze restaurant website for sourdough keywords
  private async analyzeRestaurantWebsite(websiteUrl: string): Promise<{keywords: string[], description: string}> {
    try {
      // Clean up URL
      let cleanUrl = websiteUrl.trim();
      if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      const response = await axios.get(cleanUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove non-content elements
      $('script, style, nav, header, footer, .nav, .navigation, .cookie, .popup').remove();
      
      // Focus on content areas that typically contain menu/description
      const contentAreas = [
        'main', '.main', '.content', '.about', '.menu', '.description',
        '.story', '.our-story', '.food', '.pizza', '.specialty', '.ingredients'
      ].map(selector => $(selector).text()).join(' ');
      
      const fullContent = $('body').text();
      const combinedContent = (contentAreas + ' ' + fullContent).toLowerCase().replace(/\s+/g, ' ');
      
      // Find sourdough keywords
      const foundKeywords = this.sourdoughKeywords.filter(keyword => 
        combinedContent.includes(keyword.toLowerCase())
      );
      
      // Extract context around keywords for description
      let description = '';
      if (foundKeywords.length > 0) {
        console.log(`      Found on website: ${foundKeywords.join(', ')}`);
        
        foundKeywords.forEach(keyword => {
          const index = combinedContent.indexOf(keyword.toLowerCase());
          if (index !== -1 && description.length < 300) {
            const start = Math.max(0, index - 75);
            const end = Math.min(combinedContent.length, index + 200);
            const context = combinedContent.substring(start, end).trim();
            description += context + ' ';
          }
        });
      }
      
      return {
        keywords: foundKeywords,
        description: description.trim().substring(0, 400)
      };
      
    } catch (error) {
      console.log(`      Website check failed: ${error.message}`);
      return { keywords: [], description: '' };
    }
  }

  // Add verified sourdough restaurant to database
  private async addVerifiedSourdoughRestaurant(
    restaurant: OutscraperCSVRow, 
    verification: {keywords: string[], description: string}, 
    city: string, 
    state: string
  ): Promise<boolean> {
    try {
      // Check if restaurant already exists
      const existing = await db.select().from(restaurants)
        .where(eq(restaurants.name, restaurant.name));
      
      if (existing.length > 0) {
        console.log(`    Restaurant already exists in database, skipping`);
        return false;
      }

      const restaurantData = {
        name: restaurant.name,
        address: restaurant.address || '',
        city: city,
        state: state,
        zipCode: restaurant.address?.match(/\d{5}/)?.[0] || '',
        phone: restaurant.phone || '',
        website: restaurant.website || '',
        description: verification.description || `Verified sourdough keywords: ${verification.keywords.join(', ')}`,
        sourdoughVerified: 1,
        sourdoughKeywords: verification.keywords,
        rating: restaurant.rating || 0,
        reviewCount: restaurant.reviews_count || 0,
        latitude: restaurant.latitude || 0,
        longitude: restaurant.longitude || 0,
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400",
        reviews: [`Verified via Outscraper CSV: ${verification.keywords.join(', ')}`]
      };

      await db.insert(restaurants).values(restaurantData);
      console.log(`    ✅ ADDED TO DATABASE`);
      
      return true;
      
    } catch (error) {
      console.log(`    Failed to add to database: ${error.message}`);
      return false;
    }
  }

  // Instructions for using Outscraper website
  displayInstructions(): void {
    console.log('📋 OUTSCRAPER WEBSITE USAGE INSTRUCTIONS');
    console.log('=' .repeat(50));
    
    console.log('\n1. 🔍 Go to outscraper.com/google-maps-scraper');
    console.log('\n2. 📝 Set up your search:');
    console.log('   Categories: "Pizza Restaurant"');
    console.log('   Locations: "San Francisco, CA" (or your target city)');
    console.log('   ✅ Check "Custom locations" if available');
    
    console.log('\n3. 🎯 Run the search');
    console.log('   Expected results: ~180 restaurants for San Francisco');
    console.log('   Cost: $0.001 per city');
    
    console.log('\n4. 📥 Download results as CSV');
    console.log('   Save to your computer');
    
    console.log('\n5. 🎯 Upload CSV and run verification:');
    console.log('   Place CSV file in project folder');
    console.log('   Run: tsx outscraper-csv-processor.ts');
    
    console.log('\n📊 EXPECTED WORKFLOW:');
    console.log('   Outscraper finds ALL pizza restaurants');
    console.log('   Our system verifies which use sourdough');
    console.log('   Only sourdough restaurants added to database');
    console.log('   Get real adoption rate percentages');
  }
}

// Main execution function for testing
async function main() {
  const processor = new OutscraperCSVProcessor();
  
  processor.displayInstructions();
  
  console.log('\n🔍 To process a CSV file:');
  console.log('1. Download pizza restaurant data from Outscraper');
  console.log('2. Save CSV file to project folder');
  console.log('3. Run: tsx outscraper-csv-processor.ts [csv-file-path] [city] [state]');
  
  // Example usage if CSV file is provided
  const csvFile = process.argv[2];
  const city = process.argv[3];
  const state = process.argv[4];
  
  if (csvFile && city && state) {
    console.log(`\n🚀 Processing ${csvFile} for ${city}, ${state}...`);
    const results = await processor.processCSVFile(csvFile, city, state);
    console.log(`\n✅ Processing complete: ${results} sourdough restaurants added`);
  }
}

main().catch(console.error);