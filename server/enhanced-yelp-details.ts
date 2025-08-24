#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import { restaurants } from '@shared/schema';
import type { InsertRestaurant } from '@shared/schema';

class EnhancedYelpDetails {
  private yelp_api_key: string;
  private sourdoughKeywords = [
    'sourdough',
    'naturally leavened', 
    'wild yeast',
    'naturally fermented'
  ];

  // Promising Portland pizza places to investigate
  private targetEstablishments = [
    'Ken\'s Artisan Pizza',
    '48 North Pizzeria', 
    'Paladin Pie',
    'Bull Run Pizza',
    'Mucca Pizzeria',
    'Pizza Creature',
    'Double Mountain',
    'Scottie\'s Pizza Parlor'
  ];

  constructor() {
    this.yelp_api_key = process.env.YELP_API_KEY!;
    if (!this.yelp_api_key) {
      throw new Error('YELP_API_KEY is required');
    }
  }

  private containsSourdoughKeywords(text: string): boolean {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return this.sourdoughKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  private async getYelpBusinessDetails(businessId: string): Promise<any> {
    try {
      const response = await axios.get(`https://api.yelp.com/v3/businesses/${businessId}`, {
        headers: {
          'Authorization': `Bearer ${this.yelp_api_key}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      console.log(`   ⚠️  Failed to get business details: ${error.message}`);
      return null;
    }
  }

  private async scrapeWebsiteForSourdough(url: string): Promise<{ 
    hasSourdough: boolean; 
    content?: string; 
  }> {
    try {
      console.log(`     🌐 Checking website: ${url}`);
      
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const response = await axios.get(cleanUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      $('script, style, noscript').remove();
      
      const bodyText = $('body').text();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const title = $('title').text() || '';
      
      const allContent = `${title} ${metaDescription} ${bodyText}`.toLowerCase();
      const hasSourdough = this.containsSourdoughKeywords(allContent);
      
      return {
        hasSourdough,
        content: hasSourdough ? allContent.substring(0, 300) : undefined
      };

    } catch (error: any) {
      console.log(`     ⚠️  Website check failed: ${error.message}`);
      return { hasSourdough: false };
    }
  }

  private async searchAndInvestigateTargets(): Promise<number> {
    console.log(`\n🔍 Investigating ${this.targetEstablishments.length} promising Portland pizza establishments...`);
    
    let verifiedCount = 0;

    for (const businessName of this.targetEstablishments) {
      console.log(`\n🍕 Investigating: ${businessName}`);
      
      try {
        // Search for the specific business
        const searchResponse = await axios.get('https://api.yelp.com/v3/businesses/search', {
          headers: {
            'Authorization': `Bearer ${this.yelp_api_key}`,
            'Accept': 'application/json'
          },
          params: {
            term: businessName,
            location: 'Portland, OR',
            categories: 'pizza',
            limit: 5
          },
          timeout: 10000
        });

        if (!searchResponse.data.businesses || searchResponse.data.businesses.length === 0) {
          console.log('   ❌ Not found on Yelp');
          continue;
        }

        // Find exact or closest match
        const business = searchResponse.data.businesses.find((b: any) => 
          b.name.toLowerCase().includes(businessName.toLowerCase()) ||
          businessName.toLowerCase().includes(b.name.toLowerCase())
        ) || searchResponse.data.businesses[0];

        console.log(`   📍 Found: ${business.name}`);
        console.log(`   📍 Address: ${business.location.display_address.join(', ')}`);
        console.log(`   ⭐ Rating: ${business.rating} (${business.review_count} reviews)`);

        // Get detailed business information
        const businessDetails = await this.getYelpBusinessDetails(business.id);
        
        let isVerified = false;
        let verificationSource = '';
        let verificationContent = '';
        let websiteUrl = '';

        // Check if business name suggests sourdough/artisan
        if (this.containsSourdoughKeywords(business.name)) {
          isVerified = true;
          verificationSource = 'Business Name';
          verificationContent = business.name;
          console.log(`   ✅ SOURDOUGH keywords in business name!`);
        }
        
        // Get website URL if available
        if (businessDetails && businessDetails.url) {
          // Try to find the actual website URL from Yelp page
          console.log(`   🔗 Yelp URL: ${businessDetails.url}`);
          
          // Some businesses have their website in Yelp details
          if (businessDetails.website) {
            websiteUrl = businessDetails.website;
          }
          
          // Try common website patterns
          const businessNameForUrl = business.name.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/pizza|parlor|pie|kitchen/g, '');
          
          const possibleUrls = [
            `https://www.${businessNameForUrl}.com`,
            `https://${businessNameForUrl}.com`,
            `https://www.${businessNameForUrl}pizza.com`,
            `https://${businessNameForUrl}pizza.com`
          ];

          // Try the most likely website patterns
          for (const url of possibleUrls) {
            try {
              console.log(`   🔍 Trying: ${url}`);
              const testResponse = await axios.head(url, { timeout: 5000 });
              if (testResponse.status === 200) {
                websiteUrl = url;
                console.log(`   ✅ Found website: ${url}`);
                break;
              }
            } catch (error) {
              // Website doesn't exist or is not accessible
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Check website for sourdough if found and not already verified
        if (!isVerified && websiteUrl) {
          const websiteResult = await this.scrapeWebsiteForSourdough(websiteUrl);
          if (websiteResult.hasSourdough) {
            isVerified = true;
            verificationSource = 'Restaurant Website';
            verificationContent = websiteResult.content || '';
            console.log(`   ✅ SOURDOUGH FOUND on website!`);
          }
        }

        if (!isVerified) {
          console.log(`   ❌ No sourdough verification found`);
        }

        // Save verified establishments
        if (isVerified) {
          try {
            const insertData: InsertRestaurant = {
              name: business.name,
              address: business.location.display_address.join(', '),
              phone: business.phone || null,
              website: websiteUrl || businessDetails?.url || null,
              latitude: business.coordinates?.latitude || 45.5152,
              longitude: business.coordinates?.longitude || -122.6784,
              description: `Verified sourdough pizza from ${verificationSource}: ${verificationContent?.substring(0, 200)}...`,
              cuisine: 'Italian',
              priceRange: business.price || '$-$$',
              rating: business.rating || null,
              city: 'Portland',
              state: 'OR'
            };

            await db.insert(restaurants).values(insertData);
            console.log(`   💾 SAVED to database`);
            verifiedCount++;
            
          } catch (error: any) {
            if (error.message?.includes('duplicate')) {
              console.log(`   ⚠️  Already exists in database`);
            } else {
              console.error(`   ❌ Error saving: ${error.message}`);
            }
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error: any) {
        console.error(`   ❌ Error investigating ${businessName}: ${error.message}`);
      }
    }

    return verifiedCount;
  }

  async executeEnhancedInvestigation(): Promise<number> {
    console.log(`\n🚀 ENHANCED YELP INVESTIGATION - Portland, OR`);
    console.log('📋 Strategy: Investigate promising establishments + get detailed business info');
    
    try {
      const verifiedCount = await this.searchAndInvestigateTargets();

      console.log(`\n📊 ENHANCED INVESTIGATION COMPLETE`);
      console.log(`🔍 Establishments investigated: ${this.targetEstablishments.length}`);
      console.log(`✅ Additional verified sourdough restaurants: ${verifiedCount}`);

      return verifiedCount;

    } catch (error: any) {
      console.error('❌ Enhanced investigation failed:', error.message);
      throw error;
    }
  }
}

// Execute directly
const investigator = new EnhancedYelpDetails();
investigator.executeEnhancedInvestigation()
  .then((count) => {
    console.log(`\n✅ Enhanced Yelp investigation completed!`);
    console.log(`🥖 Found and verified ${count} additional sourdough pizza restaurants`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Investigation failed:', error);
    process.exit(1);
  });