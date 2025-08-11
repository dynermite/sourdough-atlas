import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
