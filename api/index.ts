import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from "express";
import { registerRoutes } from "../server/routes";
import { seedDatabase } from "../server/seed-data";

let app: express.Application | null = null;

const getApp = async () => {
  if (!app) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Seed the database with sample data
    await seedDatabase();
    
    // Register API routes
    await registerRoutes(app);
  }
  return app;
};

const handler = async (req: VercelRequest, res: VercelResponse) => {
  const app = await getApp();
  
  // Set the request URL to match the API path
  req.url = req.url?.replace(/^\/api/, '') || '/';
  
  return app(req as any, res as any);
};

export default handler;