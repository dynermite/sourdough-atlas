import { EnhancedSourdoughScraper } from './enhanced-scraper';

async function main() {
  console.log('Testing enhanced scraper for Portland...');
  const scraper = new EnhancedSourdoughScraper();
  await scraper.scrapeCity('Portland', 'OR');
  console.log('Enhanced scraping complete!');
  process.exit(0);
}

main().catch(console.error);