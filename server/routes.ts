import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema } from "@shared/schema";
import { registerScrapeRoutes } from "./scrape-routes";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Register scraping routes
  registerScrapeRoutes(app);
  
  // Get all restaurants
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  // Get restaurant by ID
  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const restaurant = await storage.getRestaurantById(id);
      
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // Search restaurants
  app.get("/api/restaurants/search/:query", async (req, res) => {
    try {
      const { query } = req.params;
      const restaurants = await storage.searchRestaurants(query);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Failed to search restaurants" });
    }
  });

  // Get restaurants by city
  app.get("/api/restaurants/city/:city", async (req, res) => {
    try {
      const { city } = req.params;
      const restaurants = await storage.getRestaurantsByCity(city);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurants by city" });
    }
  });

  // Get restaurants by state
  app.get("/api/restaurants/state/:state", async (req, res) => {
    try {
      const { state } = req.params;
      const restaurants = await storage.getRestaurantsByState(state);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurants by state" });
    }
  });

  // Test scraper accuracy (admin endpoint)
  app.post("/api/admin/test-accuracy", async (req, res) => {
    try {
      const { city } = req.body;
      if (!city) {
        return res.status(400).json({ error: "City parameter required" });
      }
      
      const { testScraperAccuracy } = await import('./scraper-test');
      const result = await testScraperAccuracy(city);
      
      res.json(result);
    } catch (error) {
      console.error("Error testing scraper accuracy:", error);
      res.status(500).json({ error: "Failed to test scraper accuracy" });
    }
  });

  // Run comprehensive accuracy test (admin endpoint)
  app.post("/api/admin/comprehensive-test", async (_req, res) => {
    try {
      const { runComprehensiveTest } = await import('./scraper-test');
      const results = await runComprehensiveTest();
      
      res.json({ 
        message: "Comprehensive test completed",
        results,
        summary: {
          citiesTested: results.length,
          avgAccuracy: Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length)
        }
      });
    } catch (error) {
      console.error("Error running comprehensive test:", error);
      res.status(500).json({ error: "Failed to run comprehensive test" });
    }
  });

  // Enhanced scraping for specific city (admin endpoint)
  app.post("/api/admin/enhanced-scrape", async (req, res) => {
    try {
      const { city, state } = req.body;
      if (!city || !state) {
        return res.status(400).json({ error: "City and state parameters required" });
      }
      
      const { EnhancedSourdoughScraper } = await import('./enhanced-scraper');
      const scraper = new EnhancedSourdoughScraper();
      await scraper.scrapeCity(city, state);
      
      res.json({ 
        message: `Enhanced scraping completed for ${city}, ${state}`,
        instructions: "Check database for newly added verified sourdough restaurants"
      });
    } catch (error) {
      console.error("Error running enhanced scraper:", error);
      res.status(500).json({ error: "Failed to run enhanced scraper" });
    }
  });

  // Web discovery scraping (admin endpoint)
  app.post("/api/admin/web-discovery", async (req, res) => {
    try {
      const { city, state, maxTime = 300 } = req.body; // Default 5 minutes
      if (!city || !state) {
        return res.status(400).json({ error: "City and state parameters required" });
      }
      
      // Run discovery in background with timeout
      setTimeout(async () => {
        try {
          const { WebDiscoveryScraper } = await import('./web-discovery-scraper');
          const scraper = new WebDiscoveryScraper();
          await scraper.discoverAndAnalyzeCity(city, state);
        } catch (error) {
          console.error("Web discovery failed:", error);
        }
      }, 100);
      
      res.json({ 
        message: `Web discovery started for ${city}, ${state}`,
        instructions: "Discovery running in background. Check console logs and database for results.",
        estimatedTime: `${maxTime} seconds`
      });
    } catch (error) {
      console.error("Error starting web discovery:", error);
      res.status(500).json({ error: "Failed to start web discovery" });
    }
  });

  // Google Business scraping (admin endpoint) 
  app.post("/api/admin/google-business", async (req, res) => {
    try {
      const { city, state } = req.body;
      if (!city || !state) {
        return res.status(400).json({ error: "City and state parameters required" });
      }
      
      // Run Google Business scraping in background
      setTimeout(async () => {
        try {
          const { GoogleBusinessScraper } = await import('./google-business-scraper');
          const scraper = new GoogleBusinessScraper();
          await scraper.scrapeGoogleBusinesses(city, state);
        } catch (error) {
          console.error("Google Business scraping failed:", error);
        }
      }, 100);
      
      res.json({ 
        message: `Google Business scraping started for ${city}, ${state}`,
        instructions: "Scraper analyzing restaurant websites and Google Business profiles. Check console logs for progress.",
        focus: "Restaurant-owned content only (no third-party blogs)"
      });
    } catch (error) {
      console.error("Error starting Google Business scraping:", error);
      res.status(500).json({ error: "Failed to start Google Business scraping" });
    }
  });

  // Google Maps comprehensive scraping (admin endpoint)
  app.post("/api/admin/google-maps", async (req, res) => {
    try {
      const { city, state } = req.body;
      if (!city || !state) {
        return res.status(400).json({ error: "City and state parameters required" });
      }
      
      // Run comprehensive Google Maps scraping in background
      setTimeout(async () => {
        try {
          const { GoogleMapsScraper } = await import('./google-maps-scraper');
          const scraper = new GoogleMapsScraper();
          await scraper.scrapeGoogleMapsRestaurants(city, state);
        } catch (error) {
          console.error("Google Maps scraping failed:", error);
        }
      }, 100);
      
      res.json({ 
        message: `Comprehensive Google Maps scraping started for ${city}, ${state}`,
        instructions: "This will take significant time. Finding ALL pizza restaurants from Google Maps, then analyzing their Google Business profiles and websites for sourdough keywords.",
        process: "1) Find all pizza restaurants in Google Maps → 2) Analyze Google Business descriptions → 3) Analyze restaurant websites",
        expectedDuration: "15-30 minutes for thorough analysis"
      });
    } catch (error) {
      console.error("Error starting Google Maps scraping:", error);
      res.status(500).json({ error: "Failed to start Google Maps scraping" });
    }
  });

  // Reliable restaurant discovery (admin endpoint)
  app.post("/api/admin/reliable-scraper", async (req, res) => {
    try {
      const { city, state } = req.body;
      if (!city || !state) {
        return res.status(400).json({ error: "City and state parameters required" });
      }
      
      // Run reliable restaurant scraping in background
      setTimeout(async () => {
        try {
          const { ReliableRestaurantScraper } = await import('./reliable-restaurant-scraper');
          const scraper = new ReliableRestaurantScraper();
          await scraper.scrapeReliableRestaurants(city, state);
        } catch (error) {
          console.error("Reliable restaurant scraping failed:", error);
        }
      }, 100);
      
      res.json({ 
        message: `Reliable restaurant discovery started for ${city}, ${state}`,
        instructions: "Discovering pizza restaurants through business directories and analyzing their websites for sourdough keywords.",
        focus: "Restaurant-controlled content only (no blogs, reviews, or third-party sources)",
        process: "1) Find pizza restaurants through business directories → 2) Test common restaurant website patterns → 3) Analyze each restaurant's website for sourdough keywords",
        expectedDuration: "10-15 minutes for thorough analysis"
      });
    } catch (error) {
      console.error("Error starting reliable restaurant scraping:", error);
      res.status(500).json({ error: "Failed to start reliable restaurant scraping" });
    }
  });

  // Seed verified restaurants (admin endpoint)
  app.post("/api/admin/seed-verified", async (_req, res) => {
    try {
      const { verifiedSourdoughRestaurants } = await import('./verified-restaurants');
      let addedCount = 0;
      
      for (const restaurant of verifiedSourdoughRestaurants) {
        const zipCode = restaurant.address.match(/\d{5}(-\d{4})?/)?.[0] || '';
        
        const restaurantData = {
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          state: restaurant.state,
          zipCode,
          phone: restaurant.phone,
          website: restaurant.website,
          description: restaurant.description,
          sourdoughVerified: 1 as const,
          sourdoughKeywords: restaurant.sourdoughKeywords,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          reviews: [`Verified authentic sourdough - ${restaurant.verificationSource}`]
        };
        
        try {
          await storage.addRestaurant(restaurantData);
          addedCount++;
          console.log(`Added: ${restaurant.name} in ${restaurant.city}, ${restaurant.state}`);
        } catch (error) {
          console.log(`Skipped (likely exists): ${restaurant.name} in ${restaurant.city}, ${restaurant.state}`);
        }
      }
      
      res.json({ 
        message: `Seeded ${addedCount} verified restaurants`, 
        addedCount 
      });
    } catch (error) {
      console.error("Error seeding verified restaurants:", error);
      res.status(500).json({ error: "Failed to seed verified restaurants" });
    }
  });

  // Create new restaurant (for future admin functionality)
  app.post("/api/restaurants", async (req, res) => {
    try {
      const validatedData = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(validatedData);
      res.status(201).json(restaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid restaurant data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
