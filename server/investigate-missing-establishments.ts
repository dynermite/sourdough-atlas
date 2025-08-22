#!/usr/bin/env tsx

import axios from 'axios';
import * as cheerio from 'cheerio';

interface MissingEstablishmentAnalysis {
  name: string;
  website: string;
  sourdoughEvidence: string[];
  possibleReasons: string[];
  recommendations: string[];
}

class MissingEstablishmentInvestigation {
  private sourdoughKeywords = [
    'sourdough', 'naturally leavened', 'wild yeast', 'naturally fermented'
  ];
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OUTSCRAPER_API_KEY || '';
  }

  async investigateJulesPizza(): Promise<MissingEstablishmentAnalysis> {
    console.log('🔍 INVESTIGATING MISSING ESTABLISHMENT: Jules Pizza');
    console.log('=' .repeat(50));
    
    const analysis: MissingEstablishmentAnalysis = {
      name: "Jules Pizza",
      website: "https://www.julespizza.co/about-us",
      sourdoughEvidence: [],
      possibleReasons: [],
      recommendations: []
    };

    // Step 1: Analyze website content
    console.log('\n📄 STEP 1: WEBSITE CONTENT ANALYSIS');
    try {
      const websiteContent = await this.analyzeWebsiteContent(analysis.website);
      analysis.sourdoughEvidence = websiteContent;
      
      if (websiteContent.length > 0) {
        console.log(`✅ Website DOES contain sourdough evidence: ${websiteContent.join(', ')}`);
      } else {
        console.log('❌ Website does NOT contain our 4 sourdough keywords');
      }
    } catch (error) {
      console.log(`❌ Website analysis failed: ${error.message}`);
      analysis.possibleReasons.push('Website inaccessible to our analysis tool');
    }

    // Step 2: Test various search queries that should find Jules Pizza
    console.log('\n🔍 STEP 2: SEARCH QUERY TESTING');
    await this.testSearchQueries(analysis);

    // Step 3: Check if Jules Pizza appears in general pizza searches
    console.log('\n🍕 STEP 3: GENERAL PIZZA SEARCH TESTING');
    await this.testGeneralPizzaSearches(analysis);

    // Step 4: Provide recommendations
    this.generateRecommendations(analysis);

    return analysis;
  }

  async analyzeWebsiteContent(websiteUrl: string): Promise<string[]> {
    const response = await axios.get(websiteUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    
    // Extract comprehensive text content
    const textSections = [
      $('title').text(),
      $('meta[name="description"]').attr('content') || '',
      $('h1, h2, h3, h4').text(),
      $('.about, .story, #about, [class*="about"]').text(),
      $('.menu, .food-menu, #menu, [class*="menu"]').text(),
      $('.description, .info, [class*="description"]').text(),
      $('main').text(),
      $('body').text()
    ];

    const fullText = textSections.join(' ').toLowerCase();
    console.log(`   Analyzed ${fullText.length} characters of website content`);
    
    // Check for our 4 keywords
    const foundKeywords: string[] = [];
    for (const keyword of this.sourdoughKeywords) {
      if (fullText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }

    // Also check for related terms that might indicate sourdough
    const relatedTerms = [
      'fermentation', 'starter', 'levain', 'mother dough', 'wild fermentation',
      'natural fermentation', 'long fermentation', 'slow rise', 'traditional method'
    ];
    
    const relatedFound: string[] = [];
    for (const term of relatedTerms) {
      if (fullText.includes(term)) {
        relatedFound.push(`related: ${term}`);
      }
    }

    return [...foundKeywords, ...relatedFound];
  }

  async testSearchQueries(analysis: MissingEstablishmentAnalysis) {
    if (!this.apiKey) {
      console.log('   ❌ No API key - cannot test search queries');
      analysis.possibleReasons.push('Cannot test API search coverage without API key');
      return;
    }

    const testQueries = [
      'Jules Pizza San Francisco',
      'sourdough pizza San Francisco',
      'pizza San Francisco CA',
      'artisan pizza San Francisco',
      'Jules Pizza sourdough'
    ];

    for (const query of testQueries) {
      console.log(`   Testing: "${query}"`);
      
      try {
        const results = await this.performSearchQuery(query);
        const foundJules = results.some(result => 
          result.name && result.name.toLowerCase().includes('jules')
        );
        
        if (foundJules) {
          console.log(`   ✅ Jules Pizza FOUND in "${query}" search`);
        } else {
          console.log(`   ❌ Jules Pizza NOT found in "${query}" search (${results.length} results)`);
          analysis.possibleReasons.push(`Not found in "${query}" search despite ${results.length} results`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`   ❌ Search failed: ${error.message}`);
        analysis.possibleReasons.push(`Search query "${query}" failed: ${error.message}`);
      }
    }
  }

  async testGeneralPizzaSearches(analysis: MissingEstablishmentAnalysis) {
    if (!this.apiKey) {
      console.log('   ❌ No API key - cannot test general searches');
      return;
    }

    const generalSearches = [
      { query: 'pizza restaurants San Francisco', limit: 100 },
      { query: 'best pizza San Francisco CA', limit: 50 }
    ];

    for (const search of generalSearches) {
      console.log(`   Testing: "${search.query}" (limit: ${search.limit})`);
      
      try {
        const results = await this.performSearchQuery(search.query, search.limit);
        
        // Check if Jules appears in results
        const julesResult = results.find(result => 
          result.name && result.name.toLowerCase().includes('jules')
        );
        
        if (julesResult) {
          console.log(`   ✅ Jules Pizza FOUND: ${julesResult.name}`);
          console.log(`      Address: ${julesResult.full_address || julesResult.address || 'N/A'}`);
          console.log(`      Description: ${julesResult.description || 'N/A'}`);
          console.log(`      Website: ${julesResult.website || julesResult.site || 'N/A'}`);
        } else {
          console.log(`   ❌ Jules Pizza NOT found in ${results.length} general pizza results`);
          analysis.possibleReasons.push(`Not found in comprehensive pizza search of ${results.length} establishments`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 4000));
        
      } catch (error) {
        console.log(`   ❌ General search failed: ${error.message}`);
        analysis.possibleReasons.push(`General pizza search failed: ${error.message}`);
      }
    }
  }

  async performSearchQuery(query: string, limit: number = 20): Promise<any[]> {
    const response = await axios.get('https://api.outscraper.com/maps/search-v3', {
      params: {
        query,
        limit,
        language: 'en',
        region: 'US'
      },
      headers: {
        'X-API-KEY': this.apiKey
      },
      timeout: 25000
    });

    if (response.data.status === 'Error') {
      throw new Error(response.data.error || 'API returned error status');
    }

    if (response.data.status === 'Pending') {
      return await this.waitForResults(response.data.id);
    }

    if (response.data.status === 'Success') {
      let results = response.data.data;
      if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
        results = results.flat();
      }
      return results || [];
    }

    throw new Error(`Unexpected status: ${response.data.status}`);
  }

  async waitForResults(requestId: string): Promise<any[]> {
    const maxAttempts = 6;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      try {
        const resultResponse = await axios.get(`https://api.outscraper.com/requests/${requestId}`, {
          headers: {
            'X-API-KEY': this.apiKey
          },
          timeout: 20000
        });

        if (resultResponse.data.status === 'Success') {
          let results = resultResponse.data.data;
          if (Array.isArray(results) && results.length > 0 && Array.isArray(results[0])) {
            results = results.flat();
          }
          return results || [];
        } else if (resultResponse.data.status === 'Error') {
          throw new Error(resultResponse.data.error || 'Request processing failed');
        }
        
      } catch (error) {
        if (attempts === maxAttempts) throw error;
      }
    }

    throw new Error(`Timeout after ${maxAttempts} attempts`);
  }

  generateRecommendations(analysis: MissingEstablishmentAnalysis) {
    console.log('\n💡 STEP 4: RECOMMENDATIONS FOR IMPROVED DETECTION');
    
    if (analysis.sourdoughEvidence.length > 0) {
      analysis.recommendations.push('Website contains sourdough evidence - search coverage needs improvement');
      analysis.recommendations.push('Add targeted searches for specific restaurant names');
      analysis.recommendations.push('Increase search result limits to catch more establishments');
    } else {
      analysis.recommendations.push('Website does not contain our 4 keywords - may require manual verification');
      analysis.recommendations.push('Consider expanding keyword detection to related terms');
    }

    if (analysis.possibleReasons.some(reason => reason.includes('search'))) {
      analysis.recommendations.push('Improve search query coverage - try neighborhood-specific searches');
      analysis.recommendations.push('Test different search term combinations');
    }

    analysis.recommendations.push('Implement manual cross-reference with known sourdough directories');
    analysis.recommendations.push('Add social media and review site analysis for sourdough mentions');

    analysis.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  displayAnalysis(analysis: MissingEstablishmentAnalysis) {
    console.log('\n📊 MISSING ESTABLISHMENT ANALYSIS SUMMARY');
    console.log('=' .repeat(50));
    
    console.log(`\n🏪 Restaurant: ${analysis.name}`);
    console.log(`🌐 Website: ${analysis.website}`);
    
    console.log(`\n🔍 Sourdough Evidence Found: ${analysis.sourdoughEvidence.length} items`);
    analysis.sourdoughEvidence.forEach(evidence => {
      console.log(`   ✅ ${evidence}`);
    });
    
    console.log(`\n❌ Possible Reasons for Missing: ${analysis.possibleReasons.length} identified`);
    analysis.possibleReasons.forEach((reason, index) => {
      console.log(`   ${index + 1}. ${reason}`);
    });
    
    console.log(`\n💡 Recommendations: ${analysis.recommendations.length} suggested`);
    analysis.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
}

export async function investigateMissingEstablishments() {
  const investigation = new MissingEstablishmentInvestigation();
  const analysis = await investigation.investigateJulesPizza();
  
  investigation.displayAnalysis(analysis);
  
  console.log('\n🎯 INVESTIGATION COMPLETE');
  console.log('This analysis will help improve our discovery system to catch similar establishments.');
  
  return analysis;
}

if (import.meta.url.endsWith(process.argv[1])) {
  investigateMissingEstablishments().catch(console.error);
}