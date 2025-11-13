import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema } from "@shared/schema";
import { registerScrapeRoutes } from "./scrape-routes";
import { z } from "zod";
import { discoverAuthenticSourdough } from "./outscraper-integration";
import path from "path";

// Helper function to trigger area discovery
async function triggerAreaDiscovery(bounds: { north: number; south: number; east: number; west: number; zoom: number }) {
  console.log('Triggering area discovery for bounds:', bounds);
  
  // Estimate city from bounds center
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;
  
  // Use reverse geocoding or city detection logic here
  // For now, we'll use a simple approach based on known city coordinates
  const city = await estimateCityFromCoordinates(centerLat, centerLng);
  
  if (city && process.env.OUTSCRAPER_API_KEY) {
    // Note: OutscraperSourdoughDiscovery class not found, using available discovery function
    // const discovery = new OutscraperSourdoughDiscovery();
    try {
      // TODO: Implement OutscraperSourdoughDiscovery or use available discovery function
      const newRestaurants = await discoverAuthenticSourdough(city.name, city.state);
      console.log(`Discovered ${newRestaurants} new restaurants in ${city.name}, ${city.state}`);
    } catch (error) {
      console.error('Error in area discovery:', error);
    }
  }
}

// Estimate city from coordinates
async function estimateCityFromCoordinates(lat: number, lng: number): Promise<{ name: string; state: string } | null> {
  // Major US cities with approximate coordinates
  const cities = [
    { name: 'San Francisco', state: 'California', lat: 37.7749, lng: -122.4194 },
    { name: 'Portland', state: 'Oregon', lat: 45.5152, lng: -122.6784 },
    { name: 'Seattle', state: 'Washington', lat: 47.6062, lng: -122.3321 },
    { name: 'Austin', state: 'Texas', lat: 30.2672, lng: -97.7431 },
    { name: 'Denver', state: 'Colorado', lat: 39.7392, lng: -104.9903 },
    { name: 'Chicago', state: 'Illinois', lat: 41.8781, lng: -87.6298 },
    { name: 'New York', state: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', state: 'California', lat: 34.0522, lng: -118.2437 },
    { name: 'Miami', state: 'Florida', lat: 25.7617, lng: -80.1918 },
    { name: 'Boston', state: 'Massachusetts', lat: 42.3601, lng: -71.0589 },
    { name: 'Philadelphia', state: 'Pennsylvania', lat: 39.9526, lng: -75.1652 },
    { name: 'Phoenix', state: 'Arizona', lat: 33.4484, lng: -112.0740 },
    { name: 'San Diego', state: 'California', lat: 32.7157, lng: -117.1611 },
    { name: 'Dallas', state: 'Texas', lat: 32.7767, lng: -96.7970 },
    { name: 'Houston', state: 'Texas', lat: 29.7604, lng: -95.3698 }
  ];
  
  // Find closest city within reasonable distance (0.5 degrees ~ 55km)
  let closestCity = null;
  let minDistance = 0.5;
  
  for (const city of cities) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = { name: city.name, state: city.state };
    }
  }
  
  return closestCity;
}

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

  // Get restaurants within map bounds with auto-discovery (MUST come before :id route)
  app.get("/api/restaurants/bounds", async (req, res) => {
    try {
      console.log('Bounds endpoint hit with query:', req.query);
      const { north, south, east, west, zoom } = req.query;
      
      if (!north || !south || !east || !west) {
        console.log('Missing bounds parameters');
        return res.status(400).json({ message: "Bounds parameters required" });
      }

      const bounds = {
        north: parseFloat(north as string),
        south: parseFloat(south as string),
        east: parseFloat(east as string),
        west: parseFloat(west as string),
        zoom: parseInt(zoom as string) || 10
      };

      console.log('Parsed bounds:', bounds);

      // Get existing restaurants in bounds first
      const existingRestaurants = await storage.getRestaurantsInBounds(bounds);
      console.log(`Found ${existingRestaurants.length} restaurants in bounds`);
      
      // If zoom level is high enough (regional/city level) and we have few restaurants, trigger discovery
      if (bounds.zoom >= 8 && existingRestaurants.length < 3) {
        console.log('Triggering background discovery...');
        // Trigger background discovery for this area
        setTimeout(async () => {
          try {
            await triggerAreaDiscovery(bounds);
          } catch (error) {
            console.error('Background discovery failed:', error);
          }
        }, 0);
      }
      
      res.json(existingRestaurants);
    } catch (error) {
      console.error('Error fetching restaurants by bounds:', error);
      res.status(500).json({ message: "Failed to fetch restaurants by bounds" });
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

  // Get restaurant by ID (MUST come after specific routes)
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
      
      const { EnhancedPizzaDiscovery } = await import('./enhanced-scraper');
      const scraper = new EnhancedPizzaDiscovery();
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
          const { WebDiscoveryScr } = await import('./web-discovery-scraper');
          const scraper = new WebDiscoveryScr();
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

  // Complete 5-step discovery system (admin endpoint)
  app.post("/api/admin/complete-discovery", async (req, res) => {
    try {
      const { city, state } = req.body;
      if (!city || !state) {
        return res.status(400).json({ error: "City and state parameters required" });
      }
      
      // Run complete 5-step discovery in background
      setTimeout(async () => {
        try {
          const { runCompleteDiscovery } = await import('./complete-discovery-system');
          const results = await runCompleteDiscovery(city, state);
          console.log(`Discovery completed for ${city}, ${state}:`, results);
        } catch (error) {
          console.error("Complete discovery failed:", error);
        }
      }, 100);
      
      res.json({ 
        message: `Complete 5-step discovery started for ${city}, ${state}`,
        instructions: "Running comprehensive discovery system with all 5 steps",
        process: [
          "Step 1: Search for 'sourdough pizza' and 'artisan pizza'",
          "Step 2: Analyze Google Business Profiles for keywords", 
          "Step 3: Scrape restaurant websites for keywords",
          "Step 4: Check Instagram, Facebook, and Yelp profiles",
          "Step 5: Compile results and add to map"
        ],
        expectedDuration: "20-40 minutes for thorough 5-step analysis"
      });
    } catch (error) {
      console.error("Error starting complete discovery:", error);
      res.status(500).json({ error: "Failed to start complete discovery" });
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
      const { seedVerifiedComprehensiveDatabase } = await import('./verified-restaurants');
      const result = await seedVerifiedComprehensiveDatabase();
      
      res.json({ 
        message: "Verified restaurants seeded successfully", 
        imported: result.imported,
        skipped: result.skipped,
        cityStats: result.cityStats,
        stateStats: result.stateStats
      });
    } catch (error) {
      console.error('Error seeding verified restaurants:', error);
      res.status(500).json({ message: "Failed to seed verified restaurants", error: error instanceof Error ? error.message : 'Unknown error' });
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

  // Download project archive endpoint
  app.get('/download-project', (req, res) => {
    const filePath = path.join(__dirname, '..', 'sourdough-scout-complete.tar.gz');
    res.download(filePath, 'sourdough-scout-complete.tar.gz', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(404).send('File not found');
      }
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

