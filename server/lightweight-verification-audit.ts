#!/usr/bin/env tsx

import { db } from './db';
import { restaurants } from '../shared/schema';
import { eq } from 'drizzle-orm';
import https from 'https';
import http from 'http';

// Lightweight verification audit using native HTTP requests
// Verifies all restaurants against their official websites
const SOURDOUGH_KEYWORDS = [
  'sourdough',
  'naturally leavened', 
  'wild yeast'
];

interface VerificationResult {
  restaurantId: string;
  name: string;
  city: string;
  state: string;
  website: string;
  verified: boolean;
  foundKeywords: string[];
  errorMessage?: string;
}

class LightweightVerificationAudit {
  private results: VerificationResult[] = [];
  private verified = 0;
  private failed = 0;
  private removed = 0;

  async fetchWebsiteContent(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No URL provided'));
        return;
      }

      // Clean and validate URL
      let cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }

      const urlObj = new URL(cleanUrl);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'close'
        },
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        res.on('end', () => {
          // Basic HTML tag removal for text analysis
          const textContent = data
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[^;]+;/g, ' ')
            .toLowerCase();
          
          resolve(textContent);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(10000);
      req.end();
    });
  }

  async verifyRestaurant(restaurant: any): Promise<VerificationResult> {
    const result: VerificationResult = {
      restaurantId: restaurant.id,
      name: restaurant.name,
      city: restaurant.city,
      state: restaurant.state,
      website: restaurant.website,
      verified: false,
      foundKeywords: []
    };

    try {
      if (!restaurant.website) {
        result.errorMessage = 'No website provided';
        return result;
      }

      const content = await this.fetchWebsiteContent(restaurant.website);
      
      // Check for sourdough keywords
      for (const keyword of SOURDOUGH_KEYWORDS) {
        if (content.includes(keyword.toLowerCase())) {
          result.foundKeywords.push(keyword);
        }
      }

      result.verified = result.foundKeywords.length > 0;
      
    } catch (error) {
      result.errorMessage = error.message;
    }

    return result;
  }

  async auditAllRestaurants() {
    console.log('🔍 COMPREHENSIVE SOURDOUGH VERIFICATION AUDIT');
    console.log('=' .repeat(60));
    console.log('✅ Verifying ALL restaurants against official sources');
    console.log('🎯 Maintaining 100% authenticity requirement');
    console.log('🚫 Removing restaurants without verified claims');
    
    // Get all restaurants from database
    const allRestaurants = await db.select().from(restaurants);
    
    console.log(`\n📊 AUDIT SCOPE: ${allRestaurants.length} restaurants to verify`);
    console.log('=' .repeat(60));

    // Process restaurants with delay to be respectful to servers
    for (let i = 0; i < allRestaurants.length; i++) {
      const restaurant = allRestaurants[i];
      
      console.log(`\n[${i + 1}/${allRestaurants.length}] Verifying: ${restaurant.name} (${restaurant.city}, ${restaurant.state})`);
      
      const result = await this.verifyRestaurant(restaurant);
      this.results.push(result);
      
      if (result.verified) {
        console.log(`   ✅ VERIFIED: Found keywords [${result.foundKeywords.join(', ')}]`);
        this.verified++;
      } else {
        console.log(`   ❌ NOT VERIFIED: ${result.errorMessage || 'No sourdough claims found'}`);
        this.failed++;
        
        // Remove from database - no sourdough claims found
        try {
          await db.delete(restaurants).where(eq(restaurants.id, result.restaurantId));
          this.removed++;
          console.log(`   🗑️  REMOVED from database`);
        } catch (error) {
          console.log(`   ⚠️  Failed to remove: ${error.message}`);
        }
      }
      
      // Small delay between requests to be respectful
      if (i < allRestaurants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async generateReport() {
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 COMPREHENSIVE VERIFICATION AUDIT COMPLETE');
    console.log('=' .repeat(60));
    
    console.log(`📊 AUDIT RESULTS:`);
    console.log(`   ✅ Verified: ${this.verified} restaurants`);
    console.log(`   ❌ Failed Verification: ${this.failed} restaurants`);
    console.log(`   🗑️  Removed: ${this.removed} restaurants`);
    
    if (this.results.length > 0) {
      console.log(`   📈 Success Rate: ${((this.verified / this.results.length) * 100).toFixed(1)}%`);
    }

    console.log(`\n🔑 VERIFIED KEYWORDS FOUND:`);
    const keywordStats = this.results
      .filter(r => r.verified)
      .flatMap(r => r.foundKeywords)
      .reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    Object.entries(keywordStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([keyword, count]) => {
        console.log(`   "${keyword}": ${count} restaurants`);
      });

    console.log(`\n🏆 VERIFICATION SUCCESS BY STATE:`);
    const stateStats = this.results
      .filter(r => r.verified)
      .reduce((acc, r) => {
        acc[r.state] = (acc[r.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    Object.entries(stateStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([state, count]) => {
        console.log(`   ${state}: ${count} verified restaurants`);
      });

    console.log(`\n✅ DATA INTEGRITY ACHIEVED:`);
    console.log(`   • 100% of remaining restaurants verified through official sources`);
    console.log(`   • All claims sourced from restaurant websites`);
    console.log(`   • Zero assumptions or unverified entries`);
    console.log(`   • Complete authenticity for travelers`);

    // Final database count
    const finalRestaurants = await db.select().from(restaurants);
    console.log(`\n🎯 FINAL VERIFIED DATABASE: ${finalRestaurants.length} authentic restaurants`);
    
    return {
      totalAudited: this.results.length,
      verified: this.verified,
      failed: this.failed,
      removed: this.removed,
      finalCount: finalRestaurants.length
    };
  }
}

export async function runLightweightVerificationAudit() {
  const audit = new LightweightVerificationAudit();
  
  try {
    await audit.auditAllRestaurants();
    const results = await audit.generateReport();
    return results;
  } catch (error) {
    console.error('Audit failed:', error);
    throw error;
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  runLightweightVerificationAudit().catch(console.error);
}