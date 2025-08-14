import * as cron from 'node-cron';
import { startScraping, getScrapingStatus } from './scraper';

export class ScrapingScheduler {
  private isRunning: boolean = false;
  private lastRunTime: string | null = null;

  startScheduledScraping() {
    // Run every Sunday at 3 AM to scrape new restaurants
    cron.schedule('0 3 * * 0', async () => {
      if (this.isRunning) {
        console.log('Scraping already in progress, skipping scheduled run');
        return;
      }

      console.log('Starting scheduled scraping task...');
      this.isRunning = true;

      try {
        // List of major cities to scrape
        const citiesToScrape = [
          'San Francisco California',
          'Los Angeles California',
          'New York New York',
          'Chicago Illinois',
          'Austin Texas',
          'Portland Oregon',
          'Seattle Washington',
          'Denver Colorado',
          'Boston Massachusetts',
          'Miami Florida',
          'Nashville Tennessee',
          'Philadelphia Pennsylvania'
        ];

        for (const city of citiesToScrape) {
          console.log(`Scraping ${city}...`);
          await startScraping(city, 15);
          
          // Wait 30 seconds between cities to be respectful
          await new Promise(resolve => setTimeout(resolve, 30000));
        }

        console.log('Scheduled scraping completed successfully');
        this.lastRunTime = new Date().toISOString();
      } catch (error) {
        console.error('Error during scheduled scraping:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('Scheduled scraping task registered for Sundays at 3 AM');
  }

  async manualScrape(searchQuery: string, maxResults: number = 20): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scraping is already in progress');
    }

    this.isRunning = true;
    try {
      await startScraping(searchQuery, maxResults);
      this.lastRunTime = new Date().toISOString();
    } finally {
      this.isRunning = false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRunTime || 'Never',
      nextRun: 'Sundays at 3 AM'
    };
  }
}

export const scheduler = new ScrapingScheduler();