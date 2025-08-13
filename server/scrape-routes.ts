import type { Express } from "express";
import { scheduler } from "./scheduler";
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