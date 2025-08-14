import { GoogleBusinessScraper } from './google-business-scraper';

async function main() {
  console.log('🏢 Testing Google Business scraper for Portland...');
  const scraper = new GoogleBusinessScraper();
  
  try {
    await scraper.scrapeGoogleBusinesses('Portland', 'OR');
    console.log('\n✅ Google Business scraping test complete!');
  } catch (error) {
    console.error('❌ Google Business scraping failed:', error);
  }
  
  process.exit(0);
}

main().catch(console.error);