import axios from 'axios';
import * as cheerio from 'cheerio';

interface SocialMediaProfile {
  platform: 'instagram' | 'facebook';
  username: string;
  url: string;
  bio?: string;
  hasSourdoughKeywords: boolean;
  foundKeywords: string[];
}

interface RestaurantSocialMedia {
  name: string;
  address: string;
  socialProfiles: SocialMediaProfile[];
  totalSourdoughProfiles: number;
}

export class SocialMediaDiscovery {
  private sourdoughKeywords = ['sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'];

  /**
   * Discover social media profiles for a restaurant using multiple methods
   */
  async findRestaurantSocialMedia(restaurantName: string, address: string, website?: string): Promise<RestaurantSocialMedia> {
    console.log(`🔍 Discovering social media for: ${restaurantName}`);
    
    const profiles: SocialMediaProfile[] = [];
    
    // Method 1: Check restaurant website for social media links
    if (website) {
      const websiteProfiles = await this.extractSocialFromWebsite(website);
      profiles.push(...websiteProfiles);
    }
    
    // Method 2: Direct Instagram search patterns
    const instagramProfiles = await this.searchInstagramProfiles(restaurantName, address);
    profiles.push(...instagramProfiles);
    
    // Method 3: Direct Facebook search patterns
    const facebookProfiles = await this.searchFacebookProfiles(restaurantName, address);
    profiles.push(...facebookProfiles);
    
    // Method 4: Google search for social media mentions
    const googleFoundProfiles = await this.googleSearchSocialMedia(restaurantName, address);
    profiles.push(...googleFoundProfiles);
    
    // Remove duplicates
    const uniqueProfiles = this.removeDuplicateProfiles(profiles);
    
    // Check each profile for sourdough keywords
    for (const profile of uniqueProfiles) {
      await this.checkProfileForSourdough(profile);
    }
    
    const sourdoughProfilesCount = uniqueProfiles.filter(p => p.hasSourdoughKeywords).length;
    
    console.log(`📱 Found ${uniqueProfiles.length} social profiles, ${sourdoughProfilesCount} with sourdough keywords`);
    
    return {
      name: restaurantName,
      address,
      socialProfiles: uniqueProfiles,
      totalSourdoughProfiles: sourdoughProfilesCount
    };
  }

