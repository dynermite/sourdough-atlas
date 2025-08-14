import { WebDiscoveryScraper } from './web-discovery-scraper';

async function main() {
  console.log('🚀 Testing web discovery scraper for Portland...');
  const scraper = new WebDiscoveryScraper();
  
  try {
    await scraper.discoverAndAnalyzeCity('Portland', 'OR');
    console.log('\n✅ Web discovery test complete!');
  } catch (error) {
    console.error('❌ Discovery failed:', error);
  }
  
  process.exit(0);
}

main().catch(console.error);