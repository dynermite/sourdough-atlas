import type { Express } from "express";
import { scheduler } from "./scheduler";
import { scrapeGoogleMapsForSourdough } from './comprehensive-google-maps-scraper';
import { scrapeGooglePlacesForSourdough } from './google-places-scraper';
import { buildCityDatabase, buildComprehensiveDatabase } from './database-builder';
import { z } from "zod";

const scrapeRequestSchema = z.object({
  searchQuery: z.string().min(1),
  maxResults: z.number().min(1).max(50).default(20)
});

export function registerScrapeRoutes(app: Express) {
  // Manual scraping endpoint
  app.post("/api/scrape", async (req, res) => {
    try {
      const { searchQuery, maxResults } = scrapeRequestSchema.parse(req.body);
      
      // Start scraping using the scheduler
      scheduler.manualScrape(searchQuery, maxResults)
        .catch(error => console.error('Background scraping error:', error));
      
      res.json({ 
        message: `Started scraping for "${searchQuery}" with max ${maxResults} results`,
        status: 'started'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      
      if (error instanceof Error && error.message.includes('already in progress')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to start scraping" });
    }
  });

  // Google Places comprehensive scraping endpoint (more reliable)
  app.post("/api/scrape/google-places/:city/:state", async (req, res) => {
    try {
      const { city, state } = req.params;
      
      console.log(`\n🚀 Starting Google Places scraping for ${city}, ${state}...`);
      
      // Start scraping in background
      const scrapePromise = scrapeGooglePlacesForSourdough(city, state);
      
      res.json({ 
        message: `Started comprehensive Google Places scraping for ${city}, ${state}`,
        status: 'started',
        city,
        state
      });
      
      // Continue scraping in background
      scrapePromise.then((addedCount) => {
        console.log(`✅ Google Places scraping completed for ${city}, ${state}: Added ${addedCount} restaurants`);
      }).catch((error) => {
        console.error(`❌ Google Places scraping failed for ${city}, ${state}:`, error);
      });
      
    } catch (error) {
      console.error('Google Places scraping error:', error);
      res.status(500).json({ message: "Failed to start Google Places scraping" });
    }
  });

  // Google Maps comprehensive scraping endpoint  
  app.post("/api/scrape/google-maps/:city/:state", async (req, res) => {
    try {
      const { city, state } = req.params;
      
      console.log(`\n🚀 Starting Google Maps scraping for ${city}, ${state}...`);
      
      // Start scraping in background
      const scrapePromise = scrapeGoogleMapsForSourdough(city, state);
      
      res.json({ 
        message: `Started comprehensive Google Maps scraping for ${city}, ${state}`,
        status: 'started',
        city,
        state
      });
      
      // Continue scraping in background
      scrapePromise.then((addedCount) => {
        console.log(`✅ Google Maps scraping completed for ${city}, ${state}: Added ${addedCount} restaurants`);
      }).catch((error) => {
        console.error(`❌ Google Maps scraping failed for ${city}, ${state}:`, error);
      });
      
    } catch (error) {
      console.error('Google Maps scraping error:', error);
      res.status(500).json({ message: "Failed to start Google Maps scraping" });
    }
  });

  // Build comprehensive database
  app.post("/api/build-database", async (req, res) => {
    try {
      console.log('🚀 Starting comprehensive database building...');
      
      res.json({ 
        message: 'Started building comprehensive sourdough pizza database',
        status: 'started',
        note: 'This will scrape 10+ major cities for verified sourdough restaurants'
      });
      
      // Continue building in background
      buildComprehensiveDatabase().catch((error) => {
        console.error('❌ Database building failed:', error);
      });
      
    } catch (error) {
      console.error('Database building error:', error);
      res.status(500).json({ message: "Failed to start database building" });
    }
  });

  // Build database for specific city
  app.post("/api/build-database/:city/:state", async (req, res) => {
    try {
      const { city, state } = req.params;
      
      console.log(`🚀 Starting database building for ${city}, ${state}...`);
      
      res.json({ 
        message: `Started building database for ${city}, ${state}`,
        status: 'started',
        city,
        state
      });
      
      // Continue building in background
      buildCityDatabase(city, state).then((addedCount) => {
        console.log(`✅ Database building completed for ${city}, ${state}: Added ${addedCount} restaurants`);
      }).catch((error) => {
        console.error(`❌ Database building failed for ${city}, ${state}:`, error);
      });
      
    } catch (error) {
      console.error('Database building error:', error);
      res.status(500).json({ message: "Failed to start database building" });
    }
  });

  // Get scraping status
  app.get("/api/scrape/status", async (req, res) => {
    try {
      const status = scheduler.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get scraping status" });
    }
  });
}