  /**
   * Extract social media links from restaurant website
   */
  private async extractSocialFromWebsite(websiteUrl: string): Promise<SocialMediaProfile[]> {
    try {
      const response = await axios.get(websiteUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      const profiles: SocialMediaProfile[] = [];
      
      // Look for Instagram links
      $('a[href*="instagram.com"]').each((i, link) => {
        const href = $(link).attr('href');
        if (href) {
          const username = this.extractInstagramUsername(href);
          if (username) {
            profiles.push({
              platform: 'instagram',
              username,
              url: `https://instagram.com/${username}`,
              hasSourdoughKeywords: false,
              foundKeywords: []
            });
          }
        }
      });
      
      // Look for Facebook links
      $('a[href*="facebook.com"]').each((i, link) => {
        const href = $(link).attr('href');
        if (href) {
          const username = this.extractFacebookUsername(href);
          if (username) {
            profiles.push({
              platform: 'facebook',
              username,
              url: `https://facebook.com/${username}`,
              hasSourdoughKeywords: false,
              foundKeywords: []
            });
          }
        }
      });
      
      return profiles;
    } catch (error) {
      console.log(`   ❌ Website social extraction failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Search for Instagram profiles using common naming patterns
   */
  private async searchInstagramProfiles(restaurantName: string, address: string): Promise<SocialMediaProfile[]> {
    const profiles: SocialMediaProfile[] = [];
    
    // Generate potential Instagram usernames
    const potentialUsernames = this.generateInstagramUsernames(restaurantName);
    
    for (const username of potentialUsernames) {
      try {
        // We'll use a web search to see if this Instagram profile exists and get basic info
        const exists = await this.checkInstagramProfileExists(username);
        if (exists) {
          profiles.push({
            platform: 'instagram',
            username,
            url: `https://instagram.com/${username}`,
            hasSourdoughKeywords: false,
            foundKeywords: []
          });
        }
      } catch (error) {
        // Continue with next username
        continue;
      }
    }
    
    return profiles;
  }

  /**
   * Search for Facebook profiles using common naming patterns
   */
  private async searchFacebookProfiles(restaurantName: string, address: string): Promise<SocialMediaProfile[]> {
    const profiles: SocialMediaProfile[] = [];
    
    // Generate potential Facebook page names
    const potentialPages = this.generateFacebookPages(restaurantName);
    
    for (const pageName of potentialPages) {
      try {
        const exists = await this.checkFacebookPageExists(pageName);
        if (exists) {
          profiles.push({
            platform: 'facebook',
            username: pageName,
            url: `https://facebook.com/${pageName}`,
            hasSourdoughKeywords: false,
            foundKeywords: []
          });
        }
      } catch (error) {
        continue;
      }
    }
    
    return profiles;
  }

  /**
   * Use Google search to find social media mentions
   */
  private async googleSearchSocialMedia(restaurantName: string, address: string): Promise<SocialMediaProfile[]> {
    const profiles: SocialMediaProfile[] = [];
    
    try {
      // Use Outscraper to search for social media mentions
      const outscraper_api_key = process.env.OUTSCRAPER_API_KEY;
      if (!outscraper_api_key) return profiles;
      
      const searchQuery = `"${restaurantName}" instagram OR facebook site:instagram.com OR site:facebook.com`;
      
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: searchQuery,
          limit: 10,
          async: false
        },
        headers: {
          'X-API-KEY': outscraper_api_key
        },
        timeout: 15000
      });
      
      if (response.data?.data?.[0]) {
        const results = response.data.data[0];
        
        results.forEach(result => {
          if (result.link) {
            if (result.link.includes('instagram.com')) {
              const username = this.extractInstagramUsername(result.link);
              if (username) {
                profiles.push({
                  platform: 'instagram',
                  username,
                  url: result.link,
                  hasSourdoughKeywords: false,
                  foundKeywords: []
                });
              }
            } else if (result.link.includes('facebook.com')) {
              const username = this.extractFacebookUsername(result.link);
              if (username) {
                profiles.push({
                  platform: 'facebook',
                  username,
                  url: result.link,
                  hasSourdoughKeywords: false,
                  foundKeywords: []
                });
              }
            }
          }
        });
      }
    } catch (error) {
      console.log(`   ❌ Google social search failed: ${error.message}`);
    }
    
    return profiles;
  }

  /**
   * Generate potential Instagram usernames from restaurant name
   */
  private generateInstagramUsernames(restaurantName: string): string[] {
    const clean = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')  // Remove special chars
      .replace(/\s+/g, '');         // Remove spaces
    
    const withSpaces = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');        // Replace spaces with underscores
    
    const withDots = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');        // Replace spaces with dots
    
    // Common restaurant patterns
    const patterns = [
      clean,
      withSpaces,
      withDots,
      `${clean}pizza`,
      `${clean}pdx`,
      `${clean}portland`,
      `pizza${clean}`,
      `${clean}restaurant`,
      `${clean}_pizza`,
      `${clean}.pizza`,
      clean.replace('pizza', '').replace('pie', '').trim()
    ];
    
    return [...new Set(patterns)].filter(p => p.length > 2);
  }

  /**
   * Generate potential Facebook page names from restaurant name
   */
  private generateFacebookPages(restaurantName: string): string[] {
    const clean = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    const withDots = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.');
    
    const patterns = [
      clean,
      withDots,
      restaurantName.replace(/\s+/g, ''),
      `${clean}-pizza`,
      `${clean}-portland`,
      clean.replace('pizza', '').replace('pie', '').trim()
    ];
    
    return [...new Set(patterns)].filter(p => p.length > 2);
  }

  /**
   * Check if Instagram profile exists (simplified check)
   */
  private async checkInstagramProfileExists(username: string): Promise<boolean> {
    try {
      // Use a web search to check if this Instagram profile has any mentions
      const outscraper_api_key = process.env.OUTSCRAPER_API_KEY;
      if (!outscraper_api_key) return false;
      
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: `site:instagram.com/${username}`,
          limit: 1,
          async: false
        },
        headers: {
          'X-API-KEY': outscraper_api_key
        },
        timeout: 8000
      });
      
      return response.data?.data?.[0]?.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if Facebook page exists (simplified check)
   */
  private async checkFacebookPageExists(pageName: string): Promise<boolean> {
    try {
      const outscraper_api_key = process.env.OUTSCRAPER_API_KEY;
      if (!outscraper_api_key) return false;
      
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: `site:facebook.com/${pageName}`,
          limit: 1,
          async: false
        },
        headers: {
          'X-API-KEY': outscraper_api_key
        },
        timeout: 8000
      });
      
      return response.data?.data?.[0]?.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check social media profile for sourdough keywords
   */
  private async checkProfileForSourdough(profile: SocialMediaProfile): Promise<void> {
    try {
      let bio = '';
      
      if (profile.platform === 'instagram') {
        bio = await this.getInstagramBio(profile.username);
      } else if (profile.platform === 'facebook') {
        bio = await this.getFacebookDescription(profile.username);
      }
      
      profile.bio = bio;
      
      // Check for sourdough keywords in bio
      const lowerBio = bio.toLowerCase();
      const foundKeywords: string[] = [];
      
      this.sourdoughKeywords.forEach(keyword => {
        if (lowerBio.includes(keyword.toLowerCase())) {
          foundKeywords.push(keyword);
        }
      });
      
      profile.foundKeywords = foundKeywords;
      profile.hasSourdoughKeywords = foundKeywords.length > 0;
      
      if (profile.hasSourdoughKeywords) {
        console.log(`   ✅ ${profile.platform} @${profile.username} has sourdough keywords: ${foundKeywords.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to check ${profile.platform} @${profile.username}: ${error.message}`);
    }
  }

  /**
   * Get Instagram bio using web scraping approach
   */
  private async getInstagramBio(username: string): Promise<string> {
    try {
      // Use Google search to find Instagram profile information
      const outscraper_api_key = process.env.OUTSCRAPER_API_KEY;
      if (!outscraper_api_key) return '';
      
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: `site:instagram.com/${username}`,
          limit: 1,
          async: false
        },
        headers: {
          'X-API-KEY': outscraper_api_key
        },
        timeout: 8000
      });
      
      if (response.data?.data?.[0]?.[0]) {
        const result = response.data.data[0][0];
        return result.description || result.snippet || '';
      }
      
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Get Facebook page description using web scraping approach
   */
  private async getFacebookDescription(pageName: string): Promise<string> {
    try {
      const outscraper_api_key = process.env.OUTSCRAPER_API_KEY;
      if (!outscraper_api_key) return '';
      
      const response = await axios.get('https://api.outscraper.com/google-search-v3', {
        params: {
          query: `site:facebook.com/${pageName}`,
          limit: 1,
          async: false
        },
        headers: {
          'X-API-KEY': outscraper_api_key
        },
        timeout: 8000
      });
      
      if (response.data?.data?.[0]?.[0]) {
        const result = response.data.data[0][0];
        return result.description || result.snippet || '';
      }
      
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Extract Instagram username from URL
   */
  private extractInstagramUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract Facebook username/page from URL
   */
  private extractFacebookUsername(url: string): string | null {
    const match = url.match(/facebook\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  /**
   * Remove duplicate profiles
   */
  private removeDuplicateProfiles(profiles: SocialMediaProfile[]): SocialMediaProfile[] {
    const seen = new Set();
    return profiles.filter(profile => {
      const key = `${profile.platform}:${profile.username}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Test the social media discovery system with Pizza Creature
   */
  async testPizzaCreature(): Promise<void> {
    console.log('🧪 TESTING SOCIAL MEDIA DISCOVERY: Pizza Creature');
    console.log('');
    
    const result = await this.findRestaurantSocialMedia(
      'Pizza Creature',
      '7316 N Lombard St, Portland, OR 97203',
      'http://www.pizzacreature.com/'
    );
    
    console.log('📊 RESULTS:');
    console.log(`   Restaurant: ${result.name}`);
    console.log(`   Total social profiles found: ${result.socialProfiles.length}`);
    console.log(`   Profiles with sourdough keywords: ${result.totalSourdoughProfiles}`);
    console.log('');
    
    result.socialProfiles.forEach(profile => {
      console.log(`📱 ${profile.platform.toUpperCase()}: @${profile.username}`);
      console.log(`   🔗 ${profile.url}`);
      console.log(`   📝 Bio: ${profile.bio || 'Not available'}`);
      if (profile.hasSourdoughKeywords) {
        console.log(`   ✅ SOURDOUGH KEYWORDS: ${profile.foundKeywords.join(', ')}`);
      } else {
        console.log(`   ❌ No sourdough keywords found`);
      }
      console.log('');
    });
  }
}